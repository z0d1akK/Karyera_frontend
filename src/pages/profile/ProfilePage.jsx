import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { EmployeeProfile } from '../../features/employees/components/EmployeeProfile.jsx';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { Skeleton } from '../../shared/ui/PageState/PageState.jsx';
import { useAuthStore } from '../../store/authStore.js';

export function ProfilePage() {
    const employee = useAuthStore((state) => state.employee);
    const session = useAuthStore((state) => state.session);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const isReady = useAuthStore((state) => state.isReady);
    const byUser = useQuery({
        queryKey: queryKeys.employees.byUser(session?.userId),
        queryFn: () => employeeApi.getByUserId(session.userId),
        enabled: Boolean(isAuthenticated && session?.userId),
        retry: 2,
    });
    const employeeId = employee?.id || byUser.data?.id;
    const waiting = Boolean(isAuthenticated && session?.userId)
        && !employeeId
        && (!isReady || byUser.isLoading || byUser.isFetching || !byUser.isFetched);

    if (waiting) {
        return <Skeleton rows={8} />;
    }

    return <EmployeeProfile employeeId={employeeId} isSelf />;
}

export function EmployeeDetailsPage() {
    const { id } = useParams();
    return <EmployeeProfile employeeId={id} />;
}
