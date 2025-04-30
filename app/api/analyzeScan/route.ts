import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { Buffer } from 'buffer';
import { Prompt1, Prompt2, Prompt3 } from '../../../lib/prompts';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function POST(req: Request) {
  const { imageBase64, latitude, longitude } = await req.json();
  if (!imageBase64 || latitude == null || longitude == null) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  // 1. Extraction via GPT-4o Vision
  const imgBuffer = Buffer.from(imageBase64, 'base64');
  const gptResp = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: Prompt1 },
      { role: 'user', content: imgBuffer }
    ]
  });
  const content = gptResp.choices?.[0]?.message?.content;
  if (!content) {
    return NextResponse.json({ error: 'Empty GPT response' }, { status: 500 });
  }
  let metadata: any;
  try {
    metadata = JSON.parse(content);
  } catch {
    return NextResponse.json({ error: 'Invalid GPT JSON' }, { status: 500 });
  }

  // 2. Background PNG
  const bgResp = await openai.images.generate({
    prompt: Prompt2.replace('{continent}', metadata.continent).replace('{biome}', metadata.biome),
    n: 1,
    size: '400x250',
    response_format: 'b64_json'
  });
  const bgBase64 = bgResp.data[0].b64_json!;

  // 3. Sujet PNG
  const subjResp = await openai.images.generate({
    prompt: Prompt3.replace('{continent}', metadata.continent),
    n: 1,
    size: '400x250',
    response_format: 'b64_json'
  });
  const subjBase64 = subjResp.data[0].b64_json!;

  return NextResponse.json({ metadata, bgBase64, subjBase64 });
} 