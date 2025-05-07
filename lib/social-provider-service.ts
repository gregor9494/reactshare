import { SocialProviderConfig, SocialAccount } from '@/lib/types';
import {
  getProviders,
  getSocialProvider
} from '@/app/api/auth/providers';

/**
 * Service for interacting with social media providers
 */
export class SocialProviderService {
  /**
   * Get all available social providers
   */
  static getAvailableProviders(): SocialProviderConfig[] {
    const providers = getProviders();
    return Object.values(providers).filter(provider => provider.isAvailable);
  }

  /**
   * Get a provider by ID
   */
  static getProviderById(id: string): SocialProviderConfig | undefined {
    return getSocialProvider(id);
  }

  /**
   * Determine whether an account has specific capabilities
   */
  static hasCapability(account: SocialAccount, capability: string): boolean {
    const provider = this.getProviderById(account.provider);
    if (!provider) return false;
    
    switch (capability) {
      case 'upload':
        return !!provider.features.upload;
      case 'playlists': 
        return !!provider.features.playlists;
      case 'analytics':
        return !!provider.features.analytics;
      case 'scheduling':
        return !!provider.features.scheduling;
      default:
        return false;
    }
  }

  /**
   * Get OAuth scopes needed for a specific provider and functionality
   */
  static getRequiredScopes(providerId: string, functionality: 'read' | 'write' | 'upload'): string {
    const provider = this.getProviderById(providerId);
    if (!provider) return '';
    
    return provider.scopes[functionality] || '';
  }

  /**
   * Get API endpoints for a specific provider
   */
  static getProviderEndpoints(providerId: string): Record<string, string | undefined> {
    const provider = this.getProviderById(providerId);
    if (!provider) return {};
    
    return provider.endpoints;
  }

  /**
   * Get analytics metrics available for a provider
   */
  static getAnalyticsMetrics(providerId: string): string[] {
    const provider = this.getProviderById(providerId);
    if (!provider) return [];
    
    return provider.analyticsMetrics;
  }

  /**
   * Check if account token needs refresh based on expiry time
   */
  static isTokenExpired(account: SocialAccount): boolean {
    if (!account.token_expires_at) return false;
    
    const expiryDate = new Date(account.token_expires_at);
    const now = new Date();
    
    // Add a 5-minute buffer to be safe
    const bufferMs = 5 * 60 * 1000;
    return expiryDate.getTime() - bufferMs < now.getTime();
  }
  
  /**
   * Get the OAuth URL for connecting an account
   */
  static getOAuthCallbackUrl(providerId: string): string {
    const provider = this.getProviderById(providerId);
    if (!provider) return '/dashboard/social';
    
    return provider.authCallbackUrl;
  }
}