import axios from '@/services/axios';
import type { LoginUserData, UserDocument } from '@/types/interfaces';

// ponytail: no try/catch — React Query catches errors natively and exposes them via isError/error
export default async function getActiveUserAPi(): Promise<UserDocument | null> {
  const response = await axios.get<LoginUserData>('/api/auth/me');
  return response.data.user ?? null;
}
