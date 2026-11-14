import axios from 'axios';

import { env } from '../config/env.js';
import { authStorage } from '../../services/auth/authStorage.js';
import { useAuthStore } from '../../store/authStore.js';

export const axiosClient = axios.create({
    baseURL: env.apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

const refreshClient = axios.create({
    baseURL: env.apiBaseUrl,
    headers: {
        'Content-Type': 'application/json',
    },
});

let refreshPromise = null;

function isPublicAuthRequest(url = '') {
    return (
        url.includes('/v1/auth/login')
        || url.includes('/v1/auth/refresh')
        || url.includes('/v1/auth/change-initial-password')
    );
}

async function refreshTokens() {
    const refreshToken = authStorage.getRefreshToken();

    if (!refreshToken) {
        throw new Error('NO_REFRESH_TOKEN');
    }

    const { data } = await refreshClient.post('/v1/auth/refresh', { refreshToken });
    useAuthStore.getState().setAuth({
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
    });
    return data.accessToken;
}

axiosClient.interceptors.request.use((config) => {
    const accessToken = authStorage.getAccessToken();

    if (accessToken && !isPublicAuthRequest(config.url || '')) {
        config.headers.Authorization = `Bearer ${accessToken}`;
    }

    return config;
});

axiosClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (!original || error.response?.status !== 401 || original._retry) {
            return Promise.reject(error);
        }

        const requestUrl = original.url || '';

        if (isPublicAuthRequest(requestUrl)) {
            return Promise.reject(error);
        }

        original._retry = true;
        original.headers = original.headers || {};

        try {
            refreshPromise = refreshPromise || refreshTokens();
            const accessToken = await refreshPromise;
            original.headers.Authorization = `Bearer ${accessToken}`;
            return axiosClient(original);
        } catch (refreshError) {
            useAuthStore.getState().logout();
            window.location.assign('/login');
            return Promise.reject(refreshError);
        } finally {
            refreshPromise = null;
        }
    },
);
