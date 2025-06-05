import { dbConnection } from "../../db/connection.js";

const con = dbConnection();

const userQuery = (query, values) => {
  return new Promise((resolve, reject) => {
    con.query(query, values, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
};

export default userQuery;
