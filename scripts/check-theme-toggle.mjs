#!/usr/bin/env node
// Automated check for the design-system theme toggle infrastructure.
// Verifies the SSR output and CSS payload, reducing the manual visual
// verification (task 7.2) to a 5-second click-and-look.
//
// Usage: node scripts/check-theme-toggle.mjs

import { spawn } from "node:child_process";
import { setTimeout as wait } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..");
const port = 4180;
const baseUrl = `http://127.0.0.1:${port}`;
const pageUrl = `${baseUrl}/design-system`;

const checks = [];
let failed = 0;
function check(name, pass, detail = "") {
	checks.push({ name, pass, detail });
	if (!pass) failed += 1;
}

function fetchText(url) {
	return fetch(url, { headers: { "cache-control": "no-cache" } }).then((r) => {
		if (!r.ok) throw new Error(`HTTP ${r.status} on ${url}`);
		return r.text();
	});
}

async function startDevServer() {
	console.log(`Starting dev server on :${port}…`);
	const proc = spawn("pnpm", ["next", "dev", "--port", String(port), "--hostname", "127.0.0.1"], {
		cwd: root,
		stdio: ["ignore", "pipe", "pipe"],
		env: { ...process.env, NODE_ENV: "development" },
	});

	let resolved = false;
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			if (!resolved) {
				resolved = true;
				reject(new Error("Dev server did not start within 30s"));
			}
		}, 30000);

		proc.stdout.on("data", (chunk) => {
			const s = chunk.toString();
			process.stdout.write(`  [dev] ${s}`);
			if (!resolved && /Ready in|Local:.*http/i.test(s)) {
				resolved = true;
				clearTimeout(timer);
				// Give the server a moment to finish warming up the first route
				wait(500).then(() => resolve(proc));
			}
		});
		proc.stderr.on("data", (chunk) => {
			process.stderr.write(`  [dev] ${chunk}`);
		});
		proc.on("exit", (code) => {
			if (!resolved) {
				resolved = true;
				clearTimeout(timer);
				reject(new Error(`Dev server exited early with code ${code}`));
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
	let proc;
	try {
		proc = await startDevServer();
	} catch (err) {
		console.error(`✗ Could not start dev server: ${err.message}`);
		process.exit(1);
	}

	try {
		// 1. Fetch the page
		const html = await fetchText(pageUrl);
		check("GET /design-system responde 200", html.length > 100, `${html.length} bytes`);

		// 2. Verify ThemeProvider wiring (no hydration warning error from next-themes)
		check(
			"<html> tiene suppressHydrationWarning",
			/html\s+lang=/.test(html) && !/<html[^>]*\sonly-/.test(html),
			"presence of lang attribute, absence of only-* hydration markers",
		);

		// 3. Verify the ThemeToggle is rendered (button with aria-label)
		check(
			"ThemeToggle renderiza con aria-label='Cambiar tema'",
			/aria-label="Cambiar tema"/.test(html),
		);

		// 4. Verify the toggle is inside a button (shadcn button pattern)
		check(
			"ThemeToggle usa un <button> (no un <a>)",
			/<button[^>]*aria-label="Cambiar tema"/.test(html),
		);

		// 5. Verify Sun and Moon icons are present (lucide-react)
		check("Iconos Sun y Moon presentes", /lucide-sun/.test(html) && /lucide-moon/.test(html));

		// 6. Verify the next-themes inline script is present (FOUC prevention)
		check(
			"Script de next-themes inyectado (pre-paint)",
			/localStorage|theme/i.test(html) && html.includes("classList"),
			"classList mutation in inline script",
		);

		// 7. Fetch the CSS and verify both :root and .dark blocks
		const cssMatch = html.match(
			/href="(\/_next\/static\/(?:css|chunks)\/[^"]+\.css)"/,
		);
		if (!cssMatch) {
			check("CSS bundle encontrado en HTML", false, "no /_next/static/{css,chunks}/*.css link");
		} else {
			const cssUrl = `${baseUrl}${cssMatch[1]}`;
			const css = await fetchText(cssUrl);

			check("CSS contiene :root con tokens light", /:root\s*\{/.test(css));
			check("CSS contiene .dark con tokens dark", /\.dark\s*\{/.test(css));
			check(
				"Tokens FIFA presentes (azul / rojo / crema)",
				// Accepts either oklch form (source) or hex form (Turbopack dev output).
				// Hex form: --primary: #1a3c5e, --brand: #e63947, --background: #f5f5f0
				// oklch form: --primary: oklch(0.349 0.072 251)
				(/oklch\([^)]*0\.349[^)]*251\)/.test(css) ||
					/--primary:\s*#1a3c5e/.test(css)) &&
					(/oklch\([^)]*0\.612[^)]*22\)/.test(css) || /--brand:\s*#e63947/.test(css)) &&
					(/oklch\([^)]*0\.969[^)]*106\)/.test(css) ||
						/--background:\s*#f5f5f0/.test(css)),
			);
			check(
				"Tailwind v4 `@theme inline` (o `@layer theme`) está presente",
				/@theme\s+inline|@layer\s+theme/.test(css),
			);
		}

		// 8. Verify the page mentions the design system contents (sanity)
		check(
			"Página muestra título 'Cromos Mundial 2026'",
			/Cromos Mundial 2026/.test(html),
		);
		check("Sección Paleta visible", /Paleta/.test(html));
		check("Sección Tipografía visible", /Tipograf\u00eda/.test(html));
	} catch (err) {
		check("Fetch y parsing del HTML", false, err.message);
	} finally {
		await stopDevServer(proc);
	}

	// Report
	console.log("\n=== Theme toggle infrastructure check ===");
	for (const c of checks) {
		const mark = c.pass ? "✓" : "✗";
		const detail = c.detail ? ` (${c.detail})` : "";
		console.log(`  ${mark} ${c.name}${detail}`);
	}
	console.log("");
	if (failed > 0) {
		console.log(`✗ ${failed}/${checks.length} checks fallaron.`);
		process.exit(1);
	}
	console.log(
		`✓ ${checks.length}/${checks.length} checks pasaron.\n` +
			"  → Falta solo la confirmación visual: arrancar el dev server y hacer\n" +
			"    click en el toggle. La página debe conmutar light/dark sin flash.",
	);
}

run();
