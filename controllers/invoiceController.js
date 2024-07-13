import bcrypt from "bcrypt";
import Joi from "joi";
import db from "../config/db.js";
import moment from "moment";
import { UploadOnCLoudinary } from '../utils/cloudinary.js';
import { getUserById } from './userController.js'

export const getInvoice = async (req, res, next) => {
    const BucketOptions = [
        { value: '1', label: '0 to 30' },
        { value: '2', label: '31 to 60' },
        { value: '3', label: '61 to 90' },
        { value: '4', label: '91 to 120' },
        { value: '5', label: '121 to 150' },
        { value: '6', label: '151 to 180' },
        { value: '7', label: '181 to 365' },
        { value: '8', label: '>365' }
    ];

    try {
        let conditions = [];
        let allocationString = '';
        let lenderString = '';
        let productString = '';
        let campaignString = '';
        let agencyString = '';
        let group_by = "product_type";

        if (req.body.agency && req.body.agency.length) {
            agencyString = req.body.agency;
            conditions.push(`AND agency_name = '${agencyString}'`);
        }
        if (req.body.allocation && req.body.allocation.length) {
            allocationString = req.body.allocation.map(item => `'${item}'`).join(',');
        }
        if (req.body.lender_id && req.body.lender_id.length) {
            lenderString = req.body.lender_id.map(item => `'${item}'`).join(',');
            conditions.push(`AND approved_nbfc IN (${lenderString})`);
        }
        if (req.body.campaign && req.body.campaign.length) {
            campaignString = req.body.campaign.map(item => `'${item}'`).join(',');
            conditions.push(`AND campaign IN (${campaignString})`);
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
            conditions.push(` and product_type in (${productString})`);
        }

        let toDate = ''
        let fromDate = ''
        let lastDay = '';
        let month = '';
        // start_date means month and end_date means years
        if (req.body.start_date && req.body.end_date) {
            lastDay = new Date(req.body.end_date, req.body.start_date, 0).getDate();
            month = req.body.start_date < 10 ? `0${req.body.start_date}` : req.body.start_date;
            fromDate = `${req.body.end_date}-${month}-01`
            toDate = `${req.body.end_date}-${month}-${lastDay}`
        } else {
            toDate = "2024-04-30";
            fromDate = "2024-04-01";
        }
        conditions.push(` AND payment_date BETWEEN '${fromDate}' AND '${toDate}'`);

        let results = {};

        for (let bucket of BucketOptions) {
            let bucketCondition = '';
            if (bucket.value == '1') {
                bucketCondition = 'between 0 and 30';
            } else if (bucket.value == '2') {
                bucketCondition = 'between 31 and 60';
            } else if (bucket.value == '3') {
                bucketCondition = 'between 61 and 90';
            } else if (bucket.value == '4') {
                bucketCondition = 'between 91 and 120';
            } else if (bucket.value == '5') {
                bucketCondition = 'between 121 and 150';
            } else if (bucket.value == '6') {
                bucketCondition = 'between 151 and 180';
            } else if (bucket.value == '7') {
                bucketCondition = 'between 181 and 365';
            } else if (bucket.value == '8') {
                bucketCondition = ' >365';
            }

            let bucketConditions = [...conditions, ` and dpd_in_days ${bucketCondition}`];

            let QUERY = `SELECT  ${group_by},SUM(pos) AS total_pos,SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN pos ELSE 0 END) AS resolved_pos,ROUND(( SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN pos ELSE 0 END)* 100.0) / SUM(pos), 2) AS percentage_pos FROM tbl_master${req.user.id} WHERE id>0 `;

            if (bucketConditions.length > 0) {
                QUERY += bucketConditions.join(" ");
            }
            QUERY += ` GROUP BY ${group_by}  ORDER BY ${group_by} ASC`;
            console.log(QUERY)
            const queryResult = await new Promise((resolve, reject) => {
                db.query(QUERY, (error, result) => {
                    if (error) {
                        return reject(error);
                    }
                    resolve(result);
                });
            });

            for (let row of queryResult) {
                if (!results[row.product_type]) {
                    results[row.product_type] = {};
                }
                let slabValue = await getSlabByProductId(row.product_type, row.percentage_pos, bucket.value, req.user)

                results[row.product_type][bucket.label] = {
                    total_pos: row.total_pos,
                    resolved_pos: row.resolved_pos,
                    percentage_pos: row.percentage_pos,
                    slabValue: slabValue,
                };
            }
        }
        let agencyDetails = await getUserByName(req.body.agency, req.user.branch)
        let nbfcDetails = await getNBFCDetailsById(req.user.branch)
        let accountDetails = await getAccountDetailsById(agencyDetails.id);
        let penalty = await getPenalty(agencyDetails.id, toDate);
        let isGenerated = await checkInvoice(agencyDetails.id, month, req.body.end_date)

        return res.status(200).send({
            success: 1,
            count: Object.keys(results).length,
            data: results,
            agencyDetails: agencyDetails,
            nbfcDetails: nbfcDetails,
            accountDetails: accountDetails,
            penalty: penalty,
            isGenerated: isGenerated

        });
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};

export const confirmInvoice = async (req, res, next) => {
    db.beginTransaction(async function (err) {
        if (err) {
            console.error("Error beginning transaction:", err);
            return res.status(500).send({ success: false, message: "Database error." });
        }
        try {
            if (!('file' in req.files)) {
                for (const key in req.files) {
                    fs.unlink(`uploads/profile/${req.files[key][0].filename}`, (err) => {
                        if (err) console.error("Error deleting file:", err);
                    });
                }
                return res.status(400).send({ success: false, message: "Mandatory Documents are missing" });
            }
            const ids = req.body.ids;
            const uploadedDoc = await uploadtocloudinary(req, res);
            if (Object.keys(uploadedDoc).length !== 0) {
                for (const key in uploadedDoc) {
                    if (uploadedDoc.hasOwnProperty(key)) {
                        const docquery = `INSERT INTO tbl_invoices (agency_id, month, year, url, created_by, escalation_ids) VALUES (?, ?, ?, ?, ?, ?)`;
                        await executeQuery(docquery, [req.body.agency_id, req.body.month, req.body.year, uploadedDoc[key], req.user.id, ids]);
                    }
                }


                const lastDay = new Date(req.body.year, req.body.month, 0).getDate();
                const month = req.body.month < 10 ? `0${req.body.month}` : req.body.month;
                const invoice_month = `${req.body.year}-${month}-${lastDay}`
                const idsArray = ids.split(',');

                const query = `update  tbl_escalations set invoice_month=? where id in (${idsArray.join(',')})`;
                await executeQuery(query, [invoice_month, ids]);

                db.commit(function (err) {
                    if (err) {
                        console.error("Error committing transaction:", err);
                        return res.status(500).send({ success: false, message: "Database error." });
                    }
                    return res.status(200).send({ success: true, message: "Invoice generated successfully" });
                });
            } else {
                throw new Error("No documents uploaded");
            }
        } catch (error) {
            db.rollback(function () {
                console.error("Error occurred in transaction:", error);
                return res.status(500).send({ success: false, message: "Database error." });
            });
        }
    });
}
export const changeInvoiceStatus = async (req, res, next) => {
    const updateSchema = Joi.object({
        id: Joi.number().min(1).required(),
        status: Joi.number().min(0).required(),
        ids: Joi.string().min(0).required(),
    });
    const { error } = updateSchema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(", ");
        const errorType = error.details[0].type;
        return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
    }

    const sql = `update tbl_invoices set approved=? , approved_by=? where id =?`;
    const result = await executeQuery(sql, [req.body.status, req.user.id, req.body.id]);


    if (req.body.status == 2) {
        const idsArray = req.body.ids.split(',');

        const updateEscalation = `update tbl_escalations set invoice_month=null where id in (${idsArray.join(',')})`;
        const result1 = await executeQuery(updateEscalation, [req.body.ids]);


    }

    return res.status(200).json({ success: true, message: `Updated` });



}

