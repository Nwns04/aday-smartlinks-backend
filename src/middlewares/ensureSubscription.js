// src/middlewares/ensureSubscription.js
module.exports = function ensureSubscription(req, res, next) {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }
  
    // Premium always OK
    if (req.user.subscriptionPlan === "premium") {
      return next();
    }
  
    // Essential trial must still be active
    if (
      req.user.subscriptionPlan === "essential" &&
      req.user.trialExpiresAt &&
      new Date(req.user.trialExpiresAt) > new Date()
    ) {
      return next();
    }
  
    return res
      .status(403)
      .json({ message: "Your trial has expired. Please upgrade to continue." });
  };
  