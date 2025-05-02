const express = require("express");
const router = express.Router();
const ActivityLog = require("../models/ActivityLog");
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');

const { Types } = require('mongoose');

router.get('/:campaignId', ensureAuthenticated, async (req, res, next) => {
  const { campaignId } = req.params;

  if (!Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({ message: 'Invalid campaign ID' });
  }

  try {
    const logs = await ActivityLog.find({ campaignId })
      .populate('user', 'name');
    res.json(logs);
  } catch (err) {
    next(err);                         // global error handler
  }
});

router.post('/:campaignId', ensureAuthenticated, async (req, res, next) => {
  const { campaignId } = req.params;

  if (!Types.ObjectId.isValid(campaignId)) {
    return res.status(400).json({ message: 'Invalid campaign ID' });
  }

  try {
    const log = await ActivityLog.create({
      campaignId,
      user: req.user._id,
      message: req.body.message?.trim(),     // new field
      action: 'Note',                        // optional
      ip: req.ip
    });
    res.status(201).json(log);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
