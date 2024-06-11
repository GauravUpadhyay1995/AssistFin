import bcrypt from "bcrypt";
import Joi from "joi";
import db from "../config/db.js"; // Assuming "../config/db.js" provides database functionality
import moment from "moment";

export const getStateData = async (req, res, next) => {
    try {

        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let bucketString = '';
        let allocationString = '';
        let productString = '';
        if (req.body.allocation && req.body.allocation.length) {
            allocationString = req.body.allocation.map(item => `'${item}'`).join(',');
        }
        if (req.body.bucket && req.body.bucket.length) {
            bucketString = req.body.bucket.map(item => `'${item}'`).join(',');
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
        }



        if (req.body.bucket && req.body.bucket.length) {
            conditions.push(" and bucket in (" + bucketString + ")");

        }
        if (req.body.allocation && req.body.allocation.length) {
            conditions.push(" and agency_name in (" + allocationString + ")");

        }
        if (req.body.product && req.body.product.length) {
            conditions.push(" and product_type in (" + productString + ")");

        }

        if (req.body.start_date && req.body.end_date) {
            const fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            const toDate = moment(req.body.end_date).format('YYYY-MM-DD');
            conditions.push("  and collection_date BETWEEN '" + fromDate + "' AND '" + toDate + "'");
        }
        QUERY = "SELECT  state,        COUNT(id) AS total_count,SUM(pos) AS POS,SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN pos ELSE 0 END) AS resolved_pos,SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN 1 ELSE 0 END) AS resolved_count,ROUND(( SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN pos ELSE 0 END)* 100.0) / SUM(pos), 2) AS percentage_pos,ROUND((SUM(CASE WHEN CAST(collected_amt AS DECIMAL(10, 2)) >= CAST(emi_amt_fixed AS DECIMAL(10, 2)) THEN 1 ELSE 0 END)*100)/COUNT(id),2) as percentage_count FROM `master` WHERE id>0 WHERE id>0 ";



        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        QUERY += " GROUP BY state  ORDER BY state ASC";


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
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });

    }



};
export const getCityData = async (req, res, next) => {
    try {

        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let bucketString = '';
        let allocationString = '';
        let productString = '';
        let cityString = '';

        let stateString = '';

        if (req.body.state && req.body.state.length) {
            stateString = req.body.state.map(item => `'${item}'`).join(',');
        }
        if (req.body.city && req.body.city.length) {
            cityString = req.body.city.map(item => `'${item}'`).join(',');
        }

        if (req.body.allocation && req.body.allocation.length) {
            allocationString = req.body.allocation.map(item => `'${item}'`).join(',');
        }
        if (req.body.bucket && req.body.bucket.length) {
            bucketString = req.body.bucket.map(item => `'${item}'`).join(',');
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
        }



        if (req.body.bucket && req.body.bucket.length) {
            conditions.push(" and bucket in (" + bucketString + ")");

        }
        if (req.body.allocation && req.body.allocation.length) {
            conditions.push(" and agency_name in (" + allocationString + ")");

        }
        if (req.body.product && req.body.product.length) {
            conditions.push(" and product_type in (" + productString + ")");

        }


        if (req.body.city && req.body.city.length) {
            conditions.push(" and city in (" + cityString + ")");

        }
        if (req.body.state && req.body.state.length) {
            conditions.push(" and state in (" + stateString + ")");

        }
        if (req.body.start_date && req.body.end_date) {
            const fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            const toDate = moment(req.body.end_date).format('YYYY-MM-DD');
            conditions.push("  and call_date BETWEEN '" + fromDate + "' AND '" + toDate + "'");
        }
        QUERY = "SELECT city, SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) AS paid, SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) AS unpaid,COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) AS paid_count,COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END) AS unpaid_count,(COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) + COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END)) AS grand_sum,SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END) AS total,ROUND((SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) * 100.0) /SUM(CASE WHEN status_b IN ('Paid','UnPaid') THEN pos ELSE 0 END), 2) AS paid_percentage,ROUND((SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) * 100.0) / SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END), 2) AS unpaid_percentage FROM `master` WHERE id>0 ";



        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        QUERY += " GROUP BY city  ORDER BY city ASC";


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
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });

    }



};
export const getPinData = async (req, res, next) => {
    try {


        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let bucketString = '';
        let allocationString = '';
        let productString = '';
        let stateString = '';
        let cityString = '';
        let pincodeString = '';
        let campaignString = '';
        let lenderString = '';
        let genderString = '';
        if (req.body.gender && req.body.gender.length) {
            genderString = req.body.gender.map(item => `'${item}'`).join(',');
        }
        if (req.body.campaign && req.body.campaign.length) {
            campaignString = req.body.campaign.map(item => `'${item}'`).join(',');
        }
        if (req.body.lender_id && req.body.lender_id.length) {
            lenderString = req.body.lender_id.map(item => `'${item}'`).join(',');
        }

        if (req.body.state && req.body.state.length) {
            stateString = req.body.state.map(item => `'${item}'`).join(',');
        }
        if (req.body.city && req.body.city.length) {
            cityString = req.body.city.map(item => `'${item}'`).join(',');
        }
        if (req.body.pincode && req.body.pincode.length) {
            pincodeString = req.body.pincode.map(item => `'${item}'`).join(',');
        }

        if (req.body.allocation && req.body.allocation.length) {
            allocationString = req.body.allocation.map(item => `'${item}'`).join(',');
        }
        if (req.body.bucket && req.body.bucket.length) {
            bucketString = req.body.bucket.map(item => `'${item}'`).join(',');
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
        }



        if (req.body.state && req.body.state.length) {
            conditions.push(" and state in (" + stateString + ")");

        }

        if (req.body.city && req.body.city.length) {
            conditions.push(" and city in (" + cityString + ")");

        }
        if (req.body.pincode && req.body.pincode.length) {
            conditions.push(" and pincode in (" + pincodeString + ")");

        }

        if (req.body.bucket && req.body.bucket.length) {
            conditions.push(" and bucket in (" + bucketString + ")");

        }
        if (req.body.allocation && req.body.allocation.length) {
            conditions.push(" and agency_name in (" + allocationString + ")");

        }
        if (req.body.product && req.body.product.length) {
            conditions.push(" and product_type in (" + productString + ")");

        }

        if (req.body.campaign && req.body.campaign.length) {
            conditions.push(" and campaign in (" + campaignString + ")");

        }
        if (req.body.lender_id && req.body.lender_id.length) {
            conditions.push(" and approved_nbfc in (" + lenderString + ")");

        }
        if (req.body.gender && req.body.gender.length) {
            conditions.push(" and gender in (" + genderString + ")");

        }

        if (req.body.start_date && req.body.end_date) {
            const fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            const toDate = moment(req.body.end_date).format('YYYY-MM-DD');
            conditions.push("  and collection_date BETWEEN '" + fromDate + "' AND '" + toDate + "'");

        }



        QUERY = "SELECT pincode, SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) AS paid, SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) AS unpaid,COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) AS paid_count,COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END) AS unpaid_count,(COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) + COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END)) AS grand_sum,SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END) AS total,ROUND((SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) * 100.0) /SUM(CASE WHEN status_b IN ('Paid','UnPaid') THEN pos ELSE 0 END), 2) AS paid_percentage,ROUND((SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) * 100.0) / SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END), 2) AS unpaid_percentage FROM `master` WHERE id>0 ";



        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        if (req.body.loanAmount && req.body.loanAmount.length) {
            QUERY += manageCustomQuery(req.body.loanAmount, 'loan_amount')

        }
        if (req.body.age && req.body.age.length) {
            QUERY += manageCustomQuery(req.body.age, 'age')

        }

        QUERY += " GROUP BY pincode  ORDER BY pincode ASC";


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
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });

    }



};
export const getDurationData = async (req, res, next) => {
    try {

        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let bucketString = '';
        let allocationString = '';
        let productString = '';
        let stateString = '';
        let cityString = '';
        let pincodeString = '';
        let campaignString = '';
        let lenderString = '';
        let genderString = '';
        let Duration = '';
        if (req.body.gender && req.body.gender.length) {
            genderString = req.body.gender.map(item => `'${item}'`).join(',');
        }
        if (req.body.campaign && req.body.campaign.length) {
            campaignString = req.body.campaign.map(item => `'${item}'`).join(',');
        }
        if (req.body.lender_id && req.body.lender_id.length) {
            lenderString = req.body.lender_id.map(item => `'${item}'`).join(',');
        }

        if (req.body.state && req.body.state.length) {
            stateString = req.body.state.map(item => `'${item}'`).join(',');
        }
        if (req.body.city && req.body.city.length) {
            cityString = req.body.city.map(item => `'${item}'`).join(',');
        }
        if (req.body.pincode && req.body.pincode.length) {
            pincodeString = req.body.pincode.map(item => `'${item}'`).join(',');
        }

        if (req.body.allocation && req.body.allocation.length) {
            allocationString = req.body.allocation.map(item => `'${item}'`).join(',');
        }
        if (req.body.bucket && req.body.bucket.length) {
            bucketString = req.body.bucket.map(item => `'${item}'`).join(',');
        }
        if (req.body.product && req.body.product.length) {
            productString = req.body.product.map(item => `'${item}'`).join(',');
        }



        if (req.body.state && req.body.state.length) {
            conditions.push(" and state in (" + stateString + ")");

        }

        if (req.body.city && req.body.city.length) {
            conditions.push(" and city in (" + cityString + ")");

        }
        if (req.body.pincode && req.body.pincode.length) {
            conditions.push(" and pincode in (" + pincodeString + ")");

        }

        if (req.body.bucket && req.body.bucket.length) {
            conditions.push(" and bucket in (" + bucketString + ")");

        }
        if (req.body.allocation && req.body.allocation.length) {
            conditions.push(" and agency_name in (" + allocationString + ")");

        }
        if (req.body.product && req.body.product.length) {
            conditions.push(" and product_type in (" + productString + ")");

        }

        if (req.body.campaign && req.body.campaign.length) {
            conditions.push(" and campaign in (" + campaignString + ")");

        }
        if (req.body.lender_id && req.body.lender_id.length) {
            conditions.push(" and approved_nbfc in (" + lenderString + ")");

        }
        if (req.body.gender && req.body.gender.length) {
            conditions.push(" and gender in (" + genderString + ")");

        }

        if (req.body.start_date && req.body.end_date) {
            const fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            const toDate = moment(req.body.end_date).format('YYYY-MM-DD');
            conditions.push("  and collection_date BETWEEN '" + fromDate + "' AND '" + toDate + "'");

        }
        if (req.body.tool == "Daily") {
            Duration = " DATE_FORMAT(collection_date,'%d/%m/%Y') as date";
        } else if (req.body.tool == "Weekly") {
            Duration = " CONCAT(DATE_FORMAT(collection_date - INTERVAL (WEEKDAY(collection_date)) DAY, '%d/%m/%Y'),'-',DATE_FORMAT(collection_date - INTERVAL (WEEKDAY(collection_date) - 6) DAY, '%d/%m/%Y')) as date";
        } else if (req.body.tool == "Monthly") {
            Duration = " CONCAT(LPAD(MONTH(collection_date), 2, '0'), '/', YEAR(collection_date)) as date";
        } else {
            Duration = " YEAR(collection_date) as date";
        }

        QUERY = "SELECT pincode, " + Duration + ", SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) AS paid, SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) AS unpaid,COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) AS paid_count,COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END) AS unpaid_count,(COUNT(CASE WHEN status_b = 'Paid' THEN 1 END) + COUNT(CASE WHEN status_b = 'UnPaid' THEN 1 END)) AS grand_sum,SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END) AS total,ROUND((SUM(CASE WHEN status_b = 'Paid' THEN pos ELSE 0 END) * 100.0) /SUM(CASE WHEN status_b IN ('Paid','UnPaid') THEN pos ELSE 0 END), 2) AS paid_percentage,ROUND((SUM(CASE WHEN status_b = 'UnPaid' THEN pos ELSE 0 END) * 100.0) / SUM(CASE WHEN status_b IN ('Paid', 'UnPaid') THEN pos ELSE 0 END), 2) AS unpaid_percentage FROM `master` WHERE id>0 ";


        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        if (req.body.loanAmount && req.body.loanAmount.length) {
            QUERY += manageCustomQuery(req.body.loanAmount, 'loan_amount')

        }
        if (req.body.age && req.body.age.length) {
            QUERY += manageCustomQuery(req.body.age, 'age')

        }
        QUERY += " GROUP BY date ORDER BY collection_date ASC";
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
        console.error("Error occurred while fetching data:", error);
        return res.status(500).send({ message: "Internal server error." });

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


        let QUERY = "SELECT DISTINCT bucket FROM master ORDER BY CASE WHEN bucket = 'Above 150K' THEN 9999999  ELSE CAST(SUBSTRING_INDEX(bucket, '-', 1) AS UNSIGNED) END,  CASE  WHEN bucket = 'Above 150K' THEN NULL  ELSE CAST(SUBSTRING_INDEX(bucket, '-', -1) AS UNSIGNED) END;";


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


        let QUERY = "SELECT distinct(agency_name) FROM master  order by agency_name asc ";


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


        let QUERY = "SELECT distinct(product_type) FROM master  order by product_type asc ";


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
        console.log(req.user)


        let QUERY = "SELECT distinct(state) FROM master  order by state asc ";


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
export const getCityByState = async (req, res, next) => {
    try {
        let astateString = '';
        let QUERY = '';

        if (req.body.states && req.body.states.length) {
            astateString = req.body.states.map(item => `'${item}'`).join(',');
        }
        if (req.body.states && req.body.states.length) {
            QUERY = "SELECT distinct(city) FROM master  where state in (" + astateString + ") order by city asc ";
        } else {
            QUERY = "SELECT distinct(city) FROM master  order by city asc ";
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
            QUERY = "SELECT distinct(pincode) FROM master  where city in (" + acitiesString + ") order by pincode asc ";
        } else {
            QUERY = "SELECT distinct(pincode) FROM master  order by pincode asc ";
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


        let QUERY = "SELECT distinct(campaign) FROM master  order by campaign asc ";


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


        let QUERY = "SELECT distinct(approved_nbfc) FROM master  order by approved_nbfc asc ";


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
        master
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
        master
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







