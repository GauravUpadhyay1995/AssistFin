import db from '../config/db.js';
import path from 'path';
import xlsx from 'xlsx';
import fs from 'fs';
import { addDays, isValid, parse, format } from 'date-fns';

const expectedHeaders = ['loan_id',
    'dob',
    'age',
    'pan_number',
    'phone_number',
    'state',
    'city',
    'zone',
    'cluster',
    'pincode',
    'branch',
    'income_group',
    'occupation',
    'employer',
    'agency_name',
    'paid_status',
    'campaign',
    'norm',
    'product_type',
    'approved_nbfc',
    'disbursal_date',
    'loan_amount',
    'pf_percentage',
    'pf_amt',
    'int_rate_monthly',
    'total_int_due',
    'net_disb_amt',
    'total_due_amt',
    'tenure',
    'emi_amt_fixed',
    'first_emi_date',
    'last_emi_date',
    'dpd_in_days',
    'pos',
    'total_outstanding',
    'total_emi_paid',
    'balance_emi',
    'overdue_emi',
    'prin_overdue',
    'overdue_int',
    'penal_due',
    'total_overdue',
    'paid_principal',
    'paid_int',
    'penal_paid',
    'collected_amt',
    'payment_date',
    'date_of_emi_missed',
    'date_of_last_payment',
    'credit_score',
    'underwirtting_model',
    'foir'
];

export const handleUpload = async (req, res) => {
    console.log(req.user);

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const result = await processAndInsertData(req.file.path, req.user.id); // Pass req.user.id to the function
        fs.unlinkSync(req.file.path); // Clean up the uploaded file

        if (result.success) {
            res.status(200).send('File uploaded and data inserted into MySQL successfully.');
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
};

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
            if ((header === 'dob' || header === 'first_emi_date'  ||header === 'last_due_date' || header === 'last_emi_date' ||header === 'disbursal_date' || header === 'date_of_emi_missed' || header === 'date_of_last_emi_paid' ||header === 'date_of_last_payment'|| header === 'payment_date') && typeof cellValue === 'number') {
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

    const tableName = `tbl_master${userId}`;
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
