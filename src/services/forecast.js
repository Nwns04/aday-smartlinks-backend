// services/forecast.js
const Click = require('../models/Click');
const Campaign     = require('../models/Campaign');
const HoltWinters = require('holt-winters');

async function getForecastData(slug, days = 14) {
  const since = new Date();
  since.setDate(since.getDate() - days);

  /* ------------------------------------------------------------
   * 1) Fetch clicks (use embedded analytics to avoid missing coll.)
   * ------------------------------------------------------------ */
  const campaign = await Campaign.findOne({ slug }).lean();
  if (!campaign) throw new Error('Campaign not found');

  const clicksArr = Array.isArray(campaign.analytics?.clicks)
    ? campaign.analytics.clicks
    : [];

  // group per-day counts for the window
  const daily = {};
  clicksArr.forEach(({ timestamp }) => {
    const ts = new Date(timestamp);
    if (ts < since) return;                    // outside the window
    const key = ts.toISOString().slice(0, 10); // YYYY-MM-DD
    daily[key] = (daily[key] || 0) + 1;
  });

  /* ------------------------------------------------------------
   * 2) Fill missing dates so the chart is continuous
   * ------------------------------------------------------------ */
  const series = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    series.push({ date: key, actual: daily[key] || 0 });
  }

  /* ------------------------------------------------------------
   * 3) Forecast – only if we have enough signal
   * ------------------------------------------------------------ */
  const values = series.map(d => d.actual);
  const MIN_POINTS = 7 * 2;  // at least two seasons (14 pts) is safe
  let forecast = values;

  try {
    if (values.filter(v => v > 0).length >= MIN_POINTS) {
      const hw = new HoltWinters({
        data: values,
        windowSize: 7,
        alpha: 0.5,
        beta: 0.4,
        gamma: 0.3,
        seasonLength: 7,
      });
      forecast = hw.predict(days);
    }
  } catch (e) {
    console.warn('⚠️  Holt-Winters failed – falling back to flat forecast', e);
  }

  /* ------------------------------------------------------------
   * 4) Attach forecast values
   * ------------------------------------------------------------ */
  return series.map((d, i) => ({
    date: d.date,
    actual: d.actual,
    forecast: Math.round(forecast[i] ?? d.actual),
  }));
}


module.exports = { getForecastData };
