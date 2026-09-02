import mysql from 'mysql2/promise';

let pool = null;

export function getDb() {
  if (pool) return pool;

  const required = ['CLOUD_DB_HOST', 'CLOUD_DB_USER', 'CLOUD_DB_PASSWORD', 'CLOUD_DB_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Cloud DB configuration missing: ${missing.join(', ')}`);
  }

  pool = mysql.createPool({
    host: process.env.CLOUD_DB_HOST,
    port: parseInt(process.env.CLOUD_DB_PORT) || 4000,
    user: process.env.CLOUD_DB_USER,
    password: process.env.CLOUD_DB_PASSWORD,
    database: process.env.CLOUD_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    timezone: '+05:30',
    dateStrings: true,
    ssl: process.env.CLOUD_DB_SSL === 'false' ? undefined : { rejectUnauthorized: false }
  });

  return pool;
}

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS,PATCH');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Vendor-Id');
}
