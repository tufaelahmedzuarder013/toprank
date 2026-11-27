import "dotenv/config";

// Integration tests run against TEST_DATABASE_URL (never your dev database).
if (process.env.TEST_DATABASE_URL) process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
else delete process.env.DATABASE_URL;

// Default to demo payments unless a test opts in to Stripe.
delete process.env.STRIPE_SECRET_KEY;
delete process.env.STRIPE_WEBHOOK_SECRET;
