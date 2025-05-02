// utils/withGrowthBook.js
const gbClient = require("./growthbook");
module.exports = (handler) => (req, res, next) => {
  const userCtx = { attributes: { id: req.user?._id?.toString() || "anonymous" } };
  req.growthbook = gbClient.createScopedInstance(userCtx);
  return handler(req, res, next);
};
