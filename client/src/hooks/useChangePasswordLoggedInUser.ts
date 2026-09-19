import { useMutation, useQueryClient } from '@tanstack/react-query';
import changeLoggedInUserPassApi from '@/api/changeLoggedinUserPass';

export const useChangePasswordLoggedInUser = (onSuccessCallback?: () => void) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: changeLoggedInUserPassApi,
    onSuccess: (data) => {
      if (!data) throw new Error('No user data from API');
      const user = data.user;
      // Update the cache immediately, then confirm with a fresh fetch
      queryClient.setQueryData(['activeUser'], user);
      queryClient.invalidateQueries({ queryKey: ['activeUser'] });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
};
