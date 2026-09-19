import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import changePasswordApi from '@/api/changePasswordApi';
import { toast } from 'react-toastify';

export const useChangePassword = (onSuccessCallback?: () => void) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: changePasswordApi,
    onSuccess: () => {
      // The server no longer auto-logs in after a password reset.
      // Direct the user to home where they can log in with their new password.
      if (onSuccessCallback) onSuccessCallback();
      navigate('/');
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });
};
