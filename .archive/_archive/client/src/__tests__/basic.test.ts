import { describe, it, expect } from "vitest";

describe("Basic Test Suite", () => {
  it("should pass a basic assertion", () => {
    expect(true).toBe(true);
  });

  it("should correctly add numbers", () => {
    expect(1 + 1).toBe(2);
  });

  it("should handle string concatenation", () => {
    expect("hello" + " " + "world").toBe("hello world");
  });
});