export const deleteInvoice = async (req, res, next) => {
    const updateSchema = Joi.object({
        id: Joi.number().min(1).required(),
        status: Joi.number().min(0).required(),
        escalation_ids: Joi.string().min(0).required(),
    });
    const { error } = updateSchema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(", ");
        const errorType = error.details[0].type;
        return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
    }
    try {
        const sql = `update tbl_invoices set isActive=0  where id =?`;
        const result = await executeQuery(sql, [req.body.id]);
        const idsArray = req.body.escalation_ids.split(',');

        const updateEscalationIDS = `update tbl_escalations set invoice_month=null  where id in (${idsArray.join(',')})`;
        const queryresult = await new Promise((resolve, reject) => {
            db.query(updateEscalationIDS, (error, result) => {
                console.log(updateEscalationIDS)

                if (error) {
                    console.error("Error occurred in transaction:", error);
                    return reject(error);

                }
                resolve(result);
            });
        });

    } catch (error) {
        console.error("Error occurred in transaction:", error);
        return res.status(500).send({ success: false, message: "Database error." });
    }

    return res.status(200).json({ success: true, message: 'Updated' });

}
export const getPayment = async (req, res, next) => {
    const updateSchema = Joi.object({
        agency: Joi.number().min(1).required(),
        month: Joi.array().items(Joi.number().min(1).max(12)).required(),
        year: Joi.number().min(1).required(),
    });
    const { error } = updateSchema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(", ");
        const errorType = error.details[0].type;
        return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
    }

    const { agency, month, year } = req.body;

    try {
        const sql = `SELECT 
    i.*, 
    DATE_FORMAT(i.created_date, '%d-%m-%Y %h:%i:%s %p') as created_date,

    u1.nbfc_name AS created_by,
    u2.nbfc_name AS approved_by,
    u3.nbfc_name AS agency_name
FROM 
    tbl_invoices i
LEFT JOIN 
    tbl_users u1 ON i.created_by = u1.id
LEFT JOIN 
    tbl_users u2 ON i.approved_by = u2.id 
LEFT JOIN 
    tbl_users u3 ON i.agency_id = u3.id
    
    where i.agency_id=? and i.isActive=1 and i.month in (?) and i.year=? `;
        const queryResult = await new Promise((resolve, reject) => {
            db.query(sql, [agency, month, year], (error, result) => {
                if (error) {
                    console.error("Error executing SQL query:", error);
                    return reject(error);
                }
                resolve(result);
            });
        });


        return res.status(200).json({ success: true, data: queryResult });
    } catch (err) {
        console.error("Database error:", err);
        return res.status(500).json({ success: false, message: "Internal Server Error" });
    }
}

