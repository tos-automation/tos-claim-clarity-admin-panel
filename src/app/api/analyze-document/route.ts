import { NextRequest } from 'next/server';

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
  try {
    const { documentId, fileUrl } = await req.json();

    if (!documentId || !fileUrl) {
      return new Response(JSON.stringify({ error: "Missing documentId or fileUrl" }), {
        status: 400,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      });
    }

    // 🧠 TODO: replace this with actual PDF parsing and OpenAI logic
    const fakeExtractedData = {
      summary: "This is a placeholder summary extracted from the PDF.",
    };

    // 🧠 Update the Supabase document record
    const res = await fetch(`${process.env.SUPABASE_URL}/rest/v1/documents?id=eq.${documentId}`, {
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
        extracted_data: fakeExtractedData,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("❌ Supabase update failed:", errorText);
      return new Response(JSON.stringify({ error: "Failed to update document" }), {
        status: 500,
        headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error("❌ /api/analyze-document error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' },
    });
  }
}
