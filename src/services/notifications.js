// services/notification.js
const nodemailer = require('nodemailer');
const webpush = require('../utils/webpush'); // ✅ Use the shared configured webpush
const Subscription = require('../models/PushSubscription');

// 1) configure your mail transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
});

// 2) Send transactional email
async function sendEmail(to, subject, html) {
  await transporter.sendMail({ from: '"Aday" <noreply@aday.io>', to, subject, html });
}

// 3) Broadcast a push notification to all subscribers of a campaign
async function broadcastWebPush(campaignSlug, payload) {
  const subs = await Subscription.find({ campaignSlug });
  await Promise.all(subs.map(s =>
    webpush.sendNotification(s.subscription, JSON.stringify(payload)).catch((err) => {
      console.error(`❌ Push notification failed for [${s.endpoint}]:`, err);
    })
  ));
}

module.exports = { sendEmail, broadcastWebPush };
