import { axiosClient } from '../../../shared/api/axiosClient.js';
import { PasswordChangeRequiredError, getApiError } from '../../../shared/api/errors.js';
import { env } from '../../../shared/config/env.js';
import { mockAuthApi } from '../../../services/mock/authMock.js';

export const authApi = {
    async login(credentials) {
        if (env.useMockApi) {
            return mockAuthApi.login({
                email: credentials.login,
                password: credentials.password,
            });
        }

        try {
            const { data } = await axiosClient.post('/v1/auth/login', {
                login: credentials.login,
                password: credentials.password,
            });
            return data;
        } catch (error) {
            const parsed = getApiError(error);

            if (parsed.code === 'PASSWORD_CHANGE_REQUIRED') {
                throw new PasswordChangeRequiredError(credentials.login);
            }

            throw error;
        }
    },

    async changeInitialPassword(payload) {
        await axiosClient.post('/v1/auth/change-initial-password', payload);
    },

    async logout(refreshToken) {
        if (!refreshToken) {
            return;
        }

        await axiosClient.post('/v1/auth/logout', { refreshToken });
    },

    async getUsers(params) {
        const { data } = await axiosClient.get('/v1/users', { params });
        return data;
    },

    async getUser(id) {
        const { data } = await axiosClient.get(`/v1/users/${id}`);
        return data;
    },

    async getUserByEmployee(employeeId) {
        const { data } = await axiosClient.get(`/v1/users/employee/${employeeId}`);
        return data;
    },

    async createUser(payload) {
        const { data } = await axiosClient.post('/v1/users', payload);
        return data;
    },

    async updateUser(id, payload) {
        const { data } = await axiosClient.put(`/v1/users/${id}`, payload);
        return data;
    },

    async activateUser(id) {
        await axiosClient.patch(`/v1/users/${id}/activate`);
    },

    async deactivateUser(id) {
        await axiosClient.patch(`/v1/users/${id}/deactivate`);
    },

    async resetUserPassword(id, temporaryPassword) {
        await axiosClient.post(`/v1/users/${id}/reset-password`, { temporaryPassword });
    },

    async deleteUser(id) {
        await axiosClient.delete(`/v1/users/${id}`);
    },
};
