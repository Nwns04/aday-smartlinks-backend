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
    lowercase: true,
    trim: true,
    // sparse: true,
    // unique: true,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  customDomain: {
    type: String,
    unique: true,
    sparse: true,
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

UserSchema.index(
  { subdomain: 1 },
  {
    unique: true,
    partialFilterExpression: {
      subdomain: { $type: "string", $ne: "" }
    }
  }
);

// you can do the same for customDomain if you want to exclude nulls/empty strings there too:
UserSchema.index(
  { customDomain: 1 },
  {
    unique: true,
    partialFilterExpression: {
      customDomain: { $type: "string", $ne: "" }
    }
  }
);

module.exports = mongoose.models.User || mongoose.model('User', UserSchema);
