const mongoose = require('mongoose');

const ClickSchema = new mongoose.Schema({
  timestamp: Date,
  device: String,
  browser: String,
  referrer: String,
  geo: {
    country: String,
    city: String,
    region: String,
    lat: Number,
    lon: Number
  },
  utmSource: String,
  utmMedium: String,
  utmCampaign: String,
}, { _id: false });

const CampaignSchema = new mongoose.Schema({
  user:         { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  title:        String,
  artistName:   String,
  artwork:      String,
  slug:         { type: String, unique: true },
  releaseDate:  Date,
  serviceLinks: {
    spotify: String,
    apple:   String,
    boomplay:String,
    audiomack:String,
    youtube: String,
  },
  vanitySlug: {
    type:     String,
    unique:   true,
    sparse:   true,
    trim:     true,
    lowercase:true,
  },
  customCSS:   { type: String, default: "" },
  subdomain:   { type: String, unique: true, sparse: true },
  type:        String, // presave or smart-link
  status:      {
    type: String,
    enum: ["upcoming", "released"],
    default: "upcoming",
  },
  fanFunnels: [{
    sessionId: String,
    clickedAt: Date,
    email:     String,
    emailAt:   Date,
    followed:  Boolean,
    followedAt:Date
  }],
  analytics: {
    clicks:     { type: [ClickSchema], default: [] },
    countries:  [String],
    devices:    [String],
    timestamps: [Date],
  },
  emails: [{
    email:       String,
    collectedAt: { type: Date, default: Date.now },
  }],
  logo:            { type: String, default: "" },
  bgType:          { type: String, enum: ["artwork","solid","none"], default: "artwork" },
  bgColor:         { type: String, default: "#000000" },
  blurPx:          { type: Number, default: 20 },
  ctaMessage:      String,
  workspace:       { type: mongoose.Schema.Types.ObjectId, ref: 'Workspace' },
  liveStreamUrl:   { type: String, default: "" },
}, {
  // ← Mongoose schema options go here:
  timestamps: true
});

module.exports = mongoose.model('Campaign', CampaignSchema);
