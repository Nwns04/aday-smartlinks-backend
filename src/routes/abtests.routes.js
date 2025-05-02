const express = require('express');
const router  = express.Router();
const ensureAuth = require('../middlewares/ensureAuthenticated');
const ctrl    = require('../controllers/abTestController');

// Create a new A/B test for a campaign
router.post('/:campaignId/tests', ensureAuth, ctrl.createTest);

// List A/B tests for a campaign
router.get('/:campaignId/tests', ensureAuth, ctrl.getTests);

// Update an existing test (e.g. save new blocks/order)
router.patch('/tests/:id', ensureAuth, ctrl.updateTest);

module.exports = router;
