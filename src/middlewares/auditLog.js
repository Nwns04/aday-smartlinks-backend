const ActivityLog = require('../models/ActivityLog');

async function auditLog({ workspace, campaignId, user, ip, action, before, after }) {
  try {
    await ActivityLog.create({ workspace, campaignId, user, ip, action, before, after });
  } catch(err) {
    console.error('Audit log error:', err);
  }
}

// wrap your update handlers:
function withAudit(action) {
  return async (req, res, next) => {
    // capture “before”
    const Campaign = require('../models/Campaign');
    const campBefore = await Campaign.findById(req.params.slug || req.body.id).lean();

    // let the request go through
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        // capture “after”
        const campAfter = await Campaign.findById(campBefore._id).lean();
        await auditLog({
          workspace: req.body.workspaceId || campAfter.workspace,
          campaignId: campAfter._id,
          user: req.user._id,
          ip: req.ip,
          action,
          before: campBefore,
          after: campAfter
        });
      }
    });

    next();
  };
}

module.exports = { withAudit };
