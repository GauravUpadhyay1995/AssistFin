// cronJobs.js
import cron from 'node-cron';
import db from './config/db.js';
import { format } from 'date-fns';

// Function to set up cron jobs
const WaiverPolicyExpiry = async () => {
    // Schedule a task to run every 10 seconds
    // cron.schedule('0 0 * * *', async () => { // Changed to run every 10 seconds for testing
    cron.schedule('*/10 * * * * *', async () => {
        try {
            const RuleQuery = `SELECT id, expiry_date FROM tbl_waiver_rules`;
            const results = await db.query(RuleQuery);
            console.log(results)

            for (const result of results) {
                const isExpired = checkExpiry(result.expiry_date);


                if (!isExpired) {
                    const UpdateRuleQuery = `UPDATE tbl_waiver_rules SET isExpired = 1 WHERE id = ?`;
                    await db.query(UpdateRuleQuery, [result.id]);
                    console.log(`Policy with ID ${result.id} has expired and updated.`);
                }
            }

        } catch (error) {
            console.error('Error fetching or updating waiver rules:', error);
        }
    });
};

// Function to set up cron jobs
const WaiverRequestSchemeExpiry = async () => {
    // Schedule a task to run every 10 seconds
    cron.schedule('0 0 * * *', async () => { // Changed to run every 10 seconds for testing
        try {
            const RuleQuery = `SELECT tbl_waiver_rules.isExpired as PolicyExpired,tbl_waiver_rules.expiry_date,tbl_waiver_requests.id as waiver_req_id, tbl_waiver_requests.scheme_expiry,tbl_waiver_requests.waiver_rule_id FROM tbl_waiver_requests inner join tbl_waiver_rules on tbl_waiver_requests.waiver_rule_id=tbl_waiver_rules.id`;
            const results = await db.query(RuleQuery);

            for (const result of results) {
                if (result.PolicyExpired) {
                    const UpdateRuleQuery = `UPDATE tbl_waiver_requests SET isExpired = 1 WHERE id = ?`;
                    await db.query(UpdateRuleQuery, [result.waiver_req_id]);
                    console.log(`Scheme with ID ${result.waiver_req_id} has expired and updated.`);

                } else {
                    const isExpired = checkExpiry(result.scheme_expiry);


                    if (!isExpired) {
                        const UpdateRuleQuery = `UPDATE tbl_waiver_requests SET isExpired = 1 WHERE id = ?`;
                        await db.query(UpdateRuleQuery, [result.waiver_req_id]);
                        console.log(`Rule with ID ${result.waiver_req_id} has expired and updated.`);
                    }

                }
            }

        } catch (error) {
            console.error('Error fetching or updating waiver rules:', error);
        }
    });
};

// Function to check if the expiry date has passed
const checkExpiry = (expiryDateStr, date2 = false) => {
    const expiryDate = new Date(expiryDateStr);
    let currentDate = '';
    if (date2) {
        currentDate = new Date(date2);
    } else {
        currentDate = new Date();
    }


    return expiryDate >= currentDate; // Return true if not expired, false if expired
};

export { WaiverPolicyExpiry, WaiverRequestSchemeExpiry };
