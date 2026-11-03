import logo from '../../../../assets/logo/logo.png';

import styles from './AuthLogo.module.css';

export function AuthLogo({ inverted = false }) {
    return (
        <div className={`${styles.logo} ${inverted ? styles.inverted : ''}`}>
            <img
                src={logo}
                alt=""
                className={styles.icon}
            />

            <span className={styles.name}>
                Karyera
            </span>
        </div>
    );
}