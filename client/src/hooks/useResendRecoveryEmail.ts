import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import resendRecoveryEmailApi from '@/api/resendRecoveyEmailApi';

export const useResendRecoveryEmail = (callbackFn?: () => void) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: resendRecoveryEmailApi,
    onSuccess: (credentials) => {
      if (callbackFn) callbackFn();
      navigate('/RecoveryEmailValidationPage', { state: credentials });
    },
    onError: (error) => {
      if (callbackFn) callbackFn();
      throw new Error(error.message);
    },
  });
};
