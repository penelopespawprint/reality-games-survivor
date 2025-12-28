import { testEmailConfig, sendEmail } from "../server/email.js";

async function main() {
  console.log("🧪 Testing Email Configuration\n");

  // Test 1: Verify transporter configuration
  console.log("1️⃣ Testing email transporter configuration...");
  const isValid = await testEmailConfig();

  if (!isValid) {
    console.log("\n❌ Email is not configured or configuration is invalid.");
    console.log("\nTo configure email, add these variables to your .env file:");
    console.log("  EMAIL_HOST=smtp.gmail.com");
    console.log("  EMAIL_PORT=587");
    console.log("  EMAIL_USER=your-email@gmail.com");
    console.log("  EMAIL_PASSWORD=your-app-password");
    console.log("\n📖 For Gmail App Password instructions:");
    console.log("  https://support.google.com/accounts/answer/185833");
    console.log("\n✅ Without email configured, reset links will be logged to console only.");
    process.exit(0);
  }

  // Test 2: Send a test email
  console.log("\n2️⃣ Sending test email...");
  const testEmail = process.env.EMAIL_USER || "test@example.com";

  const success = await sendEmail({
    to: testEmail,
    subject: "RGFL Email Configuration Test",
    html: `
      <h1>Email Configuration Test</h1>
      <p>If you're reading this, your RGFL email configuration is working correctly!</p>
      <p>You can now send:</p>
      <ul>
        <li>Welcome emails to new users</li>
        <li>Password reset emails</li>
        <li>Future notifications and announcements</li>
      </ul>
      <p><strong>Configuration verified at:</strong> ${new Date().toLocaleString()}</p>
    `,
    text: "Email configuration test successful!"
  });

  if (success) {
    console.log(`\n✅ Test email sent successfully to ${testEmail}`);
    console.log("📬 Check your inbox to confirm receipt.");
  } else {
    console.log("\n❌ Failed to send test email. Check the error messages above.");
  }
}

main().catch(console.error);
