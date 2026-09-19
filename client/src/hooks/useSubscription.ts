import type { CreateCheckoutSessionParams } from '@/types/interfaces';
import { loadStripe } from '@stripe/stripe-js';
import { useMutation, useQuery } from '@tanstack/react-query';
import axios from 'axios';
import { toast } from 'react-toastify';
import {
  getPriceId,
  subscriptionService,
} from '../services/subscriptionService';

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);
// Query keys
export const subscriptionKeys = {
  all: ['subscription'] as const,
  status: () => [...subscriptionKeys.all, 'status'] as const,
};

// Hook for getting subscription status
export const useSubscriptionStatus = () => {
  return useQuery({
    queryKey: subscriptionKeys.status(),
    queryFn: subscriptionService.getSubscriptionStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: (failureCount, error) => {
      // Don't retry on 401 (unauthorized)
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        return false;
      }
      return failureCount < 3;
    },
  });
};

// Hook for creating checkout session
export const useCreateCheckoutSession = () => {
  return useMutation({
    mutationFn: async (params: CreateCheckoutSessionParams) => {
      return await subscriptionService.createCheckoutSession(params);
    },
    onSuccess: async (data) => {
      const stripe = await stripePromise;
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }
      window.location.href = data.sessionUrl;
    },
    onError: (error) => {
      const errorMessage =
        (axios.isAxiosError(error) && error.response?.data?.error) ||
        error.message ||
        'Failed to create checkout session';
      toast.error(errorMessage);
    },
  });
};

// Hook for creating portal session (manages subscription, billing, and cancellation)
export const useCreatePortalSession = () => {
  return useMutation({
    mutationFn: subscriptionService.createPortalSession,
    onSuccess: (data) => {
      window.location.href = data.url;
    },
    onError: (error) => {
      const errorMessage =
        (axios.isAxiosError(error) && error.response?.data?.error) ||
        error.message ||
        'Failed to create portal session';
      toast.error(errorMessage);
    },
  });
};

// Composite hook for subscription management
export const useSubscription = () => {
  const statusQuery = useSubscriptionStatus();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();

  const handlePlanSelect = async (planName: string, isAnnual: boolean) => {
    if (planName === 'Free') {
      toast.info('You are already on the Free plan');
      return;
    }

    try {
      const priceId = getPriceId(planName, isAnnual);
      await checkoutMutation.mutateAsync({ priceId, isAnnual });
    } catch (error) {
      // Error is already handled in the mutation
      console.error('Plan selection failed:', error);
    }
  };

  const handleManageSubscription = () => {
    portalMutation.mutate();
  };

  // ponytail: cancellation goes through Stripe Customer Portal — no bespoke cancel endpoint needed
  const handleCancelSubscription = () => {
    portalMutation.mutate();
  };

  return {
    // Data
    subscription: statusQuery.data,

    // Status
    isLoading: statusQuery.isLoading,
    isError: statusQuery.isError,
    error: statusQuery.error,

    // Actions
    handlePlanSelect,
    handleManageSubscription,
    handleCancelSubscription,

    // Mutation states
    isCreatingCheckout: checkoutMutation.isPending,
    isCreatingPortal: portalMutation.isPending,
    isCanceling: portalMutation.isPending,

    // Refetch function
    refetchStatus: statusQuery.refetch,
  };
};
