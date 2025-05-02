const { initialize } = require('unleash-client')

/**
 * Immediately initialize Unleash against your local server.
 */
const unleash = initialize({
  url: 'http://localhost:4242/api/client/',   // your local Unleash URL
  appName: 'aday-smartlinks',
  environment: 'development',
  customHeaders: {
    // your Unleash client access token
    Authorization: 'default:development.fe0e14fe46fc13d631e3f1cbab0af9384bb089a6b31d158be2ebf0ca',
  },
})

unleash.on('ready', () => {
  console.log('✅ Unleash client is ready')
})
unleash.on('error', err => {
  console.error('❌ Unleash error:', err)
})

/**
 * Export a single helper that tells you if the flag is on.
 */
function isEnabled(flagName, context = {}) {
  return unleash.isEnabled(flagName, context)
}

module.exports = { isEnabled }
