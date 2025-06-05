import dotenv from "dotenv";
dotenv.config();
import mysql from "mysql2/promise";
import pkg from "lodash";
const { get } = pkg;

export const dbConnection = async () => {
  try {
    const connection = await mysql.createConnection({
      host: get(process.env, "DB_HOST"),
      user: get(process.env, "DB_USER"),
      password: get(process.env, "DB_PASSWORD"),
      database: get(process.env, "DB_NAME"),
      port: get(process.env, "DB_PORT"),
      // socketPath is typically not used on Clever Cloud; omit unless required
    });

    console.log("✅ MySQL connection established.");
    return connection;
  } catch (err) {
    console.error("❌ MySQL connection error:", err.message);
    throw err;
  }
};