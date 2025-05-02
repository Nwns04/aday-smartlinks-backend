// routes/campaigns.routes.js
const express = require('express');
const Campaign = require('../models/Campaign');
const router = express.Router();
const slugify = require('slugify');
const User = require('../models/User');
const querystring = require('querystring');
const mongoose = require('mongoose');
const UAParser = require('ua-parser-js');
const geoip = require('geoip-lite');
const analyticsController = require("../controllers/analyticsController");
const { Parser } = require('json2csv');
const axios = require('axios');
const url = require("url");
const ensurePremium = require('../middlewares/ensurePremium');
const ensureSubscription    = require("../middlewares/ensureSubscription");
const MAX_ESSENTIAL_CAMPAIGNS = 10;
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const ensureCampaignOwner = require("../middlewares/ensureCampaignOwner");
const Workspace = require('../models/Workspace');
const { withAudit } = require('../middlewares/auditLog');
const gbClient = require("../utils/growthbook");
const ActivityLog = require("../models/ActivityLog");
const forecastController = require('../controllers/forecastController');
const { sendEmail } = require("../services/emailService");

const PushSub = require('../models/PushSubscription');
const webpush  = require('../utils/webpush');
// Redirect old URLs to new format
router.get('/link/:slug', async (req, res) => {
  if (!req.growthbook.isOn("enable-new-campaign-flow")) {
    return res.status(403).json({ message: "New campaign flow is disabled." });
  }
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Not found' });
    return res.redirect(301, `/${campaign.slug}`);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/forecast/:slug', forecastController.getForecast);

router.get('/:slug/geo', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const clicks = campaign.analytics?.clicks || [];

    const countryBreakdown = {};
    const cityBreakdown = {};
    const regionBreakdown = {};

    clicks.forEach((click) => {
      const country = click.geo?.country || 'Unknown';
      const city = click.geo?.city || 'Unknown';
      const region = click.geo?.region || 'Unknown';

      countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
      cityBreakdown[city] = (cityBreakdown[city] || 0) + 1;
      regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
    });

    res.json({
      country:  campaign.analytics.countries.slice(-1)[0] || null,
      city:     campaign.analytics.clicks.slice(-1)[0]?.geo.city   || null,
      region:   campaign.analytics.clicks.slice(-1)[0]?.geo.region || null,
      lat:      campaign.analytics.clicks.slice(-1)[0]?.geo.lat    || null,
      lon:      campaign.analytics.clicks.slice(-1)[0]?.geo.lon    || null,
    });
  } catch (error) {
    console.error("Geo Insights Error:", error.message);
    res.status(500).json({ message: 'Failed to fetch geo insights' });
  }
});

