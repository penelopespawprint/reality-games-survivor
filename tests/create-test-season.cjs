#!/usr/bin/env node

const https = require('https');

const SUPABASE_URL = 'https://qxrgejdfxcvsfktgysop.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF4cmdlamRmeGN2c2ZrdGd5c29wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQ1NDc5MDEsImV4cCI6MjA1MDEyMzkwMX0.qMxVPCDRpUc-NXQHuoOWJRVNUMl6hKpH9OVdK5sLzYY';

// Create Season 50 (as per CLAUDE.md)
const season = {
  number: 50,
  name: 'Survivor: Season 50',
  is_active: true,
  registration_opens_at: '2025-12-19T20:00:00Z',  // Dec 19, 2025 12:00 PM PST
  draft_order_deadline: '2026-01-05T20:00:00Z',   // Jan 5, 2026 12:00 PM PST
  registration_closes_at: '2026-02-26T01:00:00Z', // Feb 25, 2026 5:00 PM PST
  premiere_at: '2026-02-26T04:00:00Z',            // Feb 25, 2026 8:00 PM PST
  draft_deadline: '2026-03-03T04:00:00Z',         // Mar 2, 2026 8:00 PM PST
  finale_at: '2026-05-28T04:00:00Z',              // May 27, 2026 8:00 PM PST
};

function makeRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const requestOptions = {
      hostname: urlObj.hostname,
      port: urlObj.port || 443,
      path: urlObj.pathname + urlObj.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Prefer': 'return=representation',
        ...options.headers,
      },
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data: data, headers: res.headers });
        }
      });
    });

    req.on('error', reject);

    if (options.body) {
      req.write(JSON.stringify(options.body));
    }

    req.end();
  });
}

async function main() {
  console.log('Creating Season 50...');

  try {
    // First check if season 50 exists
    const checkResponse = await makeRequest(
      `${SUPABASE_URL}/rest/v1/seasons?number=eq.50&select=*`
    );

    if (checkResponse.status === 200 && Array.isArray(checkResponse.data) && checkResponse.data.length > 0) {
      console.log('Season 50 already exists:');
      console.log(JSON.stringify(checkResponse.data[0], null, 2));
      console.log('\nUpdating to is_active=true...');

      const updateResponse = await makeRequest(
        `${SUPABASE_URL}/rest/v1/seasons?number=eq.50`,
        {
          method: 'PATCH',
          body: { is_active: true },
        }
      );

      console.log('Update response:', updateResponse.status);
      console.log(JSON.stringify(updateResponse.data, null, 2));
    } else {
      // Create new season
      const createResponse = await makeRequest(
        `${SUPABASE_URL}/rest/v1/seasons`,
        {
          method: 'POST',
          body: season,
        }
      );

      console.log('Create response status:', createResponse.status);
      console.log('Response:', JSON.stringify(createResponse.data, null, 2));

      if (createResponse.status === 201) {
        console.log('\n✓ Season 50 created successfully!');
      } else {
        console.error('\n✗ Failed to create season');
        console.error('Status:', createResponse.status);
        console.error('Error:', createResponse.data);
      }
    }
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
