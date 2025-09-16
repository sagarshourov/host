const cron = require('node-cron');
const { PreApproval } = require('../models');
const { Op } = require('sequelize');

// Run daily at midnight to check for expired approvals
const expirationJob = cron.schedule('0 0 * * *', async () => {
    try {
        const [updatedCount] = await PreApproval.update(
            { status: 'expired' },
            {
                where: {
                    status: 'approved',
                    expiresAt: { [Op.lt]: new Date() }
                }
            }
        );

        console.log(`Marked ${updatedCount} approvals as expired`);
    } catch (error) {
        console.error('Error in expiration job:', error);
    }
});

module.exports = expirationJob;
