import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTop20Sites } from "@/lib/intel";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const borough = searchParams.get("borough");
  const data = await getTop20Sites({ borough });

  // Free plan sees blurred-lite: still top 20 but contacts trimmed in UI via plan.
  return NextResponse.json({
    ...data,
    plan: session.user.plan,
  });
}
