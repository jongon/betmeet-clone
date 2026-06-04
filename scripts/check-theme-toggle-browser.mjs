#!/usr/bin/env node
// Headless verification of the theme toggle using Playwright.
// Clicks the toggle, verifies the .dark class is applied to <html>,
// and snapshots the page in both states for visual inspection.
//
// Usage: node scripts/check-theme-toggle-browser.mjs
//
// Requires `playwright` and `pnpm exec playwright install chromium` to have run.

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const port = 4280;
const baseUrl = `http://127.0.0.1:${port}`;
const pageUrl = `${baseUrl}/design-system`;
const screenshotDir = join(root, ".tmp", "theme-toggle-screenshots");

const checks = [];
let failed = 0;
function check(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  if (!pass) failed += 1;
}

async function startDevServer() {
  console.log(`Starting dev server on :${port}…`);
  const proc = spawn("pnpm", ["next", "dev", "--port", String(port), "--hostname", "127.0.0.1"], {
    cwd: root,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env, NODE_ENV: "development" },
  });

  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Dev server did not start within 30s")), 30000);
    proc.stdout.on("data", (chunk) => {
      if (/Ready in|Local:.*http/i.test(chunk.toString())) {
        clearTimeout(timer);
        wait(500).then(() => resolve(proc));
      }
    });
    proc.stderr.on("data", () => {});
    proc.on("exit", (code) => {
      if (code && code !== 0 && code !== null) {
        clearTimeout(timer);
        reject(new Error(`Dev server exited with code ${code}`));
      }
    });
  });
}

async function stopDevServer(proc) {
  if (!proc || proc.killed) return;
  proc.kill("SIGTERM");
  await wait(500);
  if (!proc.killed) proc.kill("SIGKILL");
}

async function run() {
  await mkdir(screenshotDir, { recursive: true });

  let proc;
  try {
    proc = await startDevServer();
  } catch (err) {
    console.error(`✗ Could not start dev server: ${err.message}`);
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();

    // Step 1: Initial load (default = system theme = light in this env)
    await page.goto(pageUrl, { waitUntil: "networkidle" });
    await wait(300); // give next-themes script a moment

    const initialClass = await page.evaluate(() => document.documentElement.className);
    check(
      "Carga inicial: <html> sin clase (system default)",
      initialClass === "" || initialClass === "light",
      `class="${initialClass}"`,
    );

    const initialBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Modern Chromium returns lab() color values. Parse L (0-100): > 80 = light.
    const initialL = initialBg.match(/lab\(([\d.]+)/);
    const initialLuma = initialL ? Number(initialL[1]) : 50;
    check(
      "Fondo inicial es claro (luma > 80)",
      initialLuma > 80,
      `backgroundColor=${initialBg} (L=${initialLuma})`,
    );

    await page.screenshot({
      path: join(screenshotDir, "1-initial.png"),
      fullPage: true,
    });

    // Step 2: Open the dropdown and click "Oscuro"
    const toggle = page.getByRole("button", { name: "Cambiar tema" });
    await toggle.click();
    await wait(150);

    const darkItem = page.getByRole("menuitem", { name: "Oscuro" });
    await darkItem.click();
    await wait(300); // let the class apply

    const afterDarkClass = await page.evaluate(() => document.documentElement.className);
    check(
      "Tras click en 'Oscuro': <html> tiene clase 'dark'",
      afterDarkClass.includes("dark"),
      `class="${afterDarkClass}"`,
    );

    const darkBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    // Dark bg: oklch(0.22 0.03 250) → lab L ≈ 9-15
    const darkL = darkBg.match(/lab\(([\d.]+)/);
    const darkLuma = darkL ? Number(darkL[1]) : 999;
    check(
      "Fondo tras toggle es oscuro (L < 30)",
      darkLuma < 30,
      `backgroundColor=${darkBg} (L=${darkLuma})`,
    );

    await page.screenshot({
      path: join(screenshotDir, "2-dark.png"),
      fullPage: true,
    });

    // Step 3: Switch back to "Claro"
    await toggle.click();
    await wait(150);
    const lightItem = page.getByRole("menuitem", { name: "Claro" });
    await lightItem.click();
    await wait(300);

    const afterLightClass = await page.evaluate(() => document.documentElement.className);
    check(
      "Tras click en 'Claro': <html> NO tiene clase 'dark'",
      !afterLightClass.includes("dark"),
      `class="${afterLightClass}"`,
    );

    const lightBg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    const lightL = lightBg.match(/lab\(([\d.]+)/);
    const lightLuma = lightL ? Number(lightL[1]) : 50;
    check(
      "Fondo tras volver a 'Claro' es claro de nuevo (L > 80)",
      lightLuma > 80,
      `backgroundColor=${lightBg} (L=${lightLuma})`,
    );

    await page.screenshot({
      path: join(screenshotDir, "3-back-to-light.png"),
      fullPage: true,
    });

    // Step 4: Reload in dark mode (FOUC test)
    await toggle.click();
    await wait(150);
    await darkItem.click();
    await wait(300);

    // Set up navigation listener BEFORE the reload
    await page.reload({ waitUntil: "domcontentloaded" });
    await wait(50); // first paint
    const classOnFirstPaint = await page.evaluate(() => document.documentElement.className);
    check(
      "Recarga en dark: clase 'dark' aplicada antes del primer paint (no flash)",
      classOnFirstPaint.includes("dark"),
      `classOnFirstPaint="${classOnFirstPaint}"`,
    );
  } catch (err) {
    check("Ejecución del test en browser", false, err.message);
  } finally {
    await browser.close();
    await stopDevServer(proc);
  }

  console.log("\n=== Theme toggle browser check ===");
  for (const c of checks) {
    const mark = c.pass ? "✓" : "✗";
    const detail = c.detail ? ` (${c.detail})` : "";
    console.log(`  ${mark} ${c.name}${detail}`);
  }
  console.log("");
  if (failed > 0) {
    console.log(`✗ ${failed}/${checks.length} checks fallaron.`);
    console.log(`  Screenshots en: ${screenshotDir}`);
    process.exit(1);
  }
  console.log(
    `✓ ${checks.length}/${checks.length} checks pasaron.\n` +
      `  Screenshots guardados en: ${screenshotDir}\n` +
      "  → Tarea 7.2 verificada. La única confirmación humana pendiente es\n" +
      "    abrir las imágenes y confirmar que el render visual es correcto.",
  );
}

run();
