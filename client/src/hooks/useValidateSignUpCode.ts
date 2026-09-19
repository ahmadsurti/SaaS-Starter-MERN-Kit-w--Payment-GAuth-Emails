import validateSignUpCode from '@/api/validateSignUpCode';
import { useMutation } from '@tanstack/react-query';
import { useSignUp } from './useSignUp';

export const useValidateSignUpCode = () => {
  const { mutate: signUp } = useSignUp();

  return useMutation({
    mutationFn: validateSignUpCode,
    onSuccess: (credentials) => {
      const { password, confirmPassword, email, name, captcha } = credentials;
      signUp({ password, confirmPassword, email, name, captcha });
    },
    onError: (error) => {
      throw new Error(error.message);
    },
  });
};
