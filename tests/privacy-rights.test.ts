import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, test } from "node:test";
import {
  isActivePrivacyRequest,
  PRIVACY_REQUEST_LABELS,
  PRIVACY_REQUEST_STATUSES,
  PRIVACY_REQUEST_TYPES,
} from "../src/lib/privacy.ts";

const projectRoot = resolve(import.meta.dirname, "..");

describe("privacy rights workflow", () => {
  test("covers the core UK GDPR request types and terminal states", () => {
    assert.deepEqual(PRIVACY_REQUEST_TYPES, [
      "access",
      "portability",
      "erasure",
      "restriction",
      "objection",
    ]);
    for (const requestType of PRIVACY_REQUEST_TYPES) {
      assert.ok(PRIVACY_REQUEST_LABELS[requestType]);
    }
    assert.equal(isActivePrivacyRequest("submitted"), true);
    assert.equal(isActivePrivacyRequest("identity_verification"), true);
    assert.equal(isActivePrivacyRequest("in_progress"), true);
    assert.equal(isActivePrivacyRequest("completed"), false);
    assert.equal(isActivePrivacyRequest("refused"), false);
    assert.equal(isActivePrivacyRequest("withdrawn"), false);
    assert.equal(PRIVACY_REQUEST_STATUSES.length, 6);
  });

  test("enforces RLS, immutable events and a one-month operational target", () => {
    const migration = readFileSync(
      resolve(projectRoot, "supabase/migrations/20260815203000_privacy_rights_requests.sql"),
      "utf8",
    );

    assert.match(migration, /ALTER TABLE public\.privacy_requests ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /ALTER TABLE public\.privacy_request_events ENABLE ROW LEVEL SECURITY/);
    assert.match(migration, /DEFAULT \(now\(\) \+ interval '1 month'\)/);
    assert.match(migration, /privacy_requests_one_active_type_per_user/);
    assert.match(migration, /user_id = auth\.uid\(\)/);
    assert.match(migration, /public\.has_role\(auth\.uid\(\), 'admin'/);
    assert.match(migration, /GRANT UPDATE \(status, response_summary\)/);
    assert.match(migration, /validate_privacy_request_transition/);
    assert.match(migration, /Invalid privacy request status transition/);
    assert.match(migration, /response summary is required/i);
    assert.match(migration, /SECURITY DEFINER[\s\S]*SET search_path = public/);
    assert.doesNotMatch(migration, /GRANT[^;]+TO PUBLIC/i);
  });

  test("wires self-service and MFA-gated operations into settings", () => {
    const settings = readFileSync(
      resolve(projectRoot, "src/routes/_authenticated/settings.tsx"),
      "utf8",
    );
    const functions = readFileSync(resolve(projectRoot, "src/lib/privacy.functions.ts"), "utf8");

    assert.match(settings, /TabsTrigger value="privacy"/);
    assert.match(settings, /<PrivacySettings \/>/);
    assert.match(functions, /middleware\(\[requireSupabaseAuth\]\)/);
    assert.match(functions, /current_platform_admin_security_status/);
    assert.match(functions, /is_aal2/);
    assert.doesNotMatch(functions, /supabaseAdmin/);
  });
});
