const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: String,
  spotifyId: String,
  spotifyRefreshToken: String,
  spotifyTokenExpiresAt: Date,
  spotifyArtistId: String,
  artistName: String,
  name: String,
  email: String,
  profileImage: String,
  emailGoal: {
    type: Number,
    default: 100,
  },
  
  subdomain: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  customDomain: {
    type: String,
    unique: true,
    lowercase: true,
    trim: true,
  },
  customDomainVerified: {
    type: Boolean,
    default: false,
  },

  isArtist: {
    type: Boolean,
    default: false,
  },
  isVerifiedArtist: {
    type: Boolean,
    default: false,
  },
  dashboardLayout: { type: Object, default: {} }, // For customizable layouts
  achievements: { type: [String], default: [] },    // List of achievement identifiers
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String, default: "" },
  subscriptionPlan: { 
  type: String, 
  enum: ["essential", "premium"], 
  default: null   // User must explicitly choose a plan
},
trialExpiresAt: { 
  type: Date, 
  default: null 
},


  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
