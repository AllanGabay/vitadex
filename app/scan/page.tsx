'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import exifr from 'exifr';

export default function ScanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [exifCoords, setExifCoords] = useState<{ latitude: number; longitude: number } | null>(null);
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
      exifr.gps(imageFile)
        .then(({ latitude, longitude }) => {
          if (latitude != null && longitude != null) {
            setExifCoords({ latitude, longitude });
          } else {
            setExifCoords(null);
            console.warn('Aucune coordonnée GPS dans l’image');
          }
        })
        .catch(err => {
          setExifCoords(null);
          console.error('Erreur EXIF GPS:', err);
        });
    }
  }, [imageFile]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!imageFile || !exifCoords || !user) return;
    setLoading(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const { latitude, longitude } = exifCoords;
        const res = await fetch('/api/analyzeScan', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: base64,
            latitude,
            longitude
          })
        });
        const data = await res.json();
        if (!res.ok) {
          console.error('AnalyseScan API error:', data.error || res.status);
          alert(`Erreur d'analyse : ${data.error || res.status}`);
          setLoading(false);
          return;
        }
        const { metadata, bgBase64, subjBase64 } = data;
        const docRef = await addDoc(collection(db, 'cards'), {
          uid: user.uid,
          ...metadata,
          backgroundUrl: `data:image/png;base64,${bgBase64}`,
          subjectUrl: `data:image/png;base64,${subjBase64}`,
          createdAt: serverTimestamp()
        });
        router.push(`/card/${docRef.id}`);
      };
      reader.readAsDataURL(imageFile);
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