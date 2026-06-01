#!/usr/bin/env node
// WCAG 2.1 contrast checker for design system tokens (oklch inputs).
// Usage: node scripts/contrast-check.mjs

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

function oklchToLinearSrgb(L, C, H) {
	const hRad = (H * Math.PI) / 180;
	const a = C * Math.cos(hRad);
	const b = C * Math.sin(hRad);

	const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
	const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
	const s_ = L - 0.0894841775 * a - 1.291485548 * b;

	const l = l_ ** 3;
	const m = m_ ** 3;
	const s = s_ ** 3;

	let r = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
	let g = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
	let blue = -0.0041960863 * l - 0.703418614 * m + 1.707614701 * s;

	r = clamp01(r);
	g = clamp01(g);
	blue = clamp01(blue);

	return [r, g, blue];
}

function clamp01(x) {
	if (x < 0) return 0;
	if (x > 1) return 1;
	return x;
}

function srgbToLinear(c) {
	return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance([r, g, b]) {
	const R = srgbToLinear(r);
	const G = srgbToLinear(g);
	const B = srgbToLinear(b);
	return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

function contrastRatio(fg, bg) {
	const L1 = relativeLuminance(fg);
	const L2 = relativeLuminance(bg);
	const lighter = Math.max(L1, L2);
	const darker = Math.min(L1, L2);
	return (lighter + 0.05) / (darker + 0.05);
}

function parseOklch(str) {
	const match = str.match(/oklch\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)/);
	if (!match) return null;
	return [Number(match[1]), Number(match[2]), Number(match[3])];
}

const here = dirname(fileURLToPath(import.meta.url));
const cssPath = join(here, "..", "src", "app", "globals.css");
const css = readFileSync(cssPath, "utf8");

function extractBlock(content, name) {
	const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const re = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\n\\}`);
	const m = content.match(re);
	return m ? m[1] : "";
}

function extractTokens(block) {
	const tokens = {};
	const re = /(--[a-z0-9-]+)\s*:\s*([^;]+);/gi;
	let m;
	while ((m = re.exec(block)) !== null) {
		tokens[m[1]] = m[2].trim();
	}
	return tokens;
}

const rootBlock = extractBlock(css, ":root");
const darkBlock = extractBlock(css, ".dark");
const light = extractTokens(rootBlock);
const dark = extractTokens(darkBlock);

const pairs = [
	["background", "foreground"],
	["card", "card-foreground"],
	["popover", "popover-foreground"],
	["primary", "primary-foreground"],
	["secondary", "secondary-foreground"],
	["muted", "muted-foreground"],
	["accent", "accent-foreground"],
	["brand", "brand-foreground"],
	["destructive", "destructive-foreground"],
];

function checkTheme(name, tokens) {
	console.log(`\n=== ${name} ===`);
	const rows = [];
	for (const [bg, fg] of pairs) {
		const bgVal = tokens[`--${bg}`];
		const fgVal = tokens[`--${fg}`];
		if (!bgVal || !fgVal) continue;
		const bgOklch = parseOklch(bgVal);
		const fgOklch = parseOklch(fgVal);
		if (!bgOklch || !fgOklch) continue;
		const bgRgb = oklchToLinearSrgb(...bgOklch);
		const fgRgb = oklchToLinearSrgb(...fgOklch);
		const ratio = contrastRatio(fgRgb, bgRgb);
		const aaNormal = ratio >= 4.5;
		const aaLarge = ratio >= 3.0;
		rows.push({ pair: `${bg}/${fg}`, ratio, aaNormal, aaLarge });
	}
	for (const r of rows) {
		const flag = r.aaNormal ? "AA OK" : r.aaLarge ? "AA-large only" : "FAIL";
		console.log(`  ${r.pair.padEnd(34)} ${r.ratio.toFixed(2).padStart(6)}:1  ${flag}`);
	}
	return rows;
}

const lightRows = checkTheme("LIGHT (root)", light);
const darkRows = checkTheme("DARK", dark);

const failing = [...lightRows, ...darkRows].filter((r) => !r.aaNormal);
if (failing.length > 0) {
	console.log(`\nFAIL: ${failing.length} pair(s) do not meet AA (>= 4.5:1) for normal text.`);
	process.exit(1);
}
console.log("\nAll surface/foreground pairs meet AA (>= 4.5:1).");
