// routes/presskit.js
const express = require('express');
const { generatePressKit } = require('../services/pressKit');
const ensureAuthenticated = require('../middlewares/ensureAuthenticated');
const router = express.Router();

router.post('/:campaignId', ensureAuthenticated, async (req, res) => {
  const { html } = req.body; // client can supply custom template or we build it server‑side
  const pdfBuffer = await generatePressKit(html);
  res.type('application/pdf').send(pdfBuffer);
});

module.exports = router;
