const express = require("express");
const User = require("../models/User");
const router = express.Router();
const { resolveTxt } = require("dns/promises");
const querystring = require("querystring");
const axios = require("axios");
const { body, validationResult } = require('express-validator');
const { refreshSpotifyToken } = require('../utils/spotify');
const { sendWelcomeEmail } = require('../services/emailService');
const { sendDomainConfirmationEmail } = require('../services/emailService');
const speakeasy = require("speakeasy");
const QRCode = require("qrcode");
const ensurePremium = require('../middlewares/ensurePremium');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const ensureSubscription = require('../middlewares/ensureSubscription');
const jwt = require('jsonwebtoken');


const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const REDIRECT_URI =
  process.env.SPOTIFY_REDIRECT_URI || "http://localhost:5000/auth/spotify/callback";
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:3000";
const SCOPES = [
  "user-read-private",
  "user-read-email",
  "ugc-image-upload",
  "playlist-read-private",
].join(" ");

// Start Spotify OAuth
router.get("/spotify", (req, res) => {
  const { email } = req.query;
  if (!email) {
    return res.status(400).json({ message: "Email parameter is required" });
  }

  const queryParams = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: SCOPES,
    state: email,
    show_dialog: true,
  });

  res.redirect(`https://accounts.spotify.com/authorize?${queryParams}`);
});

// Spotify Callback
// Spotify Callback
router.get("/spotify/callback", async (req, res) => {
  const code = req.query.code;
  const email = req.query.state;
  const error = req.query.error;

  if (error || !code || !email) {
    return res.redirect(`${FRONTEND_URL}/dashboard?spotify=error`);
  }

  try {
    const tokenResponse = await axios.post(
      "https://accounts.spotify.com/api/token",
      new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const { access_token, refresh_token, expires_in } = tokenResponse.data;

    const profileResponse = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const profile = profileResponse.data;

    // Do not enforce a minimum follower count for now
    const isArtist = profile.product === 'premium' || profile.type === 'artist' || profile.type === 'user';
    const isVerifiedArtist = profile.type === 'artist';

    const updatedUser = await User.findOneAndUpdate(
      { email },
      {
        spotifyId: profile.id,
        spotifyArtistId: profile.id,
        artistName: profile.display_name,
        spotifyRefreshToken: refresh_token,
        spotifyTokenExpiresAt: new Date(Date.now() + expires_in * 1000),
        isArtist,
        isVerifiedArtist,
      },
      { new: true, upsert: false }
    );

    if (updatedUser && isVerifiedArtist) {
      // Ensure that sendArtistWelcomeEmail is imported
      await sendArtistWelcomeEmail(updatedUser.email, updatedUser.name);
    }

    res.redirect(`${FRONTEND_URL}/dashboard?spotify=connected&t=${Date.now()}`);
  } catch (err) {
    console.error("Spotify Callback Error:", err.message);
    res.redirect(`${FRONTEND_URL}/dashboard?spotify=error`);
  }
});


// Spotify Profile (Live status & refresh)
// Single, consolidated endpoint version
router.get("/spotify/profile/:email", async (req, res) => {
  const email = req.params.email;
  try {
    const user = await User.findOne({ email });
    if (!user || !user.spotifyId) {
      return res.status(400).json({ message: "No Spotify connection found" });
    }
    // Refresh token if it’s near expiration
    if (!user.spotifyTokenExpiresAt || new Date() > new Date(user.spotifyTokenExpiresAt - 300000)) {
      await refreshSpotifyToken(user);
    }

    const profileRes = await axios.get("https://api.spotify.com/v1/me", {
      headers: { Authorization: `Bearer ${user.spotifyId}` },
    });
    res.json(profileRes.data);
  } catch (error) {
    console.error("Spotify Profile Error:", error.response?.data || error.message);

    if (error.response && error.response.status === 401) {
      // Optionally clear the invalid tokens
      await User.findOneAndUpdate(
        { email },
        { spotifyId: null, spotifyRefreshToken: null, spotifyTokenExpiresAt: null }
      );
    }
    res.status(500).json({ message: "Failed to fetch Spotify profile" });
  }
});


router.post(
  '/google',
  [
    body('googleId').notEmpty().withMessage('Google ID is required'),
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('A valid email is required'),
    body('profileImage').optional().isURL().withMessage('Profile image must be a valid URL'),
    body('username').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(422).json({ errors: errors.array() });
    }
    try {
      const { googleId, name, email, profileImage, username } = req.body;
      let user = await User.findOne({ googleId });
      if (!user) {
        user = new User({
          googleId,
          name,
          email,
          profileImage,
          subdomain: username || null,
        });
        // New users get a welcome email
        await sendWelcomeEmail(email, name);
      } else {
        user.name = name;
        user.email = email;
        user.profileImage = profileImage;
        if (!user.subdomain && username) {
          user.subdomain = username;
        }
      }
      await user.save();

const payload = {
  id: user._id,
  email: user.email,
  subscriptionPlan: user.subscriptionPlan,
  trialExpiresAt: user.trialExpiresAt,
  isPremium: user.subscriptionPlan === "premium",
};

const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' })

      await user.save();
      return res.status(200).json({ token, user });
    } catch (err) {
      console.error("Auth Error:", err);
      res.status(500).json({ message: 'Authentication failed' });
    }
  }
);



