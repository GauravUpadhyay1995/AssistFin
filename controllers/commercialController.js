import db from "../config/db.js";
import Joi from "joi";
import { format } from 'date-fns';

const changeDateFormate = async (getDAte) => {
    const dob = new Date(getDAte);
    return format(dob, 'yyyy-MM-dd');
}

export const addCommercialRule = async (req, res, next) => {
    try {
        const updateSchema = Joi.object({
            product_id: Joi.number().min(1).required(),
            bucket_id: Joi.number().min(1).required(),
            fixed_percentage: Joi.number().min(1).max(100).required(),
            min_percentage: Joi.array().items(Joi.string().min(0).max(100)).optional(),
            offer_percentage: Joi.array().items(Joi.string().min(0).max(100)).optional(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }

        const promises = req.body.min_percentage.map(async (minPerc, i) => {
            const offerPerc = req.body.offer_percentage[i];
            const isExist = await checkAlreadyExist(req.body.product_id, req.body.bucket_id, minPerc, req);

            if (!isExist) {
                const insertQuery = `insert into tbl_commercial_rule (branch_id, product_id, bucket_id, fixed_percentage, min_percentage, offer_percentage, created_by) VALUES (?,?,?,?,?,?,?)`;
                return new Promise((resolve, reject) => {
                    db.query(insertQuery, [req.user.branch, req.body.product_id, req.body.bucket_id, req.body.fixed_percentage, minPerc, offerPerc, req.user.id], (error, results) => {
                        if (error) {
                            console.error("Error occurred while querying the database:", error);
                            reject(new Error("Internal server error."));
                        } else {
                            resolve(results);
                        }
                    });
                });
            }
        });

        await Promise.all(promises);
        return res.status(200).send({ success: true, message: "Rule Added" });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
};


export const listCommercialRule = async (req, res, next) => {
    try {
        const branchId = req.user.branch;
        const SQL = `SELECT 
         tbl_commercial_rule.id, 
         tbl_commercial_rule.approvedBy, 
         tbl_commercial_rule.isApproved, 
                        tbl_commercial_rule.product_id, 
                        tbl_commercial_rule.bucket_id, 
                        COUNT(tbl_commercial_rule.id) AS total_count, 
                        tbl_users.nbfc_name, 
                        GROUP_CONCAT(tbl_commercial_rule.id) AS ids ,
                        fixed_percentage
                    FROM   
                        tbl_commercial_rule 
                    INNER JOIN  
                        tbl_users ON tbl_commercial_rule.created_by = tbl_users.id 
                    WHERE  
                        tbl_commercial_rule.branch_id = ? 
                    GROUP BY  
                        tbl_commercial_rule.product_id, tbl_commercial_rule.bucket_id`;

        return new Promise((resolve, reject) => {
            db.query(SQL, [branchId], async (error, results) => {
                if (error) {
                    console.error("Error occurred while querying the database:", error);
                    reject(new Error("Internal server error."));
                } else {
                    for (let i = 0; i < results.length; i++) {
                        const productId = results[i].product_id;
                        try {
                            const productName = await getProductNameById(productId);
                            if (results[i].approvedBy) {
                                const approvedBy = await getUserById(results[i].approvedBy);
                                results[i].approvedBy = approvedBy.nbfc_name;

                            }else{
                                results[i].approvedBy = '-';
                            }

                            results[i].productName = productName;
                            if (results[i].total_count) {
                                const SlabDetails = await getSlabDetails(results[i].ids);
                                results[i].Slabs = SlabDetails;
                            }

                        } catch (err) {
                            console.error(`Error fetching product name for product_id ${productId}:`, err);
                            // Handle error fetching product name
                        }
                    }
                    // resolve(results); // Resolve with modified results
                    return res.status(200).send({ success: true, message: "Fetched.", data: results });
                }
            });
        });

    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });
    }
}


const checkAlreadyExist = async (product_id, bucket_id, min_percentage, req) => {
    const query = "SELECT * FROM tbl_commercial_rule WHERE product_id = ? AND bucket_id = ? AND min_percentage = ? and branch_id=?";
    return new Promise((resolve, reject) => {
        db.query(query, [product_id, bucket_id, min_percentage, req.user.branch], (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result.length > 0);
            }
        });
    });
};
const getProductNameById = async (productId) => {
    const query = "SELECT product FROM tbl_products WHERE id = ? ";
    return new Promise((resolve, reject) => {
        db.query(query, [productId], (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result[0].product);
            }
        });
    });

}
const getSlabDetails = async (ids) => {
    const query = `SELECT * FROM tbl_commercial_rule WHERE id in (${ids}) `;
    return new Promise((resolve, reject) => {
        db.query(query, (error, result) => {
            if (error) {
                reject(error);
            } else {
                resolve(result);
            }
        });
    });
}

export const approveCommercialRule = async (req, res) => {
    try {
        const updateSchema = Joi.object({
            Id: Joi.number().min(1).required(),
            status: Joi.number().min(0).max(1).required(),
        });

        const { error } = updateSchema.validate(req.body);
        if (error) {
            const errorMessage = error.details.map(detail => detail.message).join(", ");
            const errorType = error.details[0].type;
            return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
        }
        const { Id, status } = req.body;

        const UpdateQuery = "update tbl_commercial_rule set isApproved=?, approvedBy=? where id=?";


        db.query(UpdateQuery, [status,req.user.id, Id], async (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ success: false, message: "Internal server error." });
            }
            return res.status(200).send({
                success: true,
                message: ` ${status == 1 ? "Approved" : "UnApproved"} Successfully`,
            });
        });


    } catch (error) {
        console.error("Error occurred while querying the database:", error);
        return res.status(500).send({ success: false, message: "Internal server error." });

    }
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