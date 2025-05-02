const Campaign = require('../models/Campaign'); // ✅ Required!
exports.getLinkClickTimeline = async (req, res) => {
  const { slug } = req.params;
  const { range = "24h" } = req.query;

  try {
    const campaign = await Campaign.findOne({ slug: req.params.slug })
  .select('+emails') // Add this to include emails
  .lean();
    if (!campaign) return res.status(404).json({ message: "Campaign not found" });

    const now = new Date();
    let startTime;

    if (range === "24h") {
      startTime = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    } else if (range === "7d") {
      startTime = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else {
      startTime = new Date(0);
    }

    const timelineMap = new Map();

    for (const dateRaw of campaign.analytics.timestamps || []) {
      const date = new Date(dateRaw);
      if (date >= startTime) {
        let label;

        if (range === "24h") {
          const hour = date.getHours();
          label = `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? "PM" : "AM"}`;
        } else {
          label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
        }

        timelineMap.set(label, (timelineMap.get(label) || 0) + 1);
      }
    }

    let result = Array.from(timelineMap.entries()).map(([label, count]) => ({ label, count }));

    if (range === "24h") {
      const hourOrder = [
        "12AM", "1AM", "2AM", "3AM", "4AM", "5AM", "6AM", "7AM", "8AM", "9AM", "10AM", "11AM",
        "12PM", "1PM", "2PM", "3PM", "4PM", "5PM", "6PM", "7PM", "8PM", "9PM", "10PM", "11PM"
      ];
      result.sort((a, b) => hourOrder.indexOf(a.label) - hourOrder.indexOf(b.label));
    } else {
      result.sort((a, b) => new Date(`${a.label}, ${now.getFullYear()}`) - new Date(`${b.label}, ${now.getFullYear()}`));
    }

    res.json(result);
  } catch (err) {
    console.error("Error generating timeline:", err);
    res.status(500).json({ message: "Failed to generate timeline data" });
  }
};
