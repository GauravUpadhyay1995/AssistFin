import db from "../config/db.js";
import Joi from "joi";
import fs from "fs";
import { format, toDate } from 'date-fns';
import { UploadOnCLoudinary } from '../utils/cloudinary.js';

const changeDateFormate = async (getDAte) => {
    const dob = new Date(getDAte);
    return format(dob, 'yyyy-MM-dd');
}

export const raiseEscalation = async (req, res, next) => {
    try {


        const updateSchema = Joi.object({
            loan_id: Joi.string().min(2).max(50).optional(),
            agency_id: Joi.number().min(1).required(),
            fromDate: Joi.date().required(),
            toDate: Joi.date().required(),
            comments: Joi.string().min(4).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const fromDate = await changeDateFormate(req.body.fromDate);
        const toDate = await changeDateFormate(req.body.toDate);
        req.body.fromDate = fromDate;
        req.body.toDate = toDate;

        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {

                const fields = Object.keys(req.body).join(", ");
                const placeholders = Array(Object.keys(req.body).length).fill("?").join(", ");
                const insertUserQuery = `INSERT INTO tbl_escalations (created_by,branch, ${fields}) VALUES (?,?, ${placeholders})`;
                const insertUserValues = [req.user.id, req.user.branch, ...Object.values(req.body)];
                const userInsertResult = await executeQuery(insertUserQuery, insertUserValues);
                const insertedId = userInsertResult.insertId;
                db.commit(function (err) {
                    if (err) {
                        console.error("Error committing transaction:", err);
                        return res.status(500).send({ success: false, message: "Database error." });
                    }

                });


                const uploadedDoc = await uploadtocloudinary(req, res);
                if (Object.keys(uploadedDoc).length !== 0 && uploadedDoc != false) {
                    for (const key in uploadedDoc) {
                        if (uploadedDoc.hasOwnProperty(key)) {
                            const docquery = `INSERT INTO tbl_escalation_reply (escalation_id,comments,attachments,created_by,branch) VALUES (?,?,?,?,?)`;
                            const docInsertResult = await executeQuery(docquery, [insertedId, req.body.comments, uploadedDoc[key], req.user.id, req.user.branch]);

                            const updateQuery = `update tbl_escalations set file=? where id = ?`;
                            const updatedResult = await executeQuery(updateQuery, [uploadedDoc[key], insertedId]);
                        }
                    }
                } else {
                    db.rollback(function () {
                        console.error("Error occurred in transaction:", error);
                        return res.status(500).send({ success: false, message: "Database error." });
                    });
                }
                return res.status(200).send({ success: true, message: "Escalation Raised" });
            } catch (error) {
                // Rollback transaction if any error occurs
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};
export const openedEscalationForNBFC = async (req, res, next) => {
    try {
        let status = req.body.status;
        let extra = '';
        if (req.user.type === "agency" || req.user.type === "employee") {
            extra = ` where esc.agency_id=${req.user.isAgency}`;
        }

        const sql = `SELECT 
    esc.*, 
    DATE_FORMAT(esc.created_date, '%d-%m-%Y %h:%i:%s %p') as created_date,
     DATE_FORMAT(esc.updated_date, '%d-%m-%Y %h:%i:%s %p') as updated_date,
    u1.nbfc_name AS created_by,
    u2.nbfc_name AS updated_by,
    u3.nbfc_name AS agency_name,
    COUNT(*) AS duplicacy_count
FROM 
    (
        SELECT DISTINCT agency_id, id
        FROM tbl_escalations
        WHERE branch = 78 AND status = ${status}
    ) AS distinct_agencies
JOIN 
    tbl_escalations esc ON distinct_agencies.id = esc.id
LEFT JOIN 
    tbl_users u1 ON esc.created_by = u1.id
LEFT JOIN 
    tbl_users u2 ON esc.updated_by = u2.id 
LEFT JOIN 
    tbl_users u3 ON esc.agency_id = u3.id 
    ${extra} 
GROUP BY 
    esc.agency_id
ORDER BY 
    esc.id DESC;
`;
        const Result = await executeQuery(sql, [req.user.branch]);

        return res.status(200).send({ success: true, message: "Escalation Fetched", data: Result });

    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

export const getEscalationByAgencyId = async (req, res, next) => {
    try {
        const sql = `SELECT 
                        e.comments as ESC_COMMENTS, 
                        r.*,
                        DATE_FORMAT(r.created_date, '%d-%m-%Y %h:%i:%s %p') as created_date
                     FROM 
                        tbl_escalations e
                     LEFT JOIN 
                        tbl_escalation_reply r 
                     ON 
                        e.id = r.escalation_id
                     WHERE  
                        r.escalation_id IN (SELECT id FROM tbl_escalations WHERE agency_id = ? and status=?)
                     ORDER BY 
                        r.created_date DESC;`;
        const result = await executeQuery(sql, [req.body.agency_id, req.body.status]);

        // Transform the result into the desired format
        const transformedData = result.reduce((acc, row) => {
            const commentKey = row.ESC_COMMENTS;

            if (!acc[commentKey]) {
                acc[commentKey] = [];
            }

            acc[commentKey].push({
                id: row.id,
                comments: row.comments,
                isAgency: row.isAgency,
                escalation_id: row.escalation_id,
                created_date: row.created_date,
                attachments: row.attachments
            });

            return acc;
        }, {});

        return res.status(200).send({ success: true, message: "Escalation Fetched", data: transformedData });

    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

export const getClosedEscalationById = async (req, res, next) => {
    try {
        const sql = `SELECT * , DATE_FORMAT(fromDate, '%d-%m-%Y %h:%i:%s %p') as fromDate,
     DATE_FORMAT(toDate, '%d-%m-%Y %h:%i:%s %p') as toDate, DATE_FORMAT(created_date, '%d-%m-%Y %h:%i:%s %p') as created_date,
     DATE_FORMAT(updated_date, '%d-%m-%Y %h:%i:%s %p') as updated_date from tbl_escalations where id=?`;
        const result = await executeQuery(sql, [req.body.escalation_id]);
        return res.status(200).send({ success: true, message: "Escalation Fetched", data: result });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

export const replyEscalation = async (req, res, next) => {
    try {


        const updateSchema = Joi.object({

            escalation_id: Joi.number().min(1).required(),
            comments: Joi.string().min(4).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }


        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {
                const isAgency = req.user.isAgency >= 1 ? 1 : 0;

                const fields = Object.keys(req.body).join(", ");
                const placeholders = Array(Object.keys(req.body).length).fill("?").join(", ");
                const insertUserQuery = `INSERT INTO tbl_escalation_reply (created_by,branch,isAgency, ${fields}) VALUES (?,?,?, ${placeholders})`;
                const insertUserValues = [req.user.id, req.user.branch, isAgency, ...Object.values(req.body)];
                const userInsertResult = await executeQuery(insertUserQuery, insertUserValues);
                const insertedId = userInsertResult.insertId;
                db.commit(function (err) {
                    if (err) {
                        console.error("Error committing transaction:", err);
                        return res.status(500).send({ success: false, message: "Database error." });
                    }

                });


                if (req.files !== undefined && Object.keys(req.files).length === 1) {
                    const uploadedDoc = await uploadtocloudinary(req, res);
                    if (uploadedDoc != false && Object.keys(uploadedDoc).length !== 0) {
                        for (const key in uploadedDoc) {
                            if (uploadedDoc.hasOwnProperty(key)) {
                                const docquery = `update tbl_escalation_reply set attachments=?`;
                                const docInsertResult = await executeQuery(docquery, [uploadedDoc[key], insertedId]);


                            }
                        }
                    } else {
                        db.rollback(function () {
                            console.error("Error occurred in transaction:", error);
                            return res.status(500).send({ success: false, message: "Database error." });
                        });
                    }
                }
                return res.status(200).send({ success: true, message: "Escalation Raised" });


            } catch (error) {
                // Rollback transaction if any error occurs
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }

};

export const closeEscalation = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            closeOption: Joi.string().min(1).required(),
            penalityOption: Joi.number().min(0).optional(),
            penality: Joi.number().min(0).optional(),
            message: Joi.string().min(4).required(),
            escalation_id: Joi.number().min(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const { penality, penalityOption, message, closeOption, escalation_id } = req.body;

        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {
                const query = `UPDATE tbl_escalations SET penalty=?, penalty_type=?, final_comments=?, updated_by=?, status=? WHERE id=?`;
                await executeQuery(query, [penality, penalityOption, message, req.user.id, closeOption, escalation_id]);

                db.commit(function (err) {
                    if (err) {
                        db.rollback(function () {
                            console.error("Error committing transaction:", err);
                            return res.status(500).send({ success: false, message: "Database error." });
                        });
                    } else {
                        return res.status(200).send({ success: true, message: "Escalation Closed" });
                    }
                });

            } catch (error) {
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

const getCurrentDateTime = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Months are 0-based
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};
export const escalationWaiverRequest = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({

            waiver: Joi.number().min(1).optional(),
            escalation_id: Joi.number().min(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const { waiver, escalation_id } = req.body;

        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {


                const currentDateTime = getCurrentDateTime();
                const query = `UPDATE tbl_escalations SET waiver_request=?, waiver_requested_by=?, waiver_created_date=? WHERE id=?`;
                await executeQuery(query, [waiver, req.user.id, currentDateTime, escalation_id]);

                db.commit(function (err) {
                    if (err) {
                        db.rollback(function () {
                            console.error("Error committing transaction:", err);
                            return res.status(500).send({ success: false, message: "Database error." });
                        });
                    } else {
                        return res.status(200).send({ success: true, message: "Escalation Closed" });
                    }
                });

            } catch (error) {
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

export const escalationWaiverApprove = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({

            statusID: Joi.number().min(0).optional(),
            escalation_id: Joi.number().min(1).required(),
            waiver: Joi.number().when('statusID', {
                is: 2,
                then: Joi.number().min(0).required(),
                otherwise: Joi.number().min(1).required()
            })
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const { escalation_id, statusID } = req.body;
        req.body.waiver = statusID == 2 ? 0 : (statusID == 0 ? 0 : req.body.waiver);

        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {


                const currentDateTime = getCurrentDateTime();
                const query = `UPDATE tbl_escalations SET waiver_approved=?,waiverStatus=?, waiver_approved_by=?, waiver_approved_date=? WHERE id=?`;
                await executeQuery(query, [req.body.waiver, statusID, req.user.id, currentDateTime, escalation_id]);

                db.commit(function (err) {
                    if (err) {
                        db.rollback(function () {
                            console.error("Error committing transaction:", err);
                            return res.status(500).send({ success: false, message: "Database error." });
                        });
                    } else {
                        return res.status(200).send({ success: true, message: "Escalation Closed" });
                    }
                });

            } catch (error) {
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};


async function uploadtocloudinary(req, res) {
    const allowedFields = ['attachment'];
    const uploadResults = {};

    // Check if any files are uploaded
    const noFilesUploaded = allowedFields.every(field => !req.files[field]);
    if (noFilesUploaded) {
        console.log("No files uploaded.");
        return false;
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
            resolve(result);
        });
    });
}









