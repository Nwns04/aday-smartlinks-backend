// services/supabaseSync.js
const { createClient } = require('@supabase/supabase-js');
const Campaign = require('../models/Campaign');
const Click = require('../models/Click');
const Loyalty = require('../models/Loyalty');
const ActivityLog = require('../models/ActivityLog');
const { broadcastWebPush } = require('./notifications');
// Initialize Supabase client (requires service-role key)
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// List of collections and their target Supabase table names (all lowercase)
const MODELS = [
  { model: Campaign, table: 'campaign' },
  { model: Click, table: 'click' },
  { model: Loyalty, table: 'loyalty' },
  { model: ActivityLog, table: 'activitylog' }
];

// Sync one model/table by polling the full dataset
async function pollAndSync(model, tableName) {
  try {
    if (!model?.find) {
      throw new TypeError(`Model for table [${tableName}] is not valid or improperly imported.`);
    }

    const docs = await model.find().lean();

    const rows = docs.map(doc => {
      const row = { ...doc, id: doc._id.toString() };
      delete row._id;
      delete row.__v;

      // Optional: broadcast push for new Clicks (example)
      if (tableName === 'click') {
        broadcastWebPush(doc.campaignSlug || doc.campaign, {
          title: `New click`,
          body: `IP: ${doc.ip}, UA: ${doc.userAgent}`
        });
      }

      return row;
    });

    const { error } = await supabase
      .from(tableName)
      .upsert(rows, { onConflict: 'id' });

    if (error) {
      console.error(`❌ Supabase polling error for [${tableName}]:`, error);
    } else {
      console.log(`✅ [Polling] Synced ${rows.length} records to ${tableName}`);
    }
  } catch (err) {
    console.error(`❌ Polling failed for ${tableName}:`, err);
  }
}


// Main polling loop (every 5 minutes)
module.exports = function startSupabaseSync() {
  // Initial sync on start
  MODELS.forEach(({ model, table }) => pollAndSync(model, table));

  // Then re-sync every 5 minutes
  setInterval(() => {
    MODELS.forEach(({ model, table }) => pollAndSync(model, table));
  }, 5 * 60 * 1000); // 5 mins

  console.log('✅ Supabase sync service started with polling only (watch disabled)');
};
