// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

afterEach(() => {
  cleanup();
});

import type { ProjectedLeaderboardRow } from "../../services/project-leaderboard";
import type { LeaderboardRow } from "../../types";
import { PoolLeaderboard } from "../pool-leaderboard";

const COPY = {
  badge: "proy.",
  current: "actual",
  projected: "proy.",
  rise: "sube",
  fall: "baja",
  same: "igual",
  newEntry: "nuevo",
  disclaimer: "Projected ranking if the live score holds at full-time.",
};

function row(
  userId: string,
  nickname: string,
  totalPoints: number,
  position: number,
): LeaderboardRow {
  return {
    position,
    userId,
    nickname,
    avatarUrl: "/a.png",
    totalPoints,
    isViewer: false,
    isTied: false,
  };
}

function projected(
  base: LeaderboardRow,
  over: Partial<ProjectedLeaderboardRow> = {},
): ProjectedLeaderboardRow {
  return {
    ...base,
    livePoints: 0,
    projectedPoints: base.totalPoints,
    previousPosition: base.position,
    projectedPosition: base.position,
    positionDelta: 0,
    isNew: false,
    ...over,
  };
}

describe("PoolLeaderboard — non-projection mode (default)", () => {
  it("renders rows with totalPoints when no projection is provided", () => {
    render(<PoolLeaderboard rows={[row("u1", "Ana", 14, 1)]} />);
    expect(screen.getByText("Ana")).toBeDefined();
    expect(screen.getByTestId("leaderboard-position-u1").textContent).toBe("1");
    expect(screen.getByText("14")).toBeDefined();
  });

  it("respects the `limit` prop", () => {
    render(
      <PoolLeaderboard
        rows={[row("u1", "Ana", 14, 1), row("u2", "Bo", 10, 2)].map((r) => r)}
        limit={1}
      />,
    );
    expect(screen.getByText("Ana")).toBeDefined();
    expect(screen.queryByText("Bo")).toBeNull();
  });
});

describe("PoolLeaderboard — projection mode (Unit 62)", () => {
  it("renders the projected position, projected points, badge and `→` arrow when hasLive=true", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const projectedRows = [
      projected(rows[0], { projectedPoints: 19, projectedPosition: 1, positionDelta: 0 }),
    ];
    render(<PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive copy={COPY} />);
    expect(screen.getByTestId("pool-leaderboard").getAttribute("data-projection")).toBe("true");
    // Position column shows projectedPosition.
    expect(screen.getByTestId("leaderboard-position-u1").textContent).toBe("1");
    // Projected points rendered.
    expect(screen.getByTestId("leaderboard-projected-u1").textContent).toBe("19");
    // Strikethrough confirmed total still visible.
    expect(screen.getByText("14")).toBeDefined();
    // Badge rendered.
    expect(screen.getByText("proy.")).toBeDefined();
    // "→" arrow rendered somewhere.
    expect(screen.getAllByText("→").length).toBeGreaterThan(0);
    // Delta displayed (same → 0).
    expect(screen.getByTestId("leaderboard-delta-u1").textContent).toContain("igual");
  });

  it("renders `sube N` when delta > 0 (user rose)", () => {
    const rows = [row("u1", "Ana", 10, 3)];
    const projectedRows = [
      projected(rows[0], {
        projectedPoints: 15,
        projectedPosition: 1,
        previousPosition: 3,
        positionDelta: 3 - 1,
      }),
    ];
    render(<PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive copy={COPY} />);
    expect(screen.getByTestId("leaderboard-delta-u1").textContent).toBe("sube 2");
  });

  it("renders `baja N` when delta < 0 (user fell)", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    const projectedRows = [
      projected(rows[0], {
        projectedPoints: 14,
        projectedPosition: 3,
        previousPosition: 1,
        positionDelta: 1 - 3,
      }),
    ];
    render(<PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive copy={COPY} />);
    expect(screen.getByTestId("leaderboard-delta-u1").textContent).toBe("baja 2");
  });

  it("renders `nuevo` for a synthesized row with previousPosition=null (BR-62.4)", () => {
    const rows: LeaderboardRow[] = [];
    const projectedRows: ProjectedLeaderboardRow[] = [
      {
        position: 0,
        userId: "u-new",
        nickname: "Bobi",
        avatarUrl: "/b.png",
        totalPoints: 0,
        isViewer: false,
        isTied: false,
        livePoints: 5,
        projectedPoints: 5,
        previousPosition: null,
        projectedPosition: 2,
        positionDelta: null,
        isNew: true,
      },
    ];
    render(<PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive copy={COPY} />);
    expect(screen.getByTestId("leaderboard-projected-u-new").textContent).toBe("5");
    expect(screen.getByTestId("leaderboard-delta-u-new").textContent).toBe("nuevo");
  });

  it("falls back to non-projection rendering when hasLive is false", () => {
    const rows = [row("u1", "Ana", 14, 1)];
    // `identityProjection` returns projected-shape rows but caller passes
    // hasLive=false; the component must render in the original style.
    const projectedRows = [projected(rows[0])];
    render(
      <PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive={false} copy={COPY} />,
    );
    // Original mode: no badge, no `→` arrow.
    expect(screen.queryByText("proy.")).toBeNull();
    expect(screen.queryAllByText("→")).toHaveLength(0);
  });
});

