/** Browser smoke: real Chromium on local static server, never live Stripe. */
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const origin = process.env.GAME_SMOKE_ORIGIN || "http://127.0.0.1:8765";
const browser = await chromium.launch({ headless: true, args: ["--no-sandbox"] });
const errors = [];
const unexpectedRequests = [];
const report = [];
mkdirSync("artifacts", { recursive: true });

async function open(context, label) {
  const page = await context.newPage();
  page.on("pageerror", error => errors.push(label + ": " + error.message));
  page.on("request", request => {
    const url = request.url();
    if (!url.startsWith(origin + "/") && !url.startsWith("data:")) {
      unexpectedRequests.push(label + ": " + url);
    }
  });
  const response = await page.goto(origin + "/game.html?test=1", { waitUntil: "load" });
  assert.equal(response.status(), 200, label + ": should serve page");
  await page.waitForFunction(() => Boolean(window.__zenithSoloTest));
  return page;
}

try {
  const desktopContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const landing = await desktopContext.newPage();
  const response = await landing.goto(origin + "/", { waitUntil: "load" });
  assert.equal(response.status(), 200);
  assert.equal(await landing.getByRole("link", {name: /Play free Mars Race preview/}).count(), 1);
  const gameLink = await landing.getByRole("link", {name: /Play free Mars Race preview/}).getAttribute("href");
  assert.equal(gameLink, "./game.html");
  const page = await open(desktopContext, "desktop");
  let state = await page.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.equal(state.status, "ready");
  assert.equal(state.ticks, 0);
  assert.equal(state.boosts, 3);
  await page.screenshot({ path: "artifacts/game-desktop-ready.png", fullPage: true });
  await page.getByRole("button", { name: "Start race" }).click();
  await page.waitForFunction(() => window.__zenithSoloTest.snapshot().status === "running");
  await page.keyboard.down("ArrowRight");
  await page.waitForTimeout(560);
  await page.keyboard.up("ArrowRight");
  state = await page.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.ok(state.x > 94, "ship should move right on keyboard thrust");
  assert.ok(state.ticks > 10, "animation should advance one race clock");
  assert.equal(state.status, "running");
  await page.keyboard.press("Space");
  await page.waitForTimeout(90);
  state = await page.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.equal(state.boosts, 2, "single key press should use one boost");
  // Boosting into moving debris may legitimately cause a crash. Separate
  // pause/restart assertions from that hazardous flight trajectory.
  await page.getByRole("button", { name: "Restart" }).click();
  await page.waitForTimeout(80);
  assert.equal(await page.evaluate(() => window.__zenithSoloTest.snapshot().status), "running");
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  state = await page.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.equal(state.status, "paused");
  await page.waitForTimeout(250);
  const paused = await page.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.equal(paused.ticks, state.ticks, "pause must freeze simulation ticks");
  await page.getByRole("button", { name: "Resume" }).click();
  await page.waitForTimeout(140);
  assert.equal(await page.evaluate(() => window.__zenithSoloTest.snapshot().status), "running");
  for (let i = 0; i < 3; i++) {
    await page.getByRole("button", { name: "Restart" }).click();
    await page.waitForTimeout(230);
    const restarted = await page.evaluate(() => window.__zenithSoloTest.snapshot());
    assert.equal(restarted.boosts, 3);
    assert.equal(restarted.status, "running");
    assert.ok(restarted.ticks > 2 && restarted.ticks < 24,
      "restart must not create a second simulation clock");
  }
  await page.screenshot({ path: "artifacts/game-desktop-running.png", fullPage: true });
  report.push("desktop: landing link, ready, keyboard, single boost, pause/resume, triple restart");

  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true,
  });
  const mobile = await open(mobileContext, "mobile");
  const overflow = await mobile.evaluate(() =>
    document.documentElement.scrollWidth - window.innerWidth
  );
  assert.ok(overflow <= 1, "mobile page has horizontal overflow: " + overflow);
  const right = mobile.getByRole("button", { name: "Thrust right" });
  assert.ok(await right.isVisible(), "touch controls should be shown on mobile");
  await mobile.getByRole("button", { name: "Start race" }).click();
  await right.evaluate(button => button.dispatchEvent(new PointerEvent(
    "pointerdown", { bubbles: true, cancelable: true, pointerId: 22, pointerType: "touch" }
  )));
  await mobile.waitForTimeout(320);
  await right.evaluate(button => button.dispatchEvent(new PointerEvent(
    "pointerup", { bubbles: true, pointerId: 22, pointerType: "touch" }
  )));
  state = await mobile.evaluate(() => window.__zenithSoloTest.snapshot());
  assert.ok(state.x > 94, "mobile touch-right should steer ship");
  assert.equal(state.status, "running");
  await mobile.screenshot({ path: "artifacts/game-mobile-running.png", fullPage: true });
  report.push("mobile: 390px no overflow, touch movement, running state");
  await mobileContext.close();
  await desktopContext.close();
  assert.deepEqual(errors, [], "unexpected JavaScript errors");
  assert.deepEqual(unexpectedRequests, [], "game must not call remote network");
  report.push("no JavaScript page errors or third-party network requests");
  console.log("GAME_BROWSER_SMOKE_PASS", report.join(" | "));
} finally {
  await browser.close();
}
