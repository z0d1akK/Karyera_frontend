import { axiosClient } from '../../../shared/api/axiosClient.js';
import { toSearchParams } from '../../../shared/lib/queryParams.js';

const get = (path, params) =>
    axiosClient.get(path, { params: toSearchParams(params) }).then((response) => response.data);

export const timeApi = {
    listEntries(params) {
        return get('/v1/time/entries', params);
    },
    getEntry(id) {
        return axiosClient.get(`/v1/time/entries/${id}`).then((response) => response.data);
    },
    createEntry(payload) {
        return axiosClient.post('/v1/time/entries', payload).then((response) => response.data);
    },
    updateEntry(id, payload) {
        return axiosClient.patch(`/v1/time/entries/${id}`, payload).then((response) => response.data);
    },
    voidEntry(id, payload) {
        return axiosClient.post(`/v1/time/entries/${id}/void`, payload).then((response) => response.data);
    },
    listTimesheets(params) {
        return get('/v1/time/timesheets', params);
    },
    getTimesheet(id) {
        return axiosClient.get(`/v1/time/timesheets/${id}`).then((response) => response.data);
    },
    createTimesheet(payload) {
        return axiosClient.post('/v1/time/timesheets', payload).then((response) => response.data);
    },
    submitTimesheet(id, payload) {
        return axiosClient.post(`/v1/time/timesheets/${id}/submit`, payload).then((response) => response.data);
    },
    approveTimesheet(id, payload) {
        return axiosClient.post(`/v1/time/timesheets/${id}/approve`, payload).then((response) => response.data);
    },
    rejectTimesheet(id, payload) {
        return axiosClient.post(`/v1/time/timesheets/${id}/reject`, payload).then((response) => response.data);
    },
    reviews(id) {
        return axiosClient.get(`/v1/time/timesheets/${id}/reviews`).then((response) => response.data);
    },
    pendingApproval() {
        return axiosClient.get('/v1/time/timesheets/pending-approval').then((response) => response.data);
    },
    workCalendar(employeeId, from, to) {
        return get(`/v1/time/employees/${employeeId}/work-calendar`, { from, to });
    },
    dailySummary(employeeId, from, to) {
        return get(`/v1/time/employees/${employeeId}/daily-summary`, { from, to });
    },
    weeklySummary(employeeId, weekStart) {
        return get(`/v1/time/employees/${employeeId}/weekly-summary`, { weekStart });
    },
};

export function hoursLabel(minutes) {
    const value = Number(minutes || 0) / 60;
    return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatHours(t, minutes) {
    return t('time.hoursValue', { value: hoursLabel(minutes) });
}

export function minutesDelta(actual, planned) {
    return Number(actual || 0) - Number(planned || 0);
}
