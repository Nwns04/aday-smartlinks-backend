//services/emailService.js
require('dotenv').config();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,       // e.g., Mailtrap SMTP host
  port: Number(process.env.MAIL_PORT) || 2525,     // e.g., 2525
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
    
  },
  secure: false,    
});
console.log("MAIL_HOST:", process.env.MAIL_HOST);
console.log("MAIL_PORT:", process.env.MAIL_PORT);
console.log("MAIL_USER:", process.env.MAIL_USER);

async function sendEmail({ from, to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: from || `"ADAY Team" <${process.env.MAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email sent:", info.response);
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
}

async function sendWelcomeEmail(email, name) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Welcome ${name}!</h2>
      <p>Thank you for joining ADAY Smartlinks. Explore features like campaign creation, analytics, and artist verification to boost your presence.</p>
      <p>Get started by visiting your dashboard: <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">Your Dashboard</a></p>
      <p>Best regards,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: "Welcome to ADAY Smartlinks!",
    html,
  });
}

async function sendArtistWelcomeEmail(email, name) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Congratulations ${name}!</h2>
      <p>Your account has been verified as an artist.</p>
      <p>You now have access to enhanced insights like Fan Funnel, Geo Insights, and more. Visit your dashboard to see your performance metrics.</p>
      <p>Explore your dashboard: <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">View Dashboard</a></p>
      <p>All the best,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: "You're Now a Verified Artist on ADAY!",
    html,
  });
}

async function sendCampaignCreatedEmail(campaign, email) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Your Campaign Has Been Created!</h2>
      <p>Campaign Title: <strong>${campaign.title}</strong></p>
      <p>Status: ${campaign.status || "Upcoming"}</p>
      <p>You can manage your campaign by logging into your dashboard: 
        <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">Dashboard</a>
      </p>
      <p>Thank you for choosing ADAY Smartlinks!</p>
      <p>Best,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: "Campaign Created Successfully",
    html,
  });
}

async function sendCampaignReleaseNotification(campaign, email) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Your campaign "<strong>${campaign.title}</strong>" is now live!</h2>
      <p>Your presave campaign has been released successfully. Visit your dashboard to review performance insights and share your campaign.</p>
      <p><a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">View Dashboard</a></p>
      <p>Congratulations!<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: `Campaign "${campaign.title}" is now live!`,
    html,
  });
}

async function sendAnalyticsDigest(email, digestData) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Campaign Analytics Digest</h2>
      <p>Here is a summary of your campaign performance:</p>
      <ul>
        <li>Total Campaigns: ${digestData.totalCampaigns}</li>
        <li>Total Clicks: ${digestData.totalClicks}</li>
        <li>Total Emails: ${digestData.totalEmails}</li>
        <li>Average CTR: ${digestData.avgCTR}%</li>
      </ul>
      <p>For more details, visit your dashboard: <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">Your Dashboard</a></p>
      <p>Best regards,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: "Your ADAY Analytics Digest",
    html,
  });
}

async function sendDomainConfirmationEmail(email, domain) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      <h2>Your Custom Domain/Subdomain is Set!</h2>
      <p>Congratulations! Your domain has been successfully verified and added to your account:</p>
      <p><strong>${domain}</strong></p>
      <p>You can now use this domain to share your campaigns with your fans. Visit your dashboard for more details: <a href="${process.env.FRONTEND_URL}/dashboard" style="color: #1d4ed8;">Dashboard</a></p>
      <p>Best regards,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject: "Your Domain/Subdomain is Confirmed",
    html,
  });
}

async function sendSupportEmail(email, subject, message) {
  const html = `
    <div style="font-family: sans-serif; padding: 24px;">
      ${message}
      <p>If you have any questions or need assistance, please reply to this email or contact our support team.</p>
      <p>Best regards,<br/><strong>The ADAY Team</strong></p>
    </div>
  `;
  await sendEmail({
    to: email,
    subject,
    html,
  });
}

module.exports = {
  sendEmail,
  sendWelcomeEmail,
  sendArtistWelcomeEmail,
  sendCampaignCreatedEmail,
  sendCampaignReleaseNotification,
  sendAnalyticsDigest,
  sendDomainConfirmationEmail,
  sendSupportEmail,
};
