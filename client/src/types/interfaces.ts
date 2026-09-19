import type { ReactNode } from 'react';

export interface UserDocument {
  _id: string;
  email: string;
  name: string;
  password: string;
  profilePhoto?: string;
}

export interface ApiResponse<T = unknown> {
  data:
    | LoginUserData
    | AIApiData
    | T;
  status: number;
}

export interface LoginUserData {
  success: boolean;
  message: string;
  errors?: string[];
  user?: UserDocument;
  userId?: string;
  profilePhoto?: string;
}
export interface EmailSentData {
  success: boolean;
  message: string;
  errors?: string[];
  emailSentID: string;
}
export interface LogoutApiResponse {
  success: boolean;
  message: string;
}

export interface validateSignup {
  errors: string[];
  validated: boolean;
  hasUpper: RegExp;
  hasLower: RegExp;
  hasSymbol: RegExp;
  hasNumber: RegExp;

  validateEmail(): void;
  validatePasswordLength(): void;
  validatePasswordForce(): void;
  checkIfPasswordsAreEqual(): void;
  checkValidation(): string[];
}

export type ValidateChangePassword = Omit<validateSignup, 'validateEmail'>;

export interface ChangePasswordWithTokenProps {
  newPassword: string;
  confirmPassword: string;
  resetToken: string;
}
// Kept for backward compatibility — used by logged-in password change flow
export type ChangeUserLoggedInPassProps = {
  newPassword: string;
  confirmPassword: string;
  currentPassword: string;
};
export interface SignUpCheckErrorsProps {
  password: string;
  confirmPassword: string;
  email: string;
  name: string;
  captcha: string;
}

export type ChangePasswordErrorsProps = Pick<
  SignUpCheckErrorsProps,
  'password' | 'confirmPassword'
>;

export interface SendRecoveryEmailProps {
  email: string;
  captcha: string;
  id?: string;
}

export interface ThemeContextType {
  theme: string;
  toggleTheme?: () => void;
  checked: boolean;
  setChecked?: React.Dispatch<React.SetStateAction<boolean>>;
}

export interface ChildrenProps {
  children?: ReactNode;
}

export interface SubscriptionStatus {
  plan: 'free' | 'standard' | 'pro';
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  sessionUrl: string;
}

export interface PortalSessionResponse {
  url: string;
}

export interface CreateCheckoutSessionParams {
  priceId: string;
  isAnnual: boolean;
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metrics?: {
    streak?: number;
    consistency?: number;
    totalStudyTime?: number;
  };
}

export interface QuickPrompt {
  id: string;
  text: string;
  icon: string;
  category: string;
}

export interface ChatState {
  isOpen: boolean;
  isMinimized: boolean;
  isLoading: boolean;
  messages: AIMessage[];
  quickPrompts: QuickPrompt[];
}

export interface AIApiData {
  success: boolean;
  message: string;
  metrics: {
    streak: number;
    consistency: number;
    totalStudyTime: number;
  };
}
