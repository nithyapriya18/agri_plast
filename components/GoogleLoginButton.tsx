'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { storeUserSession } from '@/lib/utils/userStorage';

declare const google: {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: { error?: string; access_token?: string }) => void;
      }) => { requestAccessToken: () => void };
    };
  };
};

interface GoogleLoginButtonProps {
  redirectTo?: string;
  onSuccess?: () => void;
}

export function GoogleLoginButton({ redirectTo = '/dashboard', onSuccess }: GoogleLoginButtonProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleGoogleClick = () => {
    setError(null);
    setIsLoading(true);

    if (typeof google === 'undefined') {
      setError('Google Sign-In script not loaded. Please refresh the page.');
      setIsLoading(false);
      return;
    }
    if (!clientId) {
      setError('Google Sign-In is not configured (missing NEXT_PUBLIC_GOOGLE_CLIENT_ID).');
      setIsLoading(false);
      return;
    }

    try {
      const tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: 'email profile openid',
        callback: async (response: { error?: string; access_token?: string }) => {
          if (response.error) {
            setError(`Login failed: ${response.error}`);
            setIsLoading(false);
            return;
          }
          if (!response.access_token) {
            setIsLoading(false);
            return;
          }
          try {
            const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
              headers: { Authorization: `Bearer ${response.access_token}` },
            });
            if (!userInfoRes.ok) throw new Error('Failed to fetch profile');
            const userInfo = await userInfoRes.json();
            const email = userInfo.email as string;
            const name = (userInfo.name as string) || email.split('@')[0];

            const apiRes = await fetch('/api/auth/getOrCreateUser', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email, name }),
            });
            const data = await apiRes.json();

            if (!apiRes.ok) {
              setError(data?.message || data?.error || 'Access denied.');
              setIsLoading(false);
              return;
            }
            if (!data.authorized || !data.user?.id) {
              setError('Access denied.');
              setIsLoading(false);
              return;
            }

            storeUserSession(email, data.user.id, name);
            onSuccess?.();
            // Full page navigation so the next request includes the cookie (middleware can see agriplast_user_id)
            window.location.href = redirectTo;
          } catch (err) {
            setError('Failed to verify user.');
            console.error(err);
          }
          setIsLoading(false);
        },
      });
      tokenClient.requestAccessToken();
    } catch (err) {
      setError('Failed to start Google Sign-In.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleGoogleClick}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        {isLoading ? 'Signing in...' : 'Sign in with Google'}
      </button>
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
