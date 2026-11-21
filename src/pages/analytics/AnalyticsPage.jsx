import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

export function AnalyticsPage({ title, description, actions, includeCompany, children }) {
    return (
        <section className={page.sections}>
            <div className={page.pageHead}>
                <PageHeader title={title} description={description} actions={actions} />
                <AnalyticsNav includeCompany={includeCompany} />
            </div>
            {children}
        </section>
    );
}
