import { axiosClient } from '../../../shared/api/axiosClient.js';
import { timezoneOffsetMinutes } from '../../../shared/lib/format.js';

const get = (path, config) => axiosClient.get(path, config).then((response) => response.data);

async function waitForJob(jobId, { requireResult = true } = {}) {
    for (let attempt = 0; attempt < 80; attempt += 1) {
        const job = await get(`/v1/analytics/jobs/${jobId}`);
        if (job.status === 'COMPLETED' && (!requireResult || job.resultId)) {
            return job;
        }
        if (job.status === 'FAILED') {
            const error = new Error(job.errorMessage || job.errorCode || 'FAILED');
            error.code = job.errorCode;
            error.job = job;
            throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1500));
    }
    const error = new Error('TIMEOUT');
    error.code = 'TIMEOUT';
    throw error;
}

export const analyticsApi = {
    overview() {
        return get('/v1/analytics/dashboard/overview');
    },
    skills() {
        return get('/v1/analytics/dashboard/skills');
    },
    skillDeficits() {
        return get('/v1/analytics/dashboard/skill-deficits');
    },
    departments() {
        return get('/v1/analytics/dashboard/departments');
    },
    readiness() {
        return get('/v1/analytics/dashboard/career-readiness');
    },
    development(grain = 'MONTH', periodFrom, periodTo) {
        return get('/v1/analytics/dashboard/development', { params: { grain, periodFrom, periodTo } });
    },
    activity(grain = 'MONTH', periodFrom, periodTo) {
        return get('/v1/analytics/dashboard/project-activity', { params: { grain, periodFrom, periodTo } });
    },
    dynamics(employeeId, periodFrom, periodTo) {
        return get(`/v1/analytics/employees/${employeeId}/development-dynamics`, { params: { periodFrom, periodTo } });
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
    async regenerateRecommendations(id) {
        const job = await axiosClient.post(`/v1/analytics/assessments/${id}/recommendations`).then((response) => response.data);
        if (job?.jobId) {
            await waitForJob(job.jobId, { requireResult: false });
        }
        return job;
    },
    updateRecommendation(assessmentId, recommendationId, content) {
        return axiosClient.patch(
            `/v1/analytics/assessments/${assessmentId}/recommendations/${recommendationId}`,
            { content },
        ).then((response) => response.data);
    },
    job(id) {
        return get(`/v1/analytics/jobs/${id}`);
    },
    careerOptions(jobId) {
        return get(`/v1/analytics/jobs/${jobId}/career-options`);
    },
    reports() {
        return get('/v1/analytics/reports');
    },
    reportPreview(type, params) {
        return axiosClient.get(`/v1/analytics/reports/${type}/preview`, {
            params: { ...params, zoneOffsetMinutes: timezoneOffsetMinutes() },
        }).then((response) => response.data);
    },
    async downloadReport(type, params) {
        const response = await axiosClient.get(`/v1/analytics/reports/${type}`, {
            params: { ...params, zoneOffsetMinutes: timezoneOffsetMinutes() },
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(response.data);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${String(type).toLowerCase()}.pdf`;
        link.click();
        window.URL.revokeObjectURL(url);
    },
    async startAssessment(payload) {
        const job = await axiosClient.post('/v1/analytics/assessments', payload).then((response) => response.data);
        const done = await waitForJob(job.jobId);
        return done.resultId;
    },
    listScreenings(params) {
        return get('/v1/analytics/talent-screenings', { params });
    },
    getScreening(id) {
        return get(`/v1/analytics/talent-screenings/${id}`);
    },
    screeningResults(id, params) {
        return get(`/v1/analytics/talent-screenings/${id}/results`, { params });
    },
    screeningResult(id, employeeId) {
        return get(`/v1/analytics/talent-screenings/${id}/results/${employeeId}`);
    },
    async startCareerOptions(employeeId, payload) {
        const job = await axiosClient.post(`/v1/analytics/employees/${employeeId}/career-options`, payload)
            .then((response) => response.data);
        await waitForJob(job.jobId, { requireResult: false });
        return analyticsApi.careerOptions(job.jobId);
    },
};

export function readRecommendation(content) {
    if (!content) {
        return null;
    }
    if (typeof content === 'object') {
        return content;
    }
    try {
        return JSON.parse(content);
    } catch {
        return { summary: String(content) };
    }
}

function firstNonEmpty(...lists) {
    for (const list of lists) {
        if (Array.isArray(list) && list.length) {
            return list;
        }
    }
    return [];
}

function asLines(value) {
    if (!value) {
        return [];
    }
    const items = Array.isArray(value) ? value : [value];
    return items
        .map((item) => {
            if (typeof item === 'string') {
                return item;
            }
            return item.explanation || item.text || item.title || item.description || item.summary || '';
        })
        .filter(Boolean);
}

export function recommendationView(content) {
    const parsed = readRecommendation(content);
    if (!parsed) {
        return null;
    }
    const explanation = parsed.explanation && typeof parsed.explanation === 'object' ? parsed.explanation : parsed;
    const development = parsed.development && typeof parsed.development === 'object' ? parsed.development : {};
    const recItems = firstNonEmpty(development.recommendations, explanation.recommendations, parsed.recommendations);
    const summary = explanation.summary || parsed.summary || (typeof parsed === 'string' ? parsed : '');
    const recommendations = (Array.isArray(recItems) ? recItems : [recItems]).map((item) => {
        if (typeof item === 'string') {
            return { title: item, description: '', activities: [], outcome: '' };
        }
        return {
            title: item.title || item.text || '',
            description: item.description || item.explanation || '',
            activities: asLines(item.suggestedActivities),
            outcome: item.expectedOutcome || '',
        };
    }).filter((item) => item.title || item.description);
    const view = {
        summary: typeof summary === 'string' ? summary : '',
        strengths: asLines(explanation.strengths || parsed.strengths),
        developmentAreas: asLines(explanation.developmentAreas || parsed.developmentAreas),
        limitations: asLines(explanation.limitations || parsed.limitations),
        recommendations,
    };
    const hasText = Boolean(view.summary || view.strengths.length || view.developmentAreas.length || view.limitations.length || view.recommendations.length);
    return hasText ? view : null;
}
