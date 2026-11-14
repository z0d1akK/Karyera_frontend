import logo from '../../../../assets/logo/logo.png';

import styles from './AuthLogo.module.css';

export function AuthLogo({ inverted = false, compact = false }) {
    return (
        <div className={`${styles.logo} ${inverted ? styles.inverted : ''} ${compact ? styles.compact : ''}`}>
            <img
                src={logo}
                alt="Karyera"
                className={styles.icon}
            />

            {compact ? null : (
                <span className={styles.name}>
                    Karyera
                </span>
            )}
        </div>
    );
}