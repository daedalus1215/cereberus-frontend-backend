import { describe, expect, it } from "vitest";
import { withHttpScheme } from "./open-url";

describe("withHttpScheme", () => {
  it("keeps an address that already has a scheme", () => {
    expect(withHttpScheme("https://example.com/a")).toBe(
      "https://example.com/a",
    );
    expect(withHttpScheme("HTTP://router.lan")).toBe("HTTP://router.lan");
  });

  it("assumes https for a bare address", () => {
    expect(withHttpScheme("example.com")).toBe("https://example.com");
    expect(withHttpScheme("localhost:3000")).toBe("https://localhost:3000");
  });

  it("leaves no way to reach another scheme", () => {
    expect(new URL(withHttpScheme("mailto:a@b.c")).protocol).toBe("https:");
    expect(() => new URL(withHttpScheme("javascript:alert(1)"))).toThrow();
  });
});
