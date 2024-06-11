import bcrypt from "bcrypt";
import db from "../config/db.js";
import userTypes from "./userTypes.js";
import NBFCcolumns from "./masterColumns.js";
// import express from 'express';
// import path from 'path';

import jwt from "jsonwebtoken";
import Joi from "joi";
import fs from "fs";
import { UploadOnCLoudinary } from '../utils/cloudinary.js';


export const userRegister = async (req, res, next) => {
    try {


        const updateSchema = Joi.object({
            // school_id: Joi.number().min(1).required(),
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            incorporation_date: Joi.date().required(),
            registration_number: Joi.string().required(),
            gst_number: Joi.string().required(),
            license_number: Joi.string().required(),
            nbfc_type: Joi.array().items(Joi.string()).required(),
            mobile: Joi.number().required(),
            registered_address: Joi.string().required(),
            office_address: Joi.string().required(),
            website: Joi.string().min(6),
            fax_number: Joi.string().min(4),
            ceo: Joi.string().min(2),
            cfo: Joi.string().min(2),
            compliance_officer: Joi.string().min(2),
            number_of_office: Joi.number().min(1),
            language_covered: Joi.string().min(4),
            key_service: Joi.string().min(2),
            clientele: Joi.string().min(2),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            type: Joi.string().min(4).required(),
            // Add validation for other fields you want to update
        });//.or("name", "email", "password", "mobile", "status")

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 6 char.`, errorType: errorType });

            }
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }



        const existingUserQuery = "SELECT email FROM tbl_users WHERE email = ?";
        db.query(existingUserQuery, [req.body.email], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            if (result.length) {
                return res.status(409).send({ success: false, message: "User Already Exists" });
            }

            try {

                await insertUser(req, res);
            } catch (hashError) {
                console.error("Error occurred while hashing password:", hashError);
                return res.status(500).send({ success: false, message: "Error occurred while hashing password." });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};
export const userLogin = async (req, res, next) => {
    try {

        const updateSchema = Joi.object({
            email: Joi.string().email().required(),
            password: Joi.string().required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 6 char.`, errorType: errorType });

            }
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const { email, password } = req.body;
        const userQuery = "SELECT isActive,nbfc_name,id, password, email,profile,type FROM tbl_users WHERE email = ?";
        db.query(userQuery, [email], async (error, result) => {

            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            if (!result.length) {
                return res.status(409).send({ success: false, message: "User Not Found" });
            }

            const user = result[0];
            // if (user.type.toLowerCase() == "super admin") {
            //     return res.status(400).send({ success: false, message: "You are not allowed to loggedIn here" });
            // }
            if (!user.isActive) {
                return res.status(400).send({ success: false, message: "User Not Active" });
            }
            try {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.status(401).send({ success: false, message: "Invalid Password." });
                }
                const token = jwt.sign({ id: user.id, nbfc_name: user.nbfc_name, email: user.email, type: user.type, profile: user.profile }, process.env.SECRET_KEY, {
                    expiresIn: process.env.TOKENEXPIN
                });
                return res.status(200).send({ success: true, token });
            } catch (hashError) {
                console.error("Error occurred while comparing password:", hashError);
                return res.status(500).send({ success: false, message: "Error occurred while comparing password." });
            }
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};
export const UpdateUserProfile = async (req, res, next) => {
    try {


        updateProfile(req, res);

    } catch (error) {
        console.error('Error occurred while updating user:', error);
        return res.status(500).send({ success: false, message: 'Internal server error.' });
    }
};
export const deleteUser = async (req, res) => {
    try {
        const updateSchema = Joi.object({
            userId: Joi.number().min(2).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const { userId } = req.body;
        if (!getUserById(userId)) {
            return res.status(401).send({ success: false, message: "User Not Found" });
        }
        const deleteQuery = "update tbl_users set isActive=0,updated_by=? where id=?";

        db.query(deleteQuery, [req.user.id, userId], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({
                success: true,
                message: "User Deactivated Successfully",
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const getAgents = async (req, res) => {
    try {

        const { id, type } = req.user;
        const { active } = req.body;
        if ((type === "employee") || (type === "agency")) {
            return res.status(400).send({ success: false, message: "Cant Access Agent Module." });
        }
        let filterQuery = "";
        if (active != '' && active != undefined) {
            filterQuery += ` and isActive=${active}`;
        }


        const Query = `select * from tbl_users where created_by=? and type='agency' ${filterQuery}`;

        db.query(Query, [id], async (error, result) => {
            console.log(Query, [id])
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            const sanitizedResult = result.map(user => {
                const { password, ...sanitizedUser } = user;
                return sanitizedUser;
            });
            return res.status(200).send({
                success: true,
                message: "Agents fetched",
                data: sanitizedResult
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const getEmployees = async (req, res) => {
    try {
        const { id, type } = req.user;
        let { active, agencyId } = req.body;
        if ((type === "employee")) {
            console.error("Cant Access Employee Level", error);
            return res.status(400).send({ success: false, message: "Cant Access Employee Module." });
        }
        if (type === "agency") {
            agencyId = id;
        }
        let filterQuery = "";
        if (active != '' && active != undefined) {
            filterQuery += ` and isActive= ${active}`;
        }


        const Query = `select * from tbl_users where created_by=? and type='employee' ${filterQuery}`;

        db.query(Query, [agencyId], async (error, result) => {
            console.log(Query, [agencyId])
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            const sanitizedResult = result.map(user => {
                const { password, ...sanitizedUser } = user;
                return sanitizedUser;
            });
            return res.status(200).send({
                success: true,
                message: "Employee fetched",
                data: sanitizedResult
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}

export const getNBFC = async (req, res) => {
    try {

        const { id, type } = req.user;
        const { active } = req.body;
        if ((type === "employee") || (type === "agency") || (type === "nbfc")) {
            return res.status(400).send({ success: false, message: "Cant Access Agent Module." });
        }
        let filterQuery = "";
        if (active != '' && active != undefined) {
            filterQuery += ` and isActive=${active}`;
        }


        const Query = `select * from tbl_users where  type='nbfc' ${filterQuery} order by date(created_date)`;

        db.query(Query, [id], async (error, result) => {
            console.log(Query, [id])
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            const sanitizedResult = result.map(user => {
                const { password, ...sanitizedUser } = user;
                return sanitizedUser;
            });
            return res.status(200).send({
                success: true,
                message: "NBFC fetched",
                data: sanitizedResult
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const getUserProfile = async (req, res, next) => {
    try {


        const updateSchema = Joi.object({

            userId: Joi.number().min(1).required(),

        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            return res.status(400).json({ success: false, message: `${errorMessage}` });
        }
        try {

            const userData = await getUserById(req.body.userId);
            userData.nbfc = await getUserCount(req.body.userId, 'nbfc', req.user.type);
            userData.agent = await getUserCount(req.body.userId, 'agency', req.user.type);
            userData.employee = await getUserCount(req.body.userId, 'employee', req.user.type);
            // const profileFullPath = `uploads/profile/${userData.profile}`;
            // userData.fullPath = profileFullPath;

            return res.status(200).send({
                success: true,
                message: "User Found",
                data: userData
            });
        } catch (hashError) {
            console.error("Error occurred while hashing password:", hashError);
            return res.status(500).send({ success: false, message: "Error occurred while hashing password." });
        }

    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};
export const testing = async (req, res, next) => {

    const allowedFields = ['Profile', 'Pan', 'Adhaar', 'PoliceVerification', 'DRA'];
    const uploadResults = {};

    // Check if any files are uploaded
    const noFilesUploaded = allowedFields.every(field => !req.files[field]);
    if (noFilesUploaded) {
        return res.status(400).json({ message: 'No files uploaded' });
    }

    try {
        for (const field of allowedFields) {
            if (req.files[field]) {
                const filePath = req.files[field][0].path;
                uploadResults[field] = await UploadOnCLoudinary(filePath);
            }
        }

        res.status(200).json({ message: 'Files uploaded successfully', results: uploadResults });
    } catch (error) {
        console.error('Error uploading files:', error);
        res.status(500).json({ message: 'File upload failed' });
    }
};


// export const testing = async (req, res, next) => {
//     console.log(req.files);

//     if (!req.files || (!req.files.file && !req.files.Pan && !req.files.Adhaar)) {
//         return res.status(400).json({ message: 'No files uploaded' });
//     }

//     try {
//         const uploadResults = {};

//         if (req.files.file) {
//             const filePath = req.files.file[0].path;
//             uploadResults.file = await UploadOnCLoudinary(filePath);
//         }

//         if (req.files.Pan) {
//             const panPath = req.files.Pan[0].path;
//             uploadResults.Pan = await UploadOnCLoudinary(panPath);
//         }

//         if (req.files.Adhaar) {
//             const adhaarPath = req.files.Adhaar[0].path;
//             uploadResults.Adhaar = await UploadOnCLoudinary(adhaarPath);
//         }

//         res.status(200).json({ message: 'Files uploaded successfully', results: uploadResults });
//     } catch (error) {
//         console.error('Error uploading files:', error);
//         res.status(500).json({ message: 'File upload failed' });
//     }
// };









// ALL FUNCTIONS
const updateProfile = async (req, res) => {
    let profile = '';
    if (req.files.file) {
        if (req.user.profile != "default.jpg") {
            fs.unlink(`uploads/profile/${req.files.file[0].filename}`, (err) => {
                if (err) throw err;
            });
        }
        profile = req.files.file[0].filename;
    } else {
        profile = req.user.profile;
    }
    const { email } = req.body;
    const updateData = req.body
    const userData = req.user;
    const user = await getUserById(userData.id);

    if (!user) {
        return res.status(404).send({ success: false, message: 'User not found.' });
    }

    if (email && email !== user.email) {
        const existingUser = await getUserByEmail(email);
        if (existingUser && existingUser.id !== userData.id) {
            return res.status(400).send({ success: false, message: 'Email already exists.' });
        }
    }
    const setClause = Object.keys(updateData).map(field => `${field} = ?`).join(", ");
    const updateQuery = `UPDATE tbl_users SET ${setClause} WHERE id = ?`;
    const updateValues = [...Object.values(updateData), req.user.id];

    db.query(updateQuery, updateValues, (error, result) => {
        console.log(updateQuery, updateValues); // Logging the query and values for debugging
        if (error) {
            console.error('Error occurred while updating user:', error);
            return res.status(500).send({ success: false, message: 'Database error.' });
        }

        const tokenPayload = {
            id: req.user.id,
            email: req.user.email,  // Assuming email is part of req.user
            profile: req.user.profile,  // Assuming profile is part of req.user
            type: req.user.type,
            nbfc_name: req.user.nbfc_name  // Assuming nbfc_name is part of req.user
        };
        const token = jwt.sign(tokenPayload, process.env.SECRET_KEY, {
            expiresIn: process.env.TOKENEXPIN
        });

        return res.status(200).send({ success: true, message: 'User updated successfully.', token: token });
    });


}
async function getUserById(id) {
    const query = "SELECT * FROM tbl_users WHERE id = ?";
    return new Promise((resolve, reject) => {
        db.query(query, [id], (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length ? result[0] : null);
            }
        });
    });
}
async function getUserByEmail(email) {
    const query = "SELECT * FROM tbl_users WHERE email = ?";
    return new Promise((resolve, reject) => {
        db.query(query, [email], (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length ? result[0] : null);
            }
        });
    });
}
function checkTypePermission(userType, addingType) {
    const lowerUserType = userType.toLowerCase();
    if (lowerUserType === 'agency' && (addingType === 'nbfc' || addingType === 'agency' || addingType === 'super admin')) {
        return false;
    }
    if (lowerUserType === 'nbfc' && (addingType === 'nbfc' || addingType === 'super admin')) {
        return false;
    }
    if (lowerUserType === 'super admin' && addingType === 'agency') {
        return false;
    }
    if (lowerUserType === 'employee' && addingType !== 'employee') {
        return false;
    }
    return true;
}
async function insertUser(req, res) {
    try {
        const lowerType = req.body.type.toLowerCase();

        if (!userTypes.includes(lowerType)) {
            return res.status(400).send({ success: false, message: "Invalid User Type" });
        }

        if (!checkTypePermission(req.user.type, lowerType)) {
            return res.status(400).send({ success: false, message: "You Are Not Allowed To Add This UserType" });
        }

        const hashPassword = await bcrypt.hash(req.body.password, 10);
        req.body.password = hashPassword;
        const insertUserQuery = `INSERT INTO tbl_users (created_by, ${Object.keys(req.body).join(", ")}) VALUES (?, ${Array(Object.keys(req.body).length).fill("?").join(", ")})`;
        const insertUserValues = [req.user.id, ...Object.values(req.body)];

        db.query(insertUserQuery, insertUserValues, async (error, result) => {
            if (error) {
                console.error("Error occurred while inserting user into the database:", error);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            if (lowerType === "nbfc") {
                const insertedId = result.insertId;

                try {
                    await createNewTable(`tbl_master${insertedId}`);
                } catch (createTableError) {
                    console.error("Error occurred while creating new table:", createTableError);
                    return res.status(500).send({ success: false, message: "Error creating table for NBFC." });
                }
            }

            return res.status(200).send({ success: true, message: "User Registered Successfully" });
        });
    } catch (error) {
        console.error("Error occurred while processing the request:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
}

async function createNewTable(tableName) {
    return new Promise((resolve, reject) => {
        // Ensure the table name is sanitized
        let sanitizedTableName = db.escapeId(tableName); // This helps prevent SQL injection
        let columns = NBFCcolumns;
        let SQL = `CREATE TABLE ${sanitizedTableName} (${columns})`;

        db.query(SQL, (error, result) => {
            if (error) {
                return reject(error);
            }
            resolve(result);
        });
    });
}

async function getUserCount(id, type, loggedInUserType) {
    console.log(loggedInUserType);
    let query = "";
    let queryParams = [];

    if (loggedInUserType === "super admin") {
        query = "SELECT count(id) as counts FROM tbl_users WHERE type=?";
        queryParams = [type];
    } else {
        query = "SELECT count(id) as counts FROM tbl_users WHERE created_by = ? and type=?";
        queryParams = [id, type];
    }

    return new Promise((resolve, reject) => {
        db.query(query, queryParams, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length ? result[0] : null);
            }
        });
    });
}




