const mongoose = require('mongoose');

const BioLinkSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title: String,
  slug: { type: String, unique: true },
  profileImage: String,
  bio: String,
  socialLinks: {
    instagram: String,
    twitter: String,
    tiktok: String,
    youtube: String,
    website: String,
  },
  musicLinks: {
    spotify: String,
    apple: String,
    audiomack: String,
  },
  merchLink: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('BioLink', BioLinkSchema);
