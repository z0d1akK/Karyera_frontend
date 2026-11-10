export function enumLabel(t, group, value) {
    if (value == null || value === '') {
        return t('common.notSpecified');
    }
    return t(`enums.${group}.${value}`, { defaultValue: String(value) });
}

export function statusTone(group, value) {
    return TONES[group]?.[value] || 'neutral';
}

const TONES = {
    employmentStatus: {
        ACTIVE: 'success',
        ON_LEAVE: 'warning',
        SUSPENDED: 'warning',
        TERMINATED: 'danger',
    },
    projectStatus: {
        PLANNED: 'neutral',
        ACTIVE: 'warning',
        ON_HOLD: 'neutral',
        COMPLETED: 'success',
        CANCELLED: 'danger',
    },
    careerGoalStatus: {
        PROPOSED: 'neutral',
        ACTIVE: 'warning',
        ACHIEVED: 'success',
        CANCELLED: 'danger',
    },
    trackStatus: {
        DRAFT: 'neutral',
        PUBLISHED: 'success',
        ARCHIVED: 'neutral',
    },
    planStatus: {
        DRAFT: 'neutral',
        SUBMITTED: 'warning',
        ACTIVE: 'warning',
        CHANGES_REQUESTED: 'danger',
        COMPLETED: 'success',
        CANCELLED: 'danger',
    },
    timeEntryStatus: {
        DRAFT: 'neutral',
        SUBMITTED: 'warning',
        APPROVED: 'success',
        REJECTED: 'danger',
        VOIDED: 'neutral',
    },
    timesheetStatus: {
        DRAFT: 'neutral',
        SUBMITTED: 'warning',
        APPROVED: 'success',
        REJECTED: 'danger',
    },
    recommendationStatus: {
        RUNNING: 'warning',
        COMPLETED: 'success',
        FAILED: 'danger',
    },
    reserveStatus: {
        DRAFT: 'neutral',
        ACTIVE: 'success',
        CLOSED: 'warning',
        ARCHIVED: 'neutral',
    },
};
