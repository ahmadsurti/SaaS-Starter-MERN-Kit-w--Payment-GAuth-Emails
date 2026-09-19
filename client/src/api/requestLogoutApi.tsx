import { toast } from 'react-toastify';
import axios from '@/services/axios';
import type { LogoutApiResponse } from '@/types/interfaces';

export default async function requestLogoutApi(): Promise<LogoutApiResponse | undefined> {
  try {
    const res = await axios.get<LogoutApiResponse>('/api/auth/logout');
    toast.success(res?.data?.message);
    return res.data;
  } catch (err: any) {
    const errors = [err.response.data.errors];
    errors.forEach((error: string) => toast.error(error));
  }
}
