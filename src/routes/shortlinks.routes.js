const express = require('express');
const Click     = require('../models/Click');
const ShortLink = require('../models/ShortLink');
const webpush = require("../utils/webpush");
const PushSub = require("../models/PushSubscription");
const router = express.Router();

// Use dynamic import for nanoid
let nanoid;
(async () => {
  const { nanoid: _nanoid } = await import('nanoid');
  nanoid = _nanoid;
})();

// Create short link
router.post('/:campaignId', async (req, res) => {
  if (!nanoid) {
    const { nanoid: _nanoid } = await import('nanoid');
    nanoid = _nanoid;
  }

  const code = nanoid(8);
  const target = req.body.target;
  const sl = await ShortLink.create({ code, target, campaign: req.params.campaignId });
  res.json({ shortUrl: `${process.env.BASE_URL}/${code}` });
});

// Redirect short link
router.get('/:code', async (req, res) => {
    const io = req.app.get('socketio');
    // load link + campaign slug
    const sl = await ShortLink.findOne({ code: req.params.code }).populate('campaign');
    if (!sl) return res.status(404).send('Not found');
  
    // 1) record click
    const newClick = await Click.create({
      campaign:  sl.campaign._id,
      ip:        req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date()
    });
  
    // 2) emit to any clients in this campaign room
    
    io.to(sl.campaign.slug).emit('click', {
      campaign: sl.campaign.slug,
      at:       newClick.createdAt,
      ip:       newClick.ip,
    });

     // — Web‑Push notify —
 const subs = await PushSub.find({ campaign: sl.campaign });
 const payload = JSON.stringify({
   title: "New click!",
   body: `At ${new Date(newClick.timestamp).toLocaleTimeString()}`,
   url: `${process.env.FRONTEND_URL}/campaign/${sl.campaign}`
 });
 subs.forEach(sub => {
   webpush
     .sendNotification(
       { endpoint: sub.endpoint, keys: sub.keys },
       payload
     )
     .catch(err => console.error("Push error:", err));
 });
  
    // 3) redirect as before
    res.redirect(sl.target);
  });

module.exports = router;
