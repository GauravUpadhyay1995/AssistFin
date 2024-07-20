import bcrypt from "bcrypt";
import Joi from "joi";
import db from "../config/db.js"; // Assuming "../config/db.js" provides database functionality
import moment from "moment";


export const getFilterAllocation = async (req, res, next) => {
    try {
        const user = req.user;
        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let stateString = "";
        let cityString = "";
        let pinString = "";
        let allocationString = '';
        let lenderString = '';
        let productString = '';
        let campaignString = '';
        let genderString = '';
        let ageString = '';
        let loanAmountString = '';
        let bucketString = '';
        let agencyString = '';
        let group_by = "state";
        console.log(req.body)
        if (req.body.agency && req.body.agency.length) {
            agencyString = req.body.agency.map(item => `'${item}'`).join(',');
            conditions.push(`AND agency_name IN (${agencyString})`);
        }

        if (req.body.state && req.body.state.length) {
            stateString = req.body.state.map(item => `'${item}'`).join(',');
            conditions.push(`AND state IN (${stateString})`);
        }
        if (req.body.city && req.body.city.length) {
            cityString = req.body.city.map(item => `'${item}'`).join(',');
            conditions.push(`AND city IN (${cityString})`);
        }
        if (req.body.pincode && req.body.pincode.length) {
            pinString = req.body.pincode.map(item => `'${item}'`).join(',');
            conditions.push(`AND pincode IN (${pinString})`);
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
        if (req.body.gender && req.body.gender.length) {
            genderString = req.body.gender.map(item => `'${item}'`).join(',');
            conditions.push(`AND gender IN (${genderString})`);
        }

        if (req.body.bucket && req.body.bucket.length) {
            bucketString = req.body.bucket.map(item => `'${item}'`).join(',');
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
        }

        if (req.body.bucket && req.body.bucket.length) {
            conditions.push(` and bucket in ( ${bucketString})`);

        }
        if (req.body.allocation && req.body.allocation.length) {
            conditions.push(` and agency_name in (${allocationString})`);

        }
        if (req.body.product && req.body.product.length) {
            conditions.push(` and product_type in (${productString})`);

        }
        if (req.body.group_by) {
            group_by = req.body.group_by;
        }


        QUERY = `SELECT  * FROM tbl_master${req.user.id} WHERE id>0 `;

        if (req.body.loanAmount && req.body.loanAmount.length) {
            QUERY += manageCustomQuery(req.body.loanAmount, 'loan_amount')

        }

        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        QUERY += ` GROUP BY ${group_by}  ORDER BY ${group_by} ASC`;
        console.log(QUERY)
        db.query(QUERY, (error, result) => {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {

    }



};

export const getAllUsers = async (req, res, next) => {
    try {


        let QUERY = "SELECT distinct(user) FROM call_log  order by user asc ";


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllBucket = async (req, res, next) => {
    try {


        let QUERY = `SELECT DISTINCT bucket FROM tbl_master${req.user.id} ORDER BY CASE WHEN bucket = 'Above 150K' THEN 9999999  ELSE CAST(SUBSTRING_INDEX(bucket, '-', 1) AS UNSIGNED) END,  CASE  WHEN bucket = 'Above 150K' THEN NULL  ELSE CAST(SUBSTRING_INDEX(bucket, '-', -1) AS UNSIGNED) END;`;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllAgency = async (req, res, next) => {
    try {


        let QUERY = `SELECT distinct(agency_name) FROM tbl_master${req.user.id}  order by agency_name asc `;
        console.log(QUERY)

        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllProduct = async (req, res, next) => {
    try {


        let QUERY = `SELECT distinct(product_type) FROM tbl_master${req.user.id}  order by product_type asc `;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllState = async (req, res, next) => {
    try {
        let QUERY = `SELECT distinct(state) FROM tbl_master${req.user.id}  order by state asc `;
        db.query(QUERY, function (error, result) {
            console.log(QUERY)
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getCityByState = async (req, res, next) => {
    try {
        let astateString = '';
        let QUERY = '';

        if (req.body.states && req.body.states.length) {
            astateString = req.body.states.map(item => `'${item}'`).join(',');
        }
        if (req.body.states && req.body.states.length) {
            QUERY = `SELECT distinct(city) FROM tbl_master${req.user.id}  where state in (${astateString}) order by city asc `;
        } else {
            QUERY = `SELECT distinct(city) FROM tbl_master${req.user.id}  order by city asc `;
        }



        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getPinByCity = async (req, res, next) => {
    try {
        let acitiesString = '';
        let QUERY = '';

        if (req.body.cities && req.body.cities.length) {
            acitiesString = req.body.cities.map(item => `'${item}'`).join(',');
        }
        if (req.body.cities && req.body.cities.length) {
            QUERY = `SELECT distinct(pincode) FROM tbl_master${req.user.id}  where city in (${acitiesString}) order by pincode asc `;
        } else {
            QUERY = `SELECT distinct(pincode) FROM tbl_master${req.user.id}  order by pincode asc `;
        }


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllCampaign = async (req, res, next) => {
    try {


        let QUERY = `SELECT distinct(campaign) FROM tbl_master${req.user.id}  order by campaign asc `;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const getAllNbfc = async (req, res, next) => {
    try {


        let QUERY = `SELECT distinct(approved_nbfc) FROM tbl_master${req.user.id}  order by approved_nbfc asc `;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};
export const uploadMasterData = async (req, res, next) => {
    try {
        console.log(req.body)

    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};

export const getLoanAmount = async (req, res, next) => {
    try {


        let QUERY = `SELECT
    CONCAT(FLOOR(loan_amount / 10000) * 10000 + 1, '-', FLOOR(loan_amount / 10000) * 10000 + 10000) AS loanAmount
    FROM
    tbl_master${req.user.id}
    GROUP BY
    loanAmount
    ORDER BY
    MIN(loan_amount / 10000) ASC;
    `;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }

}

export const getAge = async (req, res, next) => {
    try {


        let QUERY = `SELECT
        CONCAT(FLOOR(age / 5) * 5, '-', FLOOR(age / 5) * 5 + 4) AS ageRange
    FROM
    tbl_master${req.user.id}
    GROUP BY
        ageRange
    ORDER BY
        MIN(age / 5) ASC;
    ;
    `;


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            return res.status(200).send({
                success: 1,
                count: result.length,
                data: result,
            });
        });
    } catch (error) {
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });
    }

}
function manageCustomQuery(val, key) {
    const conditions1 = val.map(range => {
        const [min, max] = range.split('-').map(Number);
        return `(${key} >= ${min} AND ${key} <= ${max})`;
    });

    const query = ` and (${conditions1.join(' OR ')})`;
    return query;
}







