// routes/loyalty.routes.js
const express = require('express');
const router = express.Router();
const Loyalty = require('../models/Loyalty');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');

const BADGES = [
  { name: 'Rookie',    threshold: 10  },
  { name: 'Superfan',  threshold: 50  },
  { name: 'Champion',  threshold: 100 },
];
// Grant points
router.post('/:campaignId/points', ensureAuthenticated, async (req, res) => {
  const { amount } = req.body;
  const { campaignId } = req.params;
  const userId = req.user._id;

  let record = await Loyalty.findOne({ campaign: campaignId, user: userId });
  if (!record) record = new Loyalty({ campaign: campaignId, user: userId });

  record.points += amount;

  // ▶️ Badge logic
  BADGES.forEach(badge => {
    if (
      record.points >= badge.threshold &&
      !record.badges.some(b => b.name === badge.name)
    ) {
      record.badges.push({ name: badge.name, awardedAt: new Date() });
    }
  });

  await record.save();
  res.json(record);
});

// Fetch leaderboard
router.get('/:campaignId/leaderboard', async (req, res) => {
  const { campaignId } = req.params;
  const top = await Loyalty.find({ campaign: campaignId })
    .sort({ points: -1 })
    .limit(10)
    .populate('user','name profileImage');
  res.json(top);
});

module.exports = router;
