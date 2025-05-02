// models/PushSubscription.js
const mongoose = require("mongoose");

const PushSubSchema = new mongoose.Schema({
  campaign:    { type: mongoose.Types.ObjectId, ref: "Campaign", required: true },
  endpoint:    String,
  keys: {
    p256dh:    String,
    auth:      String
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model("PushSubscription", PushSubSchema);
