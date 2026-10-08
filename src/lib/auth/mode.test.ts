import { expect, test } from "bun:test";
import { DEFAULT_AUTH_MODE, parseAuthMode } from "./mode";

test("defaults to owner authentication", () => {
  expect(parseAuthMode(undefined)).toBe(DEFAULT_AUTH_MODE);
  expect(parseAuthMode("")).toBe("owner");
  expect(parseAuthMode("invalid")).toBe("owner");
});

test("accepts the explicit no-auth local mode", () => {
  expect(parseAuthMode("none")).toBe("none");
  expect(parseAuthMode(" NONE ")).toBe("none");
});
