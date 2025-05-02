const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  message: "Too many requests from this IP, please try again later.",
  validate: {
    trustProxy: false, // ✅ disables the warning/validation
  },
});

module.exports = limiter;
