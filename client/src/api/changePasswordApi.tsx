import { ChangePasswordValidator } from '@/classes/ChangePasswordValidator';
import axios from '@/services/axios';
import type { ApiResponse, LoginUserData } from '@/types/interfaces';
import { toast } from 'react-toastify';

export interface ChangePasswordWithTokenProps {
  newPassword: string;
  confirmPassword: string;
  resetToken: string;
}

export default async function changePasswordApi(credentials: ChangePasswordWithTokenProps) {
  const { newPassword, confirmPassword, resetToken } = credentials;

  const passwordValidator = new ChangePasswordValidator(newPassword, confirmPassword);
  const errors = passwordValidator.checkValidation();

  if (errors.length) {
    errors.forEach((error: string) => toast.error(error));
    throw new Error('Validation failed');
  }

  try {
    const res: ApiResponse = await axios.put('/api/auth/changePassword', {
      newPassword,
      confirmPassword,
      resetToken,
    });

    const data = res.data as LoginUserData;
    toast.success(data.message);
    return data;
  } catch (err: any) {
    const errors = [err.response.data.errors];
    errors.forEach((error: string) => toast.error(error));
  }
}
