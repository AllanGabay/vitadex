'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { auth, db } from '../../lib/firebaseClient';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, query, where, getDocs } from 'firebase/firestore';

interface Card {
  id: string;
  nom_commun: string;
  subjectUrl: string;
}

export default function DexPage() {
  const [cards, setCards] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const q = query(collection(db, 'cards'), where('uid', '==', user.uid));
        const snapshot = await getDocs(q);
        const result: Card[] = snapshot.docs.map(doc => ({
          id: doc.id,
          nom_commun: (doc.data() as any).nom_commun,
          subjectUrl: (doc.data() as any).subjectUrl
        }));
        setCards(result);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement...</div>;
  }

  return (
    <div className="min-h-screen p-4 bg-gray-100">
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {cards.map(card => (
          <Link key={card.id} href={`/card/${card.id}`} className="block bg-white rounded shadow p-2">
            <img src={card.subjectUrl} alt={card.nom_commun} className="w-full h-32 object-cover rounded" />
            <p className="mt-2 text-center font-medium">{card.nom_commun}</p>
          </Link>
        ))}
      </div>
      <Link href="/scan" className="fixed bottom-6 right-6 bg-blue-600 p-4 rounded-full text-white shadow-lg">
        Scanner
      </Link>
    </div>
  );
} 