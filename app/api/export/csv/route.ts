import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache";
import { buildCsv } from "@/lib/csv";

export async function GET(request: NextRequest) {
  const runId = request.nextUrl.searchParams.get("runId");
  if (!runId) {
    return NextResponse.json(
      { error: "Missing runId query parameter" },
      { status: 400 }
    );
  }

  const users = cacheGet(runId);
  if (!users) {
    return NextResponse.json(
      { error: "Run not found or expired" },
      { status: 404 }
    );
  }

  const csv = buildCsv(users);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition":
        'attachment; filename="uganda_github_users.csv"',
    },
  });
}
