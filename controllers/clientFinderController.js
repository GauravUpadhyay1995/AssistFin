import db from "../config/db.js";
import { faker } from '@faker-js/faker';
import xlsx from 'xlsx';
const createIndianDummyAndInsertSQL = () => {
    return new Promise((resolve, reject) => {
        try {
            // Define the number of records
            const numRecords = 100000;

            // Generate fake Indian data
            for (let i = 0; i < numRecords; i++) {
                const clientName = faker.person.firstName() + ' ' + faker.person.lastName();
                const state = faker.location.state();
                const city = faker.location.city();
                const pincode = faker.location.zipCode('######');
                const contact = faker.phone.number('##########');

                // Construct SQL insert statement
                const sql = `INSERT INTO tbl_client_finder (client_name, state, city, pincode, contact) VALUES (?, ?, ?, ?, ?)`;
                const values = [clientName, state, city, pincode, contact];

                // Execute the SQL insert statement
                db.query(sql, values, (error, results, fields) => {
                    if (error) {
                        console.error('Error inserting data:', error);
                        reject(error);
                    }
                });
            }

            console.log('Data inserted into tbl_client_finder successfully.');
            resolve();
        } catch (error) {
            reject(error);
        }
    });
};

// Export the function to be used in your route or controller
export const fetchClients = async (req, res, next) => {
    try {
        const output = await filterClients(req)
        output.tot_count = output.length;
        return res.status(200).send({ success: true, message: "Fetched.", data: output, tot_count: output['tot_count'] });

    } catch (error) {
        console.error('Database Error:', error);
        res.status(500).send('Database Error:');
    }
};

export const generateFakeData = async (req, res, next) => {
    try {
        await createIndianDummyAndInsertSQL();
        res.status(200).send('Data inserted into tbl_client_finder successfully.');
    } catch (error) {
        console.error('Error inserting data into tbl_client_finder:', error);
        res.status(500).send('Failed to insert data into tbl_client_finder.');
    }
}


const filterClients = (req) => {
    return new Promise((resolve, reject) => {
        const searchString=req.body.filter
        const { page = 1, limit = 10 } = req.body;
        const offset = (page - 1) * limit;
        const sql = `SELECT * FROM tbl_client_finder WHERE client_name LIKE ? OR state LIKE ? OR city LIKE ? OR pincode LIKE ? OR contact LIKE ? order by client_name asc LIMIT ? OFFSET ? `;
        const values = [`%${searchString}%`, `%${searchString}%`, `%${searchString}%`, `%${searchString}%`, `%${searchString}%`, parseInt(limit), parseInt(offset)];

        db.query(sql, values, (error, results) => {
            if (error) {
                reject(error);
            } else {
                resolve(results);
            }
        });
    });
};

