import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Prompt1, Prompt2, Prompt3, HtmlTemplate } from 'lib/prompts';
import { Buffer } from 'buffer';
import { adminDb } from 'lib/firebaseAdmin';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  console.log('⚡ analyzeScan start');
  // Debug: list available models for this API key
  try {
    const modelList = await openai.models.list();
    console.log('📦 Available models:', modelList.data.map(m => m.id));
  } catch (err) {
    console.error('❌ Failed to list models:', err);
  }
  const body = await req.json();
  console.log('🔍 Received body:', body);
  // Log size of base64 string
  console.log('📷 imageBase64 length:', body.imageBase64?.length);
  if (!process.env.OPENAI_API_KEY) {
    console.error('Missing OPENAI_API_KEY');
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }
  const { imageBase64, textDescription, latitude, longitude } = body;
  try {
    // Require either an image or text description, plus coords
    if ((imageBase64 == null && !textDescription) || latitude == null || longitude == null) {
      console.error('analyzeScan missing parameters', { imageBase64, textDescription, latitude, longitude });
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    // Step 0: build card ID and check existence in Firestore
    const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/(^-|-$)/g,'');
    // we will parse metadata next, so placeholder species until GPT returns
    // Step1: prepare GPT messages
    const messages: any[] = [
      { role: 'system', content: Prompt1 },
      { role: 'system', content: HtmlTemplate },
    ];
    if (textDescription) {
      messages.push({ role: 'user', content: textDescription });
    } else {
      console.log('🔄 Decoding image for GPT');
      const imgBuffer = Buffer.from(imageBase64!, 'base64');
      messages.push({ role: 'user', name: 'photo.jpg', content: imgBuffer });
    }
    // inclure les coordonnées GPS pour que GPT détermine le continent
    messages.push({
      role: 'user',
      content: `latitude: ${latitude}\nlongitude: ${longitude}`
    });
    // Step1: call GPT-4.1-nano with function spec_extract to get metadata + html_card
    console.log('🤖 Calling GPT-4.1-nano with spec_extract');
    const functionsSpec = [
      {
        name: 'spec_extract',
        description: 'Extraction des métadonnées naturalistes et génération du HTML de la carte',
        parameters: {
          type: 'object',
          properties: {
            nom_commun: { type: 'string' },
            nom_scientifique: { type: 'string' },
            categorie: {
              type: 'string',
              enum: [
                'Mammifère',
                'Oiseau',
                'Reptile',
                'Amphibien',
                'Poisson',
                'Insecte',
                'Arachnide',
                'Mollusque',
                'Crustacé',
                'Plante',
                'Champignon'
              ]
            },
            biome: {
              type: 'string',
              enum: [
                'Forêt',
                'Savane/Prairie',
                'Désert',
                'Montagne/Rocheux',
                'Eau douce',
                'Milieu marin',
                'Souterrain/Caverne',
                'Urbain',
                'Toundra/Polaire'
              ]
            },
            continent: { type: 'string' },
            traits: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
            taille_moyenne: { type: 'string' },
            esperance_vie: { type: 'string' },
            description_professionnelle: { type: 'string' },
            niveau_de_rarete: {
              type: 'string',
              enum: ['Commune', 'Peu commune', 'Rare', 'Légendaire']
            },
            html_card: { type: 'string' }
          },
          required: ['nom_commun','nom_scientifique','categorie','biome','continent','traits','taille_moyenne','esperance_vie','description_professionnelle','niveau_de_rarete','html_card']
        }
      }
    ];
    const gptResp = await openai.chat.completions.create({
      model: 'gpt-4.1-nano-2025-04-14',
      messages,
      functions: functionsSpec,
      function_call: { name: 'spec_extract' }
    });
    console.log('✅ GPT spec_extract response');
    const call = gptResp.choices?.[0]?.message?.function_call;
    if (!call || !call.arguments) {
      console.error('❌ No function_call in GPT response');
      return NextResponse.json({ error: 'No extraction data' }, { status: 500 });
    }
    let args;
    try {
      args = JSON.parse(call.arguments);
    } catch (e) {
      console.error('❌ Failed to parse function_call arguments', e);
      return NextResponse.json({ error: 'Bad extraction format' }, { status: 500 });
    }
    const { html_card, ...metadata } = args;
    // build unique ID: species_slug + continent
    const id = `${slugify(metadata.nom_commun)}_${metadata.continent}`;
    // Step0 re-check: if exists, return existing
    const snap = await adminDb.collection('vitadex').doc(id).get();
    if (snap.exists) {
      const docData = snap.data();
      return NextResponse.json({
        metadata: docData?.meta,
        bgBase64: docData?.background_b64,
        subjBase64: docData?.subject_b64,
        html_card: docData?.html_card,
        id
      });
    }

    // helper pour mapper continent en style pour DALL·E
      const continent_style = (c: string) => {
        switch (c) {
          case 'Afrique':
            return 'warm earthy tones';
          case 'Europe':
            return 'elegant watercolor';
          case 'Asie':
            return 'minimal ink lines';
          case 'Amérique du Nord':
            return '19th-century botanical';
          case 'Amérique du Sud':
            return 'lush rainforest palette';
          case 'Océanie':
            return 'vivid marine palette';
          case 'Antarctique':
            return 'icy desaturated hues';
          default:
            return 'fantasy naturalist';
        }
      };

    // Étape 2a : génération de l'arrière-plan via DALL·E
    const style = continent_style(metadata.continent);
    const bgPrompt = Prompt2
      .replace('{biome}', metadata.biome)
      .replace('{continent_style}', style);
    const bgResp = await openai.images.generate({
      model: 'dall-e-2',
      prompt: bgPrompt,
      n: 1,
      size: '256x256',
      response_format: 'b64_json'
    });
    if (!bgResp.data?.[0]?.b64_json) {
      return NextResponse.json({ error: 'Failed to generate background image' }, { status: 500 });
    }
    const bgBase64 = bgResp.data[0].b64_json;

    // Étape 2b : génération du sujet via DALL·E
    const subjPrompt = Prompt3
      .replace('{nom_commun}', metadata.nom_commun)
      .replace('{nom_scientifique}', metadata.nom_scientifique)
      .replace('{continent_style}', style);
    const subjResp = await openai.images.generate({
      model: 'dall-e-2',
      prompt: subjPrompt,
      n: 1,
      size: '256x256',
      response_format: 'b64_json'
    });
    if (!subjResp.data?.[0]?.b64_json) {
      return NextResponse.json({ error: 'Failed to generate subject image' }, { status: 500 });
    }
    const subjBase64 = subjResp.data[0].b64_json;

    // Step3: persist in Firestore
    await adminDb.collection('vitadex').doc(id).set({
      meta: metadata,
      background_b64: bgBase64,
      subject_b64: subjBase64,
      html_card,
      createdAt: new Date()
    }, { merge: true });
    return NextResponse.json({ id, metadata, bgBase64, subjBase64, html_card });
  } catch (err: any) {
    console.error('🔥 analyzeScan caught error:', err);
    const msg = err?.message || 'Internal error';
    return NextResponse.json({ error: msg }, { status: err.statusCode || 500 });
  }
} 
