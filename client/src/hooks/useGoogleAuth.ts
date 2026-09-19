import getGoogleAuth from '@/api/getGoogleAuth';

// ponytail: getGoogleAuth does window.location.href = ... (full redirect) so
// useMutation onSuccess/navigate never fire — a plain re-export is all that's needed.
export const useGoogleAuth = (onSuccessCallback?: () => void) => ({
  mutate: () => {
    if (onSuccessCallback) onSuccessCallback();
    getGoogleAuth();
  },
  isPending: false as const,
});
