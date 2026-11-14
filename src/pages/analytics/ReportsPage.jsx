import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';

import { analyticsApi } from '../../features/analytics/api/analyticsApi.js';
import { careerApi } from '../../features/career/api/careerApi.js';
import { EmployeePicker } from '../../features/employees/components/EmployeePicker.jsx';
import { getApiError } from '../../shared/api/errors.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { canManageEmployees } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { DataTable } from '../../shared/ui/DataTable/DataTable.jsx';
import { Input, Select } from '../../shared/ui/Input/Input.jsx';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { PageState } from '../../shared/ui/PageState/PageState.jsx';
import { AnalyticsNav } from './AnalyticsNav.jsx';
import page from '../../shared/styles/page.module.css';

const ASSESSMENT_TYPES = new Set(['POSITION_FIT', 'SKILL_GAPS', 'CAREER_RECOMMENDATIONS']);
const EMPLOYEE_TYPES = new Set(['EMPLOYEE_PROFILE', 'POSITION_FIT', 'SKILL_GAPS', 'CAREER_RECOMMENDATIONS', 'DEVELOPMENT_PLAN', 'DEVELOPMENT_DYNAMICS']);

export function ReportsPage() {
    const { t } = useTranslation();
    const session = useAuthStore((state) => state.session);
    const self = useAuthStore((state) => state.employee);
    const role = session?.role;
    const types = useQuery({ queryKey: ['analytics', 'reports'], queryFn: () => analyticsApi.reports() });
    const [type, setType] = useState('POSITION_FIT');
    const [employeeId, setEmployeeId] = useState(self?.id || '');
    const [assessmentId, setAssessmentId] = useState('');
    const [reserveId, setReserveId] = useState('');
    const [periodFrom, setPeriodFrom] = useState('');
    const [periodTo, setPeriodTo] = useState('');
    const [preview, setPreview] = useState(null);
    const [error, setError] = useState('');

    const selectedEmployeeId = role === 'EMPLOYEE' ? self?.id : employeeId;
    const assessments = useQuery({
        queryKey: ['analytics', 'assessments', selectedEmployeeId],
        queryFn: () => analyticsApi.assessments(selectedEmployeeId),
        enabled: Boolean(selectedEmployeeId) && ASSESSMENT_TYPES.has(type),
    });
    const reserves = useQuery({
        queryKey: ['career', 'reserves', 'reports'],
        queryFn: async () => unwrapPage(await careerApi.listReserves({ page: 0, size: 50, sortBy: 'name' })),
        enabled: type === 'TALENT_RESERVE',
    });
    const reserve = useQuery({
        queryKey: ['career', 'reserve', reserveId],
        queryFn: () => careerApi.getReserve(reserveId),
        enabled: type === 'TALENT_RESERVE' && Boolean(reserveId),
    });

    const params = useMemo(() => ({
        employeeId: EMPLOYEE_TYPES.has(type) ? selectedEmployeeId || undefined : undefined,
        assessmentId: ASSESSMENT_TYPES.has(type) ? assessmentId || undefined : undefined,
        reserveId: type === 'TALENT_RESERVE' ? reserveId || undefined : undefined,
        jobId: type === 'TALENT_RESERVE' ? reserve.data?.lastScreeningJobId || undefined : undefined,
        periodFrom: type === 'DEVELOPMENT_DYNAMICS' ? periodFrom || undefined : undefined,
        periodTo: type === 'DEVELOPMENT_DYNAMICS' ? periodTo || undefined : undefined,
    }), [type, selectedEmployeeId, assessmentId, reserveId, reserve.data, periodFrom, periodTo]);

    async function loadPreview() {
        try {
            setError('');
            setPreview(await analyticsApi.reportPreview(type, params));
        } catch (err) {
            setPreview(null);
            setError(getApiError(err).message || err.message);
        }
    }

    return (
        <section className={page.sections}>
            <PageHeader title={t('analyticsUi.reports')} />
            <AnalyticsNav />
            {types.isError ? <PageState title={t('errors.loadFailed')} onAction={types.refetch} /> : null}
            <Card>
                <div className={page.stack}>
                    <Select label={t('analyticsUi.reportType')} value={type} onChange={(event) => {
                        setType(event.target.value);
                        setPreview(null);
                    }}>
                        {(types.data || []).map((item) => (
                            <option key={item.type} value={item.type}>{item.title}</option>
                        ))}
                    </Select>
                    {EMPLOYEE_TYPES.has(type) && role !== 'ADMIN' ? (
                        canManageEmployees(role) ? (
                            <EmployeePicker
                                label={t('employees.fullName')}
                                value={selectedEmployeeId || ''}
                                onChange={(event) => {
                                    setEmployeeId(event.target.value);
                                    setAssessmentId('');
                                }}
                            />
                        ) : (
                            <p className={page.meta}>{self ? `${self.lastName} ${self.firstName}` : t('analyticsUi.me')}</p>
                        )
                    ) : null}
                    {ASSESSMENT_TYPES.has(type) ? (
                        <Select label={t('analyticsUi.assessment')} value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)}>
                            <option value="">{t('common.select')}</option>
                            {(assessments.data || []).map((item) => (
                                <option key={item.id} value={item.id}>
                                    {formatAssessment(item)}
                                </option>
                            ))}
                        </Select>
                    ) : null}
                    {type === 'TALENT_RESERVE' ? (
                        <Select label={t('talent.reserve')} value={reserveId} onChange={(event) => setReserveId(event.target.value)}>
                            <option value="">{t('common.select')}</option>
                            {(reserves.data?.content || []).map((item) => (
                                <option key={item.id} value={item.id}>{item.name}</option>
                            ))}
                        </Select>
                    ) : null}
                    {type === 'DEVELOPMENT_DYNAMICS' ? (
                        <div className={page.grid}>
                            <Input type="date" label={t('analyticsUi.periodFrom')} value={periodFrom} onChange={(event) => setPeriodFrom(event.target.value)} />
                            <Input type="date" label={t('analyticsUi.periodTo')} value={periodTo} onChange={(event) => setPeriodTo(event.target.value)} />
                        </div>
                    ) : null}
                    <div className={page.row}>
                        <Button onClick={loadPreview}>{t('analyticsUi.preview')}</Button>
                        <Button variant="ghost" onClick={() => analyticsApi.downloadReport(type, params)}>{t('analyticsUi.downloadPdf')}</Button>
                    </div>
                </div>
            </Card>
            {error ? <PageState title={error} /> : null}
            {preview ? <ReportPreview document={preview} /> : null}
        </section>
    );
}

