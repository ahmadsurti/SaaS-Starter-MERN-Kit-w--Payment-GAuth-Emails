import { toast } from 'react-toastify';
import axios from '@/services/axios';
import type { ApiResponse } from '@/types/interfaces';

// The server now returns a short-lived reset token instead of a userId.
// This token must be passed to changePasswordApi to authorise the reset.
export default async function validateRecoveryEmail(credentials: {
  email: string;
  validationCode: string;
}) {
  try {
    const res: ApiResponse = await axios.put(
      '/api/auth/checkValidationCodeEmail',
      {
        email: credentials.email.trim().toLowerCase(),
        validationCode: credentials.validationCode,
      },
    );
    const data = res.data as { resetToken: string; message: string };

    toast.success(data.message);
    return data.resetToken;
  } catch (err: any) {
    const errors = [err.response.data.errors];
    errors.forEach((error: string) => toast.error(error));

    throw new Error(errors[0]);
  }
}
