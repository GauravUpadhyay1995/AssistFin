import mysql from 'mysql';
import dotenv from 'dotenv';
dotenv.config();
const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: "root",
    password: "",
    database: "analytics",
    connectTimeout: 90000,

});


export default conn;