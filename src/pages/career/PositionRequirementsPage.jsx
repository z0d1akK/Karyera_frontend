import { useEffect, useState } from 'react';
import { useLocation, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { careerApi } from '../../features/career/api/careerApi.js';
import { useCatalogs } from '../../features/employees/hooks/useCatalogs.js';
import { queryKeys } from '../../shared/api/queryKeys.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canManageHr } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { BackLink } from '../../shared/ui/BackLink/BackLink.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { Badge } from '../../shared/ui/Badge/Badge.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';
import formStyles from './PositionRequirementsPage.module.css';

export function PositionRequirementsPage() {
    const { t } = useTranslation();
    const { id } = useParams();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const fromTrack = location.state?.fromTrack;
    const role = useAuthStore((s) => s.session?.role);
    const catalogs = useCatalogs();
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const [gradeId, setGradeId] = useState(searchParams.get('gradeId') || '');
    const [listQuery, setListQuery] = useState({ page: 0, size: 20, sortBy: 'revision', sortDirection: 'DESC' });
    const [draft, setDraft] = useState({
        description: '',
        minExperienceMonths: 0,
        skillId: '',
        requiredLevel: 3,
        weight: 1,
        mandatory: true,
    });
    const [skillRows, setSkillRows] = useState([]);
    const [formOpen, setFormOpen] = useState(false);

    const query = useQuery({
        queryKey: queryKeys.career.requirements({ positionId: id, gradeId, ...listQuery }),
        queryFn: async () => unwrapPage(await careerApi.listRequirements({
            positionId: id,
            gradeId: gradeId || undefined,
            ...listQuery,
        })),
    });
    const history = useQuery({
        queryKey: ['career', 'requirement-history', id, gradeId],
        enabled: Boolean(gradeId),
        queryFn: () => careerApi.requirementHistory({ positionId: id, gradeId }),
    });
    const current = useQuery({
        queryKey: ['career', 'requirement-current', id, gradeId],
        enabled: Boolean(gradeId),
        queryFn: () => careerApi.currentRequirement({ positionId: id, gradeId }),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: queryKeys.career.requirements({ positionId: id, gradeId }) });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });
    const selected = query.data?.content?.[0];
    const skills = skillRows;

    useEffect(() => {
        setSkillRows(selected?.skills || current.data?.skills || []);
    }, [selected?.id, current.data?.id]);

    const addSkill = () => {
        if (!draft.skillId) {
            return;
        }
        setSkillRows((rows) => [
            ...rows.filter((item) => item.skillId !== draft.skillId),
            {
                skillId: draft.skillId,
                requiredLevel: Number(draft.requiredLevel),
                weight: Number(draft.weight),
                mandatory: Boolean(draft.mandatory),
                description: '',
            },
        ]);
        setDraft((current) => ({ ...current, skillId: '' }));
    };
    const removeSkill = (skillId) => {
        setSkillRows((rows) => rows.filter((item) => item.skillId !== skillId));
    };
    const openEditor = () => {
        setDraft({
            description: selected?.description || current.data?.description || '',
            minExperienceMonths: selected?.minExperienceMonths ?? current.data?.minExperienceMonths ?? 0,
            skillId: '',
            requiredLevel: 3,
            weight: 1,
            mandatory: true,
        });
        setSkillRows(selected?.skills || current.data?.skills || []);
        setFormOpen(true);
    };
    const skillName = (skillId) => catalogs.skills.find((item) => item.id === skillId)?.name || '—';

    const payload = () => ({
        positionId: id,
        gradeId: gradeId || selected?.gradeId,
        description: draft.description,
        minExperienceMonths: Number(draft.minExperienceMonths),
        skills: skillRows,
    });

    const create = useMutation({
        mutationFn: () => careerApi.createRequirement(payload()),
        onSuccess: () => {
            setFormOpen(false);
            invalidate();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => careerApi.updateRequirement(selected.id, payload()),
        onSuccess: invalidate,
        onError,
    });
    const publish = useMutation({
        mutationFn: () => careerApi.publishRequirement(selected.id),
        onSuccess: () => {
            invalidate();
            queryClient.invalidateQueries({ queryKey: ['career', 'requirement-current', id, gradeId] });
        },
        onError,
    });

    const historyRows = Array.isArray(history.data) ? history.data : history.data?.content || [];
    const status = (gradeId && current.data?.status) || selected?.status;

    return (
        <section>
            <BackLink to={fromTrack || '/app/career/tracks'}>
                {fromTrack ? t('career.backToTrack') : t('career.backToTracks')}
            </BackLink>
            <PageHeader title={t('career.requirementsTitle')} description={catalogs.positions.find((item) => item.id === id)?.name} />
            <Card>
                <Select label={t('form.grade')} value={gradeId} onChange={(e) => setGradeId(e.target.value)}>
                    <option value="">{t('common.all')}</option>
                    {catalogs.grades.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                </Select>
                {status ? <Badge>{enumLabel(t, 'requirementStatus', status)}</Badge> : null}
                <DataTable
                    rows={skills}
                    empty={t('career.noRequirements')}
                    columns={[
                        { key: 'skillName', header: t('career.skill'), render: (row) => row.skillName || catalogs.skills.find((item) => item.id === row.skillId)?.name || '—' },
                        { key: 'requiredLevel', header: t('career.level') },
                        { key: 'weight', header: t('career.weight') },
                        { key: 'mandatory', header: t('career.mandatory'), render: (row) => (row.mandatory ? t('common.yes') : t('common.no')) },
                    ]}
                />
                {canManageHr(role) ? (
                    <div className={page.row}>
                        <Button onClick={openEditor}>{t('career.newRequirement')}</Button>
                        {selected?.status === 'DRAFT' ? (
                            <Button variant="secondary" onClick={openEditor}>{t('career.editSkills')}</Button>
                        ) : null}
                        {selected?.status === 'DRAFT' ? <Button onClick={() => publish.mutate()}>{t('career.publishRequirement')}</Button> : null}
                    </div>
                ) : null}
                <h3>{t('career.history')}</h3>
                <DataTable
                    rows={historyRows}
                    columns={[
                        { key: 'revision', header: t('career.order'), render: (row) => row.revision ?? row.version },
                        { key: 'status', header: t('form.status'), render: (row) => enumLabel(t, 'requirementStatus', row.status) },
                    ]}
                />
                <Pagination
                    page={query.data?.number || 0}
                    totalPages={query.data?.totalPages || 0}
                    size={listQuery.size}
                    onChange={(pageNumber) => setListQuery({ ...listQuery, page: pageNumber })}
                    onSizeChange={(size) => setListQuery({ ...listQuery, size, page: 0 })}
                />
            </Card>
            <Modal open={formOpen} title={t('career.newRequirement')} onClose={() => setFormOpen(false)}>
                <div className={formStyles.form}>
                    <Textarea rows={3} label={t('career.description')} value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
                    <Input type="number" label={t('career.minExperience')} value={draft.minExperienceMonths} onChange={(e) => setDraft({ ...draft, minExperienceMonths: e.target.value })} />
                    <div className={formStyles.composer}>
                        <Select label={t('career.skill')} value={draft.skillId} onChange={(e) => setDraft({ ...draft, skillId: e.target.value })}>
                            <option value="">{t('common.select')}</option>
                            {catalogs.skills.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                        <Input type="number" min="1" label={t('career.level')} value={draft.requiredLevel} onChange={(e) => setDraft({ ...draft, requiredLevel: e.target.value })} />
                        <Input type="number" min="0" label={t('career.weight')} value={draft.weight} onChange={(e) => setDraft({ ...draft, weight: e.target.value })} />
                        <label className={formStyles.check}>
                            <input type="checkbox" checked={Boolean(draft.mandatory)} onChange={(e) => setDraft({ ...draft, mandatory: e.target.checked })} />
                            {t('career.mandatory')}
                        </label>
                        <Button className={formStyles.add} type="button" variant="secondary" onClick={addSkill} disabled={!draft.skillId}>
                            {t('common.add')}
                        </Button>
                    </div>
                    <div>
                        <p className={formStyles.listTitle}>{t('career.skillsInRevision')}</p>
                        <div className={formStyles.list}>
                            {skillRows.map((item) => (
                                <div key={item.skillId} className={formStyles.skill}>
                                    <div className={formStyles.skillBody}>
                                        <span className={formStyles.skillName}>{skillName(item.skillId)}</span>
                                        <span className={formStyles.skillMeta}>
                                            <span>{t('career.level')}: {item.requiredLevel}</span>
                                            <span>{t('career.weight')}: {item.weight}</span>
                                            {item.mandatory ? <span>{t('career.mandatory')}</span> : null}
                                        </span>
                                    </div>
                                    <Button type="button" variant="danger" onClick={() => removeSkill(item.skillId)}>{t('common.delete')}</Button>
                                </div>
                            ))}
                            {!skillRows.length ? <p className={formStyles.empty}>{t('career.noRequirements')}</p> : null}
                        </div>
                    </div>
                    <div className={formStyles.footer}>
                        <Button variant="ghost" onClick={() => setFormOpen(false)}>{t('common.cancel')}</Button>
                        {selected?.status === 'DRAFT' ? <Button variant="secondary" onClick={() => update.mutate()}>{t('common.save')}</Button> : null}
                        <Button onClick={() => create.mutate()} disabled={!gradeId}>{t('common.create')}</Button>
                    </div>
                </div>
            </Modal>
        </section>
    );
}
