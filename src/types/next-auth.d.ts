import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface User {
    plan?: "free" | "pro";
  }

  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      plan: "free" | "pro";
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    plan?: "free" | "pro";
  }
}
