import { axiosClient } from '../../../shared/api/axiosClient.js';

const get = (path) => axiosClient.get(path).then((response) => response.data);

async function waitForJob(jobId) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
        const job = await get(`/v1/analytics/jobs/${jobId}`);
        if (job.status === 'COMPLETED' && job.resultId) {
            return job.resultId;
        }
        if (job.status === 'FAILED') {
            const error = new Error(job.errorCode || 'FAILED');
            error.code = job.errorCode;
            throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    throw new Error('TIMEOUT');
}

export const analyticsApi = {
    overview() {
        return get('/v1/analytics/dashboard/overview');
    },
    skills() {
        return get('/v1/analytics/dashboard/skills');
    },
    readiness() {
        return get('/v1/analytics/dashboard/career-readiness');
    },
    development() {
        return get('/v1/analytics/dashboard/development');
    },
    activity() {
        return get('/v1/analytics/dashboard/project-activity');
    },
    dynamics(employeeId) {
        return get(`/v1/analytics/employees/${employeeId}/development-dynamics`);
    },
    assessments(employeeId) {
        return get(`/v1/analytics/employees/${employeeId}/assessments`);
    },
    assessment(id) {
        return get(`/v1/analytics/assessments/${id}`);
    },
    skillGaps(id) {
        return get(`/v1/analytics/assessments/${id}/skill-gaps`);
    },
    recommendations(id) {
        return get(`/v1/analytics/assessments/${id}/recommendations`);
    },
    async startAssessment(payload) {
        const job = await axiosClient.post('/v1/analytics/assessments', payload).then((response) => response.data);
        return waitForJob(job.jobId);
    },
};

export function readRecommendation(content) {
    if (!content) {
        return null;
    }
    try {
        return JSON.parse(content);
    } catch {
        return { summary: content };
    }
}
