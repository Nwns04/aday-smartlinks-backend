const express = require('express');
const router = express.Router();
const Click = require('../models/Click');
const ensureAuth = require('../middlewares/ensureAuthenticated');
const { Parser } = require('json2csv');

// GET JSON segments
router.get('/:slug', ensureAuth, async (req, res) => {
  const { device, country, from, to } = req.query;
  const match = { campaignSlug: req.params.slug };
  if (device)  match.device   = device;    // e.g. 'mobile'
  if (country) match.country  = country;   // e.g. 'US'
  if (from || to) match.timestamp = {};
  if (from) match.timestamp.$gte = new Date(from);
  if (to)   match.timestamp.$lte = new Date(to);

  const clicks = await Click.find(match).lean();
  res.json({ count: clicks.length, clicks });
});

// GET CSV export
router.get('/:slug/export', ensureAuth, async (req, res) => {
  const { device, country, from, to } = req.query;
  const match = { campaignSlug: req.params.slug };
  if (device)  match.device   = device;
  if (country) match.country  = country;
  if (from || to) match.timestamp = {};
  if (from) match.timestamp.$gte = new Date(from);
  if (to)   match.timestamp.$lte = new Date(to);

  const clicks = await Click.find(match).lean();
  const fields = ['timestamp','device','country','referrer','browser'];
  const parser = new Parser({ fields });
  const csv = parser.parse(clicks);
  res.header('Content-Type','text/csv');
  res.attachment(`${req.params.slug}-segments.csv`);
  res.send(csv);
});

module.exports = router;
