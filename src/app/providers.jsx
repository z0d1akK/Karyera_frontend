import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import { SessionBootstrap } from '../features/session/SessionBootstrap.jsx';
import { ToastHost } from '../shared/ui/Toast/ToastHost.jsx';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: 1,
            refetchOnWindowFocus: false,
        },
        mutations: {
            retry: 0,
        },
    },
});

export function AppProviders({ children }) {
    return (
        <QueryClientProvider client={queryClient}>
            <SessionBootstrap>
                {children}
                <ToastHost />
            </SessionBootstrap>
        </QueryClientProvider>
    );
}
