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
    return hasRole(role, [ROLES.HR, ROLES.ADMIN]);
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

export function isProjectEditor(role, project, employeeId) {
    if (role === ROLES.ADMIN) {
        return true;
    }

    if (!project || !employeeId) {
        return false;
    }

    return project.projectManagerId === employeeId || project.projectManager?.id === employeeId;
}

export function canManageProjectMembers(role, project, employeeId) {
    return role === ROLES.HR || isProjectEditor(role, project, employeeId);
}
