import { useQueries, useQuery } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { fullName } from './format.js';
import { unwrapPage } from './queryParams.js';

export function useEmployeeNames() {
    const people = useQuery({
        queryKey: ['employees', 'directory-names'],
        queryFn: async () => unwrapPage(await employeeApi.list({ page: 0, size: 100, sortBy: 'lastName' })).content || [],
    });

    return (id) => {
        const person = (people.data || []).find((item) => String(item.id) === String(id));
        return person ? fullName(person) : null;
    };
}

export function useEmployeeLabels(ids = []) {
    const directoryName = useEmployeeNames();
    const unique = [...new Set((ids || []).filter(Boolean).map((id) => String(id)))];
    const missing = unique.filter((id) => !directoryName(id));
    const fetched = useQueries({
        queries: missing.map((id) => ({
            queryKey: ['employees', id],
            queryFn: () => employeeApi.getById(id),
            staleTime: 60_000,
            retry: false,
        })),
    });
    const extra = {};
    missing.forEach((id, index) => {
        const person = fetched[index]?.data;
        if (person) {
            extra[id] = fullName(person);
        }
    });

    return (id) => {
        if (!id) {
            return null;
        }
        return extra[String(id)] || directoryName(id);
    };
}

export function useWorkLabels(rows) {
    const projects = useQuery({
        queryKey: ['projects', 'labels'],
        queryFn: async () => unwrapPage(await projectApi.list({ page: 0, size: 100, sortBy: 'name' })).content || [],
    });
    const projectIds = [...new Set((rows || []).map((row) => row.projectId).filter(Boolean))];
    const taskQueries = useQueries({
        queries: projectIds.map((projectId) => ({
            queryKey: ['projects', projectId, 'task-labels'],
            queryFn: async () => unwrapPage(await projectApi.listTasks(projectId, { page: 0, size: 100, sortBy: 'taskNumber' })).content || [],
        })),
    });
    const tasks = taskQueries.flatMap((query) => query.data || []);

    return {
        projectName: (id) => (projects.data || []).find((item) => item.id === id)?.name || null,
        taskTitle: (id) => {
            const found = tasks.find((item) => String(item.id) === String(id));
            return found?.title || found?.key || null;
        },
    };
}
