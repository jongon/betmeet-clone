import { Webhook } from "standardwebhooks";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { HookVerificationError, verifyHookSignature } from "../verify-hook";

const RAW_SECRET = Buffer.from("unit-72-email-hook-secret-value!").toString("base64");

function signedRequest(body: string) {
  const wh = new Webhook(RAW_SECRET);
  const msgId = "msg_abc";
  const timestamp = new Date();
  const signature = wh.sign(msgId, timestamp, body);
  const headers = new Headers({
    "webhook-id": msgId,
    "webhook-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
    "webhook-signature": signature,
  });
  return headers;
}

describe("verifyHookSignature", () => {
  beforeEach(() => {
    process.env.SEND_EMAIL_HOOK_SECRET = `v1,whsec_${RAW_SECRET}`;
  });
  afterEach(() => {
    process.env.SEND_EMAIL_HOOK_SECRET = undefined;
  });

  it("returns the parsed payload for a valid signature", () => {
    const body = JSON.stringify({
      user: { id: "u1", email: "user@test.com" },
      email_data: { token: "0", token_hash: "H", email_action_type: "signup" },
    });
    const result = verifyHookSignature(body, signedRequest(body));
    expect(result.user.email).toBe("user@test.com");
    expect(result.email_data.email_action_type).toBe("signup");
  });

  it("rejects a tampered body", () => {
    const body = JSON.stringify({ a: 1 });
    const headers = signedRequest(body);
    expect(() => verifyHookSignature(JSON.stringify({ a: 2 }), headers)).toThrow(
      HookVerificationError,
    );
  });

  it("rejects when the secret is not configured", () => {
    process.env.SEND_EMAIL_HOOK_SECRET = undefined;
    expect(() => verifyHookSignature("{}", new Headers())).toThrow(HookVerificationError);
  });

  it("rejects when required headers are missing", () => {
    expect(() => verifyHookSignature("{}", new Headers())).toThrow(/Missing webhook-id/);
  });
});
