const mongoose = require('mongoose');

const CampaignSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  artwork: String,
  releaseDate: Date,
  serviceLinks: {
    spotify: String,
    apple: String,
    boomplay: String,
    audiomack: String,
    youtube: String,
  },
  type: String, // pre-save or smart-link
  status: String,
  analytics: {
    clicks: { type: Number, default: 0 },
    countries: [String],
    devices: [String],
  },
});

module.exports = mongoose.model('Campaign', CampaignSchema);
