// testEmail.js
require("dotenv").config(); // Ensure your .env file is loaded

const { sendSupportEmail } = require('./src/services/emailService');

const { sendCampaignReleaseNotification } = require('./src/services/emailService');

// Simulated campaign data for testing
const testCampaign = {
  title: "New Presave Campaign",
  status: "released",
  // add any other fields that your email template might use if necessary
};
 
const testEmail = "topken54@gmail.com";  // Your Mailtrap test email will capture this

(async () => {
  try {
    await sendCampaignReleaseNotification(testCampaign, testEmail);
    console.log("Campaign release notification sent successfully.");
  } catch (err) {
    console.error("Error sending campaign release notification:", err);
  }
})();