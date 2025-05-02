const cron = require("node-cron");
const Campaign = require("../models/Campaign");
const User = require("../models/User");
const { sendCampaignReleaseNotification, sendAnalyticsDigest } = require('../services/emailService');

const checkReleasedCampaigns = (io) => {
  cron.schedule("0 0 * * *", async () => {
    try {
      const now = new Date();
      const campaigns = await Campaign.find({
        type: "presave",
        status: "upcoming",
        releaseDate: { $lte: now },
      });

      for (const campaign of campaigns) {
        campaign.status = "released";
        await campaign.save();

        // Real-time socket update
        io.emit("campaignReleased", { slug: campaign.slug, title: campaign.title });

        await sendCampaignReleaseNotification(campaign, campaign.userEmail);

        console.log(`✅ Campaign "${campaign.title}" marked as released`);
      }

      console.log(`🎯 Daily Campaign Check Completed: ${campaigns.length} updated`);
    } catch (error) {
      console.error("❌ Error checking campaign release dates:", error.message);
    }
  });

  cron.schedule("0 8 * * MON", async () => {
    const users = await User.find({});
    for (const user of users) {
      const digestData = {
        totalCampaigns: 5,
        totalClicks: 1200,
        totalEmails: 150,
        avgCTR: 12.5,
      };
      try {
        await sendAnalyticsDigest(user.email, digestData);
        console.log(`📬 Analytics digest sent to ${user.email}`);
      } catch (err) {
        console.error(`❌ Failed to send digest to ${user.email}:`, err);
      }
    }
  });
};

module.exports = checkReleasedCampaigns;
