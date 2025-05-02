// models/Loyalty.js
const mongoose = require('mongoose');

const LoyaltySchema = new mongoose.Schema({
  campaign: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  user:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  points:   { type: Number, default: 0 },
  badges:   [{ name: String, awardedAt: Date }],
});

module.exports = mongoose.model('Loyalty', LoyaltySchema);
