"use client";

import { useState, useEffect } from 'react';
import { SocialAccount } from '@/lib/types';

interface UseSocialAccountsResult {
  accounts: SocialAccount[];
  isLoading: boolean;
  error: string | null;
  refreshAccount: (accountId: string) => Promise<void>;
  toggleAccountStatus: (accountId: string, enabled: boolean) => Promise<void>;
  disconnectAccount: (accountId: string, provider: string) => Promise<void>;
  getAccountByProvider: (provider: string) => SocialAccount | undefined;
  refetchSocialAccounts: () => Promise<void>; // Added refetchSocialAccounts
}

export default function useSocialAccounts(): UseSocialAccountsResult {
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all social accounts on component mount
  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async (): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/social');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch social accounts');
      }

      const data = await response.json();
      setAccounts(data.accounts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error fetching social accounts:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh a specific account
  const refreshAccount = async (accountId: string): Promise<void> => {
    try {
      const account = accounts.find(a => a.id === accountId);
      if (!account) return;

      // Each provider might have a different refresh endpoint
      const response = await fetch(`/api/social/${account.provider}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to refresh ${account.provider} account`);
      }

      // Refresh the accounts list
      await fetchAccounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error refreshing account:', err);
    }
  };

  // Toggle account status (enabled/disabled)
  const toggleAccountStatus = async (accountId: string, enabled: boolean): Promise<void> => {
    try {
      const response = await fetch('/api/social', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId, enabled })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update account status');
      }

      // Update local state
      setAccounts(prev => 
        prev.map(account => 
          account.id === accountId 
            ? { ...account, status: enabled ? 'active' : 'disconnected' } 
            : account
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error updating account status:', err);
    }
  };

  // Disconnect an account
  const disconnectAccount = async (accountId: string, provider: string): Promise<void> => {
    try {
      const response = await fetch(`/api/social/${provider}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: accountId })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Failed to disconnect ${provider} account`);
      }

      // Remove account from local state
      setAccounts(prev => prev.filter(account => account.id !== accountId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      console.error('Error disconnecting account:', err);
    }
  };

  // Helper to find an account by provider
  const getAccountByProvider = (provider: string): SocialAccount | undefined => {
    return accounts.find(account => account.provider === provider);
  };

  return {
    accounts,
    isLoading,
    error,
    refreshAccount,
    toggleAccountStatus,
    disconnectAccount,
    getAccountByProvider,
    refetchSocialAccounts: fetchAccounts // Expose fetchAccounts as refetchSocialAccounts
  };
}