const getSlabByProductId = async (productName, percentage, bucketId, user) => {
    try {
        const sql = `
            SELECT tbl_commercial_rule.offer_percentage,tbl_commercial_rule.min_percentage,tbl_commercial_rule.fixed_percentage
            FROM tbl_commercial_rule
            INNER JOIN tbl_products ON tbl_commercial_rule.product_id = tbl_products.id
            WHERE tbl_commercial_rule.branch_id = tbl_products.branch
              AND tbl_commercial_rule.branch_id = 78
              AND tbl_products.product = '${productName}'  
              AND bucket_id = ${bucketId}
              AND min_percentage = (
                  SELECT MAX(min_percentage)
                  FROM tbl_commercial_rule
                  WHERE branch_id = ${user.branch}
                    AND product_id = tbl_products.id
                    AND bucket_id = ${bucketId}
                    AND min_percentage <= ${percentage}
                    and isApproved=1
              );
        `;


        const queryResult = await new Promise((resolve, reject) => {
            db.query(sql, (error, result) => {
                if (error) {
                    console.error("Error executing SQL query:", error);
                    return reject(error);
                }
                resolve(result[0]);
            });
        });

        return queryResult;
    } catch (error) {
        console.error("Error occurred:", error);
        throw error;  // Propagate the error for proper handling in the calling function
    }
}
async function checkInvoice(agency_id, month, year) {
    const query = "SELECT id,url,approved FROM tbl_invoices WHERE agency_id = ? AND month = ? and year=? and isActive=1 and (approved=1 or approved=0)";
    return new Promise((resolve, reject) => {
        db.query(query, [agency_id, month, year], (error, result) => {
            if (error) {
                reject(error);
            } else {
                // Omit 'password' field from the result object
                const userWithoutPassword = result.length ? result[0] : null;
                resolve(userWithoutPassword);
            }
        });
    });
}
async function getUserByName(name, branch) {
    const query = "SELECT * FROM tbl_users WHERE nbfc_name = ? AND branch = ?";
    return new Promise((resolve, reject) => {
        db.query(query, [name, branch], (error, result) => {
            if (error) {
                reject(error);
            } else {
                // Omit 'password' field from the result object
                const userWithoutPassword = result.length ? omitPassword(result[0]) : null;
                resolve(userWithoutPassword);
            }
        });
    });
}
async function getNBFCDetailsById(branch) {
    const query = "SELECT * FROM tbl_users WHERE id = ? and branch=?";
    return new Promise((resolve, reject) => {
        db.query(query, [branch, branch], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const userWithoutPassword = result.length ? omitPassword(result[0]) : null;
                resolve(userWithoutPassword);
            }
        });
    });
}
async function getAccountDetailsById(agencyId) {
    const query = "SELECT * FROM tbl_account_details WHERE agency = ?";
    return new Promise((resolve, reject) => {
        db.query(query, [agencyId], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const userWithoutPassword = result.length ? omitPassword(result[0]) : null;
                resolve(userWithoutPassword);
            }
        });
    });
}



