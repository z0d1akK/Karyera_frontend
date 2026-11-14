export const ROLES = {
    EMPLOYEE: 'EMPLOYEE',
    MANAGER: 'MANAGER',
    HR: 'HR',
    ADMIN: 'ADMIN',
};

export function hasRole(role, allowed = []) {
    return Boolean(role && allowed.includes(role));
}

export function canManageEmployees(role) {
    return hasRole(role, [ROLES.HR, ROLES.ADMIN, ROLES.MANAGER]);
}

export function canManageHr(role) {
    return hasRole(role, [ROLES.HR]);
}

export function canManageAdmin(role) {
    return hasRole(role, [ROLES.ADMIN]);
}

export function canCreateAccounts(role) {
    return hasRole(role, [ROLES.HR, ROLES.ADMIN]);
}

export function canManageDevelopmentPlans(role) {
    return hasRole(role, [ROLES.MANAGER, ROLES.HR]);
}

export function canUpdateOwnDevelopment(role) {
    return hasRole(role, [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR]);
}

export function canSeeAnalyticsNav(role) {
    return hasRole(role, [ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]);
}

export function canSeeAdminNav(role) {
    return hasRole(role, [ROLES.ADMIN]);
}

export function canSeeDirectory(role) {
    return hasRole(role, [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]);
}

export function canApproveTimesheets(role) {
    return hasRole(role, [ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]);
}

export function canSeeMilitary(role) {
    return hasRole(role, [ROLES.HR, ROLES.ADMIN]);
}

export function canSeeOrganization(role) {
    return hasRole(role, [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR, ROLES.ADMIN]);
}

export function canSeeTalent(role) {
    return hasRole(role, [ROLES.MANAGER, ROLES.HR]);
}

export function canSeeDevelopment(role) {
    return hasRole(role, [ROLES.EMPLOYEE, ROLES.MANAGER, ROLES.HR]);
}

export function canCreateProject(role) {
    return hasRole(role, [ROLES.MANAGER, ROLES.ADMIN]);
}

export function canWriteCatalogs(role) {
    return canManageAdmin(role);
}

function sameEmployee(value, employeeId) {
    return Boolean(value && employeeId && String(value) === String(employeeId));
}

export function isAssignedToProject(assignments, employeeId) {
    return (assignments || []).some((row) => sameEmployee(row.employeeId, employeeId) && !row.endDate);
}

export function isProjectEditor(role, project, employeeId, extras = {}) {
    if (role === ROLES.ADMIN) {
        return true;
    }

    if (!project || !employeeId) {
        return false;
    }

    if (
        sameEmployee(project.projectManagerId, employeeId)
        || sameEmployee(project.projectManager?.employeeId, employeeId)
        || sameEmployee(project.projectManager?.id, employeeId)
        || sameEmployee(project.deliveryManagerId, employeeId)
        || sameEmployee(project.deliveryManager?.employeeId, employeeId)
        || sameEmployee(project.deliveryManager?.id, employeeId)
    ) {
        return true;
    }

    return role === ROLES.MANAGER && Boolean(extras.assigned);
}

export function canManageProjectMembers(role, project, employeeId, extras = {}) {
    return role === ROLES.HR || isProjectEditor(role, project, employeeId, extras);
}
