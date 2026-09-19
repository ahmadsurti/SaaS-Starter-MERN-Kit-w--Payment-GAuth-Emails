import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import validateRecoveryEmail from '@/api/validateRecoveyEmail';

export const useValidateRecoveryCode = (onSuccessCallback?: () => void) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: validateRecoveryEmail,
    onSuccess: (resetToken) => {
      // Navigate to the password-change page, passing the reset token via
      // location state (never in the URL — it's a one-time credential).
      navigate('/ChangeRecoverPasswordPage', { state: { resetToken } });
      if (onSuccessCallback) onSuccessCallback();
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
};
