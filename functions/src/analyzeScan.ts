import * as functions from 'firebase-functions';
import { Configuration, OpenAIApi } from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { Prompt1, Prompt2, Prompt3 } from '../../lib/prompts';
import { adminDb, adminStorage } from './firebaseAdmin';
import { FieldValue } from 'firebase-admin/firestore';
import { Buffer } from 'buffer';

const openai = new OpenAIApi(new Configuration({ apiKey: process.env.OPENAI_API_KEY! }));

export const analyzeScan = functions.https.onCall(async (data, context) => {
  const { uid, imageUrl, latitude, longitude } = data;
  if (!uid || !imageUrl || latitude == null || longitude == null) {
    throw new functions.https.HttpsError('invalid-argument', 'Missing required parameters');
  }

  // 1. Extraction via GPT-4o Vision
  const gptResponse = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: Prompt1 },
      { role: 'user', content: imageUrl }
    ]
  });
  let metadata: any;
  try {
    metadata = JSON.parse(gptResponse.choices[0].message.content);
  } catch (err) {
    throw new functions.https.HttpsError('internal', 'Failed to parse GPT response');
  }
  const { nom_commun, nom_scientifique, categorie, biome, traits, taille_moyenne, esperance_vie, description_professionnelle, niveau_de_rarete, continent } = metadata;

  // 2. Background PNG
  const bgResp = await openai.images.generate({
    prompt: Prompt2.replace('{continent}', continent).replace('{biome}', biome),
    n: 1,
    size: '400x250',
    response_format: 'b64_json'
  });
  const bgBuffer = Buffer.from(bgResp.data[0].b64_json!, 'base64');

  // 3. Sujet PNG
  const subjResp = await openai.images.generate({
    prompt: Prompt3.replace('{continent}', continent),
    n: 1,
    size: '400x250',
    response_format: 'b64_json'
  });
  const subjBuffer = Buffer.from(subjResp.data[0].b64_json!, 'base64');

  // 4. Upload images
  const cardId = uuidv4();
  const bucket = adminStorage.bucket();

  const bgFile = bucket.file(`${uid}/cards/${cardId}/background.png`);
  await bgFile.save(bgBuffer, { contentType: 'image/png' });
  const [backgroundUrl] = await bgFile.getSignedUrl({ action: 'read', expires: '03-01-2500' });

  const subjFile = bucket.file(`${uid}/cards/${cardId}/subject.png`);
  await subjFile.save(subjBuffer, { contentType: 'image/png' });
  const [subjectUrl] = await subjFile.getSignedUrl({ action: 'read', expires: '03-01-2500' });

  // 5. Firestore doc
  await adminDb.collection('cards').doc(cardId).set({
    uid,
    nom_commun,
    nom_scientifique,
    categorie,
    biome,
    traits,
    taille_moyenne,
    esperance_vie,
    description_professionnelle,
    niveau_de_rarete,
    backgroundUrl,
    subjectUrl,
    createdAt: FieldValue.serverTimestamp()
  });

  // 6. Return docId
  return { docId: cardId };
}); 