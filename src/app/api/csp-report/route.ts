import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.warn(
      JSON.stringify({
        event: "csp.violation",
        blockedUri: body["csp-report"]?.["blocked-uri"],
        violatedDirective: body["csp-report"]?.["violated-directive"],
        documentUri: body["csp-report"]?.["document-uri"],
        timestamp: new Date().toISOString(),
      }),
    );
  } catch {
    // Malformed CSP report — ignore
  }
  return new NextResponse(null, { status: 204 });
}
