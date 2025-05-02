// src/middlewares/ensurePremium.js

/**
 * Allows the request to proceed only if:
 *   1. The user is authenticated        → else 401
 *   2. The user has an active premium   → else 403
 */
module.exports = function ensurePremium(req, res, next) {
  // 1️⃣  Not authenticated
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  // 2️⃣  Authenticated but not premium
  if (!req.user.isPremium) {
    return res.status(403).json({
      message: 'This feature is only available to premium users.'
    });
  }

  // 3️⃣  Authenticated *and* premium
  next();
};
