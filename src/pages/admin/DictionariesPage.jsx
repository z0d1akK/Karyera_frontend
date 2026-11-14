import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { employeeApi } from '../../features/employees/api/employeeApi.js';
import { projectApi } from '../../features/projects/api/projectApi.js';
import { unwrapPage } from '../../shared/lib/queryParams.js';
import { enumLabel } from '../../shared/lib/enums.js';
import { getApiError } from '../../shared/api/errors.js';
import { canWriteCatalogs } from '../../shared/lib/roles.js';
import { useAuthStore } from '../../store/authStore.js';
import { useToastStore } from '../../store/toastStore.js';
import { PageHeader } from '../../shared/ui/PageHeader/PageHeader.jsx';
import { AdminNav } from './AdminNav.jsx';
import { Card } from '../../shared/ui/Card/Card.jsx';
import { Tabs } from '../../shared/ui/Tabs/Tabs.jsx';
import { Input, Select, Textarea } from '../../shared/ui/Input/Input.jsx';
import { Button } from '../../shared/ui/Button/Button.jsx';
import { DataTable, Pagination } from '../../shared/ui/DataTable/DataTable.jsx';
import { StatRow, StatTile } from '../../shared/ui/StatTile/StatTile.jsx';
import { ListFilters, PageSizeField, SortField } from '../../shared/ui/ListFilters/ListFilters.jsx';
import { Modal } from '../../shared/ui/Modal/Modal.jsx';
import page from '../../shared/styles/page.module.css';

const catalogs = {
    departments: {
        list: employeeApi.listDepartments,
        create: employeeApi.createDepartment,
        update: employeeApi.updateDepartment,
        activate: employeeApi.activateDepartment,
        deactivate: employeeApi.deactivateDepartment,
    },
    positions: {
        list: employeeApi.listPositions,
        create: employeeApi.createPosition,
        update: employeeApi.updatePosition,
        activate: employeeApi.activatePosition,
        deactivate: employeeApi.deactivatePosition,
    },
    grades: {
        list: employeeApi.listGrades,
        create: (payload) => employeeApi.createGrade({ ...payload, level: Number(payload.level) || 1 }),
        update: (id, payload) => employeeApi.updateGrade(id, { ...payload, level: Number(payload.level) || 1 }),
        activate: employeeApi.activateGrade,
        deactivate: employeeApi.deactivateGrade,
        extra: ['level'],
    },
    specializations: {
        list: employeeApi.listSpecializations,
        create: employeeApi.createSpecialization,
        update: employeeApi.updateSpecialization,
        activate: employeeApi.activateSpecialization,
        deactivate: employeeApi.deactivateSpecialization,
    },
    skills: {
        list: employeeApi.listSkills,
        create: (payload) => employeeApi.createSkill({ ...payload, category: payload.category || 'TECHNICAL' }),
        update: employeeApi.updateSkill,
        activate: employeeApi.activateSkill,
        deactivate: employeeApi.deactivateSkill,
        extra: ['category'],
    },
    responsibilityTypes: {
        list: employeeApi.listResponsibilityTypes,
        create: (payload) => employeeApi.createResponsibilityType({ multipleAllowed: false, ...payload }),
        update: employeeApi.updateResponsibilityType,
        activate: employeeApi.activateResponsibilityType,
        deactivate: employeeApi.deactivateResponsibilityType,
        extra: ['code', 'multipleAllowed'],
    },
    projectRoles: {
        list: (params) => projectApi.listRoles(params),
        create: (payload) => projectApi.createRole({ active: true, ...payload }),
        update: projectApi.updateRole,
        activate: (id) => projectApi.updateRole(id, { active: true }),
        deactivate: (id) => projectApi.updateRole(id, { active: false }),
        extra: ['code'],
    },
    taskTypes: {
        list: (params) => projectApi.listTaskTypes(params),
        create: (payload) => projectApi.createTaskType({ active: true, ...payload }),
        update: projectApi.updateTaskType,
        activate: (id) => projectApi.updateTaskType(id, { active: true }),
        deactivate: (id) => projectApi.updateTaskType(id, { active: false }),
        extra: ['code'],
    },
};

const emptyForm = { name: '', description: '', code: '', category: 'TECHNICAL', level: 1, multipleAllowed: false };
const SKILL_CATEGORIES = ['TECHNICAL', 'SOFT', 'HR', 'GENERAL'];

