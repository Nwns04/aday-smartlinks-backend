const express = require('express');
const router = express.Router();
const slugify = require('slugify');
const User = require('../models/User');
const BioLink = require('../models/Biolink');

// Create BioLink
router.post("/", async (req, res) => {
  try {
    const { userEmail, title, profileImage, bio, instagram, twitter, tiktok, youtube, website, merchLink } = req.body;
    const user = await User.findOne({ email: userEmail });
    if (!user) return res.status(400).json({ message: "User not found" });

    const slug = `${slugify(title, { lower: true })}-${Math.random().toString(36).substr(2, 6)}`;

    const bioLink = await BioLink.create({
      user: user._id,
      title,
      profileImage,
      bio,
      socialLinks: { instagram, twitter, tiktok, youtube, website },
      merchLink,
      slug,
    });

    res.status(201).json(bioLink);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get BioLink Public
router.get('/public/:slug', async (req, res) => {
  try {
    const bioLink = await BioLink.findOne({ slug: req.params.slug });
    if (!bioLink) return res.status(404).json({ message: 'BioLink not found' });
    res.json(bioLink);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all BioLinks by User
router.get('/user/:userId', async (req, res) => {
    try {
      const bioLinks = await BioLink.find({ user: req.params.userId });
      res.json(bioLinks);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });
  

module.exports = router;
