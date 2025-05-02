const express = require("express");
const { initUnleash, isFeatureEnabled } = require("../utils/unleash");

initUnleash(); // call once on import

const router = express.Router();

router.get("/feature/:flag", (req, res) => {
  const flag = req.params.flag;
  const enabled = isFeatureEnabled(flag);
  res.json({ flag, enabled });
});

module.exports = router;
