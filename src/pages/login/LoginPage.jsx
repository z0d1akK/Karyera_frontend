import { LoginForm } from '../../features/auth/components/LoginForm/LoginForm.jsx';

import styles from './LoginPage.module.css';

export function LoginPage() {
    return (
        <div className={styles.page}>
            <LoginForm />
        </div>
    );
}