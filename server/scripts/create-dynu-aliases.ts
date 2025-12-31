/**
 * Script to create email aliases in Dynu
 * Creates test21@ through test40@ aliases forwarding to blake@realitygamesfantasyleague.com
 * 
 * Usage: DYNU_API_KEY=your_key tsx scripts/create-dynu-aliases.ts
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from server/.env or root .env
dotenv.config({ path: join(__dirname, '..', '.env') });
dotenv.config({ path: join(__dirname, '..', '..', '.env') });

const DYNU_API_KEY = process.env.DYNU_API_KEY;
const BASE_EMAIL = 'blake@realitygamesfantasyleague.com';
const DOMAIN = 'realitygamesfantasyleague.com';

if (!DYNU_API_KEY) {
  console.error('Error: DYNU_API_KEY environment variable is not set');
  console.error('Set it with: export DYNU_API_KEY=your_key');
  process.exit(1);
}

interface DynuResponse {
  id?: number;
  statusCode?: number;
  message?: string;
  error?: string;
  [key: string]: unknown;
}

async function createEmailAlias(aliasName: string): Promise<boolean> {
  // Dynu email forwarder API endpoint
  // Based on Dynu API v2 documentation
  const url = 'https://api.dynu.com/v2/email/forwarder';
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'API-Key': DYNU_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        domainName: DOMAIN,
        aliasName: aliasName,
        forwardTo: BASE_EMAIL,
      }),
    });

    const responseText = await response.text();
    let data: DynuResponse;
    
    try {
      data = JSON.parse(responseText);
    } catch {
      // If response isn't JSON, log the raw text
      console.error(`❌ Non-JSON response for ${aliasName}:`, responseText);
      return false;
    }

    if (response.ok) {
      console.log(`✅ Created alias: ${aliasName}@${DOMAIN} -> ${BASE_EMAIL}`);
      return true;
    } else {
      // Check if alias already exists
      if (response.status === 400 || response.status === 409) {
        const errorMsg = data.message || data.error || response.statusText;
        if (errorMsg.toLowerCase().includes('exist') || errorMsg.toLowerCase().includes('already')) {
          console.log(`⚠️  Alias ${aliasName}@${DOMAIN} already exists`);
        } else {
          console.error(`❌ Failed to create ${aliasName}@${DOMAIN}:`, errorMsg);
        }
        return false;
      }
      
      // Log full error for debugging
      console.error(`❌ Failed to create ${aliasName}@${DOMAIN} (status ${response.status}):`, JSON.stringify(data, null, 2));
      return false;
    }
  } catch (error) {
    console.error(`❌ Error creating alias ${aliasName}@${DOMAIN}:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log(`Creating email aliases for ${DOMAIN}...`);
  console.log(`Forwarding to: ${BASE_EMAIL}\n`);

  const aliases: string[] = [];
  for (let i = 21; i <= 40; i++) {
    aliases.push(`test${i}`);
  }

  console.log(`Will create ${aliases.length} aliases: ${aliases.join(', ')}\n`);

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;

  for (const alias of aliases) {
    const success = await createEmailAlias(alias);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
    
    // Small delay to avoid rate limiting (500ms between requests)
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log(`\n📊 Summary:`);
  console.log(`   ✅ Created: ${successCount}`);
  console.log(`   ❌ Failed: ${failCount}`);
  console.log(`   ⚠️  Skipped: ${skippedCount}`);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
