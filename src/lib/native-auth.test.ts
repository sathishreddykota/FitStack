import { describe, expect, it } from "vitest";
import { handoffIdFromUrl } from "./native-auth";

describe("return-to-app links", () => {
  it("accepts only FitStack's own sign-in link", () => {
    expect(handoffIdFromUrl("com.fitstack.app://auth?id=cmabc123def456ghi")).toBe("cmabc123def456ghi");
    expect(handoffIdFromUrl("com.fitstack.app://auth/?id=cmabc123def456ghi")).toBe("cmabc123def456ghi");
    expect(handoffIdFromUrl("com.fitstack.app://auth?x=1&id=cmabc123def456ghi")).toBe("cmabc123def456ghi");
    expect(handoffIdFromUrl("com.evil.app://auth?id=cmabc123def456ghi")).toBeNull();
    expect(handoffIdFromUrl("com.fitstack.app://other?id=cmabc123def456ghi")).toBeNull();
    expect(handoffIdFromUrl("com.fitstack.app://auth?id=../../x")).toBeNull();
    expect(handoffIdFromUrl("https://fitstack.app/auth?id=cmabc123def456ghi")).toBeNull();
  });
});
