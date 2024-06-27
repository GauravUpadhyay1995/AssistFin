import mysql from 'mysql';
import dotenv from 'dotenv';
dotenv.config();
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABSE,
    connectTimeout: 90000,

});


export default conn;