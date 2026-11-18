import { describe, expect, it } from "vitest";
import { isDeadTokenError } from "./push";

describe("which send errors remove a phone", () => {
  it("uninstalled or garbage tokens", () => {
    expect(isDeadTokenError("messaging/registration-token-not-registered")).toBe(true);
    expect(isDeadTokenError("messaging/invalid-registration-token")).toBe(true);
    // Firebase's real wording for a malformed token (checked against the live API).
    expect(isDeadTokenError("messaging/invalid-argument", "The registration token is not a valid FCM registration token")).toBe(true);
  });

  it("a bug in our message never deletes the user's phone", () => {
    expect(isDeadTokenError("messaging/invalid-argument", "android.notification.tag must be a string")).toBe(false);
    expect(isDeadTokenError("messaging/invalid-payload", "android.notification.color must be in the form #RRGGBB")).toBe(false);
    expect(isDeadTokenError("messaging/internal-error")).toBe(false);
    expect(isDeadTokenError("")).toBe(false);
  });
});
