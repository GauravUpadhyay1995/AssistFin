// import mysql from 'mysql';
// import dotenv from 'dotenv';
// dotenv.config();
// const conn = mysql.createConnection({
//     host: process.env.DB_HOST,
//     user: process.env.DB_USER,
//     password: process.env.DB_PASSWORD,
//     database: process.env.DB_DATABSE,
//     connectTimeout: 90000,

// });


// export default conn;
import mysql from 'mysql';
import dotenv from 'dotenv';
import util from 'util';

dotenv.config();

const conn = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABSE,
    connectTimeout: 90000,
});

conn.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err.stack);
        return;
    }
    console.log('Connected to database.');
});

// Promisify the query method
const query = util.promisify(conn.query).bind(conn);

export default { query };
