import i18n from '../../i18n/index.jsx';

export function getApiError(error) {
    const data = error?.response?.data;

    if (data?.fieldErrors && typeof data.fieldErrors === 'object') {
        const first = Object.values(data.fieldErrors)[0];
        return {
            status: error?.response?.status,
            code: data.code,
            message: Array.isArray(first) ? first[0] : first || data.message,
            fieldErrors: data.fieldErrors,
        };
    }

    const code = data?.code || error?.code;
    const mapped = {
        TIMEOUT: 'analyticsUi.jobTimeout',
        FAILED: 'analyticsUi.jobFailed',
        INSUFFICIENT_DATA: 'analyticsUi.insufficient',
    }[code];
    const status = error?.response?.status;
    const message = mapped
        ? i18n.t(mapped)
        : status === 403
            ? i18n.t('errors.forbidden')
            : data?.message || (error?.message && error.message !== code ? error.message : null) || i18n.t('errors.requestFailed');

    return {
        status,
        code,
        message,
        fieldErrors: data?.errors || data?.fieldErrors,
    };
}

export class PasswordChangeRequiredError extends Error {
    constructor(login) {
        super('PASSWORD_CHANGE_REQUIRED');
        this.name = 'PasswordChangeRequiredError';
        this.login = login;
        this.code = 'PASSWORD_CHANGE_REQUIRED';
    }
}
