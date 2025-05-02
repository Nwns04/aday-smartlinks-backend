// server.js
require('dotenv').config()
const connectDB           = require('./src/config/db')
const startSupabaseSync   = require('./src/services/supabaseSync')
const { app, server }     = require('./src/app')
const unleashReady        = require('./src/utils/growthbook').ready  // or however you expose that promise
const PORT                = process.env.PORT || 5000

async function boot() {
  try {
    // 1) Mongo
    await connectDB()
    console.log('✅ MongoDB connected')

    // 2) Unleash
    await unleashReady
    console.log('✅ Unleash ready')

    // 3) Supabase sync
    startSupabaseSync()
    console.log('🔄 Supabase sync started')

    // 4) Finally, start HTTP+Sockets
    server.listen(PORT, () =>
      console.log(`🚀 Server + Socket running on port ${PORT}`)
    )
  } catch (err) {
    console.error('❌ Boot failed:', err)
    process.exit(1)
  }
}

boot()
