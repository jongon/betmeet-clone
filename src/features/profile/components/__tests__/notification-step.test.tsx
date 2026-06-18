// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { savePushSubscription } = vi.hoisted(() => ({
  savePushSubscription: vi.fn(),
}));
const { updateNotificationPreferences } = vi.hoisted(() => ({
  updateNotificationPreferences: vi.fn(),
}));
vi.mock("@/features/notifications/actions/save-subscription", () => ({ savePushSubscription }));
vi.mock("@/features/notifications/actions/update-preferences", () => ({
  updateNotificationPreferences,
}));

// jsdom lacks PushManager, serviceWorker and Notification — stub for supported check.
// @ts-expect-error: PushManager is not part of jsdom
window.PushManager = class {};
// @ts-expect-error: serviceWorker is not part of jsdom navigator
navigator.serviceWorker = { ready: Promise.resolve() };
// @ts-expect-error: Notification is not part of jsdom
window.Notification = {
  permission: "default",
  requestPermission: vi.fn(),
};

import { NotificationStep } from "../notification-step";

function setVapid(value: string) {
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = value;
}

function unsetVapid() {
  delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  unsetVapid();
});

describe("NotificationStep — ready state", () => {
  beforeEach(() => {
    setVapid("BFAKE_PUBLIC_KEY_for_testing");
  });

  it("renders activate and skip buttons when VAPID key and push support are present", () => {
    render(<NotificationStep onComplete={vi.fn()} onSkip={vi.fn()} />);

    expect(screen.getByTestId("notification-enable")).toHaveTextContent("Activar notificaciones");
    expect(screen.getByTestId("notification-skip")).toHaveTextContent("Omitir");
  });

  it('calls onSkip when "Omitir" is clicked', () => {
    const onSkip = vi.fn();
    render(<NotificationStep onComplete={vi.fn()} onSkip={onSkip} />);

    fireEvent.click(screen.getByTestId("notification-skip"));
    expect(onSkip).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationStep — edge states", () => {
  it("shows unsupported fallback when PushManager is absent", () => {
    setVapid("BFAKE_PUBLIC_KEY_for_testing");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).PushManager;

    render(<NotificationStep onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByTestId("notification-unsupported-continue")).toBeInTheDocument();

    // Restore for subsequent tests
    // @ts-expect-error: PushManager stub
    window.PushManager = class {};
  });

  it("shows fallback when VAPID public key is missing", () => {
    render(<NotificationStep onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByTestId("notification-unsupported-continue")).toBeInTheDocument();
  });

  it("shows fallback when permission is denied", () => {
    setVapid("BFAKE_PUBLIC_KEY_for_testing");
    const originalPermission = window.Notification.permission;
    Object.defineProperty(window.Notification, "permission", {
      value: "denied",
      configurable: true,
      writable: true,
    });

    render(<NotificationStep onComplete={vi.fn()} onSkip={vi.fn()} />);
    expect(screen.getByTestId("notification-unsupported-continue")).toBeInTheDocument();

    Object.defineProperty(window.Notification, "permission", {
      value: originalPermission,
      configurable: true,
      writable: true,
    });
  });

  it("calls onComplete when Continue is clicked in unsupported state", () => {
    const onComplete = vi.fn();
    render(<NotificationStep onComplete={onComplete} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByTestId("notification-unsupported-continue"));
    expect(onComplete).toHaveBeenCalledTimes(1);
  });
});

describe("NotificationStep — activation flow", () => {
  it("transitions to activated state after successful push setup", async () => {
    setVapid("BFAKE_PUBLIC_KEY_for_testing");

    savePushSubscription.mockResolvedValue({ success: true });
    updateNotificationPreferences.mockResolvedValue({ success: true });

    const mockSubscription = {
      toJSON: () => ({
        endpoint: "https://push.svc/endpoint",
        keys: { p256dh: "p256dh-key", auth: "auth-key" },
      }),
    };

    const mockServiceWorkerRegistration = {
      pushManager: {
        subscribe: vi.fn().mockResolvedValue(mockSubscription),
      },
    };

    vi.stubGlobal("navigator", {
      ...navigator,
      serviceWorker: { ready: Promise.resolve(mockServiceWorkerRegistration) },
    });

    const requestPermission = vi.fn().mockResolvedValue("granted");
    window.Notification.requestPermission = requestPermission;

    render(<NotificationStep onComplete={vi.fn()} onSkip={vi.fn()} />);

    fireEvent.click(screen.getByTestId("notification-enable"));

    await waitFor(() => {
      expect(screen.getByTestId("notification-activated-continue")).toBeInTheDocument();
    });

    expect(savePushSubscription).toHaveBeenCalled();
    expect(updateNotificationPreferences).toHaveBeenCalledWith({
      matchStarted: true,
      matchFinished: true,
      poolInvite: true,
      globalRankImproved: true,
      goalScored: true,
    });
  });
});
