import { beforeEach, describe, expect, it, vi } from "vitest";

const { verifyMock, renderMock, sendMock } = vi.hoisted(() => ({
  verifyMock: vi.fn(),
  renderMock: vi.fn(),
  sendMock: vi.fn(),
}));

vi.mock("@/features/email/services/verify-hook", () => ({
  verifyHookSignature: verifyMock,
  HookVerificationError: class extends Error {},
}));
vi.mock("@/features/email/services/render-auth-email", () => ({
  renderAuthEmail: renderMock,
}));
vi.mock("@/lib/email/client", () => ({
  getResendClient: () => ({ emails: { send: sendMock } }),
  getEmailFrom: () => "Test <no-reply@test.com>",
}));

import { POST } from "../route";

function request(body = "{}") {
  return new Request("http://localhost/api/auth/email-hook", { method: "POST", body });
}

const SAMPLE_EMAIL = { to: "user@test.com", subject: "S", html: "<p>x</p>" };

describe("POST /api/auth/email-hook", () => {
  beforeEach(() => {
    verifyMock.mockReset();
    renderMock.mockReset();
    sendMock.mockReset();
  });

  it("returns 401 and does not send when signature verification fails", async () => {
    verifyMock.mockImplementation(() => {
      throw new Error("bad signature");
    });
    const res = await POST(request());
    expect(res.status).toBe(401);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends via Resend and returns 200 for a renderable payload", async () => {
    verifyMock.mockReturnValue({ user: {}, email_data: {} });
    renderMock.mockReturnValue(SAMPLE_EMAIL);
    sendMock.mockResolvedValue({ data: { id: "e1" }, error: null });
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(sendMock).toHaveBeenCalledWith(
      expect.objectContaining({ to: "user@test.com", subject: "S", html: "<p>x</p>" }),
    );
  });

  it("acks (200) without sending when the action type is unused", async () => {
    verifyMock.mockReturnValue({ user: {}, email_data: {} });
    renderMock.mockReturnValue(null);
    const res = await POST(request());
    expect(res.status).toBe(200);
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("returns 500 when Resend reports an error", async () => {
    verifyMock.mockReturnValue({ user: {}, email_data: {} });
    renderMock.mockReturnValue(SAMPLE_EMAIL);
    sendMock.mockResolvedValue({ data: null, error: { message: "rate limited" } });
    const res = await POST(request());
    expect(res.status).toBe(500);
  });
});
