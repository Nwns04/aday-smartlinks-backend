// src/models/ActivityLog.js
const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  campaignId: { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  user:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',     required: true },
  message:    { type: String },           // ← added so “Team Notes” works
  action:     { type: String },           // keep if you still need it
  ip:         { type: String },
  before:     { type: mongoose.Schema.Types.Mixed },
  after:      { type: mongoose.Schema.Types.Mixed },
  timestamp:  { type: Date, default: Date.now }
});

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