// Helper function to omit 'password' field from user object
function omitPassword(user) {
    if (!user) return null;
    const { password, text_password, ...userWithoutPassword } = user;
    return userWithoutPassword;
}

async function getPenalty(agency_id, toDate) {
    const query = "SELECT *,DATE_FORMAT(fromDate, '%d-%m-%Y') as fromDate,DATE_FORMAT(toDate, '%d-%m-%Y') as toDate FROM `tbl_escalations` where date(toDate)<? and waiverStatus=1 and invoice_month is NULL and agency_id=?;";
    return new Promise((resolve, reject) => {
        db.query(query, [toDate, agency_id], (error, result) => {
            if (error) {
                reject(error);
            } else {
                const user = result.length ? result : null;
                resolve(user);
            }
        });
    });
}

async function uploadtocloudinary(req, res) {
    const allowedFields = ['Profile', 'Pan', 'Adhaar', 'PoliceVerification', 'DRA', 'COI', 'GSTCertificate', 'Empannelment', 'SignedAgreement', 'file'];
    const uploadResults = {};

    // Check if any files are uploaded
    const noFilesUploaded = allowedFields.every(field => !req.files[field]);
    if (noFilesUploaded) {
        console.log("No files uploaded.");
        return "no files found";
    }

    try {
        for (const field of allowedFields) {
            if (req.files[field]) {
                const filePath = req.files[field][0].path;
                console.log(`Uploading ${field} from path ${filePath}`);
                uploadResults[field] = await UploadOnCLoudinary(filePath);
                console.log(`Uploaded ${field}: `, uploadResults[field]);
            }
        }

        return uploadResults;
    } catch (error) {
        console.error("Error occurred during file upload to Cloudinary:", error);
        return false;
    }
}



// Function to execute query
function executeQuery(query, values) {
    return new Promise((resolve, reject) => {
        db.query(query, values, (error, result) => {
            if (error) {
                return reject(error);
            }
            console.log(result)
            resolve(result);
        });
    });
}