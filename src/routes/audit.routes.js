const express = require('express');
const mongoose = require('mongoose');   
const ActivityLog = require('../models/ActivityLog');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const router = express.Router();
const gbClient = require("../utils/growthbook");

router.get('/', ensureAuthenticated, async (req, res) => { 
  try {
    const userId = req.user._id;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    // 🧠 Create scoped GrowthBook instance
    await gbClient.refreshFeatures(); // ✅ force refresh if needed

    const gb = gbClient.createScopedInstance({
      attributes: {
        id: userId.toString(),
        email: req.user.email || '',
        subscriptionPlan: req.user.subscriptionPlan || 'free',
      }
    });
    
    console.log("🟡 Flag is ON?", gb.isOn("team_audit_trail"));
    console.log("🟡 Flag Value:", gb.getFeatureValue("team_audit_trail", false));
    
    if (!gb.isOn("team_audit_trail")) {
      return res.status(404).json({ message: "Not found" });
    }

    const { workspace, campaignId } = req.query;
    
    const filter = { user: userId };
    if (workspace) filter.workspace = workspace;
    if (campaignId) filter.campaignId = campaignId;

    const logs = await ActivityLog.find(filter)
      .sort({ timestamp: -1 })
      .populate('user', 'name')
      .lean();

    return res.json(logs);
  } catch (err) {
    console.error('❌ Error in /api/audit:', err);
    return res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
