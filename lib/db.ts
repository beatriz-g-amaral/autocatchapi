import mysql from 'mysql2/promise';

export const db = mysql.createPool({
  host:  process.env.HOST,     
  user: process.env.DB_USER,          
  password: process.env.DB_PASS, 
  database: process.env.DATABASE, 
});
