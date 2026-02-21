import { NextRequest, NextResponse } from "next/server";
import { cacheGet } from "@/lib/cache";

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

  return new NextResponse(JSON.stringify(users, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        'attachment; filename="uganda_github_users.json"',
    },
  });
}
