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

    return {
        status: error?.response?.status,
        code: data?.code,
        message: data?.message || error?.message || i18n.t('errors.requestFailed'),
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
