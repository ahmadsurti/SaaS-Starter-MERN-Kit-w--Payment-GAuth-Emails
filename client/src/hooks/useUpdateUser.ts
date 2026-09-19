import editUserApi from '@/api/editUserApi';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export const useUpdateUser = (onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: editUserApi,
    onSuccess: () => {
      // Invalidate so React Query fetches the latest user data from the server.
      // The server's updateUser response does not return a user object, so we
      // cannot safely setQueryData here — invalidation is the correct pattern.
      queryClient.invalidateQueries({ queryKey: ['activeUser'] });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
};
