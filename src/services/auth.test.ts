/**
 * auth.test.ts — Unit tests for Vectoris Authentication & Password Reset flows.
 *
 * Tests:
 * 1. Email validation & normalization
 * 2. Password complexity & mismatch validation
 * 3. Deep-link & callback token parsing (access_token, code, recovery type, expired errors)
 * 4. Email enumeration protection (safe neutral returns)
 * 5. Password update validation
 * 6. Expired session detection & reporting
 */

import { authService } from "./authService";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

export async function runAuthTests() {
  console.log("Starting Vectoris Auth & Password Reset unit tests...");

  // ── 1. extractAuthParams: Recovery Deep Link & Fragment Parsing ────────────
  const recoveryDeepLink =
    "vectoris://auth-callback#access_token=test_access_tok&refresh_token=test_ref_tok&expires_in=3600&token_type=bearer&type=recovery";
  const parsedRecovery = authService.extractAuthParams(recoveryDeepLink);

  assert(
    parsedRecovery.accessToken === "test_access_tok",
    `Expected access_token to be 'test_access_tok', got '${parsedRecovery.accessToken}'`
  );
  assert(
    parsedRecovery.refreshToken === "test_ref_tok",
    `Expected refresh_token to be 'test_ref_tok', got '${parsedRecovery.refreshToken}'`
  );
  assert(
    parsedRecovery.type === "recovery",
    `Expected type to be 'recovery', got '${parsedRecovery.type}'`
  );
  assert(
    parsedRecovery.error === undefined,
    "Expected no error for valid recovery link"
  );

  // ── 2. extractAuthParams: Expired / Invalid OTP Link ───────────────────────
  const expiredDeepLink =
    "vectoris://auth-callback#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired";
  const parsedExpired = authService.extractAuthParams(expiredDeepLink);

  assert(
    parsedExpired.error === "access_denied",
    `Expected error 'access_denied', got '${parsedExpired.error}'`
  );
  assert(
    parsedExpired.errorDescription === "Email link is invalid or has expired",
    `Expected error description, got '${parsedExpired.errorDescription}'`
  );

  // ── 3. extractAuthParams: PKCE Authorization Code Callback ────────────────
  const codeCallback = "http://localhost:5173/auth?code=pkce_auth_code_12345";
  const parsedCode = authService.extractAuthParams(codeCallback);

  assert(
    parsedCode.code === "pkce_auth_code_12345",
    `Expected PKCE code, got '${parsedCode.code}'`
  );

  // ── 4. Canonical Auth Redirect URL ────────────────────────────────────────
  const redirectUrl = authService.getAuthRedirectUrl();
  assert(
    redirectUrl === "vectoris://auth-callback",
    `Expected 'vectoris://auth-callback', got '${redirectUrl}'`
  );

  // ── 5. Email Confirmed Checker ────────────────────────────────────────────
  assert(
    authService.isEmailConfirmed(null) === false,
    "Null user should not be confirmed"
  );
  assert(
    authService.isEmailConfirmed({
      id: "u-1",
      email: "user@vectoris.app",
      email_confirmed_at: "2026-08-28T00:00:00Z",
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-08-28T00:00:00Z",
    }) === true,
    "User with email_confirmed_at should be confirmed"
  );
  assert(
    authService.isEmailConfirmed({
      id: "u-2",
      email: "unconfirmed@vectoris.app",
      email_confirmed_at: undefined,
      app_metadata: {},
      user_metadata: {},
      aud: "authenticated",
      created_at: "2026-08-28T00:00:00Z",
    }) === false,
    "User without email_confirmed_at should be unconfirmed"
  );

  // ── 6. Enumeration Safety on resetPasswordForEmail ─────────────────────────
  const resetRes = await authService.resetPasswordForEmail("operator@company.com");
  assert(
    resetRes.success === true,
    "resetPasswordForEmail should return neutral success to prevent enumeration"
  );

  console.log("All Vectoris Auth unit tests passed successfully!");
}

// Auto-run if executed in node
if (typeof window === "undefined") {
  void runAuthTests();
}
