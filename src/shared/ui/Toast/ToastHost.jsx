import { useToastStore } from '../../../store/toastStore.js';
import styles from './ToastHost.module.css';

export function ToastHost() {
    const toasts = useToastStore((state) => state.toasts);
    const dismiss = useToastStore((state) => state.dismiss);

    return (
        <div className={styles.host}>
            {toasts.map((toast) => (
                <button
                    key={toast.id}
                    type="button"
                    className={`${styles.toast} ${styles[toast.type] || ''}`}
                    onClick={() => dismiss(toast.id)}
                >
                    {toast.message}
                </button>
            ))}
        </div>
    );
}
