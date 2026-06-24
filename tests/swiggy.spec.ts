// Swiggy (https://swiggy.com) public-website browser tests.
//
// IMPORTANT: `test` and `expect` are imported from
// '@testrelic/playwright-analytics/fixture' (NOT '@playwright/test'). That
// fixture wraps the `page` so TestRelic captures Network Requests, video sync,
// Console logs, and Test Navigation (Nav Logs). Combined with the
// `use: { video, screenshot, trace }` block in playwright.config.ts, every run
// populates all of the dashboard columns.
import { test, expect } from '@testrelic/playwright-analytics/fixture';

const SWIGGY_URL = 'https://www.swiggy.com';

// Swiggy is a heavy, location-gated SPA that can be slow on first paint, so give
// each navigation room and assert on stable, observable facts rather than
// brittle internal markup.
test.setTimeout(60_000);

/**
 * Swiggy serves bot-detection / consent interstitials in some regions. Best-
 * effort dismiss anything that looks like a modal so it doesn't block the test.
 */
async function dismissOverlays(page: import('@playwright/test').Page) {
  const candidates = [
    page.getByRole('button', { name: /accept|got it|ok|allow/i }),
    page.locator('[class*="close" i]').first(),
  ];
  for (const c of candidates) {
    try {
      if (await c.first().isVisible({ timeout: 1_000 })) {
        await c.first().click({ timeout: 1_000 });
      }
    } catch {
      // Overlay not present — fine.
    }
  }
}

test('Homepage loads and renders the location search bar', async ({ page }) => {
  await page.goto(SWIGGY_URL, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  // The brand is in the title on every Swiggy page.
  await expect(page).toHaveTitle(/swiggy/i);

  // The homepage's primary call-to-action is the delivery-location search box.
  const locationSearch = page
    .getByPlaceholder(/location|delivery|area|city/i)
    .or(page.locator('input[type="text"]'))
    .first();
  await expect(locationSearch).toBeVisible({ timeout: 20_000 });
});

test('User can search for a city or location', async ({ page }) => {
  await page.goto(SWIGGY_URL, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  const locationSearch = page
    .getByPlaceholder(/location|delivery|area|city/i)
    .or(page.locator('input[type="text"]'))
    .first();
  await expect(locationSearch).toBeVisible({ timeout: 20_000 });

  // Typing a city should surface autocomplete suggestions from Swiggy's
  // location API (this network call is what TestRelic captures).
  await locationSearch.click();
  await locationSearch.fill('Bengaluru');

  // A suggestions list should appear referencing the typed query.
  const suggestion = page.getByText(/bengaluru|bangalore|karnataka/i).first();
  await expect(suggestion).toBeVisible({ timeout: 20_000 });
});

test('Restaurant listing page loads with results', async ({ page }) => {
  // Swiggy's city restaurant-collection pages are publicly crawlable and don't
  // require a chosen delivery address, which makes them stable to assert on.
  await page.goto(`${SWIGGY_URL}/city/bangalore`, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  await expect(page).toHaveURL(/swiggy\.com/i);
  await expect(page).toHaveTitle(/swiggy/i);

  // The listing renders restaurant links/cards once the collection API responds.
  const restaurantLink = page
    .locator('a[href*="/restaurants/"]')
    .or(page.locator('a[href*="/menu"]'))
    .first();
  await expect(restaurantLink).toBeVisible({ timeout: 25_000 });
});

test('A restaurant page opens successfully', async ({ page }) => {
  await page.goto(`${SWIGGY_URL}/city/bangalore`, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  const restaurantLink = page
    .locator('a[href*="/restaurants/"]')
    .or(page.locator('a[href*="/menu"]'))
    .first();
  await expect(restaurantLink).toBeVisible({ timeout: 25_000 });

  // Opening a restaurant navigates to its menu page — a navigation TestRelic
  // records in the Nav Logs column.
  await restaurantLink.click();
  await page.waitForLoadState('domcontentloaded');

  await expect(page).toHaveURL(/restaurants|menu/i);
  await expect(page).toHaveTitle(/swiggy/i);
});

test('Cart interaction — user can open the cart', async ({ page }) => {
  await page.goto(SWIGGY_URL, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  // The cart entry point is present site-wide. Opening it (empty cart is fine)
  // exercises a user-facing interaction and the cart view.
  const cart = page
    .getByRole('link', { name: /cart/i })
    .or(page.getByText(/cart/i))
    .first();
  await expect(cart).toBeVisible({ timeout: 20_000 });

  await cart.click();
  // Either we land on the cart view or an "empty cart" prompt renders — both
  // confirm the cart interaction worked.
  const cartState = page.getByText(/cart|empty|add items|checkout/i).first();
  await expect(cartState).toBeVisible({ timeout: 20_000 });
});

test('Order fails when restaurant is unavailable', async ({ page }) => {
  // INTENTIONAL FAILURE (required by the assignment): demonstrates how a real
  // failed user journey — placing an order at an unavailable restaurant —
  // surfaces in the TestRelic dashboard with its video, screenshot, and trace.
  await page.goto(SWIGGY_URL, { waitUntil: 'domcontentloaded' });
  await dismissOverlays(page);

  // Simulated outcome: the order is rejected, so the expected order count (1)
  // does not match the actual placed-order count (2).
  expect(1).toBe(2);
});
