import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  AUTHENTICATED_ROUTE_BASES,
  authenticatedRouteBase,
  homePathForRole,
  roleCanAccessPath,
} from "../src/lib/route-access.ts";
import { APP_ROLES } from "../src/lib/roles.ts";
import {
  commandActionsForRole,
  commandNavigationForRole,
  mobileTabsForRole,
} from "../src/lib/navigation.ts";

describe("authenticated route access", () => {
  test("gives every role an accessible recovery destination", () => {
    for (const role of APP_ROLES) {
      assert.equal(
        roleCanAccessPath(role, homePathForRole(role)),
        true,
        `${role} cannot reach home`,
      );
      assert.equal(roleCanAccessPath(role, "/settings"), true, `${role} cannot reach settings`);
    }
  });

  test("allows platform admins to reach every classified authenticated route", () => {
    for (const path of AUTHENTICATED_ROUTE_BASES) {
      assert.equal(roleCanAccessPath("admin", path), true, `admin cannot reach ${path}`);
    }
  });

  test("classifies every generated authenticated page route", () => {
    const routeTree = readFileSync(new URL("../src/routeTree.gen.ts", import.meta.url), "utf8");
    const generatedPaths = new Set(
      [...routeTree.matchAll(/^\s+'([^']+)': typeof Authenticated\w+Route/gm)]
        .map((match) => match[1])
        .map((path) => path.replace(/^\/_authenticated(?=\/|$)/, ""))
        .filter(Boolean),
    );

    for (const path of generatedPaths) {
      const example = path.replaceAll("$id", "record-123");
      assert.notEqual(authenticatedRouteBase(example), null, `unclassified route ${path}`);
      assert.equal(roleCanAccessPath("admin", example), true, `admin cannot reach ${path}`);
    }
  });

  test("denies cross-role customer and supplier areas", () => {
    assert.equal(roleCanAccessPath("tenant", "/agency"), false);
    assert.equal(roleCanAccessPath("landlord", "/team"), false);
    assert.equal(roleCanAccessPath("buyer", "/properties"), false);
    assert.equal(roleCanAccessPath("contractor", "/banking"), false);
    assert.equal(roleCanAccessPath("conveyancer", "/arrears"), false);
    assert.equal(roleCanAccessPath("agent", "/portal/tenant"), false);
  });

  test("applies the parent policy to dynamic record routes", () => {
    assert.equal(roleCanAccessPath("landlord", "/tenancies/tenancy-123"), true);
    assert.equal(roleCanAccessPath("tenant", "/work-orders/job-123?tab=evidence"), true);
    assert.equal(roleCanAccessPath("buyer", "/leads/lead-123"), true);
    assert.equal(roleCanAccessPath("buyer", "/work-orders/job-123"), false);
    assert.equal(authenticatedRouteBase("/listing/listing-123/window-card"), "/listing");
  });

  test("fails closed for unknown, public and malformed paths", () => {
    for (const path of [
      "/future-unreviewed-route",
      "/marketplace",
      "https://example.com/dashboard",
      "//dashboard",
    ]) {
      assert.equal(roleCanAccessPath("admin", path), false, `${path} did not fail closed`);
    }
  });

  test("permits every protected navigation destination exposed to each role", () => {
    for (const role of APP_ROLES) {
      const destinations = [
        ...commandNavigationForRole(role),
        ...mobileTabsForRole(role),
        ...commandActionsForRole(role),
      ].map((item) => item.to);

      for (const destination of destinations) {
        // Marketplace and saved-search routes live outside the authenticated shell.
        if (!authenticatedRouteBase(destination)) continue;
        assert.equal(
          roleCanAccessPath(role, destination),
          true,
          `${role} navigation exposes inaccessible route ${destination}`,
        );
      }
    }
  });
});
