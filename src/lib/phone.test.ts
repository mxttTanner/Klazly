import { describe, it, expect } from "vitest";
import {
  normalizeVnPhone,
  formatVnPhoneForDisplay,
  syntheticEmailForPhone,
  isSyntheticEmail,
  phoneFromSyntheticEmail,
  isEmailLike,
  PHONE_AUTH_DOMAIN,
} from "./phone";

describe("normalizeVnPhone", () => {
  it("accepts the documented input formats and canonicalizes to E.164", () => {
    expect(normalizeVnPhone("0901234567")).toBe("+84901234567");
    expect(normalizeVnPhone("+84 901 234 567")).toBe("+84901234567");
    expect(normalizeVnPhone("84-901-234-567")).toBe("+84901234567");
    expect(normalizeVnPhone("84901234567")).toBe("+84901234567");
    expect(normalizeVnPhone("+84901234567")).toBe("+84901234567");
  });

  it("accepts every valid VN mobile prefix (3,5,7,8,9)", () => {
    for (const prefix of ["3", "5", "7", "8", "9"]) {
      expect(normalizeVnPhone(`0${prefix}01234567`)).toBe(`+84${prefix}01234567`);
    }
  });

  it("rejects landlines (prefix 2) and other invalid prefixes", () => {
    expect(normalizeVnPhone("0201234567")).toBeNull();
    expect(normalizeVnPhone("0401234567")).toBeNull();
    expect(normalizeVnPhone("0601234567")).toBeNull();
  });

  it("rejects wrong-length numbers", () => {
    expect(normalizeVnPhone("090123456")).toBeNull(); // too short
    expect(normalizeVnPhone("09012345678")).toBeNull(); // too long
  });

  it("returns null for empty / nullish input", () => {
    expect(normalizeVnPhone("")).toBeNull();
    expect(normalizeVnPhone(null)).toBeNull();
    expect(normalizeVnPhone(undefined)).toBeNull();
  });
});

describe("formatVnPhoneForDisplay", () => {
  it("re-spaces a canonical number", () => {
    expect(formatVnPhoneForDisplay("+84901234567")).toBe("+84 90 123 4567");
  });
  it("passes non-canonical input through unchanged", () => {
    expect(formatVnPhoneForDisplay("not-a-phone")).toBe("not-a-phone");
  });
  it("returns empty string for null", () => {
    expect(formatVnPhoneForDisplay(null)).toBe("");
  });
});

describe("synthetic phone-auth emails", () => {
  it("round-trips phone -> synthetic email -> phone", () => {
    const phone = "+84901234567";
    const email = syntheticEmailForPhone(phone);
    expect(email).toBe(`${phone}@${PHONE_AUTH_DOMAIN}`);
    expect(isSyntheticEmail(email)).toBe(true);
    expect(phoneFromSyntheticEmail(email)).toBe(phone);
  });

  it("treats real emails as non-synthetic", () => {
    expect(isSyntheticEmail("parent@gmail.com")).toBe(false);
    expect(phoneFromSyntheticEmail("parent@gmail.com")).toBeNull();
    expect(isSyntheticEmail(null)).toBe(false);
  });

  it("rejects a synthetic-domain email whose local part isn't a valid phone", () => {
    expect(phoneFromSyntheticEmail(`garbage@${PHONE_AUTH_DOMAIN}`)).toBeNull();
  });
});

describe("isEmailLike", () => {
  it("classifies inputs by presence of @", () => {
    expect(isEmailLike("admin@center.com")).toBe(true);
    expect(isEmailLike("0901234567")).toBe(false);
    expect(isEmailLike("  spaced@x.com  ")).toBe(true);
  });
});
