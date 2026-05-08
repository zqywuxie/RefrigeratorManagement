import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'wszqy123.',
  database: process.env.DB_NAME || 'biofridge',
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
