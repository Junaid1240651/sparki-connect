import { dbConnection } from "../../db/connection.js";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const userQuery = async (query, values, retryCount = 0) => {
  try {
    const con = dbConnection();
    return new Promise((resolve, reject) => {
      con.query(query, values, (err, results) => {
        if (err) {
          if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
              err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
              err.code === 'ECONNRESET') {
            if (retryCount < MAX_RETRIES) {
              console.log(`Query failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
              sleep(RETRY_DELAY).then(() => {
                userQuery(query, values, retryCount + 1)
                  .then(resolve)
                  .catch(reject);
              });
            } else {
              reject(err);
            }
          } else {
            reject(err);
          }
        } else {
          resolve(results);
        }
      });
    });
  } catch (err) {
    if (retryCount < MAX_RETRIES) {
      console.log(`Query failed, retrying (${retryCount + 1}/${MAX_RETRIES})...`);
      await sleep(RETRY_DELAY);
      return userQuery(query, values, retryCount + 1);
    }
    throw err;
  }
};

export default userQuery;