describe("PoolLeaderboard — competition podium (Unit 70)", () => {
  const podiumRows = [
    row("u1", "Ana", 30, 1),
    row("u2", "Bo", 24, 2),
    row("u3", "Cy", 18, 3),
    row("u4", "Di", 12, 4),
    row("u5", "Ed", 8, 5),
    row("u6", "Fe", 4, 6),
  ];

  it("shows medal emojis on the top 3 and keeps the numeric rank for a11y", () => {
    render(<PoolLeaderboard rows={podiumRows} />);
    expect(screen.getByText("🥇")).toBeDefined();
    expect(screen.getByText("🥈")).toBeDefined();
    expect(screen.getByText("🥉")).toBeDefined();
    // The numeric position is preserved (medal is decorative).
    expect(screen.getByTestId("leaderboard-position-u1").textContent).toBe("1");
    expect(screen.getByTestId("leaderboard-position-u3").textContent).toBe("3");
    // No medal beyond 3rd.
    expect(screen.getByTestId("leaderboard-position-u4").textContent).toBe("4");
  });

  it("renders the serpentinas overlay only on the 1st-place row", () => {
    render(<PoolLeaderboard rows={podiumRows} />);
    const confetti = screen.getAllByTestId("leaderboard-confetti");
    expect(confetti).toHaveLength(1);
    // It lives inside the 1st-place row.
    expect(screen.getByTestId("leaderboard-row-u1").contains(confetti[0])).toBe(true);
    expect(screen.getByTestId("leaderboard-row-u2").contains(confetti[0])).toBe(false);
  });

  it("follows the projected position in live mode (champion = projected #1)", () => {
    // Confirmed order has Cy at #3; projection lifts Cy to #1.
    const rows = [row("u1", "Ana", 30, 1), row("u3", "Cy", 18, 3)];
    const projectedRows = [
      projected(rows[1], { projectedPoints: 35, projectedPosition: 1, previousPosition: 3 }),
      projected(rows[0], { projectedPoints: 30, projectedPosition: 2, previousPosition: 1 }),
    ];
    render(<PoolLeaderboard rows={rows} projectedRows={projectedRows} hasLive copy={COPY} />);
    // Serpentinas now on Cy's row (projected champion), not Ana's.
    const confetti = screen.getByTestId("leaderboard-confetti");
    expect(screen.getByTestId("leaderboard-row-u3").contains(confetti)).toBe(true);
    expect(screen.getByTestId("leaderboard-row-u1").contains(confetti)).toBe(false);
    // Gold medal sits on the projected #1.
    expect(screen.getByText("🥇")).toBeDefined();
  });
});
