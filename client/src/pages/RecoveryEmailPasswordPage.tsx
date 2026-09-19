import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import OTPInputComponent from '@/components/OTPInputComponent';
import Spinner from '@/components/Spinner';
import { useValidateRecoveryCode } from '@/hooks/useValidateRecoveryCode';
import { useResendRecoveryEmail } from '@/hooks/useResendRecoveryEmail';
import { toast } from 'react-toastify';

export const RecoveryEmailPasswordPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const { mutate: verifyEmailCode, isPending: verifyPending } =
    useValidateRecoveryCode();

  const { mutate: reSendValidationEmail, isPending: emailPending } =
    useResendRecoveryEmail();

  useEffect(() => {
    if (!location.state) {
      toast.error('Session expired or invalid. Please request password recovery again.');
      navigate('/');
    }
  }, [location.state, navigate]);

  if (!location.state) return null;
  const { email, captcha, id } = location.state;

  async function handleVerify(otpValue: string) {
    verifyEmailCode({
      email,
      validationCode: otpValue,
    });
  }
  async function handleResendEmail(e: React.FormEvent) {
    e.preventDefault();

    reSendValidationEmail({ email, captcha, id });
  }

  if (emailPending || verifyPending) return <Spinner open />;
  return (
    <div className="">
      <OTPInputComponent
        onVerify={handleVerify}
        onResendEmail={handleResendEmail}
      />
    </div>
  );
};
