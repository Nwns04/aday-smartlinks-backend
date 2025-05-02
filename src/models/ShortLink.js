// models/ShortLink.js
const mongoose = require('mongoose');
const ShortLinkSchema = new mongoose.Schema({
  code:    { type: String, unique: true },
  target:  String,
  campaign:{ type: mongoose.Schema.Types.ObjectId, ref: 'Campaign' }
});
module.exports = mongoose.model('ShortLink', ShortLinkSchema);
