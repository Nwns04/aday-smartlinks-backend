const express = require("express");
const axios = require("axios");
const router = express.Router();
const User = require("../models/User");
const { sendWelcomeEmail } = require('../services/emailService');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL; // e.g., https://yourfrontend.com

// POST /payment/initiate
// Expected payload: { email: string, plan: "premium" }
router.post("/initiate", async (req, res) => {
  try {
    const { email, plan } = req.body;
    if (!email || plan !== "premium") {
      return res.status(400).json({ message: "Invalid payment parameters" });
    }

    // ── ① Fetch the user
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // ── ② Block if already premium
    if (user.subscriptionPlan === "premium") {
      return res.status(400).json({ message: "You already have Premium." });
    }

    // (Optional) If you don’t want them to upgrade mid-trial, also block
    if (user.subscriptionPlan === "essential" && user.trialExpiresAt > Date.now()) {
      return res.status(400).json({
        message: `Your trial runs until ${user.trialExpiresAt.toLocaleDateString()}; you can upgrade afterward.`,
      });
    }

    // ── ③ Otherwise, kick off Paystack
    const amount = 1900 * 100; // e.g. NGN
    const metadata = {
      custom_fields: [{
        display_name: "user_email",
        variable_name: "user_email",
        value: email,
      }],
    };

    const initRes = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email,
        amount,
        callback_url: `${FRONTEND_URL}/payment/verify`,
        metadata,
      },
      { headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          "Content-Type": "application/json",
      }}
    );

    return res.json({ authorization_url: initRes.data.data.authorization_url });
  } catch (err) {
    console.error("Error initiating payment:", err.response?.data || err.message);
    return res.status(500).json({ message: "Payment initiation failed" });
  }
});

// POST /payment/webhook
// This endpoint will be hit by Paystack when a transaction event occurs.
// routes/payment.routes.j

router.post("/webhook", async (req, res) => {
  const event = req.body;
  if (event.event === "charge.success") {
    // … verify and find user …
    if (user) {
      user.isPremium = true;
      user.subscriptionPlan = "premium";
      user.trialExpiresAt = null;
      await user.save();

      // ── send welcome email ──
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (err) {
        console.error('Failed to send premium-plan welcome email:', err);
      }
    }
  }
  res.sendStatus(200);
});



module.exports = router;
