import db from "../config/db.js";
import { faker } from '@faker-js/faker';
import path from 'path';
import xlsx from 'xlsx';
import fs from 'fs';
import { addDays, isValid, parse, format } from 'date-fns';
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


const expectedHeaders = [
    'client_name',
    'state',
    'city',
    'pincode',
    'contact'
];

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
export const uploadClientFinder = async (req, res, next) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const result = await processAndInsertData(req.file.path, req.user.id);
        fs.unlinkSync(req.file.path);

        if (result.success) {
            res.status(200).send({ success: true, message: "Data Uploaded" });
        } else {
            res.status(500).send({
                success: result.success,
                message: result.message
            });
        }
    } catch (err) {
        console.error('Error processing file:', err);
        res.status(500).send('Error inserting data into MySQL');
    }



}

const processAndInsertData = async (filePath, userId) => {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

    if (data.length === 0) {
        throw new Error('No data found in Excel file');
    }

    const headers = data[0].map(header => header.trim());

    // Check if all expected headers are present
    const missingHeaders = expectedHeaders.filter(header => !headers.includes(header));
    if (missingHeaders.length > 0) {
        return {
            success: 0,
            message: `Missing expected headers: ${missingHeaders.join(', ')}`,
        };
    }

    // Create a map to store the indices of expected headers
    const headerMap = {};
    expectedHeaders.forEach(expectedHeader => {
        const index = headers.indexOf(expectedHeader);
        headerMap[expectedHeader] = index;
    });

    const insertData = data.slice(1).map(row => {
        // Map each row to the expected order of columns
        return expectedHeaders.map(header => {
            let cellValue = row[headerMap[header]];

            // Convert numeric date representation to Date object
            if ((header === 'dob' || header === 'first_emi_date' || header === 'last_due_date' || header === 'last_emi_date' || header === 'disbursal_date' || header === 'date_of_emi_missed' || header === 'date_of_last_emi_paid' || header === 'date_of_last_payment' || header === 'payment_date') && typeof cellValue === 'number') {
                const parsedDate = addDays(new Date(1899, 11, 30), cellValue);
                if (isValid(parsedDate)) {
                    cellValue = format(parsedDate, 'yyyy-MM-dd');
                } else {
                    cellValue = null;
                }
            }

            return cellValue;
        });
    });

    const tableName = `tbl_client_finder`;
    const query = `INSERT INTO ${tableName} (${expectedHeaders.join(',')}) VALUES ?`;

    // Function to insert data in batches
    const insertInBatches = async (data, batchSize = 1000) => {
        for (let i = 0; i < data.length; i += batchSize) {
            const batch = data.slice(i, i + batchSize);
            await new Promise((resolve, reject) => {
                db.query(query, [batch], (err, result) => {
                    if (err) return reject(err);
                    resolve(result);
                });
            });
        }
    };

    try {
        await insertInBatches(insertData);
        return {
            success: 1,
            message: 'Data Inserted',
        };
    } catch (err) {
        console.error('Error inserting data in batches:', err);
        return {
            success: 0,
            message: 'Error inserting data into MySQL',
        };
    }
};

const filterClients = (req) => {
    return new Promise((resolve, reject) => {
        const searchString = req.body.filter
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