function formatAssessment(item) {
    const date = item.calculatedAt ? new Date(item.calculatedAt).toLocaleString() : '';
    const score = item.totalScore == null ? '—' : item.totalScore;
    return `${date} — ${score}`;
}

function ReportPreview({ document }) {
    return (
        <Card>
            <h2 className={page.sectionTitle}>{document.title}</h2>
            {document.generatedAt ? <p className={page.meta}>{document.generatedAt}</p> : null}
            <div className={page.sections}>
                {(document.sections || []).map((section, index) => (
                    <section key={`${section.heading || 'section'}-${index}`}>
                        {section.heading ? <h3 className={page.sectionTitle}>{section.heading}</h3> : null}
                        {(section.paragraphs || []).map((paragraph) => (
                            <p key={paragraph}>{paragraph}</p>
                        ))}
                        {section.table ? (
                            <DataTable
                                rows={(section.table.rows || []).map((row, rowIndex) => ({
                                    id: String(rowIndex),
                                    cells: row,
                                }))}
                                columns={(section.table.headers || []).map((header, columnIndex) => ({
                                    key: String(columnIndex),
                                    header,
                                    render: (row) => row.cells?.[columnIndex] ?? '—',
                                }))}
                            />
                        ) : null}
                    </section>
                ))}
            </div>
        </Card>
    );
}
