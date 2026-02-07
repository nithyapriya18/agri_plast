'use client';

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          {/* Copyright */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            © 2026 <span className="font-semibold text-gray-900 dark:text-white">PetaSight</span>.
            All rights reserved.
          </div>

          {/* Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              href="/contact"
              className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Product Info */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Powered by <span className="font-semibold text-blue-600 dark:text-blue-400">SiteSense</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
