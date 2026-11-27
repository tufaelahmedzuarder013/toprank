/**
 * End-to-end smoke test of the core flows against a running server in DEMO mode
 * (no STRIPE_SECRET_KEY): guest claim → demo checkout → success, cancel flow, register →
 * verify ownership (demo) → upgrade paying the difference, admin moderation and settings,
 * contact form.
 *
 *   npm run dev            # in another terminal, with a seeded database
 *   CHROME_PATH=/path/to/chrome npm run test:e2e
 *
 * Env: E2E_BASE_URL (default http://localhost:3000), CHROME_PATH (a Chrome/Chromium binary),
 * ADMIN_EMAIL / ADMIN_PASSWORD (the seeded admin). Creates a few listings tagged "E2E Tool …".
 */
import "dotenv/config";
import { chromium } from "playwright-core";

const BASE = process.env.E2E_BASE_URL ?? "http://localhost:3000";
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@example.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, channel: process.env.CHROME_PATH ? undefined : "chrome", args: ["--no-sandbox"] });
const results = [];
const log = (ok, msg) => {
  results.push({ ok, msg });
  console.log(`${ok ? "PASS" : "FAIL"} ${msg}`);
};
const errorsFor = (page, bucket) => {
  page.on("pageerror", (e) => bucket.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource/.test(m.text())) bucket.push("console: " + m.text());
  });
};

const stamp = Date.now().toString(36);
const target = `e2e-${stamp}.dev`;

// ── 1. Guest claim → demo checkout → success ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  errorsFor(page, errs);
  await page.goto(BASE + "/");
  // Home claim card validation
  await page.click("#claim button[type=submit]");
  log(await page.getByText("Enter a website URL or an X handle.").isVisible(), "home claim card shows validation for empty link");
  await page.fill("#cc-target", target);
  await page.selectOption("#cc-category", "saas");
  await page.fill("#cc-amount", "4822");
  log(await page.getByText("Taking #1 needs at least $4,825.").isVisible(), "home claim card explains the #1 gap");
  await page.getByRole("button", { name: "$4,825", exact: true }).click();
  log((await page.inputValue("#cc-amount")) === "4825", "gap fix button sets a valid amount");
  await page.fill("#cc-amount", "60");
  await page.click("#claim button[type=submit]");
  await page.waitForURL(/\/claim\?/);
  log(page.url().includes(`target=${target}`), "claim card navigates to the claim flow with the link");
  await page.waitForFunction(() => document.body.innerText.includes("is available"), null, { timeout: 20000 });
  log(true, "claim flow checks availability");
  await page.fill("#cf-name", `E2E Tool ${stamp}`);
  await page.fill("#cf-desc", "A listing created by the end-to-end test.");
  const submit = page.getByRole("button", { name: /Continue to demo checkout/ });
  log(await submit.isDisabled(), "checkout button disabled until terms are accepted");
  await page.getByRole("checkbox").click();
  await submit.click();
  await page.waitForURL(/\/checkout\/demo\//, { timeout: 20000 });
  log(true, "redirected to the demo checkout");
  await page.getByRole("button", { name: /Simulate successful payment/ }).click();
  await page.waitForURL(/\/payment\/success/, { timeout: 20000 });
  log(await page.getByRole("heading", { name: "You're on the board!" }).waitFor({ timeout: 20000 }).then(() => true, () => false), "success page confirms the listing");
  const rankText = await page.locator("text=/Confirmed at #\\d+/").first().innerText();
  log(/#\d+/.test(rankText), `final rank shown (${rankText.match(/#\d+/)?.[0]})`);
  // Duplicate claim is blocked
  await page.goto(`${BASE}/claim?target=${target}&amount=20&category=saas`);
  await page.waitForFunction(() => document.body.innerText.includes("already on the board"), null, { timeout: 20000 });
  log(true, "claiming the same link again shows the duplicate warning");
  log(errs.length === 0, `no client errors in guest flow ${errs.length ? JSON.stringify(errs) : ""}`);
  await ctx.close();
}

// ── 2. Cancel flow releases the reservation ─────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  const t2 = `cancel-${stamp}.dev`;
  await page.goto(`${BASE}/claim?target=${t2}&amount=15&category=design`);
  await page.waitForFunction(() => document.body.innerText.includes("is available"), null, { timeout: 20000 });
  await page.fill("#cf-name", "Cancel Me");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: /Continue to demo checkout/ }).click();
  await page.waitForURL(/\/checkout\/demo\//);
  await page.getByRole("button", { name: /Cancel/ }).click();
  await page.waitForURL(/\/payment\/cancelled/);
  log(await page.getByRole("heading", { name: "Checkout cancelled" }).waitFor({ timeout: 20000 }).then(() => true, () => false), "cancel returns to the cancelled page");
  await page.goto(`${BASE}/claim?target=${t2}&amount=15&category=design`);
  await page.waitForFunction(() => document.body.innerText.includes("is available"), null, { timeout: 20000 });
  log(true, "cancelled link is free to claim again");
  await ctx.close();
}

