import { Navigate, Outlet } from 'react-router-dom';

import { useAuthStore } from '../store/authStore.js';
import { hasRole } from '../shared/lib/roles.js';

export function ProtectedRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
}

export function GuestRoute() {
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

    if (isAuthenticated) {
        return <Navigate to="/app/profile" replace />;
    }

    return <Outlet />;
}

export function RoleRoute({ roles }) {
    const role = useAuthStore((state) => state.session?.role);

    if (!hasRole(role, roles)) {
        return <Navigate to="/403" replace />;
    }

    return <Outlet />;
}
