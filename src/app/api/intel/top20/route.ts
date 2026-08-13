import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTop20Sites } from "@/lib/intel";

export async function GET(request: Request) {
  const session = await auth();
  const { searchParams } = new URL(request.url);
  const borough = searchParams.get("borough");
  const data = await getTop20Sites({ borough });

  return NextResponse.json({
    ...data,
    plan: session?.user?.plan ?? "free",
  });
}
