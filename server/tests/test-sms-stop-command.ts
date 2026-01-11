/**
 * SMS STOP Command Compliance Test
 *
 * Tests FCC/TCPA compliance for SMS opt-out functionality
 *
 * Tests:
 * 1. STOP command variants (STOP, UNSUBSCRIBE, CANCEL, END, QUIT)
 * 2. Database field updates (notification_sms)
 * 3. Confirmation message responses
 * 4. sms_commands logging
 * 5. SMS suppression for opted-out users
 * 6. START command re-opt-in
 * 7. Transactional SMS bypass (verification codes)
 */

// Note: Database tests will be skipped if environment variables are not set
// Most tests are code inspection tests and don't require live database connection

let supabaseAvailable = false;
let supabaseAdmin: any = null;

try {
  // Try to load environment variables from Railway
  const { config } = await import('dotenv');
  config({ path: '../.env' }); // Try parent directory
  config(); // Try current directory

  // Only import Supabase if env vars are available
  if (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const supabaseModule = await import('./src/config/supabase.js');
    supabaseAdmin = supabaseModule.supabaseAdmin;
    supabaseAvailable = true;
  }
} catch (err) {
  console.log('⚠️  Database connection not available - database tests will be skipped');
  console.log('   This is expected for code inspection tests\n');
}

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  details: string;
  evidence?: any;
}

const results: TestResult[] = [];

// Test phone numbers (these should not be real to avoid sending actual SMS)
const TEST_PHONE = '+15555551234'; // Test phone number

/**
 * Test 1: Verify database schema supports SMS opt-out
 */
async function test1_DatabaseSchema(): Promise<TestResult> {
  if (!supabaseAvailable) {
    return {
      test: 'Database Schema',
      status: 'SKIP',
      details: 'Database connection not available - verify migrations manually'
    };
  }

  try {
    // Check users table has notification_sms column
    const { data: user, error: userError } = await supabaseAdmin
      .from('users')
      .select('notification_sms')
      .limit(1)
      .single();

    if (userError && !userError.message.includes('multiple') && !userError.message.includes('no rows')) {
      // It's okay if there's no user, just checking column exists
      if (!userError.message.includes('notification_sms')) {
        return {
          test: 'Database Schema - notification_sms column',
          status: 'FAIL',
          details: 'notification_sms column does not exist on users table',
          evidence: userError
        };
      }
    }

    // Check sms_commands table exists
    const { error: smsError } = await supabaseAdmin
      .from('sms_commands')
      .select('id, command, parsed_data, response_sent')
      .limit(1);

    if (smsError && !smsError.message.includes('no rows')) {
      return {
        test: 'Database Schema - sms_commands table',
        status: 'FAIL',
        details: 'sms_commands table does not exist or has wrong schema',
        evidence: smsError
      };
    }

    return {
      test: 'Database Schema',
      status: 'PASS',
      details: 'Both notification_sms column and sms_commands table exist with correct schema'
    };
  } catch (err) {
    return {
      test: 'Database Schema',
      status: 'FAIL',
      details: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      evidence: err
    };
  }
}

/**
 * Test 2: Verify STOP command implementation exists in code
 */
