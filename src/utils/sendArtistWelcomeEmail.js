// backend/utils/sendArtistWelcomeEmail.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // or your email provider
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const sendArtistWelcomeEmail = async (email, name) => {
  const mailOptions = {
    from: `"ADAY Team" <${process.env.MAIL_USER}>`,
    to: email,
    subject: `🎶 Welcome to ADAY, ${name}!`,
    html: `
      <div style="font-family: sans-serif; padding: 24px;">
        <h2>Hey ${name} 👋,</h2>
        <p>Welcome to <strong>ADAY</strong> — your new creative home built for artists, labels, and visionaries like you.</p>

        <p>Now that you're verified as an artist, here’s what you unlock:</p>
        <ul>
          <li>✅ Exclusive insights into fan behavior & funnel tracking</li>
          <li>✅ Artist badge on your smart links</li>
          <li>✅ Early access to promotional tools</li>
          <li>✅ Personalized artist support & features</li>
        </ul>

        <p>We’re excited to support your journey. Stay creative. Stay original. We're rooting for you. 🎧</p>

        <p>With love, <br/><strong>The ADAY Team</strong></p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('🎉 Artist welcome email sent!');
  } catch (err) {
    console.error('Failed to send welcome email:', err.message);
  }
};

module.exports = sendArtistWelcomeEmail;
