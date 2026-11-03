import { axiosClient } from '../../../shared/api/axiosClient.js';
import { toSearchParams } from '../../../shared/lib/queryParams.js';

function get(path, params) {
    return axiosClient.get(path, { params: toSearchParams(params) }).then((response) => response.data);
}

export const employeeApi = {
    list(params) {
        return get('/v1/employees', params);
    },

    getById(id) {
        return axiosClient.get(`/v1/employees/${id}`).then((response) => response.data);
    },

    getByUserId(userId) {
        return axiosClient.get(`/v1/employees/user/${userId}`).then((response) => response.data);
    },

    create(payload) {
        return axiosClient.post('/v1/employees', payload).then((response) => response.data);
    },

    update(id, payload) {
        return axiosClient.put(`/v1/employees/${id}`, payload).then((response) => response.data);
    },

    changeStatus(id, status) {
        return axiosClient
            .patch(`/v1/employees/${id}/status`, null, { params: { status } })
            .then((response) => response.data);
    },

    listDepartments(params) {
        return get('/v1/employees/departments', params);
    },

    createDepartment(payload) {
        return axiosClient.post('/v1/employees/departments', payload).then((response) => response.data);
    },

    updateDepartment(id, payload) {
        return axiosClient.put(`/v1/employees/departments/${id}`, payload).then((response) => response.data);
    },

    activateDepartment(id) {
        return axiosClient.patch(`/v1/employees/departments/${id}/activate`);
    },

    deactivateDepartment(id) {
        return axiosClient.patch(`/v1/employees/departments/${id}/deactivate`);
    },

    listPositions(params) {
        return get('/v1/employees/positions', params);
    },

    createPosition(payload) {
        return axiosClient.post('/v1/employees/positions', payload).then((response) => response.data);
    },

    updatePosition(id, payload) {
        return axiosClient.put(`/v1/employees/positions/${id}`, payload).then((response) => response.data);
    },

    activatePosition(id) {
        return axiosClient.patch(`/v1/employees/positions/${id}/activate`);
    },

    deactivatePosition(id) {
        return axiosClient.patch(`/v1/employees/positions/${id}/deactivate`);
    },

    listGrades(params) {
        return get('/v1/employees/grades', params);
    },

    createGrade(payload) {
        return axiosClient.post('/v1/employees/grades', payload).then((response) => response.data);
    },

    updateGrade(id, payload) {
        return axiosClient.put(`/v1/employees/grades/${id}`, payload).then((response) => response.data);
    },

    activateGrade(id) {
        return axiosClient.patch(`/v1/employees/grades/${id}/activate`);
    },

    deactivateGrade(id) {
        return axiosClient.patch(`/v1/employees/grades/${id}/deactivate`);
    },

    listSpecializations(params) {
        return get('/v1/employees/specializations', params);
    },

    createSpecialization(payload) {
        return axiosClient.post('/v1/employees/specializations', payload).then((response) => response.data);
    },

    updateSpecialization(id, payload) {
        return axiosClient.put(`/v1/employees/specializations/${id}`, payload).then((response) => response.data);
    },

    activateSpecialization(id) {
        return axiosClient.patch(`/v1/employees/specializations/${id}/activate`);
    },

    deactivateSpecialization(id) {
        return axiosClient.patch(`/v1/employees/specializations/${id}/deactivate`);
    },

    listSkills(params) {
        return get('/v1/employees/skills', params);
    },

    createSkill(payload) {
        return axiosClient.post('/v1/employees/skills', payload).then((response) => response.data);
    },

    updateSkill(id, payload) {
        return axiosClient.put(`/v1/employees/skills/${id}`, payload).then((response) => response.data);
    },

    activateSkill(id) {
        return axiosClient.patch(`/v1/employees/skills/${id}/activate`);
    },

    deactivateSkill(id) {
        return axiosClient.patch(`/v1/employees/skills/${id}/deactivate`);
    },

    addEmployeeSkill(employeeId, payload) {
        return axiosClient.post(`/v1/employees/${employeeId}/skills`, payload).then((response) => response.data);
    },

    updateEmployeeSkill(employeeId, skillId, payload) {
        return axiosClient
            .put(`/v1/employees/${employeeId}/skills/${skillId}`, payload)
            .then((response) => response.data);
    },

    deleteEmployeeSkill(employeeId, skillId) {
        return axiosClient.delete(`/v1/employees/${employeeId}/skills/${skillId}`);
    },

    addExperience(employeeId, payload) {
        return axiosClient.post(`/v1/employees/${employeeId}/experience`, payload).then((response) => response.data);
    },

    updateExperience(employeeId, experienceId, payload) {
        return axiosClient
            .put(`/v1/employees/${employeeId}/experience/${experienceId}`, payload)
            .then((response) => response.data);
    },

    deleteExperience(employeeId, experienceId) {
        return axiosClient.delete(`/v1/employees/${employeeId}/experience/${experienceId}`);
    },

    addEducation(employeeId, payload) {
        return axiosClient.post(`/v1/employees/${employeeId}/education`, payload).then((response) => response.data);
    },

    updateEducation(employeeId, educationId, payload) {
        return axiosClient
            .put(`/v1/employees/${employeeId}/education/${educationId}`, payload)
            .then((response) => response.data);
    },

    deleteEducation(employeeId, educationId) {
        return axiosClient.delete(`/v1/employees/${employeeId}/education/${educationId}`);
    },

    uploadPhoto(employeeId, file) {
        const formData = new FormData();
        formData.append('file', file);
        return axiosClient
            .post(`/v1/employees/${employeeId}/profile-photo`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            })
            .then((response) => response.data);
    },

    getResponsibilities(employeeId) {
        return axiosClient.get(`/v1/employees/${employeeId}/responsibilities`).then((response) => response.data);
    },

    deleteEmployee(id) {
        return axiosClient.delete(`/v1/employees/${id}`);
    },

    getPhoto(employeeId) {
        return axiosClient.get(`/v1/employees/${employeeId}/profile-photo`).then((response) => response.data);
    },

    deletePhoto(employeeId) {
        return axiosClient.delete(`/v1/employees/${employeeId}/profile-photo`);
    },

    getMilitary(employeeId) {
        return axiosClient.get(`/v1/employees/${employeeId}/military-obligation`).then((response) => response.data);
    },

    createMilitary(employeeId, payload) {
        return axiosClient.post(`/v1/employees/${employeeId}/military-obligation`, payload).then((response) => response.data);
    },

    updateMilitary(employeeId, payload) {
        return axiosClient.put(`/v1/employees/${employeeId}/military-obligation`, payload).then((response) => response.data);
    },

    deleteMilitary(employeeId) {
        return axiosClient.delete(`/v1/employees/${employeeId}/military-obligation`);
    },

    createResponsibility(employeeId, payload) {
        return axiosClient.post(`/v1/employees/${employeeId}/responsibilities`, payload).then((response) => response.data);
    },

    listResponsibilitiesByResponsible(responsibleEmployeeId) {
        return axiosClient
            .get(`/v1/employees/responsibilities/responsible/${responsibleEmployeeId}`)
            .then((response) => response.data);
    },

    updateResponsibility(id, payload) {
        return axiosClient.put(`/v1/employees/responsibilities/${id}`, payload).then((response) => response.data);
    },

    closeResponsibility(id, endDate) {
        return axiosClient
            .patch(`/v1/employees/responsibilities/${id}/close`, null, { params: { endDate } })
            .then((response) => response.data);
    },

    deleteResponsibility(id) {
        return axiosClient.delete(`/v1/employees/responsibilities/${id}`);
    },

    listResponsibilityTypes(params) {
        return get('/v1/employees/responsibility-types', params);
    },

    createResponsibilityType(payload) {
        return axiosClient.post('/v1/employees/responsibility-types', payload).then((response) => response.data);
    },

    updateResponsibilityType(id, payload) {
        return axiosClient.put(`/v1/employees/responsibility-types/${id}`, payload).then((response) => response.data);
    },

    activateResponsibilityType(id) {
        return axiosClient.patch(`/v1/employees/responsibility-types/${id}/activate`);
    },

    deactivateResponsibilityType(id) {
        return axiosClient.patch(`/v1/employees/responsibility-types/${id}/deactivate`);
    },

    deleteResponsibilityType(id) {
        return axiosClient.delete(`/v1/employees/responsibility-types/${id}`);
    },

    deleteDepartment(id) {
        return axiosClient.delete(`/v1/employees/departments/${id}`);
    },

    deletePosition(id) {
        return axiosClient.delete(`/v1/employees/positions/${id}`);
    },

    deleteGrade(id) {
        return axiosClient.delete(`/v1/employees/grades/${id}`);
    },

    deleteSpecialization(id) {
        return axiosClient.delete(`/v1/employees/specializations/${id}`);
    },

    deleteSkill(id) {
        return axiosClient.delete(`/v1/employees/skills/${id}`);
    },
};
