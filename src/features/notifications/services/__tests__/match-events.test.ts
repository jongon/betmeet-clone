import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../events", () => ({
  getMatchNotificationRecipients: vi.fn(),
  queueNotificationEvents: vi.fn(),
}));

import { getMatchNotificationRecipients, queueNotificationEvents } from "../events";
import { emitMatchNotificationEvents } from "../match-events";

describe("emitMatchNotificationEvents", () => {
  beforeEach(() => vi.clearAllMocks());

  it("queues start, finish and goal events with recipient-specific dedupe keys", async () => {
    vi.mocked(getMatchNotificationRecipients).mockResolvedValue(["user-1", "user-2"]);

    await emitMatchNotificationEvents(
      { id: "match-1", status: "SCHEDULED", homeScore: 0, awayScore: 0 },
      { id: "match-1", status: "LIVE", homeScore: 1, awayScore: 0 },
    );

    expect(queueNotificationEvents).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          type: "MATCH_STARTED",
          dedupeKey: "match:match-1:started:user-1",
          recipientUserId: "user-1",
        }),
        expect.objectContaining({
          type: "GOAL_SCORED",
          dedupeKey: "match:match-1:goal:1-0:user-2",
          recipientUserId: "user-2",
        }),
      ]),
    );
  });

  it("does not queue anything when no recipients are eligible", async () => {
    vi.mocked(getMatchNotificationRecipients).mockResolvedValue([]);

    await emitMatchNotificationEvents(null, {
      id: "match-1",
      status: "FINISHED",
      homeScore: 2,
      awayScore: 1,
    });

    expect(queueNotificationEvents).not.toHaveBeenCalled();
  });
});
