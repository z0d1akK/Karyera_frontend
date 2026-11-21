import styles from './Button.module.css';

export function Button({
    children,
    variant = 'primary',
    size = 'md',
    type = 'button',
    className = '',
    ...props
}) {
    return (
        <button
            type={type}
            className={`${styles.button} ${styles[variant]} ${size === 'sm' ? styles.sm : ''} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
