import { useTranslation } from 'react-i18next';

import styles from './Modal.module.css';

export function Modal({ open, title, children, onClose }) {
    const { t } = useTranslation();
    if (!open) {
        return null;
    }

    return (
        <div className={styles.backdrop} onClick={onClose}>
            <div className={styles.dialog} onClick={(event) => event.stopPropagation()}>
                <div className={styles.head}>
                    <h2>{title}</h2>
                    <button type="button" onClick={onClose} aria-label={t('common.close')}>
                        ×
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}
