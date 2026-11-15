import { describe, expect, it } from "vitest";
import {
  canManageTeam,
  canTakeSurveys,
  canViewBadges,
  canViewSkillTree,
  hasEngagementProfile,
} from "./permissions";

// The frontend's role rules. The server enforces the same rules on its own
// (see backend/test/rbac.e2e-spec.ts); these keep the UI in step with them.
const table = [
  //                      employee manager admin
  ["badges", canViewBadges, [true, false, false]],
  ["skill tree", canViewSkillTree, [true, false, false]],
  ["surveys", canTakeSurveys, [true, false, false]],
  ["manage team", canManageTeam, [false, true, false]],
  ["engagement profile", hasEngagementProfile, [true, true, false]],
] as const;

describe.each(table)("%s", (_name, predicate, [employee, manager, admin]) => {
  it(`employee=${employee}, manager=${manager}, admin=${admin}`, () => {
    expect(predicate("employee")).toBe(employee);
    expect(predicate("manager")).toBe(manager);
    expect(predicate("admin")).toBe(admin);
  });
});
