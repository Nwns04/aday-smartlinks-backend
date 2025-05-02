// src/middlewares/ensureAuthenticated.js
const jwt   = require('jsonwebtoken');
const User  = require('../models/User');   // Mongoose model

/**
 * Verifies the Bearer token, looks up the user, and attaches
 * a minimal user object (including `isPremium`) to req.user.
 * Returns 401 if the request is unauthenticated or the token
 * is invalid/expired.
 */
module.exports = async function ensureAuthenticated(req, res, next) {
  const authHeader = req.header('Authorization') || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    // ── Pull just the fields we need (fast & lean)
    const user = await User.findById(payload.id)
      .select('_id email isPremium subscriptionPlan')
      .lean();

    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user;         // ✅ now includes isPremium
    next();
  } catch (err) {
    console.error('JWT verification failed:', err.message);
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
