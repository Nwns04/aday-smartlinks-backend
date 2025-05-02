// backend/routes/contact.js
require("dotenv").config();
const express = require("express");
const router = express.Router();
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: Number(process.env.MAIL_PORT) || 2525,
  secure: Number(process.env.MAIL_PORT) === 465,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

transporter.verify()
  .then(() => console.log("✅ Mail transporter is ready"))
  .catch(err => console.error("❌ Mail transporter error:", err));

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "All fields are required." });
  }

  try {
    await transporter.sendMail({
      from: `"${name}" <${process.env.MAIL_USER}>`,
      to: "hello@adaysmartlinks.com",
      subject: `New Contact: ${name} - Aday Smartlinks`,
      text: `
        New contact form submission:
        Name: ${name}
        Email: ${email}
        Message: ${message}
      `,
      html: buildEmailTemplate(name, email, message),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("Mail error:", err);
    return res.status(500).json({ error: "Failed to send email." });
  }
});

function buildEmailTemplate(name, email, message) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>New Contact Form Submission</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          text-align: center;
          padding: 20px 0;
          border-bottom: 1px solid #eaeaea;
          margin-bottom: 30px;
        }
        .logo {
          color: transparent;
          background: linear-gradient(to right, #3B82F6, #8B5CF6);
          -webkit-background-clip: text;
          background-clip: text;
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .content {
          background-color: #f9fafb;
          padding: 25px;
          border-radius: 8px;
          margin-bottom: 30px;
        }
        .label {
          font-weight: 600;
          color: #4b5563;
          display: inline-block;
          width: 80px;
        }
        .message {
          margin-top: 20px;
          padding: 15px;
          background-color: white;
          border-left: 4px solid #8B5CF6;
          border-radius: 4px;
        }
        .footer {
          text-align: center;
          font-size: 14px;
          color: #6b7280;
          margin-top: 30px;
          padding-top: 20px;
          border-top: 1px solid #eaeaea;
        }
        .action-btn {
          display: inline-block;
          margin-top: 20px;
          padding: 10px 20px;
          background: linear-gradient(to right, #3B82F6, #8B5CF6);
          color: white;
          text-decoration: none;
          border-radius: 6px;
          font-weight: 500;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="logo">Aday Smartlinks</div>
        <div>New Contact Form Submission</div>
      </div>
      
      <div class="content">
        <div><span class="label">Name:</span> ${name}</div>
        <div><span class="label">Email:</span> <a href="mailto:${email}">${email}</a></div>
        
        <div class="message">
          <strong>Message:</strong>
          <p>${message.replace(/\n/g, '<br>')}</p>
        </div>
        
        <a href="mailto:${email}" class="action-btn">Reply to ${name.split(' ')[0]}</a>
      </div>
      
      <div class="footer">
        <p>This message was sent via the Aday Smartlinks contact form.</p>
        <p>&copy; ${new Date().getFullYear()} Aday Smartlinks. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

module.exports = router;