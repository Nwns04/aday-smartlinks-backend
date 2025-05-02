// models/Click.js
const mongoose = require('mongoose');

const ClickSchema = new mongoose.Schema({
  campaign:    { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  ip:          { type: String },
  userAgent:   { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Click', ClickSchema);
