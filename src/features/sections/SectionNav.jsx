import { NavLink } from 'react-router-dom';

import styles from './SectionNav.module.css';

export function SectionNav({ items }) {
    return (
        <nav className={styles.nav}>
            {items.map((item) => (
                <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) => `${styles.link} ${isActive ? styles.active : ''}`}
                    end={item.end}
                >
                    {item.label}
                </NavLink>
            ))}
        </nav>
    );
}