router.get('/:slug/top-fans',ensureAuthenticated, ensurePremium, ensureSubscription, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const fans = campaign.fanFunnels || [];

    // Filter fans with email collected
    const topFans = fans
      .filter(f => f.email)
      .sort((a, b) => new Date(a.clickedAt) - new Date(b.clickedAt)) // Earliest first
      .slice(0, 10); // Top 10 only

    const formatted = topFans.map((fan, index) => ({
      rank: index + 1,
      email: fan.email,
      clickedAt: fan.clickedAt,
      followed: fan.followed || false,
    }));

    res.json({ topFans: formatted });
  } catch (err) {
    console.error("Top Fans Fetch Error:", err.message);
    res.status(500).json({ message: 'Failed to fetch top fans' });
  }
});
// Create Campaign with clean slug
// Create Campaign with clean slug
router.post('/', ensureAuthenticated, async (req, res) => {
  if (req.body.workspaceId) {
    const ws = await Workspace.findById(req.body.workspaceId)
    if (!ws || !ws.members.some(m => m.user.equals(req.user._id))) {
      return res.status(403).json({ message: 'Not a member of that workspace' })
    }
    req.body.workspace = ws._id
  }
  console.log("🚀 Incoming campaign create request:", req.body);
console.log("🔐 Authenticated user:", req.user);

  try {
    const { title, userEmail, vanitySlug } = req.body;
    const user = await User.findOne({ email: req.body.userEmail });
  if (!user) return res.status(400).json({ message: 'User not found' });
  console.log("🔍 Searching user by email:", req.body.userEmail);

  if (user.subscriptionPlan === 'essential') {
    const count = await Campaign.countDocuments({ user: user._id });
    if (count >= MAX_ESSENTIAL_CAMPAIGNS) {
      return res.status(403).json({
        message: `Essential plan allows up to ${MAX_ESSENTIAL_CAMPAIGNS} campaigns. Upgrade to Premium for unlimited.`,
      });
    }
  }

    // 1. Generate default slug
    let slug = slugify(title, { 
      lower: true,
      strict: true,
      remove: /[*+~.()'"!:@]/g
    });

    let counter = 1;
    let originalSlug = slug;
    while (await Campaign.findOne({ slug })) {
      slug = `${originalSlug}-${counter}`;
      counter++;
    }

    // ✅ 2. Handle vanitySlug
    let finalVanitySlug = null;
    if (user.isPremium && vanitySlug) {
      const cleanVanity = vanitySlug.toLowerCase().trim();
      const reserved = ['aday', 'admin', 'api', 'a', 'campaign', 'create'];

      const exists = await Campaign.findOne({ vanitySlug: cleanVanity });
      if (reserved.includes(cleanVanity) || exists) {
        return res.status(400).json({ message: "Vanity slug not available" });
      }

      finalVanitySlug = cleanVanity;
    }
    const payload = {
      ...req.body,
      slug,
      user: user._id,
      subdomain: req.body.subdomain || undefined,
    };
    if (finalVanitySlug) {
      payload.vanitySlug = finalVanitySlug;
    } else {
      delete payload.vanitySlug;
    }
    // 3. Create campaign
    const campaign = await Campaign.create(payload);

    res.status(201).json(campaign);
  } catch (error) {
    console.error("🔥 Campaign creation failed:", error.message, error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Update Campaign details (with audit trail)
// router.patch(
//   '/:slug',
//   ensureAuthenticated,
//   // ensureSubscription,
//   ensureCampaignOwner,               // ← make sure only owners can edit
//   withAudit('Update Campaign'),     // ← wrap with your audit middleware
//   async (req, res) => {
//     const updates = req.body;
//     const campaign = await Campaign.findOneAndUpdate(
//       { slug: req.params.slug },
//       updates,
//       { new: true }
//     );
//     if (!campaign) return res.status(404).json({ message: 'Not found' });
//     res.json(campaign);
//   }
// );

router
  .route("/:slug")
  // READ for owner
  .get(
    ensureAuthenticated,
    ensureCampaignOwner,
    async (req, res) => {
      res.json(req.campaign);
    }
  )
  // UPDATE
  .patch(
    ensureAuthenticated,
    ensureCampaignOwner,
    async (req, res) => {
      const updates = req.body;
      const updated = await Campaign.findOneAndUpdate(
        { slug: req.params.slug },
        updates,
        { new: true }
      );
      res.json(updated);
    }
  )
  // DELETE
  .delete(
    ensureAuthenticated,
    ensureCampaignOwner,
    async (req, res) => {
      await Campaign.deleteOne({ slug: req.params.slug });
      res.status(204).end();
    }
  );


// Public Link - Get Campaign
router.get('/public/:slug', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Not found' });

    const now = new Date();
    if (campaign.type === "presave" && campaign.releaseDate <= now && campaign.status !== "released") {
      campaign.status = "released";
      await campaign.save();
    }

    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// Track Clicks
router.get("/track/:slug", async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // Parse UTM params
    const referrer = req.get("Referrer") || req.originalUrl || "";
    const parsedUrl = url.parse(referrer, true);
    const utmSource = parsedUrl.query.utm_source || null;
    const utmMedium = parsedUrl.query.utm_medium || null;
    const utmCampaign = parsedUrl.query.utm_campaign || null;

    // Device & browser info
    const ua = UAParser(req.headers["user-agent"]);
    const device = ua.device.type || "desktop";
    const browser = ua.browser.name || "unknown";

    // Geo info
    const ip = req.headers["x-forwarded-for"]?.split(",")[0] || req.connection.remoteAddress;
    const geo = geoip.lookup(ip) || {};

    const newClick = {
      timestamp: new Date(),
      device,
      browser,
      referrer,
      geo: {
        country: geo.country || "Unknown",
        city: geo.city || "Unknown",
        region: geo.region || "Unknown",
        lat: geo.ll?.[0] || null,
        lon: geo.ll?.[1] || null,
      },
      utmSource,
      utmMedium,
      utmCampaign,
    };

    campaign.analytics.clicks.push(newClick);

    // Optional: update aggregates
    if (!campaign.analytics.devices.includes(device)) campaign.analytics.devices.push(device);
    if (!campaign.analytics.countries.includes(geo.country)) campaign.analytics.countries.push(geo.country);
    campaign.analytics.timestamps.push(newClick.timestamp);

    if (sessionId) {
      await Campaign.updateOne(
        { slug },
        {
          $setOnInsert: { "fanFunnels.$[elem].sessionId": sessionId },
          $set: { "fanFunnels.$[elem].clickedAt": new Date() }
        },
        {
          arrayFilters: [{ "elem.sessionId": sessionId }],
          upsert: true
        }
      );
    }

    await campaign.save();
    const io = req.app.get('socketio');
 io.to(req.params.slug).emit('click', click);


 // load all subs for this campaign
 const subs = await PushSub.find({ campaign: campaign._id });
 subs.forEach(sub => {
   const pushPayload = JSON.stringify({
     title: `⚡️ New click on “${campaign.title}”`,
     body:  `Device: ${click.device}, Country: ${click.country}`,
     url:   window.location.origin + `/analytics/${req.params.slug}`
   });

   webpush.sendNotification(
     { endpoint: sub.endpoint, keys: sub.keys },
     pushPayload
   ).catch(console.error);
 });
  
      // ── Award 1 point per click ──
       if (req.user) {
         // assume axios is imported at top
         axios.post(
           `${process.env.API_URL}/loyalty/${campaign._id}/points`,
           { amount: 1 },
           { headers: { Authorization: req.headers.authorization } }
         ).catch(console.error);
       }
    // Redirect to Spotify by default
    const redirectUrl = campaign.serviceLinks.spotify || "https://spotify.com";
    res.redirect(redirectUrl);
  } catch (err) {
    console.error("Tracking error:", err);
    res.status(500).json({ message: "Server error" });
  }
});



router.post('/email/:slug', async (req, res) => {
  try {
    const { email, sessionId } = req.body;
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const emailExists = campaign.emails.some(e => e.email === email);

    if (!emailExists) {
      campaign.emails.push({ email, collectedAt: new Date() });
      await campaign.save();
           // ── Award 5 points for signing up ──
    if (req.user) {
       axios.post(
         `${process.env.API_URL}/loyalty/${campaign._id}/points`,
         { amount: 5 },
         { headers: { Authorization: req.headers.authorization } }
       ).catch(console.error);
     }
    }
    if (sessionId) {
      await Campaign.updateOne(
        { slug, "fanFunnels.sessionId": sessionId },
        {
          $set: {
            "fanFunnels.$.email": email,
            "fanFunnels.$.emailAt": new Date()
          }
        }
      );
    }
    res.json({ message: 'Email saved successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


  
router.get('/analytics/:userId', ensureAuthenticated, async (req, res) => {
  try {
    const { userId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid User ID' });
    }

    // Fetch all campaigns for this user
    const campaigns = await Campaign.find({ user: userId }).populate('user');

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const analytics = campaigns.map((campaign) => {
      // Clicks & emails
      const clickArray = Array.isArray(campaign.analytics?.clicks) ? campaign.analytics.clicks : [];
      const clickCount = clickArray.length;
      const emailCount = Array.isArray(campaign.emails) ? campaign.emails.length : 0;

      // CTR
      const ctr = emailCount > 0 ? (clickCount / emailCount) * 100 : 0;
      const lowCTR = ctr < 5;

      // Inactive if no clicks in last 7 days
      const inactive = !clickArray.some(click => new Date(click.timestamp) > sevenDaysAgo);

      // Spike detection (100+ clicks in a single day)
      const dailyCount = {};
      for (const click of clickArray) {
        const day = new Date(click.timestamp).toISOString().split('T')[0];
        dailyCount[day] = (dailyCount[day] || 0) + 1;
      }
      const spike = Object.values(dailyCount).some(count => count >= 100);

      // Breakdown for location, device, platform
      const countryBreakdown = {};
      const deviceBreakdown  = {};
      const platformBreakdown = {};

      for (const click of clickArray) {
        // country
        const country = click.geo?.country || 'Unknown';
        countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;

        // device
        const device = click.device || 'Unknown';
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;

        // platform (utmSource or click.platform if you track it)
        const platform = click.utmSource || click.platform || 'Unknown';
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
      }

      return {
        title: campaign.title,
        slug: campaign.slug,
        createdAt: campaign.createdAt,
        updatedAt: campaign.updatedAt,
        clicks: clickCount,
        emailCount,
        ctr: ctr.toFixed(1),
        lowCTR,
        inactive,
        spike,
        status: campaign.status || 'active',

        // These arrays drive your “Top Country/Device/Source” UI
        locationData:    Object.entries(countryBreakdown).map(([name, clicks]) => ({ name, clicks })),
        deviceBreakdown: Object.entries(deviceBreakdown).map(([name, value]) => ({ name, value })),
        platformBreakdown: Object.entries(platformBreakdown).map(([name, value]) => ({ name, value })),
      };
    });

    res.json(analytics);
  } catch (error) {
    console.error('Analytics Fetch Error:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
});


  
  router.get('/emails/:slug', async (req, res) => {
    try {
      const campaign = await Campaign.findOne({ slug: req.params.slug });
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  
      res.json({
        title: campaign.title,
        emails: campaign.emails || [] 
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get single campaign analytics
  router.get('/analytics/detail/:slug', ensureAuthenticated, ensurePremium,  ensureSubscription, 
    async (req, res) => {
    try {
      const campaign = await Campaign.findOne({ slug: req.params.slug }).populate('user');
      if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  
      const clicks = (campaign.analytics && Array.isArray(campaign.analytics.clicks))
        ? campaign.analytics.clicks
        : [];
        
      const platformBreakdown = {};
      const deviceBreakdown = {};
      const browserBreakdown = {};
      const countryBreakdown = {};
      const cityBreakdown = {};
      const regionBreakdown = {};
      const timeSeries = {};
  
      clicks.forEach((click) => {
        // Time grouping (per day)
        const date = new Date(click.timestamp);
        const key = date.toISOString().split('T')[0];
        timeSeries[key] = (timeSeries[key] || { clicks: 0, emails: 0 });
        timeSeries[key].clicks++;

        //platform
        const platform = click.platform || 'unknown';
        platformBreakdown[platform] = (platformBreakdown[platform] || 0) + 1;
        // Devices
        const device = click.device || 'Unknown';
        deviceBreakdown[device] = (deviceBreakdown[device] || 0) + 1;
  
        // Browsers
        const browser = click.browser || 'Unknown';
        browserBreakdown[browser] = (browserBreakdown[browser] || 0) + 1;
  
        // Countries
        const country = click.geo?.country || 'Unknown';
        countryBreakdown[country] = (countryBreakdown[country] || 0) + 1;
  
        // Cities
        const city = click.geo?.city || 'Unknown';
        cityBreakdown[city] = (cityBreakdown[city] || 0) + 1;
  
        // Regions
        const region = click.geo?.region || 'Unknown';
        regionBreakdown[region] = (regionBreakdown[region] || 0) + 1;
      });
  
      res.json({
        title: campaign.title,
        slug: campaign.slug,
        type: campaign.type,
        status: campaign.status || 'active',
        createdAt: campaign.createdAt,
        clicks: clicks.length,
        emails: campaign.emails,
        timeSeries: Object.entries(timeSeries).map(([date, counts]) => ({ date, ...counts })),
        deviceBreakdown: Object.entries(deviceBreakdown).map(([name, value]) => ({ name, value })),
        browserBreakdown: Object.entries(browserBreakdown).map(([name, value]) => ({ name, value })),
        locationData: Object.entries(countryBreakdown).map(([name, clicks]) => ({ name, clicks })),
        platformBreakdown: Object.entries(platformBreakdown).map(([name, value]) => ({ name, value })),
        topCities: Object.entries(cityBreakdown)
          .map(([name, clicks]) => ({ name, clicks }))
          .sort((a, b) => b.clicks - a.clicks),
        topRegions: Object.entries(regionBreakdown)
          .map(([name, clicks]) => ({ name, clicks }))
          .sort((a, b) => b.clicks - a.clicks),
      });
    } catch (error) {
      console.error("Enhanced Analytics Error:", error.message);
      res.status(500).json({ error: error.message });
    }
  });
  


  router.get('/export/emails/:slug', ensureAuthenticated, ensurePremium,  ensureSubscription, async (req, res) => {
    try {
      const campaign = await Campaign.findOne({ slug: req.params.slug });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  
      const data = campaign.emails.map((emailObj, i) => ({
        SNo: i + 1,
        Email: emailObj.email,
        CollectedAt: emailObj.collectedAt ? new Date(emailObj.collectedAt).toISOString() : "",
      }));
  
      const parser = new Parser();
      const csv = parser.parse(data);
  
      res.header('Content-Type', 'text/csv');
      res.attachment(`${campaign.slug}-emails.csv`);
      return res.send(csv);
    } catch (err) {
      console.error("Export Emails Error:", err);
      res.status(500).json({ message: "Failed to export emails" });
    }
  });
  


router.get('/export/analytics/:slug',ensureAuthenticated, ensurePremium,  ensureSubscription, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const clicks = Array.isArray(campaign.analytics?.clicks)
      ? campaign.analytics.clicks
      : [];

    const data = clicks.map((click, i) => ({
      SNo: i + 1,
      Timestamp: new Date(click.timestamp).toLocaleString(),
      Device: click.device,
      Browser: click.browser,
      Country: click.geo?.country || '',
      City: click.geo?.city || '',
      Region: click.geo?.region || '',
      Referrer: click.referrer || '',
    }));

    const fields = [
      "SNo",
      "Timestamp",
      "Device",
      "Browser",
      "Country",
      "City",
      "Region",
      "Referrer"
    ];

    const parser = new Parser({ fields });
    const csv = parser.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(`${campaign.slug}-analytics.csv`);
    return res.send(csv);
  } catch (err) {
    console.error("Export Analytics Error:", err);
    res.status(500).json({ message: "Failed to export analytics" });
  }
});

// Get email signups timeline
router.get('/timeline/emails/:slug', async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const timeline = {};

    campaign.emails.forEach(({ collectedAt }) => {
      if (collectedAt) {
        const date = new Date(collectedAt).toISOString().split("T")[0]; // YYYY-MM-DD
        timeline[date] = (timeline[date] || 0) + 1;
      }
    });

    const data = Object.entries(timeline).map(([date, count]) => ({ date, count }));
    res.json(data);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch email timeline" });
  }
});



  // GET /api/campaigns/:slug/utm-stats
  router.get("/:slug/utm-stats", ensureAuthenticated, ensurePremium, ensureSubscription, async (req, res) => {
    try {
      const campaign = await Campaign.findOne({ slug: req.params.slug });
      if (!campaign) return res.status(404).json({ message: "Campaign not found" });
  
      const { start, end } = req.query;
      const startDate = start ? new Date(start) : null;
      const endDate = end ? new Date(end) : null;
  
      const clicks = (campaign.analytics?.clicks || []).filter((click) => {
        const ts = new Date(click.timestamp);
        return (!startDate || ts >= startDate) && (!endDate || ts <= endDate);
      });
  
      const utmGroup = { source: {}, campaign: {}, medium: {} };
  
      clicks.forEach(({ utmSource = "unknown", utmCampaign = "unknown", utmMedium = "unknown" }) => {
        utmGroup.source[utmSource] = (utmGroup.source[utmSource] || 0) + 1;
        utmGroup.campaign[utmCampaign] = (utmGroup.campaign[utmCampaign] || 0) + 1;
        utmGroup.medium[utmMedium] = (utmGroup.medium[utmMedium] || 0) + 1;
      });
  
      const formatAndSort = (obj) =>
        Object.entries(obj)
          .map(([label, count]) => ({ label, count }))
          .sort((a, b) => b.count - a.count); // sort descending
  
      res.json({
        sources: formatAndSort(utmGroup.source),
        campaigns: formatAndSort(utmGroup.campaign),
        mediums: formatAndSort(utmGroup.medium),
      });
    } catch (err) {
      console.error("Error fetching UTM stats:", err);
      res.status(500).json({ message: "Server error" });
    }
  });
  
  
// GET /api/campaigns/:slug/funnel
router.get('/:slug/funnel',ensureAuthenticated, ensurePremium,  ensureSubscription, async (req, res) => {
  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug });
    if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

    const funnels = campaign.fanFunnels || [];

    const clickCount = funnels.filter(f => f.clickedAt).length;
    const emailCount = funnels.filter(f => f.email).length;
    const followCount = funnels.filter(f => f.followed).length;

    res.json({
      slug: campaign.slug,
      clickCount,
      emailCount,
      followCount,
      total: funnels.length,
      funnelSteps: [
        { step: "Click", count: clickCount },
        { step: "Email Collected", count: emailCount },
        { step: "Followed", count: followCount }
      ]
    });
  } catch (err) {
    console.error("Funnel Fetch Error:", err.message);
    res.status(500).json({ message: "Internal server error" });
  }
});

  
router.get("/timeline/:slug",ensureAuthenticated, ensurePremium, ensureSubscription, analyticsController.getLinkClickTimeline);

router.get('/check-slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const existing = await Campaign.findOne({ slug });

    if (existing) {
      return res.json({ available: false });
    }

    res.json({ available: true });
  } catch (error) {
    console.error("Slug Check Error:", error);
    res.status(500).json({ available: false, message: "Server error" });
  }
});

const ensureEssentialOrPremium = (req, res, next) => {
  if (req.user && ['essential','premium'].includes(req.user.subscriptionPlan)) {
    return next();
  }
  return res.status(403).json({ message: 'Upgrade to Essential to use UPC Lookup.' });
};

router.get('/spotify/links', async (req, res) => {
  console.log('🔍 Hitting /campaigns/spotify/links with UPC');
  try {
    const { upc } = req.query;
    if (!upc) return res.status(400).json({ message: 'UPC is required' });

    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

    const tokenRes = await axios.post(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      {
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      }
    );

    const accessToken = tokenRes.data.access_token;
    let spotifyUrl = null;
    let releaseDate = null;

    // STEP 1: Try finding album by UPC
    const albumRes = await axios.get(`https://api.spotify.com/v1/search?q=upc:${upc}&type=album&limit=1`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const album = albumRes.data.albums.items?.[0];
    if (album) {
      spotifyUrl = album.external_urls?.spotify;
      releaseDate = album.release_date || null;
    }

    // STEP 2: Fallback to track
    if (!spotifyUrl) {
      const trackRes = await axios.get(`https://api.spotify.com/v1/search?q=upc:${upc}&type=track&limit=1`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const track = trackRes.data.tracks.items?.[0];
      if (track) {
        spotifyUrl = track.external_urls?.spotify;
        releaseDate = track.album?.release_date || null;
      }
    }

    if (!spotifyUrl) {
      return res.status(404).json({ message: 'No Spotify result found for this UPC' });
    }

    // STEP 3: Use song.link API to get all platforms
    const linkRes = await axios.get(`https://api.song.link/v1-alpha.1/links?url=${encodeURIComponent(spotifyUrl)}`);
    const data = linkRes.data;

    const entityList = Object.values(data.entitiesByUniqueId || {});
    const preferredProviders = ['spotify', 'apple', 'youtube'];
    const entity =
      entityList.find(e => preferredProviders.includes(e.apiProvider) && e.title && e.artistName) ||
      entityList.find(e => e.title && e.artistName) || {};

    const links = data.linksByPlatform || {};

    res.json({
      title: entity.title || '',
      artist: entity.artistName || '',
      artwork: entity.thumbnailUrl || '',
      releaseDate: releaseDate || '', // ✅ now populated!
      spotify: links.spotify?.url || '',
      apple: links.appleMusic?.url || '',
      youtube: links.youtube?.url || '',
      boomplay: links.boomplay?.url || '',
      audiomack: links.audiomack?.url || '',
    });
  } catch (err) {
    console.error("❌ Odesli Fetch Error:", err.message);
    res.status(500).json({ message: 'Failed to fetch links from Spotify + Odesli' });
  }
});

router.get('/:slug', async (req, res) => {
  try {
    const slug = req.params.slug;

    let user;
    if (req.customDomainUser) {
      user = req.customDomainUser;
    } else if (req.subdomainUser) {
      user = req.subdomainUser;
    } else if (req.query.username) {
      user = await User.findOne({ username: req.query.username });
    }

    let campaign = user
      ? await Campaign.findOne({ slug, user: user._id })
      : null;

    if (!campaign) {
      // Try to find the campaign globally and redirect to subdomain
      campaign = await Campaign.findOne({ slug });
      if (campaign) {
        const campaignOwner = await User.findById(campaign.user);
        if (campaignOwner?.subdomain) {
          return res.redirect(302, `https://${campaignOwner.subdomain}.aday.io/${slug}`);
        }
      }
      return res.status(404).json({ message: 'Campaign not found' });
    }

    res.json(campaign);
  } catch (error) {
    console.error('Subdomain route error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
});


router.get('/:username/:slug', async (req, res) => {
  const { username, slug } = req.params;
  const user = await User.findOne({ username });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const campaign = await Campaign.findOne({ slug: req.params.slug }).populate('user');
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });

  res.json(campaign);
});

router.get('/check-vanity/:slug', async (req, res) => {
  const slug = req.params.slug.toLowerCase().trim();

  const RESERVED = ['new', 'edit', 'create', 'admin', 'aday', 'a', 'campaign', 'verify'];
  if (RESERVED.includes(slug)) {
    return res.json({ available: false, reason: "reserved" });
  }

  const exists = await Campaign.findOne({ vanitySlug: slug });
  if (exists) return res.json({ available: false });

  res.json({ available: true });
});

// Vanity redirect: aday.to/:vanitySlug
router.get('/v/:vanity', async (req, res) => {
  try {
    const { vanity } = req.params;
    const campaign = await Campaign.findOne({ vanitySlug: vanity });

    if (!campaign) {
      return res.status(404).send("Campaign not found");
    }

    return res.redirect(`/${campaign.slug}`);
  } catch (error) {
    console.error("Vanity redirect error:", error.message);
    res.status(500).send("Server error");
  }
});




router.patch("/:id/custom-css", ensureAuthenticated, ensureCampaignOwner,  ensureSubscription, async (req, res) => {
  const { customCSS } = req.body;

  try {
    const campaign = await Campaign.findById(req.params.id);
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    // Optional: restrict edit to campaign creator
    if (String(campaign.createdBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    campaign.customCSS = customCSS;
    await campaign.save();

    res.json({ message: "Custom CSS updated successfully" });
  } catch (err) {
    console.error("Update CSS error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.patch("/:id", ensureAuthenticated, async (req, res, next) => {
  try {
    const before = await Campaign.findById(req.params.id).lean();
    // apply updates…
    const updated = await Campaign.findByIdAndUpdate(req.params.id, req.body, { new: true }).lean();

    // log it
    await ActivityLog.create({
      workspace: req.query.workspace,           // if you pass it in
      campaignId: updated._id,
      user: req.user._id,
      action: "Update Campaign",
      ip: req.ip,
      before,
      after: updated
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
});

// GET /campaigns/forecast/:slug?range=14


router.post(
  "/:slug/send-blast",
  ensureAuthenticated,
  ensurePremium,
  ensureSubscription,
  async (req, res) => {
    try {
      const { subject, html } = req.body;
      if (!subject || !html) {
        return res.status(400).json({ message: "subject and html required" });
      }

      const campaign = await Campaign.findOne({ slug: req.params.slug });
      if (!campaign) return res.status(404).json({ message: "Not found" });

      const recipients = campaign.emails.map(e => e.email);
      // fire off all mails in parallel
      await Promise.all(
        recipients.map(email => sendEmail(email, subject, html))
      );

      res.json({ success: true, count: recipients.length });
    } catch (err) {
      console.error("❌ send‑blast error:", err);
      res.status(500).json({ message: "Failed to send blast" });
    }
  }
);

// in src/routes/campaigns.js (or wherever you put it)
// src/routes/campaigns.routes.js (or wherever you have your router)
router.get(
  "/emails/all/:userId",
  ensureAuthenticated,
  async (req, res) => {
    const userId = req.params.userId;
    const campaigns = await Campaign.find({ user: userId }).lean();

    // now emit email + timestamp + which campaign it came from
    const emails = campaigns.flatMap((c) =>
      (c.emails || []).map((e) => ({
        email: e.email,
        collectedAt: e.collectedAt,
        campaignTitle: c.title,
      }))
    );

    return res.json({ emails });
  }
);

router.post(
  '/emails/blast/:userId',
  ensureAuthenticated,
  async (req, res) => {
    const { userId } = req.params;
    // …auth checks…
    const { subject, body, emails } = req.body;
    if (!subject || !body || !Array.isArray(emails) || emails.length === 0) {
      return res
        .status(400)
        .json({ message: 'subject, body and non-empty emails[] required' });
    }

    try {
      // ⚡️ Pass an object with `to`, `subject` and `html`
      await Promise.all(
        emails.map(email =>
          sendEmail({
            to: email,
            subject,
            html: body
          })
        )
      );
      return res.json({ success: true, count: emails.length });
    } catch (err) {
      console.error('Bulk blast failed:', err);
      return res.status(500).json({ message: 'Failed to send blast' });
    }
  }
);



module.exports = router;
