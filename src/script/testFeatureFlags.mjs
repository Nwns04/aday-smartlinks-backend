import axios from 'axios';
import { CookieJar } from 'tough-cookie';
import { wrapper } from 'axios-cookiejar-support';

wrapper(axios);

const APP_BASE = 'http://localhost:5000';
const FLAG_NAME = 'team_audit_trail';

let APP_JWT = '';

async function fetchAppToken() {
  const { data } = await axios.post(`${APP_BASE}/auth/google`, {
    googleId:    '109602793980000781654',
    name:        'tope kenny',
    email:       'topken54@gmail.com',
    profileImage:'https://lh3.googleusercontent.com/a/ACg8ocKZhSCs-ZF5oyz3UzPuVsQwuyJFArhxAlO3MicWAQdUPGdsOkTr=s96-c',
    username:    'kenny'
  }, { headers: { 'Content-Type': 'application/json' } });

  console.log('→ APP_JWT:', data.token);
  return data.token;
}

async function waitForAudit(expectedStatus, timeout = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    try {
      const res = await axios.get(`${APP_BASE}/api/audit`, {
        headers: { Authorization: `Bearer ${APP_JWT}` }
      });
      if (res.status === expectedStatus) {
        console.log(`→ /api/audit → ${res.status} as expected`);
        return;
      }
    } catch (err) {
      if (err.response?.status === expectedStatus) {
        console.log(`→ /api/audit → ${expectedStatus} as expected`);
        return;
      }
    }
    await new Promise(r => setTimeout(r, 500));
  }
  throw new Error(`Timed out waiting for /api/audit to return ${expectedStatus}`);
}

// Test logic
(async () => {
  // 1. Get your app JWT
  APP_JWT = await fetchAppToken();

  // 2a. Test when the flag is OFF in GrowthBook
  console.log('\n1) [Flip the flag OFF in GrowthBook UI]');
  await waitForAudit(404);

  // 2b. Flip the flag ON in GrowthBook UI
  console.log('\n2) [Now flip the flag ON in GrowthBook UI]');
  await waitForAudit(200);

  console.log('\n✅ GrowthBook smoke test complete');
})();
