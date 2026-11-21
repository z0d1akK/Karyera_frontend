import { axiosClient } from '../../../shared/api/axiosClient.js';
import { toSearchParams } from '../../../shared/lib/queryParams.js';

const get = (path, params) =>
    axiosClient.get(path, { params: toSearchParams(params) }).then((response) => response.data);

export const projectApi = {
    list(params) {
        return get('/v1/projects', params);
    },
    getById(id) {
        return axiosClient.get(`/v1/projects/${id}`).then((r) => r.data);
    },
    create(payload) {
        return axiosClient.post('/v1/projects', payload).then((r) => r.data);
    },
    update(id, payload) {
        return axiosClient.patch(`/v1/projects/${id}`, payload).then((r) => r.data);
    },
    changeStatus(id, payload) {
        return axiosClient.patch(`/v1/projects/${id}/status`, payload).then((r) => r.data);
    },
    getBoard(id) {
        return axiosClient.get(`/v1/projects/${id}/board`).then((r) => r.data);
    },
    createBoard(id, payload = { name: 'Board' }) {
        return axiosClient.post(`/v1/projects/${id}/board`, payload).then((r) => r.data);
    },
    listTasks(projectId, params) {
        return get(`/v1/projects/${projectId}/tasks`, params);
    },
    createTask(projectId, payload) {
        return axiosClient.post(`/v1/projects/${projectId}/tasks`, payload).then((r) => r.data);
    },
    getTask(id) {
        return axiosClient.get(`/v1/tasks/${id}`).then((r) => r.data);
    },
    updateTask(id, payload) {
        return axiosClient.patch(`/v1/tasks/${id}`, payload).then((r) => r.data);
    },
    moveTask(id, payload) {
        return axiosClient.patch(`/v1/tasks/${id}/board-position`, payload).then((r) => r.data);
    },
    getComments(id) {
        return axiosClient.get(`/v1/tasks/${id}/comments`).then((r) => r.data);
    },
    addComment(id, payload) {
        return axiosClient.post(`/v1/tasks/${id}/comments`, payload).then((r) => r.data);
    },
    getActivities(id) {
        return axiosClient.get(`/v1/tasks/${id}/activities`).then((r) => r.data);
    },
    getChildren(id) {
        return axiosClient.get(`/v1/tasks/${id}/children`).then((r) => r.data);
    },
    listAssignments(projectId, params) {
        return get(`/v1/projects/${projectId}/assignments`, params);
    },
    listParticipation(employeeId) {
        return get('/v1/assignments/search', { employeeId, page: 0, size: 100, sortBy: 'startDate', sortDirection: 'DESC' });
    },
    assign(projectId, payload) {
        return axiosClient.post(`/v1/projects/${projectId}/assignments`, payload).then((r) => r.data);
    },
    updateAssignment(id, payload) {
        return axiosClient.patch(`/v1/assignments/${id}`, payload).then((r) => r.data);
    },
    endAssignment(id, payload) {
        return axiosClient.post(`/v1/assignments/${id}/end`, payload).then((r) => r.data);
    },
    listMilestones(projectId, params) {
        return get(`/v1/projects/${projectId}/milestones`, params);
    },
    createMilestone(projectId, payload) {
        return axiosClient.post(`/v1/projects/${projectId}/milestones`, payload).then((r) => r.data);
    },
    updateMilestone(id, payload) {
        return axiosClient.patch(`/v1/milestones/${id}`, payload).then((r) => r.data);
    },
    deleteMilestone(id) {
        return axiosClient.delete(`/v1/milestones/${id}`);
    },
    listLinks(projectId) {
        return axiosClient.get(`/v1/projects/${projectId}/links`).then((r) => r.data);
    },
    createLink(projectId, payload) {
        return axiosClient.post(`/v1/projects/${projectId}/links`, payload).then((r) => r.data);
    },
    updateLink(id, payload) {
        return axiosClient.patch(`/v1/project-links/${id}`, payload).then((r) => r.data);
    },
    deleteLink(id) {
        return axiosClient.delete(`/v1/project-links/${id}`);
    },
    addColumn(projectId, payload) {
        return axiosClient.post(`/v1/projects/${projectId}/board/columns`, payload).then((r) => r.data);
    },
    reorderColumns(projectId, payload) {
        return axiosClient.patch(`/v1/projects/${projectId}/board/columns/order`, payload).then((r) => r.data);
    },
    updateColumn(id, payload) {
        return axiosClient.patch(`/v1/board-columns/${id}`, payload).then((r) => r.data);
    },
    deleteColumn(id) {
        return axiosClient.delete(`/v1/board-columns/${id}`);
    },
    updateBoard(id, payload) {
        return axiosClient.patch(`/v1/boards/${id}`, payload).then((r) => r.data);
    },
    archiveTask(id) {
        return axiosClient.delete(`/v1/tasks/${id}`);
    },
    updateParent(id, payload) {
        return axiosClient.patch(`/v1/tasks/${id}/parent`, payload).then((r) => r.data);
    },
    getAssignees(id) {
        return axiosClient.get(`/v1/tasks/${id}/assignees`).then((r) => r.data);
    },
    setAssignees(id, payload) {
        return axiosClient.put(`/v1/tasks/${id}/assignees`, payload).then((r) => r.data);
    },
    getRelations(id) {
        return axiosClient.get(`/v1/tasks/${id}/relations`).then((r) => r.data);
    },
    addRelation(id, payload) {
        return axiosClient.post(`/v1/tasks/${id}/relations`, payload).then((r) => r.data);
    },
    deleteRelation(id) {
        return axiosClient.delete(`/v1/task-relations/${id}`);
    },
    getTaskSkills(id) {
        return axiosClient.get(`/v1/tasks/${id}/skills`).then((r) => r.data);
    },
    addTaskSkill(id, payload) {
        return axiosClient.post(`/v1/tasks/${id}/skills`, payload).then((r) => r.data);
    },
    deleteTaskSkill(id) {
        return axiosClient.delete(`/v1/task-skills/${id}`);
    },
    listRoles(params) {
        return get('/v1/project-roles', params);
    },
    createRole(payload) {
        return axiosClient.post('/v1/project-roles', payload).then((r) => r.data);
    },
    updateRole(id, payload) {
        return axiosClient.patch(`/v1/project-roles/${id}`, payload).then((r) => r.data);
    },
    deleteRole(id) {
        return axiosClient.delete(`/v1/project-roles/${id}`);
    },
    listTaskTypes(params) {
        return get('/v1/task-types', params);
    },
    createTaskType(payload) {
        return axiosClient.post('/v1/task-types', payload).then((r) => r.data);
    },
    updateTaskType(id, payload) {
        return axiosClient.patch(`/v1/task-types/${id}`, payload).then((r) => r.data);
    },
    deleteTaskType(id) {
        return axiosClient.delete(`/v1/task-types/${id}`);
    },
};
