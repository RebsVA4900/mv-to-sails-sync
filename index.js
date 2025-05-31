const axios = require('axios');

// Env vars on Render: see below
const MEMBERVAULT_API_KEY = process.env.b4ecf4860b28843bd17f5d00dfc210a6;
const MEMBERVAULT_ACCOUNT = process.env.taragrahamphotography;
const SAILS_WEBHOOK_URL = process.env.https://services.leadconnectorhq.com/hooks/TLLpIkadE4XzVuW7lRQv/webhook-trigger/32596d74-9a77-4ca0-bcaa-3fbbf9f4b59f;
const SAILS_API_KEY = process.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJsb2NhdGlvbl9pZCI6IlRMTHBJa2FkRTRYelZ1VzdsUlF2IiwidmVyc2lvbiI6MSwiaWF0IjoxNzQ3ODkxMDkxMDcwLCJzdWIiOiJBVVlOS1c0QXI1eDl6TjlIeGZtTyJ9.4TF7XoZxPzOAWU0i95c_dGxQ-T8cQ0dqXQ-9Z0Z_w_E; // Only if required

// Helper: sleep N ms
const sleep = ms => new Promise(res => setTimeout(res, ms));

// Get all users from MemberVault
async function getMVUsers() {
  const url = `https://${MEMBERVAULT_ACCOUNT}.membervault.co/api/v1/users`;
  const res = await axios.get(url, {
    headers: { 'Authorization': `Bearer ${MEMBERVAULT_API_KEY}` }
  });
  return res.data;
}

// Post user to Sails Funnel webhook
async function postToSailsFunnel(user) {
  const body = {
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    // Add any other fields if Sails Funnel supports them
  };
  // If Sails needs an API key/header, add headers here:
  const headers = SAILS_API_KEY
    ? { 'Authorization': `Bearer ${SAILS_API_KEY}` }
    : {};
    
  return axios.post(SAILS_WEBHOOK_URL, body, { headers });
}

// Track sent users by ID to avoid duplicates (in memory). Reset on server restart.
const sentUsers = new Set();

// The sync loop
async function syncLoop() {
  console.log(`[${new Date().toISOString()}] Polling MemberVault...`);
  try {
    const users = await getMVUsers();
    for (const user of users) {
      if (!user.email || sentUsers.has(user.email)) continue;
      // Try pushing to Sails Funnel
      try {
        await postToSailsFunnel(user);
        console.log(`Synced ${user.email} to Sails Funnel`);
        sentUsers.add(user.email);
      } catch (err) {
        console.error(`Failed to sync ${user.email}:`, err.response ? err.response.data : err.message);
      }
    }
  } catch (mainErr) {
    console.error('Error fetching users:', mainErr.message);
  }
}

// Poll every 5 minutes
(async function main() {
  while (true) {
    await syncLoop();
    await sleep(5 * 60 * 1000); // 5 minutes
  }
})();
