// src/app/api/analyze-document/route.ts
import { NextRequest } from 'next/server';
import axios from 'axios';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}

export async function POST(req: NextRequest) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { documentId, fileUrl } = await req.json();

    if (!documentId || !fileUrl) {
      return new Response(JSON.stringify({ error: "Missing documentId or fileUrl" }), {
        status: 400,
        headers,
      });
    }

    console.log(`📥 Starting analysis for document: ${documentId}`);

    // 1. Download PDF
    const pdfResponse = await axios.get(fileUrl, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(pdfResponse.data);

    const pdf = (await import('pdf-parse')).default;

    // 2. Extract text
    const pdfData = await pdf(buffer);
    const textContent = pdfData.text.trim();
    console.log("📄 Extracted Text Preview:", textContent.slice(0, 300));

    // 3. Ask GPT
    const gptPrompt = `
Extract the following structured data from this personal injury report:
- Client Name
- Date of Accident
- Injuries
- Treatments
- Medical Providers
- Total Medical Expenses

Return the output as valid JSON with keys:
client_name, date_of_accident, injuries, treatments, medical_providers, total_medical_expenses

Text:
${textContent}
`;

    const gptResponse = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [{ role: 'user', content: gptPrompt }],
    });

    const rawOutput = gptResponse.choices[0].message.content?.trim() || '';
    console.log("🤖 GPT Raw Output:", rawOutput);

    type ExtractedData = {
  client_name?: string;
  date_of_accident?: string;
  injuries?: string[];
  treatments?: string[];
  medical_providers?: string[];
  total_medical_expenses?: string;
  summary?: string; // fallback case
};

    let extractedData: ExtractedData;

    try {
      extractedData = JSON.parse(rawOutput);
    } catch {
      console.warn("⚠️ GPT output was not valid JSON.");
      extractedData = { summary: rawOutput };
    }

    // 4. Save to Supabase
    const updateRes = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`, {
      method: 'PATCH',
      headers: {
        'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
        'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      },
      body: JSON.stringify({
        analysis_status: 'completed',
        analyzed_at: new Date().toISOString(),
        extracted_data: extractedData,
      }),
    });

    if (!updateRes.ok) {
      const errorText = await updateRes.text();
      console.error("❌ Supabase update failed:", errorText);
      return new Response(JSON.stringify({ error: "Failed to update document" }), {
        status: 500,
        headers,
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers,
    });
  } catch (err: unknown) {
    console.error("❌ /api/analyze-document error:", err);

    // Optional: mark the document as failed in Supabase
    const { documentId } = await req.json().catch(() => ({}));
    if (documentId) {
      await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`, {
        method: 'PATCH',
        headers: {
          'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY!,
          'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ analysis_status: 'failed' }),
      });
    }

    return new Response(JSON.stringify({ error: "Internal error during analysis" }), {
      status: 500,
      headers,
    });
  }
}
