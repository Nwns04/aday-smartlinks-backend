// routes/push.routes.js
const express = require("express");
const PushSub = require("../models/PushSubscription");
const ensureAuth = require("../middlewares/ensureAuthenticated");
const router = express.Router();

// subscribe to campaign pushes
router.post("/subscribe", ensureAuth, async (req, res) => {
  // expected body: { campaignId, subscription }
  const { campaignId, subscription } = req.body;
  if (!campaignId || !subscription?.endpoint) {
    return res.status(400).json({ message: "Invalid payload" });
  }
  // dedupe by endpoint+campaign
  await PushSub.findOneAndUpdate(
    { campaign: campaignId, endpoint: subscription.endpoint },
    {
      campaign: campaignId,
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.keys.p256dh,
        auth:   subscription.keys.auth
      }
    },
    { upsert: true }
  );
  res.sendStatus(201);
});

// unsubscribe
router.post("/unsubscribe", ensureAuth, async (req, res) => {
  const { campaignId, endpoint } = req.body;
  await PushSub.deleteOne({ campaign: campaignId, endpoint });
  res.sendStatus(204);
});


router.get("/vapidPublic", (req, res) => {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key) return res.status(500).send("VAPID key not configured");
  res.send(key);
});
module.exports = router;
