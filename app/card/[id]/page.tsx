// @ts-nocheck
// eslint-disable
'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../../lib/firebaseClient';

export const dynamic = 'force-dynamic';

export default function CardPage() {
  const { id } = useParams();
  const router = useRouter();
  const [card, setCard] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, 'cards', id))
      .then(snap => {
        if (!snap.exists()) {
          router.replace('/dex');
        } else {
          setCard(snap.data());
        }
      })
      .catch(err => {
        console.error(err);
        router.replace('/dex');
      })
      .finally(() => setLoading(false));
  }, [id, router]);

  useEffect(() => {
    if (!card) return;
    const {
      nom_commun,
      nom_scientifique,
      categorie,
      biome,
      traits,
      description_professionnelle,
      backgroundUrl,
      subjectUrl
    } = card;
    const canvas = document.getElementById('c') as HTMLCanvasElement;
    const dlBtn = document.getElementById('dl') as HTMLButtonElement;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const bg = new Image(); bg.src = backgroundUrl;
    const sub = new Image(); sub.src = subjectUrl;

    // helpers
    function roundRect(x: number, y: number, w: number, h: number, r: number) {
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.arcTo(x + w, y, x + w, y + h, r);
      ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r);
      ctx.arcTo(x, y, x + w, y, r);
      ctx.closePath();
      return ctx!;
    }
    function wrap(text: string, x: number, y: number, maxW: number, lineHeight: number) {
      let words = text.split(' ');
      let line = '';
      let yy = y;
      for (const wd of words) {
        const test = line + wd + ' ';
        if (ctx.measureText(test).width > maxW) {
          ctx.fillText(line, x, yy);
          line = wd + ' ';
          yy += lineHeight;
        } else {
          line = test;
        }
      }
      ctx.fillText(line, x, yy);
    }

    Promise.all([
      new Promise<void>(res => { bg.onload = () => res(); }),
      new Promise<void>(res => { sub.onload = () => res(); })
    ]).then(() => {
      // draw background
      ctx.fillStyle = '#0d1b2a';
      ctx.fillRect(0, 0, 400, 640);
      // draw images
      ctx.drawImage(bg, 0, 0, 400, 250);
      ctx.drawImage(sub, 0, 0, 400, 250);

      // badge
      ctx.fillStyle = '#FFD700';
      roundRect(20, 20, 100, 32, 8).fill();
      ctx.font = 'bold 14px Poppins';
      ctx.fillStyle = '#2f4858';
      ctx.fillText('Rencontré', 30, 42);

      // catégorie | biome
      ctx.textAlign = 'right';
      ctx.font = 'bold 14px Poppins';
      ctx.fillStyle = '#fff';
      ctx.fillText(`${categorie} | ${biome}`, 380, 42);
      ctx.textAlign = 'left';

      // noms
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px Poppins';
      ctx.fillStyle = '#fff';
      ctx.fillText(nom_commun, 200, 310);
      ctx.font = 'italic 18px Cormorant Garamond';
      ctx.fillStyle = '#c0d6df';
      ctx.fillText(nom_scientifique, 200, 335);

      // separator line
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.beginPath();
      ctx.moveTo(100, 345);
      ctx.lineTo(300, 345);
      ctx.stroke();

      // traits icons
      const icons = ['☀️', '🌊', '👥', '🍽️'];
      traits.forEach((t: string, i: number) => {
        ctx.font = '24px sans-serif';
        ctx.fillText(icons[i], 75 + i * 80, 380);
      });
      traits.forEach((t: string, i: number) => {
        ctx.font = '12px Poppins';
        ctx.fillText(t, 75 + i * 80, 405);
      });

      // description
      ctx.font = '14px Poppins';
      ctx.fillStyle = '#d0e1e7';
      wrap(description_professionnelle, 200, 440, 380, 20);

      // ID & signature
      ctx.textAlign = 'left';
      ctx.font = '12px Poppins';
      ctx.fillStyle = '#9db4c0';
      ctx.fillText(`ID: ${id}`, 20, 620);
      ctx.textAlign = 'right';
      ctx.fillText('VitaDex', 380, 620);
    });

    // download
    if (dlBtn) {
      dlBtn.onclick = () => {
        const a = document.createElement('a');
        a.download = `${card.nom_commun}_VitaDex.jpg`;
        a.href = canvas.toDataURL('image/jpeg', 0.92);
        a.click();
      };
    }
  }, [card]);

  if (loading) {
    return <div className="flex items-center justify-center h-screen">Chargement carte...</div>;
  }
  if (!card) return null;

  return (
    <>
      {/* Load fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;700&family=Cormorant+Garamond:ital,wght@1,400&display=swap"
        rel="stylesheet"
      />
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0d1b2a] gap-5">
        <canvas
          id="c"
          width={400}
          height={640}
          style={{ borderRadius: '24px', boxShadow: '0 8px 16px rgba(0,0,0,.7)' }}
        />
        <button
          id="dl"
          className="px-5 py-2 text-white bg-[#4CAF50] rounded-lg hover:bg-[#45a049] transition"
        >
          Télécharger la carte
        </button>
      </div>
    </>
  );
} 