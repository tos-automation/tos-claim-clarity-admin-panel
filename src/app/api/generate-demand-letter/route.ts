// app/api/generate-demand-letter/route.ts
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { caseSummary } = body;

  if (!caseSummary) {
    return new Response(JSON.stringify({ error: 'Missing case summary' }), { status: 400 });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: `Write a legal demand letter:\n\n${caseSummary}` }],
    });

    const draft = completion.choices[0].message?.content;
    return new Response(JSON.stringify({ draft }), { status: 200 });
  } catch (error) {
    console.error(error);
    return new Response(JSON.stringify({ error: 'Failed to generate letter' }), { status: 500 });
  }
}
