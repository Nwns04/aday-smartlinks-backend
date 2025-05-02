// src/middlewares/ensureCampaignOwner.js
const Campaign = require("../models/Campaign");

module.exports = async function ensureCampaignOwner(req, res, next) {
  try {
    // we key everything by slug, not by Mongo _id
    const slug = req.params.slug;
    const c = await Campaign.findOne({ slug });
    if (!c) return res.status(404).json({ message: "Campaign not found" });

    // only the owner can continue
    if (c.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Forbidden" });
    }

    // optionally attach the campaign to req for later handlers
    req.campaign = c;
    next();
  } catch (err) {
    console.error("ensureCampaignOwner error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
