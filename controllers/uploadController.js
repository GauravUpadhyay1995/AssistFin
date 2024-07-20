import db from '../config/db.js';
import path from 'path';
import xlsx from 'xlsx';
import fs from 'fs';
import Joi from "joi";

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
    console.log(req.file);

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const result = await processAndInsertData(req.file.path, req.user.id); // Pass req.user.id to the function
        fs.unlinkSync(req.file.path); // Clean up the uploaded file

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
export const uploadUnpaidFileData = async (req, res) => {

    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }

    try {
        const result = await processAndInsertUnpaidData(req.file.path, req.user.id);
        const AllocateAgencyResult = AllocateAgency(req.user.branch).then(result => {
            console.log(result); // Log the result
        })
            .catch(error => {
                console.error('Error:', error); // Handle any errors
            });
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
};
const processAndInsertUnpaidData = async (filePath, userId) => {
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

    const tableName = `tbl_unpaid_master${userId}`;
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
const AllocateAgency = async (BranchId) => {
    // Validate BranchId to prevent SQL injection
    if (!Number.isInteger(BranchId)) {
        throw new Error('Invalid BranchId');
    }

    const sql = `SELECT id, state, zone, product_type, dpd_in_days 
                 FROM tbl_unpaid_master${BranchId} WHERE DATE(created_date) = CURDATE()`;

    try {
        // Fetch data from tbl_unpaid_master${BranchId}
        const results = await new Promise((resolve, reject) => {
            db.query(sql, (error, result) => {
                if (error) {
                    reject(error);
                } else {
                    resolve(result);
                }
            });
        });

        // If no data found, return null
        if (results.length === 0) {
            return null;
        }

        // Prepare a list to hold the userIds results
        const userIdsPromises = results.map(async (row) => {
            const { id, state, product_type, dpd_in_days } = row;

            // Convert dpd_in_days to category
            let dpdCategory;
            if (dpd_in_days > 0 && dpd_in_days <= 30) {
                dpdCategory = 1;
            } else if (dpd_in_days >= 31 && dpd_in_days <= 60) {
                dpdCategory = 2;
            } else if (dpd_in_days >= 61 && dpd_in_days <= 90) {
                dpdCategory = 3;
            } else if (dpd_in_days >= 91 && dpd_in_days <= 120) {
                dpdCategory = 4;
            } else if (dpd_in_days >= 121 && dpd_in_days <= 150) {
                dpdCategory = 5;
            } else if (dpd_in_days >= 151 && dpd_in_days <= 180) {
                dpdCategory = 6;
            } else if (dpd_in_days >= 181 && dpd_in_days <= 365) {
                dpdCategory = 7;
            } else {
                dpdCategory = 8;
            }

            // Query to get userId from tbl_pool_allocations
            const selectSql = `
                SELECT userId
                FROM tbl_pool_allocations
                WHERE JSON_CONTAINS(state, ?, '$')
                  AND JSON_CONTAINS(product, ?, '$')
                  AND JSON_CONTAINS(bucket, ?, '$')
            `;

            try {
                // Execute the select query
                const userIds = await new Promise((resolve, reject) => {
                    db.query(selectSql, [`"${state}"`, `"${product_type}"`, `"${dpdCategory}"`], (error, result) => {
                        if (error) {
                            reject(error);
                        } else {
                            resolve(result.map(row => row.userId)); // Extract userId values
                        }
                    });
                });

                if (userIds.length > 0) {
                    // Construct the update query with dynamic table name
                    const updateSql = `UPDATE tbl_unpaid_master${BranchId} SET agency_name = ? WHERE id = ?`;

                    // Execute the update query
                    await new Promise((resolve, reject) => {
                        db.query(updateSql, [userIds.join(', '), id], (error, result) => {
                            console.log(updateSql, [userIds.join(', '), id])
                            if (error) {
                                reject(error);
                            } else {
                                resolve(result);
                            }
                        });
                    });
                }
            } catch (error) {
                console.error('Error querying userId:', error);
                return [];
            }
        });

        // Execute all the userId queries in parallel
        await Promise.all(userIdsPromises);

    } catch (error) {
        console.error('Error fetching data from tbl_unpaid_master:', error);
        throw error;
    }
};





