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


export const unPaidDataList = async (req, res) => {
    const updateSchema = Joi.object({
        agency_id: Joi.number().min(1).optional(),
        month: Joi.number().min(1).optional(),
        year: Joi.number().min(1970).optional(),
    });

    const { error } = updateSchema.validate(req.body);
    if (error) {
        const errorMessage = error.details.map(detail => detail.message).join(", ");
        const errorType = error.details[0].type;
        return res.status(400).json({ success: false, message: `${errorMessage}`, errorType: errorType });
    }
    try {
        let months = 1;
        let year = 1;
        if (!req.body.month) {
            const date = new Date();
            const month = (date.getMonth() + 1).toString(); // getMonth() returns 0-11, so add 1
            months = month.padStart(2, '0');
        } else {
            months = req.body.month
        }
        if (!req.body.year) {
            const date = new Date();
            year = (date.getFullYear()).toString(); // getMonth() returns 0-11, so add 1

        } else {
            year = req.body.year
        }
        const extra = req.body.agency_id > 0 ? `and up.agency_name=${req.body.agency_id}` : ``;


        const sql = `select up.* ,DATE_FORMAT(up.created_date, '%d-%m-%Y %h:%i:%s %p') as created_date,
    u1.nbfc_name AS agency_name 
    from tbl_unpaid_master${req.user.branch} up 
    inner join tbl_users u1 on up.agency_name=u1.id where YEAR(up.created_date) =${year} AND MONTH(up.created_date) = ${months} ${extra}`;
        db.query(sql, (error, result) => {
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

        console.log(sql)

    } catch (err) {
        console.error('Error processing file:', err);
        res.status(500).send('Error inserting data into MySQL');
    }
};







