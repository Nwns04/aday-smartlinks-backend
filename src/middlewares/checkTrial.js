// middlewares/checkTrial.js
module.exports = async function (req, res, next) {
    // only run if user is signed in and on Essential
    if (req.user?.subscriptionPlan === 'essential' && req.user.trialExpiresAt) {
      if (new Date() > req.user.trialExpiresAt) {
        // trial expired → clear plan
        req.user.subscriptionPlan = null;
        req.user.trialExpiresAt = null;
        await req.user.save();
      }
    }
    next();
  };
  