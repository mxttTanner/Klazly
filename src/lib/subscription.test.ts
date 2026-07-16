import { describe, it, expect } from "vitest";
import {
  deriveStatus,
  trialDaysLeft,
  findTrialsToExpire,
  monthlyMrrVnd,
  TRIAL_DAYS,
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
  it("expires a trial whose end date has passed", () => {
    expect(
      deriveStatus(center({ subscription_status: "trial", trial_ends_at: iso(-1) })),
    ).toBe("expired");
  });

  it("expires a lapsed trial regardless of plan_tier (design_partner too)", () => {
    expect(
      deriveStatus(
        center({
          subscription_status: "trial",
          plan_tier: "design_partner",
          trial_ends_at: iso(-1),
        }),
      ),
    ).toBe("expired");
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

describe("findTrialsToExpire", () => {
  const centers: CenterSubscriptionInput[] = [
    center({ id: "expired", trial_ends_at: iso(-1) }),
    center({ id: "still-running", trial_ends_at: iso(10) }),
    center({ id: "partner-expired", plan_tier: "design_partner", trial_ends_at: iso(-2) }),
    center({ id: "already-active", subscription_status: "active", trial_ends_at: iso(-1) }),
  ];

  it("expires every past-due trial regardless of tier, and leaves running/active alone", () => {
    expect(findTrialsToExpire(centers).sort()).toEqual(["expired", "partner-expired"]);
  });
});

describe("TRIAL_DAYS", () => {
  it("is the single 6-month (180-day) trial length", () => {
    expect(TRIAL_DAYS).toBe(180);
  });
});

describe("monthlyMrrVnd", () => {
  it("amortises paid plans and contributes 0 for trial / no-plan / design-partner", () => {
    expect(monthlyMrrVnd({ subscription_plan: "monthly" })).toBe(1_200_000);
    expect(monthlyMrrVnd({ subscription_plan: "six_months" })).toBe(900_000);
    expect(monthlyMrrVnd({ subscription_plan: "annual" })).toBe(825_000);
    expect(monthlyMrrVnd({ subscription_plan: null })).toBe(0);
    expect(
      monthlyMrrVnd({ subscription_plan: null, plan_tier: "design_partner" }),
    ).toBe(0);
  });
});
