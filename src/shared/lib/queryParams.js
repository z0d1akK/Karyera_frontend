export function toSearchParams(params = {}) {
    const search = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
        if (value === undefined || value === null || value === '') {
            return;
        }

        search.set(key, String(value));
    });

    return search;
}

export function toSpringSort(sortBy, sortDirection = 'ASC') {
    if (!sortBy) {
        return undefined;
    }

    return `${sortBy},${String(sortDirection).toLowerCase()}`;
}

export function unwrapPage(data) {
    if (Array.isArray(data)) {
        return {
            content: data,
            totalElements: data.length,
            totalPages: 1,
            number: 0,
            size: data.length,
        };
    }

    return {
        content: data?.content ?? [],
        totalElements: data?.totalElements ?? 0,
        totalPages: data?.totalPages ?? 0,
        number: data?.number ?? 0,
        size: data?.size ?? 20,
    };
}
