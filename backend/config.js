/**
 * config.js
 * ---------
 * Database configuration loaded from environment variables.
 */

require("dotenv").config();

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "statuswatch_db",
};

const TEST_DB_CONFIG = {
  ...DB_CONFIG,
  database: process.env.DB_TEST || "statuswatch_test_db",
};

module.exports = { DB_CONFIG, TEST_DB_CONFIG };