function toPayload(catalog, source) {
    const extra = catalog.extra || [];
    const payload = {
        name: source.name,
        description: source.description || '',
    };
    if (extra.includes('code')) payload.code = source.code || '';
    if (extra.includes('category')) payload.category = source.category || 'TECHNICAL';
    if (extra.includes('level')) payload.level = Number(source.level) || 1;
    if (extra.includes('multipleAllowed')) payload.multipleAllowed = source.multipleAllowed === true || source.multipleAllowed === 'true';
    if (source.active !== undefined) payload.active = source.active;
    return payload;
}

function extraValue(row, key, t) {
    if (key === 'multipleAllowed') {
        return row.multipleAllowed ? t('common.yes') : t('common.no');
    }
    if (key === 'category') {
        return enumLabel(t, 'skillCategory', row.category);
    }
    if (row[key] == null || row[key] === '') {
        return '—';
    }
    return String(row[key]);
}

function CatalogFields({ catalog, value, onChange, t }) {
    const extra = catalog.extra || [];
    const set = (key) => (event) => {
        const next = event.target.type === 'checkbox' ? event.target.checked : event.target.value;
        onChange({ ...value, [key]: next });
    };
    const categories = [...new Set([...SKILL_CATEGORIES, value.category].filter(Boolean))];
    return (
        <>
            {extra.includes('code') ? (
                <Input label={t('dictionaries.code')} value={value.code || ''} onChange={set('code')} />
            ) : null}
            <Input label={t('dictionaries.name')} value={value.name || ''} onChange={set('name')} />
            {extra.includes('category') ? (
                <Select label={t('dictionaries.category')} value={value.category || ''} onChange={set('category')}>
                    <option value="">{t('common.select')}</option>
                    {categories.map((item) => (
                        <option key={item} value={item}>{enumLabel(t, 'skillCategory', item)}</option>
                    ))}
                </Select>
            ) : null}
            {extra.includes('level') ? (
                <Input type="number" label={t('dictionaries.level')} value={value.level ?? ''} onChange={set('level')} />
            ) : null}
            {extra.includes('multipleAllowed') ? (
                <Select
                    label={t('dictionaries.multipleAllowed')}
                    value={value.multipleAllowed === true || value.multipleAllowed === 'true' ? 'true' : 'false'}
                    onChange={(event) => onChange({ ...value, multipleAllowed: event.target.value === 'true' })}
                >
                    <option value="false">{t('common.no')}</option>
                    <option value="true">{t('common.yes')}</option>
                </Select>
            ) : null}
            <div className={page.spanAll}>
                <Textarea label={t('dictionaries.description')} value={value.description || ''} onChange={set('description')} />
            </div>
        </>
    );
}

