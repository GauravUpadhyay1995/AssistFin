import bcrypt from "bcrypt";
import db from "../config/db.js";
import userTypes from "./userTypes.js";
import NBFCcolumns from "./masterColumns.js";


import jwt from "jsonwebtoken";
import Joi from "joi";
import fs from "fs";
import { format } from 'date-fns';
import { UploadOnCLoudinary } from '../utils/cloudinary.js';

const changeDateFormate = async (getDAte) => {
    const dob = new Date(getDAte);
    return format(dob, 'yyyy-MM-dd');
}

export const addAgencyEmployee = async (req, res, next) => {
    try {

        const updateSchema = Joi.object({
            isAgency: Joi.number().min(1).required(),
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            employeeID: Joi.string().min(2).max(50).required(),
            mobile: Joi.number().required(),
            dob: Joi.date().required(),
            type: Joi.string().min(4).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 16 char.`, errorType: errorType });

            }
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const changedDb = await changeDateFormate(req.body.dob);
        req.body.dob = changedDb;

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
export const addNbfcEmployee = async (req, res, next) => {
    try {

        const updateSchema = Joi.object({
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            type: Joi.string().min(4).required(),
            // Add validation for other fields you want to update
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 16 char.`, errorType: errorType });

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

                db.beginTransaction(async function (err) {
                    if (err) {
                        console.error("Error beginning transaction:", err);
                        return res.status(500).send({ success: false, message: "Database error." });
                    }

                    try {
                        // Insert user
                        req.body.branch = req.user.branch;
                        const hashPassword = await bcrypt.hash(req.body.password, 10);
                        req.body.text_password = req.body.password;
                        req.body.password = hashPassword;

                        const fields = Object.keys(req.body).join(", ");
                        const placeholders = Array(Object.keys(req.body).length).fill("?").join(", ");
                        const insertUserQuery = `INSERT INTO tbl_users (created_by, ${fields}) VALUES (?, ${placeholders})`;
                        const insertUserValues = [req.user.id, ...Object.values(req.body)];
                        const userInsertResult = await executeQuery(insertUserQuery, insertUserValues);
                        db.commit(function (err) {
                            if (err) {
                                console.error("Error committing transaction:", err);
                                return res.status(500).send({ success: false, message: "Database error." });
                            }
                            return res.status(200).send({ success: true, message: "User Registered Successfully" });
                        });
                    } catch (error) {
                        // Rollback transaction if any error occurs
                        db.rollback(function () {
                            console.error("Error occurred in transaction:", error);
                            return res.status(500).send({ success: false, message: "Database error." });
                        });
                    }
                });
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
export const addSuperAdminEmployee = async (req, res, next) => {
    try {

        const updateSchema = Joi.object({
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            type: Joi.string().min(4).required(),
            // Add validation for other fields you want to update
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 16 char.`, errorType: errorType });

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
export const addAgency = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            account_number: Joi.string()
                .length(10)
                .max(20)
                .pattern(/^\d+$/)
                .required()
                .messages({
                    'string.pattern.base': 'account_number must be a number',
                    'string.length': 'account_number must be at least 10 digits',
                    'string.max': 'account_number must be at most 20 digits',
                }),
            ifsc_code: Joi.string().min(8).max(50).required(),
            bank_branch: Joi.string().min(2).max(50).required(),
            bank_name: Joi.string().min(2).max(50).required(),
            beneficiary_name: Joi.string().min(2).max(50).required(),
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            incorporation_date: Joi.string().required(),
            registration_number: Joi.string().required(),
            gst_number: Joi.string().required(),
            license_number: Joi.string().required(),
            nbfc_type: Joi.string().required(),
            mobile: Joi.number().required(),
            registered_address: Joi.string().required(),
            office_address: Joi.string().allow('').required(),
            website: Joi.string().min(6).allow('').optional(),
            fax_number: Joi.string().min(4).allow('').optional(),
            ceo: Joi.string().min(2).allow('').optional(),
            cfo: Joi.string().min(2).allow('').optional(),
            compliance_officer: Joi.string().min(2).allow('').optional(),
            number_of_office: Joi.number().min(1).allow('').optional(),
            language_covered: Joi.string().min(4).allow('').optional(),
            key_service: Joi.string().min(2).allow('').optional(),
            clientele: Joi.string().min(2).allow('').optional(),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            type: Joi.string().min(4).required(),
            PoolState: Joi.array().required(),
            PoolZone: Joi.array().required(),
            PoolBucket: Joi.array().required(),
            PoolProduct: Joi.array().required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 16 char.`, errorType: errorType });

            }
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }


        const changedDb = await changeDateFormate(req.body.incorporation_date);
        req.body.incorporation_date = changedDb;

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
export const addNbfc = async (req, res, next) => {
    try {
        req.body.branch = 1;

        const updateSchema = Joi.object({
            branch: Joi.number().required(),
            nbfc_name: Joi.string().min(2).max(50).required(),
            email: Joi.string().email().required(),
            incorporation_date: Joi.date().required(),
            registration_number: Joi.string().required(),
            gst_number: Joi.string().required(),
            license_number: Joi.string().required(),
            nbfc_type: Joi.string().required(),
            mobile: Joi.number().required(),
            registered_address: Joi.string().required(),
            office_address: Joi.string().allow('').required(),
            website: Joi.string().min(6).allow('').optional(),
            fax_number: Joi.string().min(4).allow('').optional(),
            ceo: Joi.string().min(2).allow('').optional(),
            cfo: Joi.string().min(2).allow('').optional(),
            compliance_officer: Joi.string().min(2).allow('').optional(),
            number_of_office: Joi.number().min(1).allow('').optional(),
            language_covered: Joi.string().min(4).allow('').optional(),
            key_service: Joi.string().min(2).allow('').optional(),
            clientele: Joi.string().min(2).allow('').optional(),
            password: Joi.string().min(8).max(16).pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]{8,16}$")).required(),
            type: Joi.string().min(4).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;

            if (errorType == "string.pattern.base") {
                return res.status(400).json({ success: false, message: `Password must have atleast one capital letter, one small letter,one numreic,one special char,min 8 char and max 16 char.`, errorType: errorType });

            }
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }


        const changedDb = await changeDateFormate(req.body.incorporation_date);
        req.body.incorporation_date = changedDb;
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
        const userQuery = "SELECT isApproved,isAgency,branch,isActive,nbfc_name,id, password, email,profile,type FROM tbl_users WHERE email = ?";
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
                return res.status(400).send({ success: false, message: "Your account has been suspended" });
            }
            console.log(user.isApproved)
            if (!user.isApproved) {
                return res.status(400).send({ success: false, message: "Your account is not approved yet." });
            }
            try {
                const passwordMatch = await bcrypt.compare(password, user.password);
                if (!passwordMatch) {
                    return res.status(401).send({ success: false, message: "Invalid Password." });
                }
                const token = jwt.sign({ isAgency: user.isAgency, branch: user.branch, id: user.id, nbfc_name: user.nbfc_name, email: user.email, type: user.type, profile: user.profile }, process.env.SECRET_KEY, {
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

export const getAgency = async (req, res) => {
    try {

        const { id, type } = req.user;
        const { active } = req.body;
        if ((type === "employee")) {
            return res.status(400).send({ success: false, message: "Cant Access Agent Module." });
        }
        // let filterQuery = "";
        // let filterType = "";
        // if (active != '' && active != undefined) {
        //     filterQuery += ` and isActive=${active}`;
        // }
        // if (type === "agency") {
        //     filterType = `'employee'`;
        // } else if (type === "nbfc") {
        //     filterType = `'agency'`;
        // }

        const Query = `select * from tbl_users where branch=? and type='agency'`;

        db.query(Query, [req.user.branch], async (error, result) => {
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
export const getAgencyEmployees = async (req, res) => {
    try {
        // let filterQuery = "";
        // if (active != '' && active != undefined) {
        //     filterQuery += ` and isActive= ${active}`;
        // }


        const Query = `select * from tbl_users where created_by=? and type='employee'`;

        db.query(Query, [req.user.id], async (error, result) => {
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
export const getSuperAdminEmployees = async (req, res) => {
    try {
        const Query = `select * from tbl_users where branch=1 and type='super admin' and id!=? and id!=1`;

        db.query(Query, [req.user.id], async (error, result) => {
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
export const getNbfcEmployees = async (req, res) => {
    try {
        const Query = `select * from tbl_users where branch=? and type='nbfc' and id!=? `;

        db.query(Query, [req.user.branch, req.user.id], async (error, result) => {
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

        const { id, type, branch } = req.user;
        const { active } = req.body;
        if ((type === "employee") || (type === "agency") || (type === "nbfc")) {
            return res.status(400).send({ success: false, message: "Cant Access Agent Module." });
        }
        let filterQuery = "";
        if (active != '' && active != undefined) {
            filterQuery += ` and isActive=${active}`;
        }
        filterQuery += ` and (tbl_users.branch=tbl_users.id)`;


        const Query = `select * from tbl_users where  type='nbfc' ${filterQuery} order by date(created_date)`;

        db.query(Query, [id], async (error, result) => {
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
            userData.doc = await getAllDocByUserId(req.body.userId);


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

    const allowedFields = ['Profile', 'Pan', 'Adhaar', 'PoliceVerification', 'DRA', 'COI', 'GSTCertificate', 'Empannelment', 'SignedAgreement'];
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

export const getProducts = async (req, res) => {
    try {
        const Query = `select * from tbl_products where  branch=? order by product asc`;

        db.query(Query, [req.user.branch], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }


            return res.status(200).send({
                success: true,
                message: "Products fetched",
                data: result
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const deleteProduct = async (req, res) => {
    try {
        const updateSchema = Joi.object({
            productId: Joi.number().min(1).required(),
            status: Joi.number().min(0).max(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const { productId, status } = req.body;

        const deleteQuery = "update tbl_products set isActive=? where id=?";


        db.query(deleteQuery, [status, productId], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({
                success: true,
                message: `Product ${status == 1 ? "Activated" : "Dectivated"} Successfully`,
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const updateProduct = async (req, res) => {
    try {
        const updateSchema = Joi.object({
            productId: Joi.number().min(1).required(),
            newName: Joi.string().required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const { productId, newName } = req.body;


        const existingQuery = "select id from tbl_products  where userId=? and product=?";


        db.query(existingQuery, [req.user.id, newName], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            if (result.length) {
                return res.status(400).send({
                    success: false,
                    message: `Product Already Exist`,
                });
            }
            const deleteQuery = "update tbl_products set product=? where id=?";


            db.query(deleteQuery, [newName, productId], async (error, result) => {
                if (error) {
                    console.error("Error occurred while querying the database:", error);
                    return res.status(500).send({ success: false, message: "Internal server error." });
                }
                return res.status(200).send({
                    success: true,
                    message: `Product Updated Successfully`,
                });
            });
        })





    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const AddProducts = async (req, res, next) => {
    try {
        const products = req.body;
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).send({ success: false, message: "No products provided." });
        }

        const productNames = products.map(item => item.product);
        const uniqueProducts = [...new Set(productNames)];
        if (uniqueProducts.length !== productNames.length) {
            return res.status(400).send({ success: false, message: "Duplicate products found." });
        }

        const userId = req.user.id;
        const branch = req.user.branch;
        const querySelect = `SELECT product FROM tbl_products WHERE branch = ?`;
        db.query(querySelect, [branch], (error, results) => {
            if (error) {
                console.error("Error occurred while fetching existing products:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            const existingProducts = results.map(row => row.product);
            const newProducts = uniqueProducts.filter(product => !existingProducts.includes(product));

            if (newProducts.length === 0) {
                return res.status(200).send({ success: true, message: "No new products to add." });
            }

            const values = newProducts.map(product => [product, userId, branch]);
            const queryInsert = `INSERT INTO tbl_products (product, userId,branch) VALUES ?`;

            db.query(queryInsert, [values], (error, results) => {
                if (error) {
                    console.error("Error occurred while adding products:", error);
                    return res.status(500).send({ success: false, message: "Internal server error." });
                }

                return res.status(200).send({ success: true, message: "Products added successfully." });
            });
        });

    } catch (error) {
        console.error("Error occurred while adding products:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};
export const approveUser = async (req, res) => {
    try {
        const updateSchema = Joi.object({
            userId: Joi.number().min(1).required(),
            status: Joi.number().min(0).max(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const { userId, status } = req.body;

        const deleteQuery = "update tbl_users set isApproved=? where id=?";


        db.query(deleteQuery, [status, userId], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({
                success: true,
                message: `User ${status == 1 ? "Approved" : "UnApproved"} Successfully`,
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}


export const addWaiverRequest = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            LoanId: Joi.string().min(2).max(50).required(),
            principalAmt: Joi.number().precision(2).required(),
            penalAmt: Joi.number().precision(2).required(),
            intrestAmt: Joi.number().precision(2).required(),
            principalPercentage: Joi.number().precision(2).required(),
            penalPercentage: Joi.number().precision(2).required(),
            intrestPercentage: Joi.number().precision(2).required(),
            totalAmt: Joi.number().precision(2).required(),


        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }


        const queryInsert = `INSERT INTO tbl_waiver_requests (agency_id,agency_branch,loanId,principal_amt,principal_percentage,penal_amt,penal_percentage,intrest_amt,intrest_percentage,total_amt,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)`;

        db.query(queryInsert, [req.user.isAgency, req.user.branch, req.body.LoanId, req.body.principalAmt, req.body.principalPercentage, req.body.penalAmt, req.body.penalPercentage, req.body.intrestAmt, req.body.intrestPercentage, req.body.totalAmt, req.user.id], (error, results) => {
            if (error) {
                console.error("Error occurred while adding Waiver:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            return res.status(200).send({ success: true, message: "Waiver requested successfully." });
        });

    } catch (error) {

    }

}

export const getCustomerDetails = async (req, res) => {
    try {
        const checkSQL = `SELECT id FROM tbl_waiver_requests WHERE loanId = ? and isApproved=2`;
        db.query(checkSQL, [req.body.LoanId], async (error, result) => {
            if (error) {
                console.error('Error occurred while checking waiver requests:', error);
                return res.status(500).send({ success: false, message: 'Database error.' });
            }
            if (result.length) {
                return res.status(200).send({ success: false, message: 'Waiver already in pending.', data: '' });
            }

            const SQL = `SELECT * FROM tbl_master${req.user.branch} WHERE id = (SELECT MAX(id) FROM tbl_master${req.user.branch} WHERE loan_id = ?)`;
            db.query(SQL, [req.body.LoanId], async (error, result) => {
                if (error) {
                    console.error('Error occurred while fetching customer details:', error);
                    return res.status(500).send({ success: false, message: 'Database error.' });
                }

                const AgencyDetails = await getUserById(req.user.isAgency);
                if (result.length && result[0].agency_name === AgencyDetails.nbfc_name) {
                    return res.status(200).send({ success: true, message: 'Customer Details Matched.', data: result });
                }

                return res.status(200).send({ success: false, message: 'Customer Not Found.', data: [] });
            });
        });
    } catch (error) {
        console.error('Error occurred:', error);
        res.status(500).send({ success: false, message: 'Internal Server Error.' });
    }
};
export const waiverList = async (req, res, next) => {
    try {
        const Query = `SELECT tbl_waiver_requests.*, 
                              tbl_users.nbfc_name, 
                               DATE_FORMAT(tbl_waiver_requests.scheme_expiry, '%d-%m-%Y %h:%i:%s %p') as formatted_expiry_date , 
                              DATE_FORMAT(tbl_waiver_requests.created_date, '%d-%m-%Y %h:%i:%s %p') as formatted_created_date , 
                              DATE_FORMAT(tbl_waiver_requests.approval_date, '%d-%m-%Y %h:%i:%s %p') as formatted_approved_date 
                       FROM tbl_waiver_requests 
                       INNER JOIN tbl_users ON tbl_waiver_requests.created_by = tbl_users.id 
                       AND tbl_users.branch = ? and tbl_waiver_requests.isActive=1 and tbl_waiver_requests.agency_id=? `;
        db.query(Query, [req.user.branch, req.user.id], async (error, result) => {
            console.log(Query, [req.user.branch, req.user.isAgency])
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            return res.status(200).send({
                success: true,
                message: "Waiver Request fetched",
                data: result
            });
        });

    } catch (error) {
        console.error("Error in waiverList function:", error); // Add error logging
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
}
export const deleteWaiverRequest = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            id: Joi.number().min(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }


        const deleteQuery = "update tbl_waiver_requests set isActive=0,updated_by=? where id=?";


        db.query(deleteQuery, [req.user.id, req.body.id], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({
                success: true,
                message: `Request Deleted Successfully`,
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}

export const nbfcWaiverList = async (req, res, next) => {
    try {
        const Query = `SELECT tbl_waiver_requests.*,tbl_users.nbfc_name, DATE_FORMAT(tbl_waiver_requests.created_date, '%d-%m-%Y %h:%i:%s %p') as formatted_created_date ,  DATE_FORMAT(tbl_waiver_requests.approval_date, '%d-%m-%Y %h:%i:%s %p') as formatted_approved_date FROM tbl_waiver_requests 
                       INNER JOIN tbl_users ON tbl_waiver_requests.agency_id = tbl_users.id 
                       AND tbl_users.branch =? and tbl_waiver_requests.isActive=1`;
        db.query(Query, [req.user.branch], async (error, result) => {

            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            return res.status(200).send({
                success: true,
                message: "Waiver Request fetched",
                data: result
            });
        });

    } catch (error) {
        console.error("Error in waiverList function:", error); // Add error logging
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
}
export const waiverDetails = async (req, res, next) => {
    try {
        const sql = `SELECT wr.*,m.product_type,m.dpd_in_days,m.prin_overdue,m.overdue_int,m.penal_due,m.total_overdue, m.dob, m.age, m.phone_number, m.last_emi_date, m.date_of_last_payment  FROM tbl_waiver_requests wr INNER JOIN tbl_master${req.user.branch} m ON wr.loanId = m.loan_id AND wr.isApproved = ${req.body.isApproved} AND wr.agency_branch = ${req.user.branch} AND wr.isActive = 1 AND m.id = (SELECT MAX(id) FROM tbl_master${req.user.branch} WHERE loan_id = ?) WHERE wr.id = ?`;
        db.query(sql, [req.body.loanId, req.body.id], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            if (!result.length) {
                return res.status(200).send({
                    success: false,
                    message: "Waiver Request Not Found",
                    data: result
                });
            }


            const CreationData = await getUserById(result[0].agency_id)
            const PoolData = await getPoolDetailsByAgencyId(result[0].agency_id)
            console.log(result[0])
            result[0]['agencyDetails'] = CreationData;
            result[0]['PoolData'] = PoolData;
            // console.log(CreationData)
            const WaiverRuleData = await getWaiverRuleCriteria(result[0].product_type, req.user.branch, result[0].dpd_in_days, CreationData.id)

            result[0]['WaiverRuleData'] = WaiverRuleData;

            return res.status(200).send({
                success: true,
                message: "Waiver Request fetched",
                data: result
            });

        });

    } catch (error) {

    }
}

// function getAgency
export const approvedWaivers = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            approved_principal: Joi.number().min(1).required(),
            approved_penal: Joi.number().min(1).required(),
            approved_intrest: Joi.number().min(1).required(),
            reason: Joi.string().min(3).required(),
            isApproved: Joi.number().min(0).required(),
            waiver_id: Joi.number().min(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const SQL = `update tbl_waiver_requests set isApproved=?,approved_principal=?,approved_penal=?,approved_intrest=?,updated_by=?,reason=?,approved_by=? where id =?`;
        db.query(SQL, [req.body.isApproved, req.body.approved_principal, req.body.approved_penal, req.body.approved_intrest, req.user.id, req.body.reason, req.user.id, req.body.waiver_id], async (error, result) => {

            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({ success: true, message: "Waiver Approved" });
        });

    } catch (error) {
        console.error("Error in waiverList function:", error); // Add error logging
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
}
export const approveWaiver = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            scheme_expiry: Joi.string().min(1).required(),
            waiverId: Joi.number().min(1).required(),
            reason: Joi.string().max(100).required(),
            updatedIntrest: Joi.number().min(0).required(),
            updatedPenal: Joi.number().min(0).required(),
            updatedPrincipal: Joi.number().min(0).required(),
            isApproved: Joi.number().min(0).max(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const sql = `UPDATE tbl_waiver_requests SET scheme_expiry=?,waiver_rule_id=?, approved_by=?, reason=?, isApproved=?, approved_principal=?, approved_penal=?, approved_intrest=? where id=?`;
        db.query(sql, [req.body.scheme_expiry, req.body.waiverId, req.user.id, req.body.reason, req.body.isApproved, req.body.updatedPrincipal, req.body.updatedPenal, req.body.updatedIntrest, req.body.waiverId], async (error, result) => {
            console.log(sql, [req.user.id, req.body.reason, req.body.updatedPrincipal, req.body.updatedPenal, req.body.updatedIntrest, req.body.waiverId]);
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            res.status(200).send({ success: true, message: "Waiver Updated." });
        });
    } catch (error) {
        console.error("Error occurred in approveWaiver function:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
}
const JoiBase = Joi.extend((joi) => ({
    type: 'string',
    base: joi.string(),
    messages: {
        'string.dateFormat': '"{{#label}}" must be in the format YYYY-MM-DD HH:mm:ss',
    },
    rules: {
        dateFormat: {
            validate(value, helpers) {
                // Regular expression to match the format YYYY-MM-DD HH:mm:ss
                const regex = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/;
                if (!regex.test(value)) {
                    return helpers.error('string.dateFormat');
                }
                return value; // Keep the value as it is if it matches
            },
        },
    },
}));
export const addWaiverRule = async (req, res, next) => {
    try {
        const updateSchema = JoiBase.object({
            principal: JoiBase.number().min(0).max(100).required(),
            penal: JoiBase.number().min(0).max(100).required(),
            interest: JoiBase.number().min(0).max(100).required(),
            bucket: JoiBase.array().required(),
            product: JoiBase.array().required(),
            expiryDate: JoiBase.string().dateFormat().required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const values = [];
        req.body.product.forEach(product => {
            req.body.bucket.forEach(bucket => {
                values.push([req.user.branch, product, bucket, req.body.penal, req.body.interest, req.body.principal, req.body.expiryDate, req.user.id]);
            });
        });

        // Construct the SQL statement to check for existing records
        const checkSQL = `SELECT product_id, bucket_id FROM tbl_waiver_rules WHERE branch_id = ? AND (product_id, bucket_id) IN (?)`;

        // Create a set of (product_id, bucket_id) pairs for the query
        const checkValues = [req.user.branch, values.map(value => [value[1], value[2]])];

        // Execute the query to check for existing records
        db.query(checkSQL, checkValues, (error, results) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }

            // Filter out values that already exist
            const existingPairs = results.map(result => `${result.product_id}-${result.bucket_id}`);
            const filteredValues = values.filter(value => !existingPairs.includes(`${value[1]}-${value[2]}`));

            if (filteredValues.length === 0) {
                return res.status(200).send({ success: false, message: "No new waiver rules to add." });
            }

            // Construct the SQL statement with placeholders for inserting new records
            const placeholders = filteredValues.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
            const insertSQL = `INSERT INTO tbl_waiver_rules 
                               (branch_id, product_id, bucket_id, penal, intrest, principal, expiry_date, created_by) 
                               VALUES ${placeholders}`;

            // Flatten the filtered values array for the query
            const flattenedValues = filteredValues.flat();

            // Execute the batch insert query
            db.query(insertSQL, flattenedValues, (error, result) => {
                if (error) {
                    console.error("Error occurred while querying the database:", error);
                    return res.status(500).send({ success: false, message: "Internal server error." });
                }
                return res.status(200).send({ success: true, message: "Waiver Rule  Created." });
            });
        });

    } catch (error) {
        console.error("Error in waiverList function:", error); // Add error logging
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};

export const waiverRuleLists = async (req, res, next) => {
    try {
        const SQL = `SELECT 
    tbl_waiver_rules.*,
    DATE_FORMAT(tbl_waiver_rules.expiry_date, '%d-%m-%Y %h:%i:%s %p') as formatted_expiry_date,
      DATE_FORMAT(tbl_waiver_rules.created_date, '%d-%m-%Y %h:%i:%s %p') as formatted_created_date,
    tbl_products.product,
    tbl_users.nbfc_name as created_by
FROM 
    tbl_waiver_rules 
INNER JOIN 
    tbl_products 
    ON tbl_waiver_rules.product_id = tbl_products.id 
INNER JOIN 
    tbl_users 
    ON tbl_waiver_rules.created_by = tbl_users.id
WHERE 
    tbl_waiver_rules.branch_id = ? 
ORDER BY 
    tbl_waiver_rules.product_id;
`;

        db.query(SQL, [req.user.branch], (error, results) => {
            console.log(SQL, [req.user.branch])
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({ success: true, message: "Fetched Lists", data: results });
        });

    } catch (error) {
        console.error("Error in waiverRuleList function:", error); // Add error logging
        return res.status(500).send({ success: false, message: "Internal server error." });
    }

}



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
        if (error) {
            console.error('Error occurred while updating user:', error);
            return res.status(500).send({ success: false, message: 'Database error.' });
        }

        const tokenPayload = {
            isAgency: req.user.isAgency,
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
async function getPoolDetailsByAgencyId(id) {
    const query = "SELECT * FROM tbl_pool_allocations WHERE userId = ?";
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

async function getWaiverRuleCriteria(ProductName, BranchId, dpdDays, agencyId) {
    if (dpdDays > 0 && dpdDays <= 30) {
        dpdDays = 1;
    } else if (dpdDays >= 31 && dpdDays <= 60) {
        dpdDays = 2;
    }
    else if (dpdDays >= 61 && dpdDays <= 90) {
        dpdDays = 3;
    }
    else if (dpdDays >= 91 && dpdDays <= 120) {
        dpdDays = 4;
    }
    else if (dpdDays >= 121 && dpdDays <= 150) {
        dpdDays = 5;
    } else if (dpdDays >= 151 && dpdDays <= 180) {
        dpdDays = 6;
    } else if (dpdDays >= 181 && dpdDays <= 365) {
        dpdDays = 7;
    } else {
        dpdDays = 8;
    }


    const query = `SELECT p.id,w.penal,w.intrest,w.principal,w.expiry_date FROM 
    tbl_waiver_rules w INNER JOIN tbl_products p ON w.branch_id = p.branch WHERE p.branch = ?  AND p.product = ? and w.bucket_id=?  limit 1`;
    return new Promise((resolve, reject) => {
        db.query(query, [BranchId, ProductName, dpdDays], (error, result) => {
            console.log(query, [BranchId, ProductName, dpdDays])
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

    let uploadedDoc = {};
    if (!req.file) {

        try {
            if (req.user.type === "agency") {
                if (!('Pan' in req.files) || !('Adhaar' in req.files)) {
                    for (const key in req.files) {
                        fs.unlink(`uploads/profile/${req.files[key][0].filename}`, (err) => {
                            if (err) throw err;
                        });
                    }
                    return res.status(400).send({ success: false, message: "Mandatory Documents are missing" });
                }
                uploadedDoc = await uploadtocloudinary(req, res);

            } else if (req.user.type === "nbfc") {
                if (!('Pan' in req.files)) {
                    console.log("Pan")

                }
                if (!('COI' in req.files)) {
                    console.log("COI")

                }
                if (!('GSTCertificate' in req.files)) {
                    console.log("GSTCertificate")

                }
                if (!('Empannelment' in req.files)) {
                    console.log("Empannelment")

                }
                if (!('SignedAgreement' in req.files)) {
                    console.log("SignedAgreement")

                }
                console.log(req.files)
                if (!('Pan' in req.files) || !('COI' in req.files) || !('GSTCertificate' in req.files) || !('Empannelment' in req.files) || !('SignedAgreement' in req.files)) {
                    for (const key in req.files) {
                        fs.unlink(`uploads/profile/${req.files[key][0].filename}`, (err) => {
                            if (err) throw err;
                        });
                    }
                    return res.status(400).send({ success: false, message: "Mandatory Documents are missing" });
                }
                uploadedDoc = await uploadtocloudinary(req, res);

            }
        } catch (error) {
            console.error("Error occurred while uploading to cloudinary:", error);
            return res.status(500).send({ success: false, message: "Error uploading to cloudinary." });
        }

    }

    try {
        const lowerType = req.body.type.toLowerCase();
        if (!userTypes.includes(lowerType)) {
            return res.status(400).send({ success: false, message: "Invalid User Type" });
        }
        // if (!checkTypePermission(req.user.type, lowerType)) {
        //     return res.status(400).send({ success: false, message: "You Are Not Allowed To Add This UserType" });
        // }

        const hashPassword = await bcrypt.hash(req.body.password, 10);
        req.body.text_password = req.body.password;
        req.body.password = hashPassword;

        // Begin transaction
        db.beginTransaction(async function (err) {
            if (err) {
                console.error("Error beginning transaction:", err);
                return res.status(500).send({ success: false, message: "Database error." });
            }

            try {
                req.body.branch = req.user.branch;

                const { account_number, ifsc_code, bank_branch, bank_name, beneficiary_name, PoolState, PoolBucket, PoolZone, PoolProduct, ...userData } = req.body;
                const fields = Object.keys(userData).join(", ");
                const placeholders = Array(Object.keys(userData).length).fill("?").join(", ");
                const insertUserQuery = `INSERT INTO tbl_users (created_by, ${fields}) VALUES (?, ${placeholders})`;
                const insertUserValues = [req.user.id, ...Object.values(userData)];
                const userInsertResult = await executeQuery(insertUserQuery, insertUserValues);

                const insertedId = userInsertResult.insertId;
                if (req.body.type === 'nbfc') {
                    const updateUserQuery = `update tbl_users set branch=? where id=?`;
                    const updateUserValues = [insertedId, insertedId];
                    await executeQuery(updateUserQuery, updateUserValues);
                }
                if (req.body.type === 'agency') {
                    const updateUserQuery1 = `update tbl_users set isAgency=? where id=?`;
                    const updateUserValues1 = [insertedId, insertedId];
                    await executeQuery(updateUserQuery1, updateUserValues1);
                }


                // Insert documents if any
                if (Object.keys(uploadedDoc).length !== 0) {
                    for (const key in uploadedDoc) {
                        if (uploadedDoc.hasOwnProperty(key)) {
                            const docquery = `INSERT INTO tbl_documents (userId,document_name,url,created_by) VALUES (?,?,?,?)`;
                            const docInsertResult = await executeQuery(docquery, [insertedId, key, uploadedDoc[key], req.user.id]);
                        }
                    }
                }

                // Create table if user type is nbfc
                if (lowerType === "nbfc") {
                    await createNewTable(`tbl_master${insertedId}`);
                }

                // Insert pool allocations if user type is nbfc
                if (req.user.type === "nbfc") {
                    const existingQuery = `select id from tbl_pool_allocations where userId=?`;
                    const isExist = await executeQuery(existingQuery, [insertedId]);
                    if (isExist) {
                        const deleteQuery = `delete  from tbl_pool_allocations where userId=?`;
                        const isExist = await executeQuery(deleteQuery, [insertedId]);

                    }



                    const poolQuery = `INSERT INTO tbl_pool_allocations (userId,state,zone,bucket,product,created_by) VALUES (?,?,?,?,?,?)`;
                    const productJson = JSON.stringify(PoolProduct);
                    const zoneJson = JSON.stringify(PoolZone);
                    const bucketJson = JSON.stringify(PoolBucket);
                    const stateJson = JSON.stringify(PoolState);
                    await executeQuery(poolQuery, [insertedId, stateJson, zoneJson, bucketJson, productJson, req.user.id]);

                    //inserting Bank details 

                    const bankQuery = `INSERT INTO tbl_account_details (bank_name,branch_name,ifsc,acc_number,beneficiary_name,agency) VALUES (?,?,?,?,?,?)`;
                    await executeQuery(bankQuery, [bank_name, bank_branch, ifsc_code, account_number, beneficiary_name, insertedId]);
                }

                // Commit transaction
                db.commit(function (err) {
                    if (err) {
                        console.error("Error committing transaction:", err);
                        return res.status(500).send({ success: false, message: "Database error." });
                    }
                    return res.status(200).send({ success: true, message: "User Registered Successfully" });
                });
            } catch (error) {
                // Rollback transaction if any error occurs
                db.rollback(function () {
                    console.error("Error occurred in transaction:", error);
                    return res.status(500).send({ success: false, message: "Database error." });
                });
            }
        });

    } catch (error) {
        console.error("Error occurred while processing the request:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
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


async function uploadtocloudinary(req, res) {
    const allowedFields = ['Profile', 'Pan', 'Adhaar', 'PoliceVerification', 'DRA', 'COI', 'GSTCertificate', 'Empannelment', 'SignedAgreement'];
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

async function getAllDocByUserId(id) {
    const query = "SELECT * FROM tbl_documents WHERE userId = ?";
    return new Promise((resolve, reject) => {
        db.query(query, [id], (error, result) => {
            if (error) {
                reject(error);
            } else {

                resolve(result.length ? result : null);
            }
        });
    });
}
// export const getAPR = async (req, res, next) => {
//     try {
//         const disbursalAmount = req.body.disbursalAmount;
//         const approval = req.body.approval;

//         // Calculate rep
//         const rep = Math.round(disbursalAmount * (req.body.roi / 100));

//         // Calculate installmentAmount
//         const installmentAmount = disbursalAmount + (rep * req.body.tenure);

//         // Calculate inte
//         const inte = rep * 30;

//         // Calculate intem
//         const intem = rep * req.body.tenure;

//         // Calculate inte1
//         const inte1 = inte * 12;

//         // Calculate adm
//         const adm = req.body.adminFee;

//         // Calculate gst
//         const gst = Math.round(adm * (18 / 100) * 100) / 100;

//         // Calculate tam
//         const tam = adm + gst;

//         // Calculate apr
//         const apr = Math.round((((inte1 + tam) / req.body.loanAmtApproved) / 30) * 365);

//         return res.status(200).send({ success: true, message: "Your APR", data: apr });

//     } catch (error) {
//         console.error("Error occurred in approveWaiver function:", error);
//         return res.status(500).send({ success: false, message: "Internal server error." });
//     }
// }








