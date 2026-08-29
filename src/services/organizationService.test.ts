/**
 * organizationService.test.ts — Unit tests for multi-tenant organization & workspace management.
 */

import { organizationService } from "./organizationService";

export async function runOrganizationServiceTests(): Promise<boolean> {
  console.log("Starting Organization & Workspace Management unit tests...");
  let allPassed = true;

  function assert(condition: boolean, msg: string) {
    if (!condition) {
      console.error(`  FAIL: ${msg}`);
      allPassed = false;
    } else {
      console.log(`  ✓ ${msg}`);
    }
  }

  try {
    // 1. Initial organizations load
    const initialOrgs = await organizationService.getUserOrganizations();
    assert(initialOrgs.length > 0, "User belongs to at least one default organization");

    const defaultOrg = initialOrgs[0];
    const initialActiveId = organizationService.getActiveOrganizationId();
    assert(Boolean(initialActiveId), `Active organization is set (${initialActiveId})`);

    // 2. Organization members retrieval
    const members = await organizationService.getOrgMembers(defaultOrg.id);
    assert(members.length > 0, `Organization ${defaultOrg.name} has members (${members.length})`);
    assert(members.some((m) => m.role === "owner"), "Organization has an owner");

    // 3. Creating a new workspace
    const newWorkspaceName = "Apex Hyperscale Infrastructure";
    const createdOrgId = await organizationService.createOrganization(newWorkspaceName, {
      sector: "data-center",
      discipline: "Electrical",
    });
    assert(Boolean(createdOrgId), `Created new workspace with ID: ${createdOrgId}`);

    const updatedOrgs = await organizationService.getUserOrganizations();
    const createdOrg = updatedOrgs.find((o) => o.id === createdOrgId);
    assert(Boolean(createdOrg), `New workspace found in user organizations`);
    assert(createdOrg?.name === newWorkspaceName, `Workspace name matches "${newWorkspaceName}"`);
    assert(organizationService.getActiveOrganizationId() === createdOrgId, "Active workspace automatically switched to new workspace");

    // 4. Renaming workspace
    const renamedTitle = "Apex Global Hyperscale";
    const renameOk = await organizationService.updateOrganizationName(createdOrgId, renamedTitle);
    assert(renameOk, "Organization renamed successfully");

    const orgsAfterRename = await organizationService.getUserOrganizations();
    const renamedOrg = orgsAfterRename.find((o) => o.id === createdOrgId);
    assert(renamedOrg?.name === renamedTitle, `Workspace name updated to "${renamedTitle}"`);

    // 5. Inviting a new team member with real metadata
    const testEmail = "elena.rostova@apexengineering.com";
    const testName = "Elena Rostova";
    const invitedMember = await organizationService.inviteMember(createdOrgId, {
      email: testEmail,
      name: testName,
      role: "admin",
    });

    assert(invitedMember.email === testEmail, `Invited member email matches "${testEmail}"`);
    assert(invitedMember.name === testName, `Invited member name matches "${testName}"`);
    assert(invitedMember.role === "admin", "Invited member assigned admin role");
    assert(invitedMember.status === "invited", "Invited member marked with invited status");

    const membersAfterInvite = await organizationService.getOrgMembers(createdOrgId);
    assert(membersAfterInvite.length === 2, `Workspace now has 2 members (Owner + Invited Admin)`);

    // 6. Updating member role
    const roleUpdateOk = await organizationService.updateMemberRole(createdOrgId, invitedMember.user_id, "editor");
    assert(roleUpdateOk, "Member role updated to editor");

    const membersAfterRoleUpdate = await organizationService.getOrgMembers(createdOrgId);
    const updatedMember = membersAfterRoleUpdate.find((m) => m.user_id === invitedMember.user_id);
    assert(updatedMember?.role === "editor", "Member role verified as editor");

    // 7. Resending invitation
    const resendOk = await organizationService.resendInvitation(createdOrgId, invitedMember.user_id);
    assert(resendOk, "Invitation re-dispatch succeeded");

    // 8. Removing member
    const removeOk = await organizationService.removeMember(createdOrgId, invitedMember.user_id);
    assert(removeOk, "Member removed from workspace");

    const membersAfterRemove = await organizationService.getOrgMembers(createdOrgId);
    assert(membersAfterRemove.length === 1, "Workspace member count decremented back to 1");

    // 9. Deleting workspace
    const deleteOk = await organizationService.deleteOrganization(createdOrgId);
    assert(deleteOk, "Workspace deleted successfully");

    const orgsAfterDelete = await organizationService.getUserOrganizations();
    assert(!orgsAfterDelete.some((o) => o.id === createdOrgId), "Deleted workspace no longer in user organizations");
    assert(organizationService.getActiveOrganizationId() !== createdOrgId, "Active workspace switched away from deleted workspace");

    console.log("✔ All Organization & Workspace Management unit tests passed successfully!");
    return allPassed;
  } catch (err) {
    console.error("Organization & Workspace unit tests encountered error:", err);
    return false;
  }
}
