/**
 * db.js
 * -----
 * MySQL connection pool (keyed by database name, so the real DB pool and
 * the test DB pool used by Jest never collide) plus schema initialisation.
 */

const mysql = require("mysql2/promise");

const dbpools = {};

function dbconnPool(config) {
  const key = config.database;
  if (!dbpools[key]) {
    dbpools[key] = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      waitForConnections: true,
      connectionLimit: 5,
    });
  }
  return dbpools[key];
}

async function initDB(config) {
  const dbconn = await mysql.createConnection({
    host: config.host,
    port: config.port,
    user: config.user,
    password: config.password,
  });

  await dbconn.query(`CREATE DATABASE IF NOT EXISTS ${config.database}`);
  await dbconn.query(`USE ${config.database}`);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS components (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      description VARCHAR(255),
      group_name VARCHAR(120) DEFAULT 'General',
      status ENUM('operational','degraded','partial_outage','major_outage','maintenance')
             NOT NULL DEFAULT 'operational',
      display_order INT DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS incidents (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      impact ENUM('minor','major','critical') NOT NULL DEFAULT 'minor',
      status ENUM('investigating','identified','monitoring','resolved')
             NOT NULL DEFAULT 'investigating',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      resolved_at DATETIME NULL
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS incident_updates (
      id INT AUTO_INCREMENT PRIMARY KEY,
      incident_id INT NOT NULL,
      status ENUM('investigating','identified','monitoring','resolved') NOT NULL,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS incident_components (
      incident_id INT NOT NULL,
      component_id INT NOT NULL,
      PRIMARY KEY (incident_id, component_id),
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS maintenance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      title VARCHAR(255) NOT NULL,
      description TEXT,
      scheduled_start DATETIME NOT NULL,
      scheduled_end DATETIME NOT NULL,
      status ENUM('scheduled','in_progress','completed','cancelled')
             NOT NULL DEFAULT 'scheduled',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS maintenance_components (
      maintenance_id INT NOT NULL,
      component_id INT NOT NULL,
      PRIMARY KEY (maintenance_id, component_id),
      FOREIGN KEY (maintenance_id) REFERENCES maintenance(id) ON DELETE CASCADE,
      FOREIGN KEY (component_id) REFERENCES components(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await dbconn.query(`
    CREATE TABLE IF NOT EXISTS subscribers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(180) NOT NULL UNIQUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);

  await conn.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      subscriber_id INT NOT NULL,
      incident_id INT NULL,
      maintenance_id INT NULL,
      message TEXT NOT NULL,
      sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (subscriber_id) REFERENCES subscribers(id) ON DELETE CASCADE,
      FOREIGN KEY (incident_id) REFERENCES incidents(id) ON DELETE CASCADE,
      FOREIGN KEY (maintenance_id) REFERENCES maintenance(id) ON DELETE CASCADE
    ) ENGINE=InnoDB
  `);

  await conn.end();
}

module.exports = { dbconnPool, initDB };