// Fetch user data
router.get("/user/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user  = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    // 🔥 auto-expire Essential trials older than 14 days
    if (
      user.subscriptionPlan === "essential" &&
      user.trialExpiresAt &&
      new Date(user.trialExpiresAt) < Date.now()
    ) {
      user.subscriptionPlan = null;
      user.trialExpiresAt   = null;
      user.isPremium        = false;
      await user.save();
    }

    return res.json(user);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
});



router.get("/spotify/recent/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user || !user.spotifyId || !user.spotifyRefreshToken) {
      return res.status(400).json({ message: "Spotify not connected" });
    }

    const tracksRes = await axios.get("https://api.spotify.com/v1/me/player/recently-played", {
      headers: { Authorization: `Bearer ${user.spotifyId}` },
    });

    res.json({ tracks: tracksRes.data.items.map((item) => item.track) });
  } catch (error) {
    console.error("Recent Tracks Error:", error.response?.data || error.message);
    res.status(500).json({ error: "Failed to fetch recent tracks" });
  }
});


// Disconnect Spotify
router.post("/spotify/disconnect/:email", async (req, res) => {
  try {
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { spotifyId: null, spotifyRefreshToken: null, spotifyTokenExpiresAt: null },
      { new: true }
    );
    res.json({ message: "Disconnected", user });
  } catch (error) {
    res.status(500).json({ error: "Failed to disconnect" });
  }
});

router.post("/email-goal/:email", async (req, res) => {
  try {
    const { goal } = req.body;
    const user = await User.findOneAndUpdate(
      { email: req.params.email },
      { emailGoal: goal },
      { new: true }
    );
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ message: "Goal updated", goal: user.emailGoal });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PATCH /user/subdomain
const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'aday', 'link', 'campaigns'];

router.patch("/user/subdomain",ensureAuthenticated, ensurePremium, ensureSubscription, async (req, res) => {
  const { email, subdomain } = req.body;
  if (!subdomain) return res.status(400).json({ message: "Subdomain required" });

  const cleanSubdomain = subdomain.toLowerCase().trim();

  // Check for reserved keywords
  if (RESERVED_SUBDOMAINS.includes(cleanSubdomain)) {
    return res.status(403).json({ message: "This subdomain is reserved" });
  }

  const existing = await User.findOne({ subdomain: cleanSubdomain });
  if (existing) return res.status(409).json({ message: "Subdomain is already taken" });

  const user = await User.findOne({ email });
  if (!user || !user.isPremium) {
    return res.status(403).json({ message: "Only premium users can use subdomains" });
  }

  user.subdomain = cleanSubdomain;
  await user.save();
  res.json({ message: "Subdomain saved", subdomain: user.subdomain });
});

router.get("/check-subdomain/:sub",ensureAuthenticated, ensurePremium,  ensureSubscription, async (req, res) => {
  const sub = req.params.sub.toLowerCase().trim();
  const RESERVED_SUBDOMAINS = ['www', 'admin', 'api', 'aday', 'link', 'campaigns'];
  if (RESERVED_SUBDOMAINS.includes(sub)) {
    return res.json({ available: false, reason: "reserved" });
  }

  const existing = await User.findOne({ subdomain: sub });
  if (existing) return res.json({ available: false });

  res.json({ available: true });
});

