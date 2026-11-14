import { Link } from 'react-router-dom';

export function NamedLink({ to, name }) {
    if (!name) {
        return '—';
    }
    if (!to) {
        return name;
    }
    return (
        <Link to={to} onClick={(event) => event.stopPropagation()}>
            {name}
        </Link>
    );
}
