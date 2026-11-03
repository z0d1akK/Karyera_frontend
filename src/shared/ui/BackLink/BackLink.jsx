import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import catalog from '../../styles/catalog.module.css';

export function BackLink({ to, children }) {
    return (
        <Link to={to} className={catalog.back}>
            <ArrowLeft size={16} />
            {children}
        </Link>
    );
}
