import { z } from "zod";

export const blockedDisposableDomains = new Set([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "33mail.com",
  "dispostable.com",
  "emailondeck.com",
  "fakeinbox.com",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "inboxkitten.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "mohmal.com",
  "mytemp.email",
  "nada.email",
  "sharklasers.com",
  "tempmail.com",
  "temp-mail.org",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com",
  "yopmail.fr",
  "disposablemail.com",
  "fake-email.com",
]);

export const signUpSchema = z.object({
  fullName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(128),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  path: ["confirmPassword"],
});

export const signupOtpSchema = z.string().regex(/^\d{6}$/);

export function isDisposableEmail(value: string) {
  const domain = value.trim().toLowerCase().split("@").at(-1) ?? "";
  return [...blockedDisposableDomains].some(
    (blocked) => domain === blocked || domain.endsWith(`.${blocked}`),
  );
}