import { QR_TOKEN_REGEX } from "@/lib/qr";
import type { CreadorSessionResolution } from "@/lib/sessions-store";

export const cambioTokenRegex = QR_TOKEN_REGEX;

export type CambioEntryState =
  | { kind: "invalid-token" }
  | { kind: "revoked-token" }
  | { kind: "closed-session" }
  | { kind: "resume"; sessionId: string; cambiadorName: string }
  | { kind: "create" };

type BuildEntryStateInput = {
  token: string;
  hasActiveToken: boolean;
  sessionResolution: CreadorSessionResolution;
};

export function buildCambioEntryState(input: BuildEntryStateInput): CambioEntryState {
  if (!cambioTokenRegex.test(input.token)) return { kind: "invalid-token" };
  if (!input.hasActiveToken) return { kind: "revoked-token" };

  if (input.sessionResolution.kind === "closed") return { kind: "closed-session" };
  if (input.sessionResolution.kind === "open") {
    return {
      kind: "resume",
      sessionId: input.sessionResolution.session.id,
      cambiadorName: input.sessionResolution.session.cambiadorName,
    };
  }

  return { kind: "create" };
}
