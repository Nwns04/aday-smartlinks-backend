const ActivityLog = require("../models/ActivityLog");

const logActivity = (action) => async (req, res, next) => {
  // Assume req.user exists after authentication
  if (req.user) {
    try {
      await ActivityLog.create({ user: req.user._id, action });
    } catch (error) {
      console.error("Activity log error:", error);
    }
  }
  next();
};

module.exports = logActivity;
