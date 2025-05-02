// routes/subscription.routes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { sendWelcomeEmail } = require('../services/emailService');


// POST /subscribe/essential
// … your imports …

router.post('/subscribe/essential', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) 
    return res.status(404).json({ message: 'User not found' });

  // ⛔️ Block if trial still active
  if (user.subscriptionPlan === 'essential' && user.trialExpiresAt > Date.now()) {
    return res.status(400).json({
      message: `Your 14-day trial is already active until ${user.trialExpiresAt.toLocaleDateString()}.`
    });
  }
  // ⛔️ Block if already Premium
  if (user.subscriptionPlan === 'premium') {
    return res.status(400).json({ message: 'You’re already on Premium.' });
  }

  // Otherwise start the trial
  user.subscriptionPlan = 'essential';
  user.trialExpiresAt = new Date(Date.now() + 14*24*60*60*1000);
  await user.save();

  try { await sendWelcomeEmail(user.email, user.name); }
  catch (e) { console.error('Failed welcome email:', e); }

  return res.json({ user });
});



module.exports = router;
