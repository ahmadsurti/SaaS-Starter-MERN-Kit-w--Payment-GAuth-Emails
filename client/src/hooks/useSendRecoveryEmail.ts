import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import sendRecoveryEmailApi from '@/api/sendRecoveryEmailApi';

export const useSendRecoveryPasswordEmail = (callbackFn?: () => void) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: sendRecoveryEmailApi,
    onSuccess: (credentials) => {
      if (callbackFn) callbackFn();
      // ponytail: navigate replaces window.location.reload() — reload after navigate() is a bug (navigate fires async, reload races it)
      navigate('/RecoveryEmailValidationPage', { state: credentials });
    },
    onError: (error) => {
      if (callbackFn) callbackFn();
      throw new Error(error.message);
    },
  });
};
