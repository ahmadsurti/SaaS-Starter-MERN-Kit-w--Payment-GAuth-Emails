export type PlansType = {
  name: string;
  description: string;
  monthlyPrice: number;
  annualPrice: number;
  popular: boolean;
  features: string[];
  limitations: string[];
  buttonVariant: 'outline' | 'default';
  annualSavings?: number;
};

// ponytail: feature copy is placeholder — replace with your actual product features before launch
const plans: PlansType[] = [
  {
    name: 'Free',
    description: 'Get started at no cost',
    monthlyPrice: 0,
    annualPrice: 0,
    popular: false,
    features: [
      'Core features included',
      'Up to [X] items / requests / seats',
      'Basic analytics',
      'Community support',
    ],
    limitations: [
      'Limited to [X] items',
      'No data export',
      'No API access',
    ],
    buttonVariant: 'outline' as const,
  },
  {
    name: 'Standard',
    description: 'For individuals and small teams',
    monthlyPrice: 5.99,
    annualPrice: 4.99,
    annualSavings: 12,
    popular: true,
    features: [
      'Everything in Free, plus:',
      'Unlimited [core feature]',
      'Data export',
      'Priority support',
      'Advanced analytics',
    ],
    limitations: [],
    buttonVariant: 'default' as const,
  },
  {
    name: 'Pro',
    description: 'For power users and growing teams',
    monthlyPrice: 7.99,
    annualPrice: 5.99,
    annualSavings: 24,
    popular: false,
    features: [
      'Everything in Standard, plus:',
      'AI-powered features',
      'API access',
      'Early access to new features',
      '24/7 premium support',
    ],
    limitations: [],
    buttonVariant: 'outline' as const,
  },
];

export default plans;
