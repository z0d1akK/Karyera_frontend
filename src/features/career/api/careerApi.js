import { axiosClient } from '../../../shared/api/axiosClient.js';
import { toSearchParams } from '../../../shared/lib/queryParams.js';

const get = (path, params) =>
    axiosClient.get(path, { params: toSearchParams(params) }).then((response) => response.data);

export const careerApi = {
    listTracks(params) {
        return get('/v1/career/tracks', params);
    },
    getTrack(id) {
        return axiosClient.get(`/v1/career/tracks/${id}`).then((r) => r.data);
    },
    createTrack(payload) {
        return axiosClient.post('/v1/career/tracks', payload).then((r) => r.data);
    },
    updateTrack(id, payload) {
        return axiosClient.patch(`/v1/career/tracks/${id}`, payload).then((r) => r.data);
    },
    addNode(trackId, payload) {
        return axiosClient.post(`/v1/career/tracks/${trackId}/nodes`, payload).then((r) => r.data);
    },
    updateNode(id, payload) {
        return axiosClient.patch(`/v1/career/nodes/${id}`, payload).then((r) => r.data);
    },
    deleteNode(id) {
        return axiosClient.delete(`/v1/career/nodes/${id}`);
    },
    addTransition(trackId, payload) {
        return axiosClient.post(`/v1/career/tracks/${trackId}/transitions`, payload).then((r) => r.data);
    },
    deleteTransition(id) {
        return axiosClient.delete(`/v1/career/transitions/${id}`);
    },
    publishTrack(id) {
        return axiosClient.post(`/v1/career/tracks/${id}/publish`).then((r) => r.data);
    },
    archiveTrack(id) {
        return axiosClient.post(`/v1/career/tracks/${id}/archive`).then((r) => r.data);
    },
    availableTracks(employeeId) {
        return axiosClient.get(`/v1/career/employees/${employeeId}/available-tracks`).then((r) => r.data);
    },
    listGoals(employeeId, params) {
        return get(`/v1/career/employees/${employeeId}/goals`, params);
    },
    createGoal(employeeId, payload) {
        return axiosClient.post(`/v1/career/employees/${employeeId}/goals`, payload).then((r) => r.data);
    },
    getGoal(id) {
        return axiosClient.get(`/v1/career/goals/${id}`).then((r) => r.data);
    },
    updateGoal(id, payload) {
        return axiosClient.patch(`/v1/career/goals/${id}`, payload).then((r) => r.data);
    },
    activateGoal(id, payload = {}) {
        return axiosClient.post(`/v1/career/goals/${id}/activate`, payload).then((r) => r.data);
    },
    achieveGoal(id, payload = {}) {
        return axiosClient.post(`/v1/career/goals/${id}/achieve`, payload).then((r) => r.data);
    },
    cancelGoal(id, payload = {}) {
        return axiosClient.post(`/v1/career/goals/${id}/cancel`, payload).then((r) => r.data);
    },
    listRequirements(params) {
        return get('/v1/career/requirements', params);
    },
    getRequirement(id) {
        return axiosClient.get(`/v1/career/requirements/${id}`).then((r) => r.data);
    },
    createRequirement(payload) {
        return axiosClient.post('/v1/career/requirements', payload).then((r) => r.data);
    },
    updateRequirement(id, payload) {
        return axiosClient.put(`/v1/career/requirements/${id}`, payload).then((r) => r.data);
    },
    publishRequirement(id) {
        return axiosClient.post(`/v1/career/requirements/${id}/publish`).then((r) => r.data);
    },
    currentRequirement(params) {
        return get('/v1/career/requirements/current', params);
    },
    requirementHistory(params) {
        return axiosClient.get('/v1/career/requirements/history', { params: toSearchParams(params) }).then((r) => r.data);
    },
    listPlans(employeeId, params) {
        return get(`/v1/career/employees/${employeeId}/development-plans`, params);
    },
    getProgress(employeeId) {
        return axiosClient.get(`/v1/career/employees/${employeeId}/development-progress`).then((r) => r.data);
    },
    createPlan(payload) {
        return axiosClient.post('/v1/career/development-plans', payload).then((r) => r.data);
    },
    getPlan(id) {
        return axiosClient.get(`/v1/career/development-plans/${id}`).then((r) => r.data);
    },
    updatePlan(id, payload) {
        return axiosClient.patch(`/v1/career/development-plans/${id}`, payload).then((r) => r.data);
    },
    submitPlan(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-plans/${id}/submit`, payload).then((r) => r.data);
    },
    approvePlan(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-plans/${id}/approve`, payload).then((r) => r.data);
    },
    requestPlanChanges(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-plans/${id}/request-changes`, payload).then((r) => r.data);
    },
    completePlan(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-plans/${id}/complete`, payload).then((r) => r.data);
    },
    cancelPlan(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-plans/${id}/cancel`, payload).then((r) => r.data);
    },
    listReviews(id) {
        return axiosClient.get(`/v1/career/development-plans/${id}/reviews`).then((r) => r.data);
    },
    addActivity(planId, payload) {
        return axiosClient.post(`/v1/career/development-plans/${planId}/activities`, payload).then((r) => r.data);
    },
    updateActivity(id, payload) {
        return axiosClient.patch(`/v1/career/development-activities/${id}`, payload).then((r) => r.data);
    },
    submitActivity(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-activities/${id}/submit`, payload).then((r) => r.data);
    },
    verifyActivity(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-activities/${id}/verify`, payload).then((r) => r.data);
    },
    rejectActivity(id, payload = {}) {
        return axiosClient.post(`/v1/career/development-activities/${id}/reject`, payload).then((r) => r.data);
    },
    addEvidence(id, payload) {
        return axiosClient.post(`/v1/career/development-activities/${id}/evidence`, payload).then((r) => r.data);
    },
    listReserves(params) {
        return get('/v1/career/talent-reserves', params);
    },
    getReserve(id) {
        return axiosClient.get(`/v1/career/talent-reserves/${id}`).then((r) => r.data);
    },
    createReserve(payload) {
        return axiosClient.post('/v1/career/talent-reserves', payload).then((r) => r.data);
    },
    updateReserve(id, payload) {
        return axiosClient.patch(`/v1/career/talent-reserves/${id}`, payload).then((r) => r.data);
    },
    activateReserve(id, payload = {}) {
        return axiosClient.post(`/v1/career/talent-reserves/${id}/activate`, payload).then((r) => r.data);
    },
    closeReserve(id, payload = {}) {
        return axiosClient.post(`/v1/career/talent-reserves/${id}/close`, payload).then((r) => r.data);
    },
    getScreening(reserveId, jobId) {
        return axiosClient.get(`/v1/career/talent-reserves/${reserveId}/screenings/${jobId}`).then((r) => r.data);
    },
    getAnalysis(id) {
        return axiosClient.get(`/v1/career/talent-reserves/${id}/analysis`).then((r) => r.data);
    },
    listCandidates(id, params) {
        return get(`/v1/career/talent-reserves/${id}/candidates`, params);
    },
    nominate(id, payload) {
        return axiosClient.post(`/v1/career/talent-reserves/${id}/candidates`, payload).then((r) => r.data);
    },
    startScreening(id, payload) {
        return axiosClient.post(`/v1/career/talent-reserves/${id}/screenings`, payload).then((r) => r.data);
    },
    getCandidate(id) {
        return axiosClient.get(`/v1/career/reserve-candidates/${id}`).then((r) => r.data);
    },
    decide(id, payload) {
        return axiosClient.post(`/v1/career/reserve-candidates/${id}/decisions`, payload).then((r) => r.data);
    },
    listDecisions(id, params) {
        return get(`/v1/career/reserve-candidates/${id}/decisions`, params);
    },
};
