import {
  createBrowserRouter,
  createRoutesFromElements,
  Route,
  RouterProvider,
} from 'react-router-dom';

import { ChangeRecoverPasswordPage } from '@/pages/ChangeRecoverPasswordPage';
import { EditProfilePage } from '@/pages/EditProfilePage';
import { EmailValidationPage } from '@/pages/EmailValidationPage';
import Homepage from '@/pages/Homepage';
import LegalPage from '@/pages/LegalPage';
import Page404 from '@/pages/Page404';
import PricingPage from '@/pages/PricingPage';
import PricingPageForGuest from '@/pages/PricingPageforGuest';
import { RecoveryEmailPasswordPage } from '@/pages/RecoveryEmailPasswordPage';
import SuccessPaymentPage from '@/pages/SuccessPaymentPage';
import MainLayout from '../layouts/MainLayout';
import ProtectedRoute from './ProtectedRoute';

const ReactRoutes = () => {
  const router = createBrowserRouter(
    createRoutesFromElements(
      <Route path="/" element={<MainLayout />}>
        {/* Public routes */}
        <Route index element={<Homepage />} />
        <Route path="EmailValidationPage" element={<EmailValidationPage />} />
        <Route path="ChangeRecoverPasswordPage" element={<ChangeRecoverPasswordPage />} />
        <Route path="RecoveryEmailValidationPage" element={<RecoveryEmailPasswordPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="pricing-guest" element={<PricingPageForGuest />} />
        <Route path="legalPage" element={<LegalPage />} />
        <Route path="*" element={<Page404 />} />

        <Route element={<ProtectedRoute />}>
          <Route path="editProfilePage" element={<EditProfilePage />} />
          <Route path="success" element={<SuccessPaymentPage />} />
        </Route>
      </Route>,
    ),
  );

  return <RouterProvider router={router} />;
};

export default ReactRoutes;
