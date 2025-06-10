import dotenv from "dotenv";
dotenv.config();
import { createConnection } from "mysql";
import pkg from "lodash";
const { get } = pkg;

let dbInstance = null;
let isConnecting = false;
const MAX_RECONNECT_ATTEMPTS = 5;
let reconnectAttempts = 0;

const createDBConnection = () => {
  return createConnection({
    host: get(process.env, "DB_HOST"),
    user: get(process.env, "DB_USER"),
    password: get(process.env, "DB_PASSWORD"),
    database: get(process.env, "DB_NAME"),
    socketPath: get(process.env, "DB_SOCKET_PATH"),
    port: get(process.env, "DB_PORT"),
    connectTimeout: 10000, // 10 seconds
    acquireTimeout: 10000,
    timeout: 10000,
    dateStrings: true
  });
};

const handleDisconnect = () => {
  if (dbInstance) {
    dbInstance.on('error', (err) => {
      console.error('Database error:', err);
      if (err.code === 'PROTOCOL_CONNECTION_LOST' || 
          err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
          err.code === 'ECONNRESET') {
        console.log('Database connection lost. Attempting to reconnect...');
        reconnect();
      } else {
        throw err;
      }
    });
  }
};

const reconnect = () => {
  if (isConnecting) return;
  
  isConnecting = true;
  if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
    console.error('Max reconnection attempts reached. Please check your database connection.');
    isConnecting = false;
    return;
  }

  console.log(`Attempting to reconnect (${reconnectAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})...`);
  
  if (dbInstance) {
    try {
      dbInstance.destroy();
    } catch (err) {
      console.error('Error destroying connection:', err);
    }
  }

  setTimeout(() => {
    dbInstance = createDBConnection();
    dbInstance.connect((err) => {
      isConnecting = false;
      if (err) {
        console.error('Error reconnecting to database:', err);
        reconnectAttempts++;
        reconnect();
      } else {
        console.log('Successfully reconnected to database');
        reconnectAttempts = 0;
        handleDisconnect();
      }
    });
  }, 2000); // Wait 2 seconds before attempting to reconnect
};

const getConnection = () => {
  if (!dbInstance) {
    dbInstance = createDBConnection();
    dbInstance.connect((err) => {
      if (err) {
        console.error('Error connecting to database:', err);
        reconnect();
      } else {
        console.log('Successfully connected to database');
        handleDisconnect();
      }
    });
  }
  return dbInstance;
};

export const dbConnection = getConnection;
