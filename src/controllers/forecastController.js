// controllers/forecastController.js
const { getForecastData } = require('../services/forecast');

exports.getForecast = async (req, res) => {
  try {
    const { slug } = req.params;
    const days = parseInt(req.query.range, 10) || 14;
    const data = await getForecastData(slug, days);

    if (!data.length) return res.status(204).send(); // ← NEW
    res.json(data);
  } catch (err) {
    console.error('Forecast error:', err);
    res.status(500).json({ message: 'Failed to generate forecast' });
  }
};

