import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { SocialAccount } from '@/lib/types';

export function useTikTokAccount() {
  const [account, setAccount] = useState<SocialAccount | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/social/tiktok');
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load TikTok account');
      }
      
      const data = await response.json();
      setAccount(data.account);
    } catch (err: any) {
      console.error('Error fetching TikTok account:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!account) return;
    
    try {
      const response = await fetch('/api/social/tiktok', {
        method: 'POST'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to refresh TikTok account');
      }
      
      const data = await response.json();
      setAccount(data.account);
      
      toast({
        title: "Account Refreshed",
        description: "TikTok account data has been updated"
      });
    } catch (err: any) {
      console.error('Error refreshing TikTok account:', err);
      toast({
        title: "Refresh Failed",
        description: err.message || 'Failed to refresh TikTok account',
        variant: "destructive"
      });
    }
  }, [account, toast]);

  const disconnectAccount = useCallback(async () => {
    if (!account) return;
    
    try {
      const response = await fetch('/api/social/tiktok', {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disconnect TikTok account');
      }
      
      setAccount(null);
      
      toast({
        title: "Account Disconnected",
        description: "TikTok account has been disconnected"
      });
    } catch (err: any) {
      console.error('Error disconnecting TikTok account:', err);
      toast({
        title: "Disconnect Failed",
        description: err.message || 'Failed to disconnect TikTok account',
        variant: "destructive"
      });
    }
  }, [account, toast]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return {
    account,
    loading,
    error,
    refreshAccount,
    disconnectAccount,
    fetchAccount
  };
}