router.put('/update-subdomain',ensureAuthenticated, ensurePremium, ensureSubscription, async (req, res) => {
  const { userId, subdomain } = req.body;

  if (!subdomain || !userId) return res.status(400).json({ message: 'Missing subdomain or userId' });

  // Check uniqueness
  const exists = await User.findOne({ subdomain: subdomain.toLowerCase().trim() });
  if (exists && exists._id.toString() !== userId) {
    return res.status(409).json({ message: 'Subdomain already taken' });
  }

  const user = await User.findByIdAndUpdate(
    userId,
    { subdomain: subdomain.toLowerCase().trim() },
    { new: true }
  );

  res.json({ message: 'Subdomain updated', user });
});

router.post("/domain",ensureAuthenticated, ensurePremium, ensureSubscription, async (req, res) => {
  const { email, domain } = req.body;

  if (!email || !domain) return res.status(400).json({ message: "Email and domain required" });

  const user = await User.findOne({ email });
  if (!user || !user.isPremium) {
    return res.status(403).json({ message: "Only premium users can add domains" });
  }

  // Optional: Add DNS check via TXT record (example check)
  try {
    const dns = require("dns").promises;
    const records = await dns.resolveTxt(`_aday.${domain}`);
    const match = records.flat().includes("verify=aday");

    if (!match) {
      return res.status(400).json({
        message: "DNS verification failed. Please add a TXT record: _aday." + domain + " = verify=aday",
      });
    }
  } catch (err) {
    return res.status(400).json({ message: "Unable to verify domain. Check your DNS settings." });
  }

  user.customDomain = domain.toLowerCase().trim();
  await user.save();

  res.json({ message: "Domain verified and saved", domain: user.customDomain });
});

router.post("/domain/verify", async (req, res) => {
  const { domain } = req.body;
  if (!domain) return res.status(400).json({ message: "Domain is required." });

  try {
    const records = await resolveTxt(`_aday.${domain}`);
    const flatRecords = records.flat();
    const isVerified = flatRecords.includes("verify=aday");

    if (!isVerified) {
      return res.status(200).json({ customDomainVerified: false });
    }

    // Update user’s customDomainVerified = true
    const user = await User.findOneAndUpdate(
      { customDomain: domain },
      { customDomainVerified: true },
      { new: true }
    );

    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({
      customDomainVerified: true,
      user,
    });
    await sendDomainConfirmationEmail(user.email, user.customDomain);
  } catch (error) {
    console.error("DNS verification error:", error);
    res.status(500).json({ message: "DNS verification failed.", error });
  }
});


// Endpoint to enable 2FA: generate secret and return a QR code data URL
router.post("/2fa/setup", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const secret = speakeasy.generateSecret({ name: `ADAY (${email})` });
  user.twoFactorSecret = secret.base32;
  await user.save();

  // ✅ Send the otpauth URL directly
  res.json({ otpauthUrl: secret.otpauth_url });
});


// Endpoint to verify 2FA token
router.post("/2fa/verify", async (req, res) => {
  const { email, token } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  const verified = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: "base32",
    token,
  });

  if (verified) {
    user.twoFactorEnabled = true;
    await user.save();
    res.json({ message: "2FA enabled successfully" });
  } else {
    res.status(400).json({ message: "Invalid token" });
  }
});

// Endpoint to disable 2FA
router.post("/2fa/disable", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ message: "User not found" });

  user.twoFactorEnabled = false;
  user.twoFactorSecret = "";
  await user.save();
  res.json({ message: "2FA disabled" });
});

// // POST /subscribe/essential
// router.post('/subscribe/essential', async (req, res) => {
//   const { email } = req.body;
//   const user = await User.findOne({ email });
//   if (!user) return res.status(404).json({ message: 'User not found' });

//   // set plan & trial
//   user.subscriptionPlan = 'essential';
//   user.trialExpiresAt = new Date(Date.now() + 14*24*60*60*1000); // 14‑day trial
//   await user.save();

//   res.json({ message: 'Essential plan activated', trialExpiresAt: user.trialExpiresAt });
// });



module.exports = router;
