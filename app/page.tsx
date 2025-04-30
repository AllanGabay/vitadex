'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, provider } from '../lib/firebaseClient';
import { signInWithPopup, onAuthStateChanged } from 'firebase/auth';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, user => {
      if (user) {
        router.replace('/dex');
      }
    });
    return unsubscribe;
  }, [router]);

  const handleSignIn = async () => {
    try {
      await signInWithPopup(auth, provider);
      router.replace('/dex');
    } catch (error) {
      console.error('Error signing in:', error);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen">
      <button
        onClick={handleSignIn}
        className="px-4 py-2 bg-blue-600 text-white rounded"
      >
        Se connecter avec Google
      </button>
    </div>
  );
} 