export function DictionariesPage() {
    const { t } = useTranslation();
    const role = useAuthStore((s) => s.session?.role);
    const canWrite = canWriteCatalogs(role);
    const [tab, setTab] = useState('departments');
    const [form, setForm] = useState(emptyForm);
    const [createOpen, setCreateOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [filters, setFilters] = useState({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC', name: '', active: '' });
    const push = useToastStore((s) => s.push);
    const queryClient = useQueryClient();
    const catalog = catalogs[tab];

    const query = useQuery({
        queryKey: ['admin-dict', tab, filters],
        queryFn: async () => unwrapPage(await catalog.list({
            ...filters,
            active: filters.active === '' ? undefined : filters.active === 'true',
        })),
    });

    const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-dict', tab] });
    const onError = (error) => push({ type: 'error', message: getApiError(error).message });

    const create = useMutation({
        mutationFn: () => catalog.create(toPayload(catalog, form)),
        onSuccess: () => {
            setCreateOpen(false);
            setForm(emptyForm);
            invalidate();
        },
        onError,
    });
    const update = useMutation({
        mutationFn: () => catalog.update(editing.id, toPayload(catalog, editing)),
        onSuccess: () => {
            setEditing(null);
            invalidate();
        },
        onError,
    });
    const activate = useMutation({ mutationFn: (id) => catalog.activate(id), onSuccess: invalidate, onError });
    const deactivate = useMutation({ mutationFn: (id) => catalog.deactivate(id), onSuccess: invalidate, onError });

    const rows = query.data?.content || [];
    const extra = catalog.extra || [];
    const sortOptions = [
        { value: 'name', label: t('dictionaries.name') },
        ...extra.map((key) => ({ value: key, label: t(`dictionaries.${key}`) })),
    ];

    return (
        <section>
            <PageHeader
                title={t('navigation.admin')}
                actions={canWrite ? <Button onClick={() => setCreateOpen(true)}>{t('dictionaries.create')}</Button> : null}
            />
            <AdminNav />
            <StatRow>
                <StatTile label={t(`dictionaries.${tab}`)} value={query.data?.totalElements ?? rows.length} />
            </StatRow>
            <Tabs
                items={Object.keys(catalogs).map((id) => ({ id, label: t(`dictionaries.${id}`) }))}
                value={tab}
                onChange={(next) => {
                    setTab(next);
                    setEditing(null);
                    setCreateOpen(false);
                    setForm(emptyForm);
                    setFilters({ page: 0, size: 20, sortBy: 'name', sortDirection: 'ASC', name: '', active: '' });
                }}
            />
            <ListFilters>
                <Input label={t('dictionaries.search')} value={filters.name} onChange={(e) => setFilters({ ...filters, name: e.target.value, page: 0 })} />
                <Select label={t('dictionaries.active')} value={filters.active} onChange={(e) => setFilters({ ...filters, active: e.target.value, page: 0 })}>
                    <option value="">{t('common.all')}</option>
                    <option value="true">{t('dictionaries.activeOnly')}</option>
                    <option value="false">{t('common.no')}</option>
                </Select>
                <SortField
                    value={filters.sortBy}
                    direction={filters.sortDirection}
                    options={sortOptions}
                    onChange={(sortBy, sortDirection) => setFilters({ ...filters, sortBy, sortDirection, page: 0 })}
                />
                <PageSizeField value={filters.size} onChange={(size) => setFilters({ ...filters, size, page: 0 })} />
            </ListFilters>
            <Modal open={createOpen} title={t('dictionaries.create')} onClose={() => setCreateOpen(false)}>
                <div className={page.stack}>
                    <div className={page.grid}>
                        <CatalogFields catalog={catalog} value={form} onChange={setForm} t={t} />
                    </div>
                    <div className={page.row}>
                        <Button onClick={() => create.mutate()} disabled={!form.name}>{t('dictionaries.create')}</Button>
                        <Button variant="ghost" onClick={() => setCreateOpen(false)}>{t('common.cancel')}</Button>
                    </div>
                </div>
            </Modal>
            <Modal open={Boolean(editing)} title={t('common.edit')} onClose={() => setEditing(null)}>
                {editing ? (
                    <div className={page.stack}>
                        <div className={page.grid}>
                            <CatalogFields catalog={catalog} value={editing} onChange={setEditing} t={t} />
                        </div>
                        <div className={page.row}>
                            <Button onClick={() => update.mutate()}>{t('dictionaries.save')}</Button>
                            <Button variant="ghost" onClick={() => setEditing(null)}>{t('common.cancel')}</Button>
                        </div>
                    </div>
                ) : null}
            </Modal>
            <Card>
                <DataTable
                    rows={rows}
                    columns={[
                        { key: 'name', sortKey: 'name', header: t('dictionaries.name') },
                        ...extra.map((key) => ({
                            key,
                            header: t(`dictionaries.${key}`),
                            render: (row) => extraValue(row, key, t),
                        })),
                        { key: 'active', header: t('dictionaries.active'), render: (row) => (row.active !== false ? t('common.yes') : t('common.no')) },
                        {
                            key: 'actions',
                            header: '',
                            wrap: true,
                            render: (row) => canWrite ? (
                                <div className={page.row}>
                                    <Button variant="ghost" onClick={() => setEditing(row)}>{t('common.edit')}</Button>
                                    {row.active === false ? (
                                        <Button variant="secondary" onClick={() => activate.mutate(row.id)}>{t('dictionaries.activate')}</Button>
                                    ) : (
                                        <Button variant="ghost" onClick={() => deactivate.mutate(row.id)}>{t('dictionaries.deactivate')}</Button>
                                    )}
                                </div>
                            ) : null,
                        },
                    ]}
                />
                <Pagination
                    page={query.data?.number || 0}
                    totalPages={query.data?.totalPages || 0}
                    size={filters.size}
                    onChange={(pageNumber) => setFilters({ ...filters, page: pageNumber })}
                    onSizeChange={(size) => setFilters({ ...filters, size, page: 0 })}
                />
            </Card>
        </section>
    );
}
