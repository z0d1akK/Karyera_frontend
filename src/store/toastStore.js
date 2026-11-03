import { create } from 'zustand';

export const useToastStore = create((set, get) => ({
    toasts: [],

    push(toast) {
        const id = crypto.randomUUID();
        set({
            toasts: [...get().toasts, { id, type: 'info', ...toast }],
        });

        window.setTimeout(() => {
            get().dismiss(id);
        }, toast.duration ?? 4000);
    },

    dismiss(id) {
        set({
            toasts: get().toasts.filter((toast) => toast.id !== id),
        });
    },
}));
