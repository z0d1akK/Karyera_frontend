function decodeBase64Url(value) {
    const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, '=');
    return decodeURIComponent(
        atob(padded)
            .split('')
            .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
            .join(''),
    );
}

export function parseJwt(token) {
    if (!token) {
        return null;
    }

    const parts = token.split('.');

    if (parts.length < 2) {
        return null;
    }

    try {
        return JSON.parse(decodeBase64Url(parts[1]));
    } catch {
        return null;
    }
}

export function getSessionFromAccessToken(token) {
    const payload = parseJwt(token);

    if (!payload) {
        return null;
    }

    return {
        userId: payload.sub ?? payload.userId ?? null,
        role: payload.role ?? null,
        email: payload.email ?? null,
        expiresAt: payload.exp ? payload.exp * 1000 : null,
    };
}

export function parseAccessToken(token) {
    return getSessionFromAccessToken(token);
}

export function isTokenExpired(token, skewMs = 10_000) {
    const session = getSessionFromAccessToken(token);

    if (!session?.expiresAt) {
        return false;
    }

    return Date.now() >= session.expiresAt - skewMs;
}
