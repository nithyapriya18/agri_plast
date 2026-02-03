'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getUserSession } from '@/lib/utils/userStorage';
import { Loader2 } from 'lucide-react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const session = getUserSession();
    if (session) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 dark:from-gray-900 dark:to-gray-800 transition-colors">
      <div className="text-center">
        <Loader2 className="w-12 h-12 animate-spin text-green-600 dark:text-green-400 mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-300 transition-colors">Loading Agriplast...</p>
      </div>
    </div>
  );
}
