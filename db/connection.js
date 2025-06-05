import dotenv from "dotenv";
dotenv.config();
import { createConnection } from "mysql";
import pkg from "lodash";
const { get } = pkg;

const connection = () => {
  const con = createConnection({
    host: get(process.env, "DB_HOST"),
    user: get(process.env, "DB_USER"),
    password: get(process.env, "DB_PASSWORD"),
    database: get(process.env, "DB_NAME"),
    socketPath: get(process.env, "DB_SOCKET_PATH"),
    port: get(process.env, "DB_PORT"),
  });
  
  // Add connection events
  con.connect((err) => {
    if (err) {
      console.error('MySQL connection error:', err);
      return;
    }
  });
  return con;
};

export const dbConnection = connection;
