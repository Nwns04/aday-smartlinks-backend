require("dotenv").config();
const mongoose = require("mongoose");
const Campaign = require("./src/models/Campaign");

const mongoUrl = process.env.MONGO_URI;
if (!mongoUrl) {
  console.error("❌ MONGO_URI not found in .env");
  process.exit(1);
}

mongoose
  .connect(mongoUrl)
  .then(() => {
    console.log("✅ Connected to MongoDB");
    seed();
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err);
  });

const userId = "67ebe215e182d6e9b236a255";

const generateFakeAnalytics = (count) => {
  const devicesList = ["desktop", "mobile", "tablet"];
  const browsers = ["Chrome", "Safari", "Firefox", "Edge"];
  const countriesList = ["US", "UK", "NG", "GH", "CA"];

  const clicks = [];
  const devices = new Set();
  const countries = new Set();
  const timestamps = [];

  for (let i = 0; i < count; i++) {
    const device = devicesList[Math.floor(Math.random() * devicesList.length)];
    const browser = browsers[Math.floor(Math.random() * browsers.length)];
    const country = countriesList[Math.floor(Math.random() * countriesList.length)];
    const timestamp = new Date(Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30); // last 30 days

    clicks.push({
      timestamp,
      device,
      browser,
      referrer: "https://example.com?utm_source=facebook&utm_medium=social&utm_campaign=launch",
      geo: {
        country,
        city: "Sample City",
        region: "Sample Region",
        lat: 6.5244,
        lon: 3.3792
      },
      utmSource: "facebook",
      utmMedium: "social",
      utmCampaign: "launch"
    });

    devices.add(device);
    countries.add(country);
    timestamps.push(timestamp);
  }

  return {
    clicks,
    devices: Array.from(devices),
    countries: Array.from(countries),
    timestamps,
  };
};

async function seed() {
  try {
    await Campaign.deleteMany({});
    console.log("🧹 Cleared existing campaigns...");

    const campaigns = [
      {
        title: "Is It a Crime",
        slug: "is-it-a-crime",
        user: userId,
        createdAt: new Date("2025-03-10"),
        releaseDate: new Date("2025-05-11"),
        artwork: "https://res-console.cloudinary.com/dwtjqkry7/thumbnails/v1/image/upload/v1743841713/am9lYm95X3RzbXd3cg==/drilldown",
        type: "presave",
        status: "upcoming",
        ctaMessage: "Be the first to hear it!",
        serviceLinks: {
          spotify: "https://spotify.com/fake-crime",
          apple: "https://apple.com/fake-crime",
          boomplay: "https://boomplay.com/fake-crime",
          audiomack: "https://audiomack.com/fake-crime",
          youtube: "https://youtube.com/fake-crime",
        },
        emails: [
          { email: "fan1@example.com", collectedAt: new Date("2025-04-05") },
          { email: "fan2@example.com", collectedAt: new Date("2025-04-06") },
        ],
        analytics: generateFakeAnalytics(50),
      },
      {
        title: "AMani",
        slug: "amani-k5nkci",
        user: userId,
        createdAt: new Date("2025-03-12"),
        releaseDate: new Date("2025-05-10"),
        artwork: "https://res-console.cloudinary.com/dwtjqkry7/thumbnails/v1/image/upload/v1743841713/am9lYm95X3RzbXd3cg==/drilldown",
        type: "presave",
        status: "upcoming",
        ctaMessage: "Don't miss it!",
        serviceLinks: {
          spotify: "https://spotify.com/fake-amani",
          apple: "https://apple.com/fake-amani",
          boomplay: "https://boomplay.com/fake-amani",
          audiomack: "https://audiomack.com/fake-amani",
          youtube: "https://youtube.com/fake-amani",
        },
        emails: [
          { email: "amani@example.com", collectedAt: new Date("2025-04-05") },
          { email: "fan3@example.com", collectedAt: new Date("2025-04-05") },
        ],
        analytics: generateFakeAnalytics(25),
      },
      {
        title: "Hehe",
        slug: "hehe-ehkbgh",
        user: userId,
        createdAt: new Date("2025-03-15"),
        releaseDate: new Date("2025-05-09"),
        artwork: "https://res-console.cloudinary.com/dwtjqkry7/thumbnails/v1/image/upload/v1743841713/am9lYm95X3RzbXd3cg==/drilldown",
        type: "presave",
        status: "upcoming",
        ctaMessage: "Save it now!",
        serviceLinks: {
          spotify: "https://spotify.com/fake-hehe",
          apple: "https://apple.com/fake-hehe",
          boomplay: "https://boomplay.com/fake-hehe",
          audiomack: "https://audiomack.com/fake-hehe",
          youtube: "https://youtube.com/fake-hehe",
        },
        emails: [],
        analytics: generateFakeAnalytics(35),
      },
      {
        title: "All Love",
        slug: "all-love",
        user: userId,
        createdAt: new Date("2025-03-20"),
        releaseDate: new Date("2025-04-01"), // already released
        artwork: "https://res-console.cloudinary.com/dwtjqkry7/thumbnails/v1/image/upload/v1743841713/am9lYm95X3RzbXd3cg==/drilldown",
        type: "smartlink",
        status: "released",
        ctaMessage: "Click to stream now!",
        serviceLinks: {
          spotify: "https://spotify.com/all-love",
          apple: "https://apple.com/all-love",
          boomplay: "https://boomplay.com/all-love",
          audiomack: "https://audiomack.com/all-love",
          youtube: "https://youtube.com/all-love",
        },
        emails: [
          { email: "love@example.com", collectedAt: new Date("2025-04-02") },
          { email: "fan4@example.com", collectedAt: new Date("2025-04-03") },
        ],
        analytics: generateFakeAnalytics(60),
      },
    ];

    await Campaign.insertMany(campaigns);
    console.log("✅ Seed complete. Campaigns added!");
  } catch (error) {
    console.error("❌ Seeding failed:", error);
  } finally {
    mongoose.disconnect();
  }
}
