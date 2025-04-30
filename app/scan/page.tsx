'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, storage, functions } from '../../lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { httpsCallable } from 'firebase/functions';
import { v4 as uuidv4 } from 'uuid';

export default function ScanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const captureInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (!u) {
        router.replace('/');
      } else {
        setUser(u);
      }
    });
    return () => unsubscribe();
  }, [router]);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setPreviewUrl(url);
    }
  }, [imageFile]);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        setLocation({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      });
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !location || !user) return;
    setLoading(true);
    try {
      const rawId = uuidv4();
      const storageRef = ref(storage, `${user.uid}/raw/${rawId}.jpg`);
      await uploadBytes(storageRef, imageFile);
      const imageUrl = await getDownloadURL(storageRef);
      const analyzeFn = httpsCallable(functions, 'analyzeScan');
      const result = await analyzeFn({
        uid: user.uid,
        imageUrl,
        latitude: location.latitude,
        longitude: location.longitude
      });
      const docId = (result.data as any).docId;
      router.push(`/card/${docId}`);
    } catch (error) {
      console.error('Erreur lors de l\'analyse :', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="flex flex-col items-center space-y-4">
        <div className="space-x-2">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded"
            onClick={() => captureInputRef.current?.click()}
          >
            Prendre une photo
          </button>
          <button
            className="px-4 py-2 bg-gray-600 text-white rounded"
            onClick={() => galleryInputRef.current?.click()}
          >
            Choisir depuis la galerie
          </button>
        </div>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          ref={captureInputRef}
          onChange={handleFileChange}
        />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={galleryInputRef}
          onChange={handleFileChange}
        />
        {previewUrl && (
          <img src={previewUrl} alt="Aperçu" className="w-full max-w-sm rounded" />
        )}
        <button
          className="px-4 py-2 bg-green-600 text-white rounded"
          onClick={handleAnalyze}
          disabled={!imageFile || loading}
        >
          {loading ? 'Analyse en cours...' : 'Analyser'}
        </button>
      </div>
    </div>
  );
} 