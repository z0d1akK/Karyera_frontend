import i18n from '../../i18n/index.jsx';

export function getApiError(error) {
    const data = error?.response?.data;
    const fieldErrors = flattenFieldErrors(data?.fieldErrors || data?.errors);

    const code = data?.code || error?.code;
    const mapped = {
        TIMEOUT: 'analyticsUi.jobTimeout',
        FAILED: 'analyticsUi.jobFailed',
        INSUFFICIENT_DATA: 'analyticsUi.insufficient',
    }[code];
    const status = error?.response?.status;
    const firstField = Object.values(fieldErrors)[0];
    const detail = error?.job?.errorMessage;
    const message = detail
        ? detail
        : mapped
        ? i18n.t(mapped)
        : firstField || data?.message || (status === 403 ? i18n.t('errors.forbidden') : null)
            || (error?.message && error.message !== code ? error.message : null) || i18n.t('errors.requestFailed');

    return {
        status,
        code,
        message,
        fieldErrors,
    };
}

export function flattenFieldErrors(source) {
    if (!source) {
        return {};
    }
    if (Array.isArray(source)) {
        return Object.fromEntries(source
            .filter((item) => item && (item.field || item.property))
            .map((item) => [item.field || item.property, item.message || item.defaultMessage]));
    }
    if (typeof source !== 'object') {
        return {};
    }
    return Object.fromEntries(Object.entries(source).map(([key, value]) => [
        key,
        Array.isArray(value) ? value[0] : value,
    ]));
}

export class PasswordChangeRequiredError extends Error {
    constructor(login) {
        super('PASSWORD_CHANGE_REQUIRED');
        this.name = 'PasswordChangeRequiredError';
        this.login = login;
        this.code = 'PASSWORD_CHANGE_REQUIRED';
    }
}
