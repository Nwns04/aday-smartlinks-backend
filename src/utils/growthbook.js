// growthbook.js
const { GrowthBookClient } = require("@growthbook/growthbook");

// 1) Create the “global” client
const gbClient = new GrowthBookClient({
  apiHost: "https://cdn.growthbook.io",
  clientKey: "sdk-FlS7F70BzBnwLMH7",
  streamingEnabled: true,    // keep flags in sync automatically
  trackingCallback: (experiment, result, userCtx) => {
    // Hook into your analytics/events system:
    console.log("Viewed experiment", {
      userId: userCtx.attributes.id,
      experimentId: experiment.key,
      variationKey: result.key,
    });
  }
});

// 2) Fetch flags & experiments at startup (optional, but ensures .init() completes)
async function initGrowthBook() {
  await gbClient.init({ timeout: 1000 });
  console.log("GrowthBook initialized");
}
initGrowthBook();

module.exports = gbClient;
