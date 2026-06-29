import { describe, it, expect } from "vitest";
import {
  deriveStatus,
  trialDaysLeft,
  findTrialsToExpire,
  findFoundingTrialsToConvert,
  computeFoundingSlotAvailability,
  FOUNDING_DEFAULT_CAP,
  type CenterSubscriptionInput,
} from "./subscription";

const DAY_MS = 24 * 60 * 60 * 1000;
const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY_MS).toISOString();

function center(over: Partial<CenterSubscriptionInput>): CenterSubscriptionInput {
  return {
    id: "c1",
    subscription_status: "trial",
    subscription_plan: null,
    trial_ends_at: null,
    ...over,
  };
}

describe("deriveStatus", () => {
  it("expires a standard trial whose end date has passed", () => {
    expect(
      deriveStatus(center({ subscription_status: "trial", trial_ends_at: iso(-1) })),
    ).toBe("expired");
  });

  it("auto-converts a founding trial past its end date to active (never flashes expired)", () => {
    expect(
      deriveStatus(
        center({
          subscription_status: "trial",
          plan_tier: "founding",
          trial_ends_at: iso(-1),
        }),
      ),
    ).toBe("active");
  });

  it("flags a trial ending within 7 days as trial_ending_soon", () => {
    expect(
      deriveStatus(center({ subscription_status: "trial", trial_ends_at: iso(3) })),
    ).toBe("trial_ending_soon");
  });

  it("keeps a trial with plenty of runway as trial", () => {
    expect(
      deriveStatus(center({ subscription_status: "trial", trial_ends_at: iso(20) })),
    ).toBe("trial");
  });

  it("passes non-trial statuses through unchanged", () => {
    for (const s of ["active", "past_due", "canceled", "expired", "paused", "pending_renewal"]) {
      expect(deriveStatus(center({ subscription_status: s }))).toBe(s);
    }
  });

  it("defaults an unknown status to trial", () => {
    expect(deriveStatus(center({ subscription_status: "bogus" }))).toBe("trial");
  });
});

describe("trialDaysLeft", () => {
  it("is positive for a future end date and negative once expired", () => {
    expect(trialDaysLeft(iso(5))).toBeGreaterThan(0);
    expect(trialDaysLeft(iso(-5))).toBeLessThan(0);
  });
  it("is null when there is no trial end date", () => {
    expect(trialDaysLeft(null)).toBeNull();
  });
});

describe("findTrialsToExpire vs findFoundingTrialsToConvert", () => {
  const centers: CenterSubscriptionInput[] = [
    center({ id: "std-expired", trial_ends_at: iso(-1) }),
    center({ id: "std-active", trial_ends_at: iso(10) }),
    center({ id: "founding-expired", plan_tier: "founding", trial_ends_at: iso(-2) }),
    center({ id: "already-active", subscription_status: "active", trial_ends_at: iso(-1) }),
  ];

  it("expires only past-due standard trials (never founding)", () => {
    expect(findTrialsToExpire(centers)).toEqual(["std-expired"]);
  });

  it("converts only past-due founding trials", () => {
    expect(findFoundingTrialsToConvert(centers).map((c) => c.id)).toEqual([
      "founding-expired",
    ]);
  });
});

describe("computeFoundingSlotAvailability", () => {
  it("finds the lowest free slot and remaining count", () => {
    const res = computeFoundingSlotAvailability(
      [
        { plan_tier: "founding", founding_center_number: 1 },
        { plan_tier: "founding", founding_center_number: 3 },
        { plan_tier: "standard", founding_center_number: null },
      ],
      FOUNDING_DEFAULT_CAP,
    );
    expect(res.taken).toEqual([1, 3]);
    expect(res.nextAvailable).toBe(2);
    expect(res.remaining).toBe(FOUNDING_DEFAULT_CAP - 2);
  });

  it("reports no slot once the cap is hit", () => {
    const res = computeFoundingSlotAvailability(
      [1, 2, 3, 4, 5].map((n) => ({ plan_tier: "founding", founding_center_number: n })),
      FOUNDING_DEFAULT_CAP,
    );
    expect(res.nextAvailable).toBeNull();
    expect(res.remaining).toBe(0);
  });

  it("defaults the founding cap to 5 (matches the pitch's '5 founding centers')", () => {
    expect(FOUNDING_DEFAULT_CAP).toBe(5);
  });
});
