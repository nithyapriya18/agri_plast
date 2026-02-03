'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { ThemeToggle } from '@/components/ThemeToggle';
import { GoogleLoginButton } from '@/components/GoogleLoginButton';

function LoginContent() {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirectTo') || '/dashboard';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 px-4 transition-colors">
      <div className="max-w-md w-full">
        <div className="flex justify-end mb-4">
          <ThemeToggle />
        </div>

        <div className="text-center mb-8">
          <div className="inline-block p-3 bg-green-600 dark:bg-green-700 rounded-2xl mb-4 transition-colors">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 transition-colors">Agriplast</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-2 transition-colors">AI-powered polyhouse planning</p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 transition-colors border border-transparent dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6 transition-colors">Log in to your account</h2>
          <GoogleLoginButton redirectTo={redirectTo} />
        </div>

        <p className="text-center text-sm text-gray-600 dark:text-gray-400 mt-6 transition-colors">
          © 2024 Agriplast. All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-green-600" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