// ── 3. Register → verify (demo) → upgrade paying the difference ─────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  errorsFor(page, errs);
  await page.goto(BASE + "/register");
  await page.fill("#name", "E2E Owner");
  await page.fill("#email", `owner-${stamp}@test.example`);
  await page.fill("#password", "short");
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForSelector("text=Use at least 10 characters.");
  log(true, "register validates password length");
  await page.fill("#password", "a-long-enough-password");
  await page.getByRole("checkbox").click();
  await page.getByRole("button", { name: "Create account" }).click();
  await page.waitForURL(/\/dashboard/);
  log(true, "registration signs the user in");

  // Find the listing created earlier and verify ownership (demo method)
  await page.goto(`${BASE}/search?q=${stamp}`);
  await page.locator(`a:has-text("E2E Tool ${stamp}")`).first().click();
  await page.waitForURL(/\/p\//);
  await page.getByRole("link", { name: /Is this yours\? Verify ownership/ }).click();
  await page.waitForURL(/\/dashboard\/listings\//);
  await page.getByRole("heading", { name: /Verify that you own this listing/ }).waitFor({ timeout: 20000 });
  log(true, "non-owner sees verification instructions");
  log(await page.getByText("toprung-site-verification=").first().isVisible(), "DNS instructions include the token");
  await page.getByRole("tab", { name: /Demo/ }).click();
  await page.getByRole("button", { name: /Verify instantly/ }).click();
  await page.waitForSelector("text=Upgrade", { timeout: 20000 });
  log(true, "demo verification unlocks owner tools");
  const current = await page.locator("#up-total").inputValue();
  await page.fill("#up-total", "120");
  await page.waitForSelector("text=due now");
  const due = await page.locator("text=/due now/").first().innerText();
  log(/\$60/.test(due), `upgrade charges only the difference (${due.replace(/\s+/g, " ")}) [start ${current}]`);
  await page.getByRole("button", { name: /Continue to demo checkout/ }).click();
  await page.waitForURL(/\/checkout\/demo\//);
  log(await page.getByText("Listing upgrade").waitFor({ timeout: 20000 }).then(() => true, () => false), "demo checkout shows the upgrade");
  await page.getByRole("button", { name: /Simulate successful payment/ }).click();
  await page.waitForURL(/\/payment\/success/);
  log(await page.getByRole("heading", { name: "Upgrade complete!" }).waitFor({ timeout: 20000 }).then(() => true, () => false), "upgrade confirmed");
  await page.goto(`${BASE}/dashboard`);
  log(await page.getByText(`E2E Tool ${stamp}`).first().isVisible(), "dashboard lists the owned listing");
  log(errs.length === 0, `no client errors in owner flow ${errs.length ? JSON.stringify(errs) : ""}`);
  await ctx.close();
}

// ── 4. Admin ─────────────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  const errs = [];
  errorsFor(page, errs);
  await page.goto(BASE + "/login?next=/admin");
  await page.fill("#email", ADMIN_EMAIL);
  await page.fill("#password", "wrong-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector("text=That email and password don't match.");
  log(true, "login rejects a wrong password");
  await page.fill("#password", ADMIN_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/admin$/);
  await page.getByRole("heading", { name: "Overview" }).waitFor();
  log(true, "admin overview loads");
  for (const path of ["/admin/listings", "/admin/payments", "/admin/ownership", "/admin/categories", "/admin/settings", "/admin/content", "/admin/messages", "/admin/users"]) {
    const res = await page.goto(BASE + path);
    log(res.status() === 200, `admin page ${path} (${res.status()})`);
  }
  // Hide and restore a listing
  await page.goto(`${BASE}/admin/listings?q=${stamp}`);
  await page.getByRole("button", { name: "Hide" }).first().click();
  await page.getByRole("button", { name: "Restore" }).first().waitFor({ timeout: 15000 });
  const hiddenRes = await page.request.get(`${BASE}/search?q=${stamp}`);
  log(!(await hiddenRes.text()).includes(`E2E Tool ${stamp}`), "hidden listing disappears from public search");
  await page.getByRole("button", { name: "Restore" }).first().click();
  await page.getByRole("button", { name: "Hide" }).first().waitFor({ timeout: 15000 });
  log(true, "listing restored");
  // Rules setting change
  await page.goto(BASE + "/admin/settings");
  await page.fill("#r-min", "12");
  await page.locator("form", { has: page.locator("#r-min") }).getByRole("button", { name: "Save" }).click();
  await page.waitForSelector("text=Settings saved.");
  const home = await page.request.get(BASE + "/");
  log((await home.text()).replace(/<!-- -->/g, "").includes("Min $12"), "rule change is reflected on the home page");
  await page.fill("#r-min", "10");
  await page.locator("form", { has: page.locator("#r-min") }).getByRole("button", { name: "Save" }).click();
  await page.waitForSelector("text=Settings saved.");
  // Non-admin can't see admin
  const anon = await browser.newContext();
  const ap = await anon.newPage();
  await ap.goto(BASE + "/admin");
  log(ap.url().includes("/login"), "guests are redirected away from admin");
  await anon.close();
  log(errs.length === 0, `no client errors in admin flow ${errs.length ? JSON.stringify(errs) : ""}`);
  await ctx.close();
}

// ── 5. Contact form ──────────────────────────────────────────────────────────
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(BASE + "/contact");
  await page.fill("#c-name", "E2E");
  await page.fill("#c-email", "e2e@test.example");
  await page.fill("#c-message", "Hello from the end-to-end test suite.");
  await page.getByRole("button", { name: "Send message" }).click();
  await page.waitForSelector("text=Your message is in");
  log(true, "contact form submits");
  await ctx.close();
}

await browser.close();
const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed`);
process.exit(failed.length ? 1 : 0);
