import bcrypt from "bcrypt";
import Joi from "joi";
import db from "../config/db.js"; // Assuming "../config/db.js" provides database functionality
import { dirname } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import moment from "moment";

const __dirname = dirname(fileURLToPath(import.meta.url));

const CURRENT_TIMESTAMP = new Date();


export const callLog = async (req, res, next) => {
    try {

        let conditions = [];
        let queryParams = [];
        let QUERY = '';
        let campaignString = '';
        let lenderString = '';

        if (req.body.campaign_id && req.body.campaign_id.length) {
            campaignString = req.body.campaign_id.map(item => `'${item}'`).join(',');
        }
        if (req.body.lender_id && req.body.lender_id.length) {
            lenderString = req.body.lender_id.map(item => `'${item}'`).join(',');
        }

        if (req.body.lead_id) {
            conditions.push(" and lead_id = '" + req.body.lead_id + "'");
        }
        if (req.body.phone_number) {
            conditions.push(" and phone_number = '" + req.body.phone_number + "'");
        }
        if (req.body.user) {
            conditions.push(" and user = '" + req.body.user + "'");
        }
        if (req.body.status) {
            conditions.push(" and status = '" + req.body.status + "'");

        }
        if (req.body.campaign_id && req.body.campaign_id.length) {
            conditions.push(" and campaign_id in (" + campaignString + ")");

        }
        if (req.body.lender_id && req.body.lender_id.length) {
            conditions.push(" and lender in (" + lenderString + ")");

        }

        if (req.body.start_date && req.body.end_date) {
            const fromDate = moment(req.body.start_date).format('YYYY-MM-DD');
            const toDate = moment(req.body.end_date).format('YYYY-MM-DD');
            conditions.push("  and call_date BETWEEN '" + fromDate + "' AND '" + toDate + "'");
        }
        if (req.body.tool == "Daily") {
            QUERY = "SELECT lender,user, campaign_id,status, DATE_FORMAT(call_date,'%d/%m/%Y') as date, COUNT(status) as connected_call FROM call_log";
        } else if (req.body.tool == "Weekly") {
            QUERY = "SELECT lender,user, campaign_id,status,CONCAT(DATE_FORMAT(call_date - INTERVAL (WEEKDAY(call_date)) DAY, '%d/%m/%Y'),'-',DATE_FORMAT(call_date - INTERVAL (WEEKDAY(call_date) - 6) DAY, '%d/%m/%Y')) as date,COUNT(status) as connected_call  FROM call_log";

        } else if (req.body.tool == "Monthly") {
            QUERY = "SELECT lender,user, campaign_id,status, CONCAT(LPAD(MONTH(call_date), 2, '0'), '/', YEAR(call_date)) as date,COUNT(status) as connected_call        FROM call_log";
        } else {
            QUERY = "SELECT lender,user, campaign_id,status,  YEAR(call_date) as date,  COUNT(status) as connected_call  FROM call_log";
        }
        QUERY += " WHERE status IN ('B', 'PTP', 'CALLBK')";

        if (conditions.length > 0) {
            QUERY += conditions.join(" ");

        }
        QUERY += " GROUP BY   date ORDER BY call_date ASC";

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
            console.log(result);
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


        let QUERY = "SELECT distinct(campaign_id) FROM call_log  order by campaign_id asc ";


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            console.log(result);
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

export const getAllLender = async (req, res, next) => {
    try {


        let QUERY = "SELECT distinct(lender) FROM call_log  order by lender asc ";


        db.query(QUERY, function (error, result) {
            if (error) {
                console.error("Error occurred while querying the database:", error);
                return res.status(500).send({ message: "Internal server error." });
            }
            console.log(result);
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


export const home = async (req, res, next) => {
    try {
        // res.render('public/callLog.html');
        res.writeHead(200, { 'Content-Type': 'text/html' });

        var file = fs.createReadStream('public/callLog.html');
        file.pipe(res);


    } catch (error) {
        console.error("Error occurred while updating school:", error);
        return res.status(500).send({ message: "Internal server error." });
    }
};


// for weekly *********************************************************************************
// SELECT
//     CONCAT(
//         DATE_FORMAT(call_date - INTERVAL (WEEKDAY(call_date)) DAY, '%d/%m/%Y'),
//         '-',
//         DATE_FORMAT(call_date - INTERVAL (WEEKDAY(call_date) - 6) DAY, '%d/%m/%Y')
//     ) as week_range,
//     COUNT(status) as connected_call
// FROM
//     call_log
// WHERE
//     status IN ("B", "PTP", "CALLBK")
//     AND call_date BETWEEN '2023-01-01' AND '2024-05-20'
// GROUP BY
//     week_range
// ORDER BY
//     week_range;




//DAILY QUERY****************************************************************************************
// SELECT
//     DATE_FORMAT(call_date, '%d/%m/%Y') as date,
//     COUNT(status) as connected_call
// FROM
//     call_log
// WHERE
//     status IN ("B", "PTP", "CALLBK")
//     AND call_date BETWEEN '2023-01-01' AND '2024-05-20'
// GROUP BY
//     date
// ORDER BY
//     date;



// MONTHLY QUERY ******************************************************************************
// SELECT
//     CONCAT(YEAR(call_date), '/', LPAD(MONTH(call_date), 2, '0')) as month,
//     COUNT(status) as connected_call
// FROM
//     call_log
// WHERE
//     status IN ("B", "PTP", "CALLBK")
//     AND call_date BETWEEN '2023-01-01' AND '2024-05-20'
// GROUP BY
//     YEAR(call_date), MONTH(call_date)
// ORDER BY
//     YEAR(call_date), MONTH(call_date);


