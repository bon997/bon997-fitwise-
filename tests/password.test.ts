import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword, passwordProblem, burnPasswordCheck } from "@/lib/password";

describe("passwords", () => {
  it("hashes with a random salt and verifies", async () => {
    const a = await hashPassword("correct horse battery");
    const b = await hashPassword("correct horse battery");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$16384$8$1$")).toBe(true);
    expect(await verifyPassword("correct horse battery", a)).toBe(true);
    expect(await verifyPassword("correct horse batterY", a)).toBe(false);
    expect(await verifyPassword("anything", null)).toBe(false);
    expect(await verifyPassword("anything", "garbage")).toBe(false);
  });

  it("treats visually identical Unicode as the same password", async () => {
    const h = await hashPassword("ﬁtwise-månad-2026"); // ligature "ﬁ"
    expect(await verifyPassword("fitwise-månad-2026", h)).toBe(true);
  });

  it("the dummy check runs without throwing", async () => {
    await expect(burnPasswordCheck("whatever")).resolves.toBeUndefined();
  });

  it("rejects weak passwords with a reason", () => {
    expect(passwordProblem("short")).toMatch(/10 characters/);
    expect(passwordProblem("aaaaaaaaaaaa")).toMatch(/repeated/);
    expect(passwordProblem("MyPassword2026")).toMatch(/easy to guess/);
    expect(passwordProblem("annasvensson99", "annasvensson@gmail.com")).toMatch(/email name/);
    expect(passwordProblem("blue-kettle-sunrise")).toBeNull();
  });
});
