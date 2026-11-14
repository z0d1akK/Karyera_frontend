import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../employees/api/employeeApi.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { useAuthStore } from '../../store/authStore.js';

export function SessionBootstrap({ children }) {
    const session = useAuthStore((state) => state.session);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const setEmployee = useAuthStore((state) => state.setEmployee);
    const setReady = useAuthStore((state) => state.setReady);
    const logout = useAuthStore((state) => state.logout);

    const query = useQuery({
        queryKey: queryKeys.employees.byUser(session?.userId),
        queryFn: () => employeeApi.getByUserId(session.userId),
        enabled: Boolean(isAuthenticated && session?.userId),
        retry: 2,
    });

    useEffect(() => {
        if (query.data) {
            setEmployee(query.data);
        }
        if (!isAuthenticated || !session?.userId || query.isFetched) {
            setReady(true);
        }
    }, [query.data, query.isFetched, isAuthenticated, session?.userId, setEmployee, setReady]);

    useEffect(() => {
        if (query.error?.response?.status === 401) {
            logout();
        }
    }, [query.error, logout]);

    return children;
}
