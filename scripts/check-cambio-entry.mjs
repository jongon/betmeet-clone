#!/usr/bin/env node

import { buildCambioEntryState } from "../src/lib/cambio-entry.ts";

let failed = 0;

function assert(condition, message) {
  if (!condition) {
    failed += 1;
    console.error(`✗ ${message}`);
  } else {
    console.log(`✓ ${message}`);
  }
}

const openState = buildCambioEntryState({
  token: "qr_0123456789abcdef0123456789abcdef",
  hasActiveToken: true,
  sessionResolution: {
    kind: "open",
    session: {
      id: "ses_1",
      cambiadorName: "Carlos",
      offeredCount: 0,
      requestedCount: 0,
      createdAt: new Date().toISOString(),
      status: "open",
      token: "qr_0123456789abcdef0123456789abcdef",
    },
  },
});

assert(openState.kind === "resume", "Resuelve sesion abierta como resume");

const noSessionState = buildCambioEntryState({
  token: "qr_0123456789abcdef0123456789abcdef",
  hasActiveToken: true,
  sessionResolution: { kind: "none" },
});

assert(noSessionState.kind === "create", "Sin sesion previa muestra formulario");

const closedState = buildCambioEntryState({
  token: "qr_0123456789abcdef0123456789abcdef",
  hasActiveToken: true,
  sessionResolution: {
    kind: "closed",
    session: {
      id: "ses_2",
      cambiadorName: "Carlos",
      offeredCount: 0,
      requestedCount: 0,
      createdAt: new Date().toISOString(),
      status: "closed",
      token: "qr_0123456789abcdef0123456789abcdef",
    },
  },
});

assert(closedState.kind === "closed-session", "Sesion cerrada retorna estado de bloqueo");

const invalidTokenState = buildCambioEntryState({
  token: "bad-token",
  hasActiveToken: true,
  sessionResolution: { kind: "none" },
});

assert(invalidTokenState.kind === "invalid-token", "Token invalido retorna estado invalido");

const revokedState = buildCambioEntryState({
  token: "qr_0123456789abcdef0123456789abcdef",
  hasActiveToken: false,
  sessionResolution: { kind: "none" },
});

assert(revokedState.kind === "revoked-token", "Token revocado retorna estado no disponible");

if (failed > 0) {
  console.error(`\n${failed} checks fallaron`);
  process.exit(1);
}

console.log("\nTodas las validaciones de cambio-entry pasaron.");
