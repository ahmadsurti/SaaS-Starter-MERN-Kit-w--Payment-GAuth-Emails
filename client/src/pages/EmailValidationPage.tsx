import OTPInputComponent from '@/components/OTPInputComponent';
import Spinner from '@/components/Spinner';
import { useSendVerificationEmail } from '@/hooks/useSendVerificationEmail';
import { useValidateSignUpCode } from '@/hooks/useValidateSignUpCode';
import { Navigate, useLocation } from 'react-router-dom';

export const EmailValidationPage = () => {
  const location = useLocation();

  const { mutate: sendVerificationEmail, isPending } =
    useSendVerificationEmail();

  const { mutate: verifyEmailCode, isPending: verifyPending } =
    useValidateSignUpCode();

  if (!location.state) {
    return <Navigate to="/" replace />;
  }

  const { password, confirmPassword, email, name, captcha } = location.state;

  async function handleVerify(otpValue: string) {
    verifyEmailCode({
      password,
      confirmPassword,
      email,
      name,
      captcha,
      validationCode: otpValue,
    });
  }

  function handleResendEmail(e: React.FormEvent) {
    e.preventDefault();
    sendVerificationEmail({ password, confirmPassword, email, name, captcha });
  }

  return (
    <div className="">
      <Spinner open={isPending || verifyPending} />
      <OTPInputComponent
        onVerify={handleVerify}
        onResendEmail={handleResendEmail}
      />
    </div>
  );
};
