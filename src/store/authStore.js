import { create } from 'zustand';

import { parseAccessToken } from '../shared/lib/jwt.js';
import { authStorage } from '../services/auth/authStorage.js';

function sessionFromToken(accessToken) {
    const claims = parseAccessToken(accessToken);

    if (!claims?.userId) {
        return null;
    }

    return {
        userId: claims.userId,
        role: claims.role,
        email: claims.email,
    };
}

const initialSession = sessionFromToken(authStorage.getAccessToken());

export const useAuthStore = create((set, get) => ({
    session: initialSession,
    employee: null,
    isAuthenticated: Boolean(initialSession?.userId),
    isReady: false,

    setAuth({ accessToken, refreshToken, employee }) {
        authStorage.setTokens({ accessToken, refreshToken });
        const session = sessionFromToken(accessToken);

        set({
            session,
            employee: employee ?? get().employee,
            isAuthenticated: Boolean(session?.userId) || Boolean(accessToken),
        });
    },

    setEmployee(employee) {
        set({ employee });
    },

    setReady(isReady) {
        set({ isReady });
    },

    logout() {
        authStorage.clearTokens();

        set({
            session: null,
            employee: null,
            isAuthenticated: false,
            isReady: true,
        });
    },
}));
