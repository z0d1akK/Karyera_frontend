import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye, EyeOff } from 'lucide-react';

import styles from './PasswordInput.module.css';

export function PasswordInput({ label, error, ...props }) {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    return (
        <label className={styles.field}>
            {label ? <span className={styles.label}>{label}</span> : null}
            <span className={styles.wrap}>
                <input
                    type={visible ? 'text' : 'password'}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    {...props}
                />
                <button
                    type="button"
                    className={styles.toggle}
                    onClick={() => setVisible((value) => !value)}
                    aria-label={visible ? t('common.hidePassword') : t('common.showPassword')}
                >
                    {visible ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
            </span>
            {error ? <span className={styles.error}>{error}</span> : null}
        </label>
    );
}
