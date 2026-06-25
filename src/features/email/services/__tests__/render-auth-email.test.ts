import { describe, expect, it } from "vitest";
import type { SendEmailHookPayload } from "../../types";
import { renderAuthEmail } from "../render-auth-email";

const SITE = "https://app.test";

function payload(overrides: Partial<SendEmailHookPayload>): SendEmailHookPayload {
  return {
    user: { id: "u1", email: "user@test.com" },
    email_data: {
      token: "000000",
      token_hash: "HASH123",
      email_action_type: "signup",
      site_url: SITE,
    },
    ...overrides,
  };
}

describe("renderAuthEmail", () => {
  it("renders the signup confirmation carrying invite_next from user_metadata", () => {
    const email = renderAuthEmail(
      payload({
        user: {
          id: "u1",
          email: "user@test.com",
          user_metadata: { invite_next: "%2Fpools%2Fjoin%3Ftoken%3Dabc" },
        },
      }),
    );
    expect(email).not.toBeNull();
    expect(email?.to).toBe("user@test.com");
    expect(email?.subject).toBe("Confirma tu cuenta — Quiniela Mundial 2026");
    expect(email?.html).toContain(
      `${SITE}/auth/confirm?token_hash=HASH123&type=signup&next=%2Fpools%2Fjoin%3Ftoken%3Dabc`,
    );
  });

  it("defaults signup next to encoded /matches when no invite_next", () => {
    const email = renderAuthEmail(payload({}));
    expect(email?.html).toContain(
      `${SITE}/auth/confirm?token_hash=HASH123&type=signup&next=%2Fmatches`,
    );
  });

  it("renders recovery pointing at /reset-password", () => {
    const email = renderAuthEmail(
      payload({
        email_data: {
          token: "0",
          token_hash: "REC",
          email_action_type: "recovery",
          site_url: SITE,
        },
      }),
    );
    expect(email?.to).toBe("user@test.com");
    expect(email?.subject).toBe("Restablece tu contraseña — Quiniela Mundial 2026");
    expect(email?.html).toContain(
      `${SITE}/auth/confirm?token_hash=REC&type=recovery&next=/reset-password`,
    );
  });

  it("sends the email change link to the NEW address and shows both addresses", () => {
    const email = renderAuthEmail(
      payload({
        user: { id: "u1", email: "old@test.com", new_email: "new@test.com" },
        email_data: {
          token: "0",
          token_hash: "CHG",
          email_action_type: "email_change",
          site_url: SITE,
        },
      }),
    );
    expect(email?.to).toBe("new@test.com");
    expect(email?.subject).toBe("Confirma el cambio de tu email — Quiniela Mundial 2026");
    expect(email?.html).toContain("old@test.com");
    expect(email?.html).toContain("new@test.com");
    expect(email?.html).toContain(
      `${SITE}/auth/confirm?token_hash=CHG&type=email_change&next=/settings/security`,
    );
  });

  it("returns null for action types the app does not use", () => {
    expect(
      renderAuthEmail(
        payload({
          email_data: {
            token: "0",
            token_hash: "X",
            email_action_type: "magiclink",
            site_url: SITE,
          },
        }),
      ),
    ).toBeNull();
  });
});
