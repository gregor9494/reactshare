"use client"

import React, { useState } from "react"
import { useSession } from "next-auth/react"
import { signIn } from "next-auth/react"
import { formatDistanceToNow } from 'date-fns'
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Youtube,
  Instagram,
  Twitter,
  Facebook,
  Twitch,
  RefreshCw,
  Trash2,
  Plus,
  Loader2,
} from "lucide-react"
import TikTok from "@/components/ui/icons/tiktok"
import useSocialAccounts from "@/hooks/use-social-accounts"
import useYouTubeOAuth from "@/hooks/use-youtube-oauth"

type PlatformIconType = React.ComponentType<{ className?: string }>;

interface PlatformConfig {
  name: string;
  icon: PlatformIconType;
  color: string;
  connectAction: () => void;
  isAvailable: boolean;
}

export function ConnectedAccounts() {
  const { data: session } = useSession();
  const { toast } = useToast();
  const {
    accounts,
    isLoading,
    refreshAccount,
    toggleAccountStatus,
    disconnectAccount,
    refetch
  } = useSocialAccounts();
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);

  // Get platform-specific data
  const getPlatformData = (provider: string): {icon: PlatformIconType, color: string} => {
    switch (provider.toLowerCase()) {
      case 'youtube':
        return { icon: Youtube, color: "text-red-600" }
      case 'instagram':
        return { icon: Instagram, color: "text-pink-600" }
      case 'twitter':
        return { icon: Twitter, color: "text-blue-400" }
      case 'facebook':
        return { icon: Facebook, color: "text-blue-600" }
      case 'twitch':
        return { icon: Twitch, color: "text-purple-600" }
      case 'tiktok':
        return { icon: TikTok, color: "text-black" }
      default:
        return { icon: Plus, color: "text-gray-400" }
    }
  }

  // Format the last sync time
  const formatLastSync = (lastSyncAt: string | null): string => {
    if (!lastSyncAt) return 'Never';
    try {
      return formatDistanceToNow(new Date(lastSyncAt), { addSuffix: true });
    } catch (e) {
      return 'Unknown';
    }
  }

  // Handle refreshing an account
  const handleRefresh = async (accountId: string) => {
    setRefreshingId(accountId);
    try {
      await refreshAccount(accountId);
      toast({
        title: "Account refreshed",
        description: "Account data has been updated successfully."
      });
    } catch (error) {
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh account",
        variant: "destructive"
      });
    } finally {
      setRefreshingId(null);
    }
  }

  // Handle refreshing all accounts
  const handleRefreshAll = async () => {
    try {
      setRefreshingAll(true);
      
      // Refresh account data
      const accountsResponse = await fetch('/api/social', {
        method: 'GET',
        cache: 'no-store'
      });
      
      if (!accountsResponse.ok) {
        throw new Error(`Failed to refresh accounts: ${accountsResponse.statusText}`);
      }
      
      // Also refresh analytics endpoints to get fresh data
      await Promise.allSettled([
        fetch('/api/social/youtube/analytics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        }),
        fetch('/api/social/tiktok/analytics', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          cache: 'no-store'
        })
      ]);
      
      // Refresh the account data
      refetch();
      
      // Add success message
      toast({
        title: "Accounts refreshed",
        description: "Social account data and analytics have been updated.",
      });
    } catch (error) {
      console.error('Error refreshing social accounts:', error);
      toast({
        title: "Refresh failed",
        description: error instanceof Error ? error.message : "Failed to refresh accounts data",
        variant: "destructive",
      });
    } finally {
      setRefreshingAll(false);
    }
  };

  // Handle disconnecting an account
  const handleDisconnect = async (accountId: string, provider: string) => {
    setDisconnectingId(accountId);
    try {
      await disconnectAccount(accountId, provider);
    } finally {
      setDisconnectingId(null);
    }
  }

  // Status badge component
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return (
          <Badge variant="outline" className="bg-green-50 text-green-700 hover:bg-green-50">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-green-500 rounded-full mr-1"></span>
              Active
            </span>
          </Badge>
        )
      case "token_expired":
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 hover:bg-amber-50">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-amber-500 rounded-full mr-1"></span>
              Token Expired
            </span>
          </Badge>
        )
      case "disconnected":
        return (
          <Badge variant="outline" className="bg-slate-100 text-slate-500 hover:bg-slate-100">
            <span className="flex items-center">
              <span className="w-2 h-2 bg-slate-400 rounded-full mr-1"></span>
              Disconnected
            </span>
          </Badge>
        )
      default:
        return null
    }
  }

  // OAuth hooks for linking
  const { connectToYouTube, isConnecting: isConnectingYouTube } = useYouTubeOAuth();

  // Define available platforms and their connection methods
  const platforms: PlatformConfig[] = [
    {
      name: "YouTube",
      icon: Youtube,
      color: "text-red-600",
      connectAction: connectToYouTube,
      isAvailable: true
    },
    {
      name: "Instagram",
      icon: Instagram,
      color: "text-pink-600",
      connectAction: () => alert("Instagram integration coming soon"),
      isAvailable: false
    },
    {
      name: "Twitter",
      icon: Twitter,
      color: "text-blue-400",
      connectAction: () => alert("Twitter integration coming soon"),
      isAvailable: false
    },
    {
      name: "Facebook",
      icon: Facebook,
      color: "text-blue-600",
      connectAction: () => alert("Facebook integration coming soon"),
      isAvailable: false
    },
    {
      name: "TikTok",
      icon: TikTok,
      color: "text-black",
      connectAction: () => signIn('tiktok', { callbackUrl: '/dashboard/social' }),
      isAvailable: true
    }
  ];

  if (isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">Loading accounts...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Connected Accounts</h2>
        {accounts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefreshAll}
            disabled={refreshingAll}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${refreshingAll ? 'animate-spin' : ''}`} />
            Refresh All
          </Button>
        )}
      </div>
      {accounts.map((account) => {
        const { icon: Icon, color } = getPlatformData(account.provider);
        const isConnected = account.status === 'active';
        const isEnabled = account.status !== 'disconnected';
        const lastSync = formatLastSync(account.last_sync_at);
        
        return (
          <div key={account.id} className="flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-medium">{account.provider.charAt(0).toUpperCase() + account.provider.slice(1)}</h3>
                <p className="text-sm text-muted-foreground">
                  {account.provider_username ? `@${account.provider_username}` : 'No username'}
                  {account.dataSource === 'real_api' && (
                    <span className="ml-2 text-xs inline-flex items-center text-green-600">
                      <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>
                      Real API
                    </span>
                  )}
                </p>
              </div>
            </div>

            <div className="ml-auto flex flex-col items-start gap-2 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Last synced: {lastSync}</span>
                {getStatusBadge(account.status)}
              </div>

              <div className="flex items-center gap-2">
                <Switch
                  checked={isEnabled}
                  onCheckedChange={(checked) => toggleAccountStatus(account.id, checked)}
                  disabled={account.status === "disconnected"}
                />
                <span className="text-sm">{isEnabled ? "Enabled" : "Disabled"}</span>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  title="Refresh connection"
                  onClick={() => handleRefresh(account.id)}
                  disabled={refreshingId === account.id}
                >
                  {refreshingId === account.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4" />
                  )}
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="text-destructive"
                      disabled={disconnectingId === account.id}
                    >
                      {disconnectingId === account.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Disconnect Account</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to disconnect your {account.provider} account? This will remove all
                        permissions and you'll need to reconnect to publish content to this platform.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-destructive-foreground"
                        onClick={() => handleDisconnect(account.id, account.provider)}
                      >
                        Disconnect
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        )
      })}

      {/* Available platforms to connect */}
      {platforms
        .filter(platform => platform.isAvailable)
        .map((platform, idx) => (
          <div key={`platform-${idx}`} className="flex flex-col gap-4 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${platform.color}`}>
                {/* Use capitalized component syntax */}
                {React.createElement(platform.icon, { className: "h-6 w-6" })}
              </div>
              <div>
                <h3 className="font-medium">{platform.name}</h3>
                <p className="text-sm text-muted-foreground">Not connected</p>
              </div>
            </div>

            <div className="ml-auto">
              <Button
                onClick={platform.connectAction}
                disabled={!platform.isAvailable || (platform.name === "YouTube" && isConnectingYouTube)}
              >
                Connect {platform.name}
              </Button>
            </div>
          </div>
        ))}

      <div className="rounded-lg border border-dashed p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <div className="rounded-full bg-muted p-3">
            <Plus className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-medium">Connect a new account</h3>
          <p className="mt-2 text-sm text-muted-foreground">Add more social media accounts to expand your reach</p>
          <div className="mt-4 flex flex-wrap gap-2 justify-center">
            {platforms.map((platform, idx) => (
                <Button
                  key={`connect-${idx}`}
                  onClick={platform.connectAction}
                  disabled={!platform.isAvailable}
                  variant={platform.isAvailable ? "default" : "outline"}
                  className="flex items-center gap-2"
                >
                  {/* Use capitalized component syntax */}
                  {React.createElement(platform.icon, { className: "h-4 w-4" })}
                  {platform.name}
                  {!platform.isAvailable && " (Coming Soon)"}
                </Button>
              ))}
          </div>
        </div>
      </div>
    </div>
  )
}
