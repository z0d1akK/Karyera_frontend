import { useParams } from 'react-router-dom';

import { EmployeeProfile } from '../../features/employees/components/EmployeeProfile.jsx';
import { useAuthStore } from '../../store/authStore.js';

export function ProfilePage() {
    const employee = useAuthStore((state) => state.employee);
    return <EmployeeProfile employeeId={employee?.id} isSelf />;
}

export function EmployeeDetailsPage() {
    const { id } = useParams();
    return <EmployeeProfile employeeId={id} />;
}
