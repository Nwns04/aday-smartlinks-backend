const ABTest = require('../models/ABTest');

exports.createTest = async (req, res) => {
  const { campaignId } = req.params;
  const { name } = req.body;
  const test = await ABTest.create({
    campaign: campaignId,
    name,
    variants: [
      { key: 'A', blocks: [] },
      { key: 'B', blocks: [] }
    ]
  });
  res.status(201).json(test);
};

exports.getTests = async (req, res) => {
  const { campaignId } = req.params;
  const tests = await ABTest.find({ campaign: campaignId });
  res.json(tests);
};

exports.updateTest = async (req, res) => {
  const { id } = req.params;
  const payload = req.body; // { name?, variants? }
  const test = await ABTest.findByIdAndUpdate(id, payload, { new: true });
  res.json(test);
};
