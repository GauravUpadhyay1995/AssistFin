import bcrypt from "bcrypt";
import Joi from "joi";
import db from "../config/db.js";
import moment from "moment";

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

        if (req.body.start_date && req.body.end_date) {
            fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            toDate = moment(req.body.end_date).format('YYYY-MM-DD');
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
        return res.status(200).send({
            success: 1,
            count: Object.keys(results).length,
            data: results,
            agencyDetails: agencyDetails,
            nbfcDetails: nbfcDetails,
            accountDetails: accountDetails
        });
    } catch (error) {
        console.error("Error occurred:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
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



