import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import sendVerificationEmailApi from '@/api/sendVerificationEmailApi';

export const useSendVerificationEmail = (onSuccessCallback?: () => void) => {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: sendVerificationEmailApi,
    onSuccess: (credentials) => {
      if (onSuccessCallback) onSuccessCallback();
      navigate('/EmailValidationPage', { state: credentials });
    },
    onError: (error) => {
      // ponytail: don't navigate away on send failure — let the user correct and retry
      throw new Error(error.message);
    },
  });
};