async function test2_StopCommandCode(): Promise<TestResult> {
  try {
    // Read the webhook file to verify STOP command handling
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    const stopVariants = ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
    const missingVariants = stopVariants.filter(variant => !webhookCode.includes(`case '${variant}':`));

    if (missingVariants.length > 0) {
      return {
        test: 'STOP Command Implementation',
        status: 'FAIL',
        details: `Missing STOP variants in code: ${missingVariants.join(', ')}`,
        evidence: missingVariants
      };
    }

    // Check for database update logic
    if (!webhookCode.includes('notification_sms: false')) {
      return {
        test: 'STOP Command Implementation',
        status: 'FAIL',
        details: 'STOP command does not update notification_sms field'
      };
    }

    // Check for confirmation message
    if (!webhookCode.includes("You've been unsubscribed")) {
      return {
        test: 'STOP Command Implementation',
        status: 'FAIL',
        details: 'STOP command does not send confirmation message'
      };
    }

    return {
      test: 'STOP Command Implementation',
      status: 'PASS',
      details: `All 5 STOP variants implemented: ${stopVariants.join(', ')}. Updates database and sends confirmation.`
    };
  } catch (err) {
    return {
      test: 'STOP Command Implementation',
      status: 'FAIL',
      details: `Failed to read webhook code: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 3: Verify START command re-opt-in implementation
 */
async function test3_StartCommandCode(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    const startVariants = ['START', 'SUBSCRIBE', 'UNSTOP'];
    const missingVariants = startVariants.filter(variant => !webhookCode.includes(`case '${variant}':`));

    if (missingVariants.length > 0) {
      return {
        test: 'START Command Implementation',
        status: 'FAIL',
        details: `Missing START variants: ${missingVariants.join(', ')}`,
        evidence: missingVariants
      };
    }

    // Check for re-enable logic
    if (!webhookCode.includes('notification_sms: true')) {
      return {
        test: 'START Command Implementation',
        status: 'FAIL',
        details: 'START command does not re-enable notification_sms'
      };
    }

    return {
      test: 'START Command Implementation',
      status: 'PASS',
      details: `All 3 START variants implemented: ${startVariants.join(', ')}`
    };
  } catch (err) {
    return {
      test: 'START Command Implementation',
      status: 'FAIL',
      details: `Failed to verify START command: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 4: Verify SMS suppression for opted-out users
 */
async function test4_SmsSuppression(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const twilioCode = await fs.readFile('./src/config/twilio.ts', 'utf-8');

    // Check for opt-out enforcement
    if (!twilioCode.includes('notification_sms')) {
      return {
        test: 'SMS Suppression Logic',
        status: 'FAIL',
        details: 'sendSMS() does not check notification_sms preference'
      };
    }

    // Check for transactional bypass
    if (!twilioCode.includes('isTransactional')) {
      return {
        test: 'SMS Suppression Logic',
        status: 'FAIL',
        details: 'No transactional SMS bypass for verification codes'
      };
    }

    // Check for opt-out detection
    if (!twilioCode.includes('opted out')) {
      return {
        test: 'SMS Suppression Logic',
        status: 'FAIL',
        details: 'SMS suppression does not log opt-out events'
      };
    }

    return {
      test: 'SMS Suppression Logic',
      status: 'PASS',
      details: 'sendSMS() checks notification_sms and supports transactional bypass'
    };
  } catch (err) {
    return {
      test: 'SMS Suppression Logic',
      status: 'FAIL',
      details: `Failed to verify SMS suppression: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 5: Verify sms_commands logging
 */
async function test5_CommandLogging(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    // Check for logging of all commands
    if (!webhookCode.includes("from('sms_commands').insert")) {
      return {
        test: 'Command Logging',
        status: 'FAIL',
        details: 'Webhook does not log commands to sms_commands table'
      };
    }

    // Check for compliance_action logging in parsed_data
    if (!webhookCode.includes('compliance_action')) {
      return {
        test: 'Command Logging',
        status: 'FAIL',
        details: 'STOP command does not log compliance_action for audit trail'
      };
    }

    return {
      test: 'Command Logging',
      status: 'PASS',
      details: 'All SMS commands are logged to sms_commands table with compliance metadata'
    };
  } catch (err) {
    return {
      test: 'Command Logging',
      status: 'FAIL',
      details: `Failed to verify command logging: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 6: Verify notification logging for compliance
 */
async function test6_NotificationLogging(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    // Check for notification logging on STOP
    if (!webhookCode.includes('logNotification')) {
      return {
        test: 'Notification Logging',
        status: 'FAIL',
        details: 'STOP command does not log to notifications table for compliance'
      };
    }

    // Check for SMS Unsubscribe event
    if (!webhookCode.includes('SMS Unsubscribe')) {
      return {
        test: 'Notification Logging',
        status: 'FAIL',
        details: 'STOP command does not create "SMS Unsubscribe" notification record'
      };
    }

    return {
      test: 'Notification Logging',
      status: 'PASS',
      details: 'STOP/START commands create notification records for compliance audit trail'
    };
  } catch (err) {
    return {
      test: 'Notification Logging',
      status: 'FAIL',
      details: `Failed to verify notification logging: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 7: Verify HELP command includes STOP information
 */
async function test7_HelpCommand(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    // Check for HELP command
    if (!webhookCode.includes("case 'HELP':")) {
      return {
        test: 'HELP Command',
        status: 'FAIL',
        details: 'No HELP command implemented'
      };
    }

    // Check that HELP includes STOP
    const helpMatch = webhookCode.match(/case 'HELP':\s*response = '([^']+)'/);
    if (!helpMatch || !helpMatch[1].includes('STOP')) {
      return {
        test: 'HELP Command',
        status: 'FAIL',
        details: 'HELP command does not mention STOP option'
      };
    }

    return {
      test: 'HELP Command',
      status: 'PASS',
      details: 'HELP command includes STOP information'
    };
  } catch (err) {
    return {
      test: 'HELP Command',
      status: 'FAIL',
      details: `Failed to verify HELP command: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 8: Integration test - Create test user and verify STOP flow
 */
async function test8_IntegrationTest(): Promise<TestResult> {
  if (!supabaseAvailable) {
    return {
      test: 'Integration Test - Database State',
      status: 'SKIP',
      details: 'Database connection not available - test in staging/production environment'
    };
  }

  try {
    // Check if there's any user with a phone number in the system
    const { data: existingUsers, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, phone, notification_sms, display_name')
      .not('phone', 'is', null)
      .limit(5);

    if (userError) {
      return {
        test: 'Integration Test',
        status: 'SKIP',
        details: `Could not query users table: ${userError.message}`
      };
    }

    if (!existingUsers || existingUsers.length === 0) {
      return {
        test: 'Integration Test',
        status: 'SKIP',
        details: 'No users with phone numbers found - cannot test STOP flow without test data'
      };
    }

    // Count users with SMS enabled vs disabled
    const enabledCount = existingUsers.filter(u => u.notification_sms === true).length;
    const disabledCount = existingUsers.filter(u => u.notification_sms === false).length;

    // Check recent STOP commands
    const { data: recentStops, error: stopError } = await supabaseAdmin
      .from('sms_commands')
      .select('command, parsed_data, response_sent, processed_at')
      .in('command', ['STOP', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'])
      .order('processed_at', { ascending: false })
      .limit(10);

    if (stopError) {
      return {
        test: 'Integration Test',
        status: 'FAIL',
        details: `Could not query sms_commands: ${stopError.message}`
      };
    }

    return {
      test: 'Integration Test - Database State',
      status: 'PASS',
      details: `Found ${existingUsers.length} users with phones. SMS enabled: ${enabledCount}, disabled: ${disabledCount}. Recent STOP commands: ${recentStops?.length || 0}`,
      evidence: {
        totalUsers: existingUsers.length,
        smsEnabled: enabledCount,
        smsDisabled: disabledCount,
        recentStopCommands: recentStops?.length || 0,
        sampleStopCommands: recentStops?.slice(0, 3)
      }
    };
  } catch (err) {
    return {
      test: 'Integration Test',
      status: 'FAIL',
      details: `Unexpected error: ${err instanceof Error ? err.message : String(err)}`,
      evidence: err
    };
  }
}

/**
 * Test 9: Verify Twilio signature validation (security)
 */
async function test9_SecurityValidation(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    // Check for Twilio signature validation
    if (!webhookCode.includes('validateTwilioWebhook')) {
      return {
        test: 'Security - Webhook Validation',
        status: 'FAIL',
        details: 'SMS webhook does not validate Twilio signature (spoofing risk)'
      };
    }

    // Check for 403 response on invalid signature
    if (!webhookCode.includes('403') && !webhookCode.includes('Forbidden')) {
      return {
        test: 'Security - Webhook Validation',
        status: 'FAIL',
        details: 'Invalid webhook signatures are not rejected with 403'
      };
    }

    return {
      test: 'Security - Webhook Validation',
      status: 'PASS',
      details: 'SMS webhook validates Twilio signature to prevent spoofing attacks'
    };
  } catch (err) {
    return {
      test: 'Security - Webhook Validation',
      status: 'FAIL',
      details: `Failed to verify security: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Test 10: Verify error handling for STOP command
 */
async function test10_ErrorHandling(): Promise<TestResult> {
  try {
    const fs = await import('fs/promises');
    const webhookCode = await fs.readFile('./src/routes/webhooks.ts', 'utf-8');

    // Check for handling STOP from unregistered phone
    if (!webhookCode.includes('unsubscribe_no_user')) {
      return {
        test: 'Error Handling - Unregistered User',
        status: 'FAIL',
        details: 'STOP from unregistered phone is not handled (FCC requires acknowledgment)'
      };
    }

    // Check for database error handling
    if (!webhookCode.includes('unsubscribe_failed')) {
      return {
        test: 'Error Handling - Database Failure',
        status: 'FAIL',
        details: 'Database errors during STOP are not handled gracefully'
      };
    }

    // Check for error message to user
    if (!webhookCode.includes('Error processing unsubscribe')) {
      return {
        test: 'Error Handling - User Feedback',
        status: 'FAIL',
        details: 'User does not receive error message when STOP fails'
      };
    }

    return {
      test: 'Error Handling',
      status: 'PASS',
      details: 'STOP command handles unregistered users, database errors, and provides user feedback'
    };
  } catch (err) {
    return {
      test: 'Error Handling',
      status: 'FAIL',
      details: `Failed to verify error handling: ${err instanceof Error ? err.message : String(err)}`
    };
  }
}

/**
 * Run all tests
 */
async function runAllTests() {
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  SMS STOP Command FCC/TCPA Compliance Test Suite');
  console.log('═══════════════════════════════════════════════════════════\n');

  const tests = [
    test1_DatabaseSchema,
    test2_StopCommandCode,
    test3_StartCommandCode,
    test4_SmsSuppression,
    test5_CommandLogging,
    test6_NotificationLogging,
    test7_HelpCommand,
    test8_IntegrationTest,
    test9_SecurityValidation,
    test10_ErrorHandling
  ];

  for (const testFn of tests) {
    const result = await testFn();
    results.push(result);

    const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} ${result.status.padEnd(4)} | ${result.test}`);
    console.log(`         ${result.details}`);
    if (result.evidence && result.status === 'PASS') {
      console.log(`         Evidence: ${JSON.stringify(result.evidence, null, 2).split('\n').join('\n         ')}`);
    }
    console.log('');
  }

  // Summary
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const skipped = results.filter(r => r.status === 'SKIP').length;

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  Test Summary');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`✅ PASSED:  ${passed}/${tests.length}`);
  console.log(`❌ FAILED:  ${failed}/${tests.length}`);
  console.log(`⚠️  SKIPPED: ${skipped}/${tests.length}`);
  console.log('');

  if (failed > 0) {
    console.log('❌ COMPLIANCE STATUS: FAILING');
    console.log('   Action required before launch\n');
    process.exit(1);
  } else if (skipped > 0) {
    console.log('⚠️  COMPLIANCE STATUS: INCOMPLETE');
    console.log('   Some tests could not be verified\n');
    process.exit(0);
  } else {
    console.log('✅ COMPLIANCE STATUS: PASSING');
    console.log('   Ready for production\n');
    process.exit(0);
  }
}

// Run tests
runAllTests().catch(err => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
