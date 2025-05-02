const mongoose = require('mongoose');

const VariantSchema = new mongoose.Schema({
  key:     { type: String, required: true },  // e.g. "A" or "B"
  blocks:  [{ type: String }],                // simple list of HTML/text blocks
});

const ABTestSchema = new mongoose.Schema({
  campaign:   { type: mongoose.Schema.Types.ObjectId, ref: 'Campaign', required: true },
  name:       { type: String, required: true },       // e.g. "CTA Color Test"
  variants:   [VariantSchema],
  createdAt:  { type: Date, default: Date.now },
});

module.exports = mongoose.model('ABTest', ABTestSchema);
