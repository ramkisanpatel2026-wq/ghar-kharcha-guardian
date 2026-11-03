import { describe, expect, it } from "bun:test";
import { isDisposableEmail, signUpSchema, signupOtpSchema } from "./signup-validation";

describe("signup validation", () => {
  it("blocks disposable domains and their subdomains", () => {
    expect(isDisposableEmail("person@mailinator.com")).toBe(true);
    expect(isDisposableEmail("person@mx.mailinator.com")).toBe(true);
  });

  it("allows regular email providers", () => {
    expect(isDisposableEmail("family.member@gmail.com")).toBe(false);
    expect(isDisposableEmail("user@outlook.com")).toBe(false);
  });

  it("accepts the configured 6–8 digit verification code range", () => {
    expect(signupOtpSchema.safeParse("123456").success).toBe(true);
    expect(signupOtpSchema.safeParse("12345678").success).toBe(true);
    expect(signupOtpSchema.safeParse("12345").success).toBe(false);
    expect(signupOtpSchema.safeParse("123456789").success).toBe(false);
    expect(signupOtpSchema.safeParse("12a456").success).toBe(false);
  });

  it("requires matching passwords and at least eight characters", () => {
    const valid = {
      fullName: "Ramkisan Patel",
      email: "family@example.com",
      password: "secure123",
      confirmPassword: "secure123",
    };
    expect(signUpSchema.safeParse(valid).success).toBe(true);
    expect(signUpSchema.safeParse({ ...valid, password: "short", confirmPassword: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ ...valid, confirmPassword: "different123" }).success).toBe(false);
  });
});