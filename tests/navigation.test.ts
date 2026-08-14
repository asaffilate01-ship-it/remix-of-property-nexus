import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";
import {
  APP_ROLES,
  commandActionsForRole,
  commandNavigationForRole,
  mobileTabsForRole,
  navigationSectionsForRole,
  searchResourcesForRole,
} from "../src/lib/navigation.ts";

describe("role-aware navigation", () => {
  test("fails closed while the database role is unresolved", () => {
    assert.deepEqual(navigationSectionsForRole(null), []);
    assert.deepEqual(mobileTabsForRole(null), []);
    assert.deepEqual(commandActionsForRole(null), []);
    assert.deepEqual(searchResourcesForRole(null), []);
  });

  test("contains no duplicate destination within any role", () => {
    for (const role of APP_ROLES) {
      const destinations = commandNavigationForRole(role).map((item) => item.to);
      assert.equal(
        new Set(destinations).size,
        destinations.length,
        `${role} contains duplicate navigation destinations`,
      );
      assert.equal(mobileTabsForRole(role).length, 4, `${role} must have four primary mobile tabs`);
    }
  });

  test("points every menu and action to a generated application route", () => {
    const routeTree = readFileSync(new URL("../src/routeTree.gen.ts", import.meta.url), "utf8");
    const destinations = new Set(
      APP_ROLES.flatMap((role) => [
        ...commandNavigationForRole(role).map((item) => item.to),
        ...commandActionsForRole(role).map((item) => item.to),
      ]),
    );
    for (const destination of destinations) {
      assert.equal(
        routeTree.includes(`fullPath: '${destination}'`),
        true,
        `${destination} is not present in the generated route tree`,
      );
    }
  });

  test("does not expose privileged creation actions to customer or supplier roles", () => {
    for (const role of [
      "tenant",
      "buyer",
      "conveyancer",
      "contractor",
      "inventory_clerk",
      "utility_provider",
    ] as const) {
      assert.deepEqual(commandActionsForRole(role), [], `${role} received a creation action`);
    }
  });

  test("wires authorised creation actions to explicit dialog search state", () => {
    const agentActions = commandActionsForRole("agent");
    assert.deepEqual(
      agentActions.map((action) => [action.to, action.search]),
      [
        ["/properties", { create: true }],
        ["/listings", { new: true }],
        ["/pipeline", { create: true }],
        ["/contacts", { create: true }],
      ],
    );
  });

  test("limits record-search resources by role", () => {
    assert.deepEqual(searchResourcesForRole("conveyancer"), []);
    assert.deepEqual(searchResourcesForRole("tenant"), ["workOrders"]);
    assert.equal(searchResourcesForRole("agent").includes("contacts"), true);
  });
});
