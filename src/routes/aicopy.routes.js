// routes/aicopy.js
const express = require('express');
const { generateCopy } = require('../services/aiCopy');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const router = express.Router();

router.post('/', ensureAuthenticated, async (req, res) => {
  const { prompt } = req.body;
  const text = await generateCopy(prompt);
  res.json({ text });
});

module.exports = router;
