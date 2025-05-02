// utils/webpush.js
const webpush = require("web-push");

// generate these once and keep secret (or store in .env)
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;

webpush.setVapidDetails(
  "mailto:topken54@gmail.com",
  VAPID_PUBLIC,
  VAPID_PRIVATE
);

module.exports = webpush;
