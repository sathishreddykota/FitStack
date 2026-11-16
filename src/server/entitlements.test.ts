import { describe, expect, it } from "vitest";
import { extendPeriod, getEntitlement } from "./entitlements";

const now = new Date("2026-11-16T12:00:00Z");
const daysAgo = (n: number) => new Date(now.getTime() - n * 86_400_000);
const daysAhead = (n: number) => new Date(now.getTime() + n * 86_400_000);

describe("getEntitlement", () => {
  it("gives new users a 7-day trial", () => {
    const e = getEntitlement({ createdAt: daysAgo(2) }, now);
    expect(e).toMatchObject({ isPro: true, source: "trial", daysLeft: 5 });
  });

  it("drops to FREE (not locked) after the trial", () => {
    const e = getEntitlement({ createdAt: daysAgo(10) }, now);
    expect(e).toMatchObject({ isPro: false, source: null, proUntil: null, daysLeft: 0 });
  });

  it("honours an active paid period", () => {
    const e = getEntitlement(
      { createdAt: daysAgo(40), subscription: { status: "active", currentPeriodEnd: daysAhead(12) } },
      now,
    );
    expect(e).toMatchObject({ isPro: true, source: "paid", daysLeft: 12 });
  });

  it("ignores an expired or inactive paid period", () => {
    expect(
      getEntitlement({ createdAt: daysAgo(40), subscription: { status: "active", currentPeriodEnd: daysAgo(1) } }, now)
        .isPro,
    ).toBe(false);
    expect(
      getEntitlement({ createdAt: daysAgo(40), subscription: { status: "refunded", currentPeriodEnd: daysAhead(5) } }, now)
        .isPro,
    ).toBe(false);
  });

  it("uses the later of trial end and paid end", () => {
    const e = getEntitlement(
      { createdAt: daysAgo(1), subscription: { status: "active", currentPeriodEnd: daysAhead(30) } },
      now,
    );
    expect(e.proUntil).toEqual(daysAhead(30));
  });
});

describe("extendPeriod", () => {
  it("starts from now when not currently PRO", () => {
    expect(extendPeriod(daysAgo(3), 30, now).end).toEqual(daysAhead(30));
    expect(extendPeriod(null, 30, now).end).toEqual(daysAhead(30));
  });

  it("stacks renewals onto the remaining days", () => {
    expect(extendPeriod(daysAhead(10), 30, now).end).toEqual(daysAhead(40));
  });
});
