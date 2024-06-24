// cronJobs.js
import cron from 'node-cron';
import db from './config/db.js';

// Function to set up cron jobs
const setupCronJobs = async () => {
    // Schedule a task to run every 10 seconds
    cron.schedule('*/10 * * * * *', async () => {
        try {
            const results = await db.query('SELECT nbfc_name FROM tbl_users WHERE id=?',['1']);
            console.log('Fetched names:', results);
        } catch (error) {
            console.error('Error fetching names:', error);
        }
    });
};

export { setupCronJobs };
