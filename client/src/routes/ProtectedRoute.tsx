import { Navigate, Outlet } from 'react-router-dom';
import { useActiveUser } from '@/hooks/useActiveUser';
import Spinner from '@/components/Spinner';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoggedIn, isLoading } = useActiveUser();

  if (isLoading) {
    return <Spinner open />;
  }

  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }

  return children || <Outlet />;
}
