import { useQuery } from '@tanstack/react-query';

import { employeeApi } from '../api/employeeApi.js';
import { queryKeys } from '../../../shared/api/queryKeys.js';
import { unwrapPage } from '../../../shared/lib/queryParams.js';

function useCatalog(key, fetcher) {
    return useQuery({
        queryKey: key,
        queryFn: async () => unwrapPage(await fetcher({ page: 0, size: 100, sortBy: 'name' })).content,
    });
}

export function useCatalogs() {
    const departments = useCatalog(queryKeys.catalogs.departments({ size: 100 }), employeeApi.listDepartments);
    const positions = useCatalog(queryKeys.catalogs.positions({ size: 100 }), employeeApi.listPositions);
    const grades = useCatalog(queryKeys.catalogs.grades({ size: 100 }), employeeApi.listGrades);
    const specializations = useCatalog(queryKeys.catalogs.specializations({ size: 100 }), employeeApi.listSpecializations);
    const skills = useCatalog(queryKeys.catalogs.skills({ size: 100 }), employeeApi.listSkills);

    const asList = (value) => (Array.isArray(value) ? value : []);

    return {
        departments: asList(departments.data),
        positions: asList(positions.data),
        grades: asList(grades.data),
        specializations: asList(specializations.data),
        skills: asList(skills.data),
    };
}
