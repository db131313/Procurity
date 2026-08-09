import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { findUserByEmail, verifyPassword } from "./users";

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
  },
  providers: [
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = String(credentials?.email ?? "").trim().toLowerCase();
        const password = String(credentials?.password ?? "");
        if (!email || !password) return null;

        const user = await findUserByEmail(email);
        if (!user) return null;
        const ok = await verifyPassword(user, password);
        if (!ok) return null;

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          plan: user.plan,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        const plan = (user as { plan?: "free" | "pro" }).plan ?? "free";
        token.plan = plan;
      }
      if (trigger === "update") {
        if (session?.plan === "free" || session?.plan === "pro") {
          token.plan = session.plan;
        } else if (token.email) {
          const fresh = await findUserByEmail(String(token.email));
          if (fresh) token.plan = fresh.plan;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.id ?? token.sub ?? "");
        session.user.plan = (token.plan as "free" | "pro") ?? "free";
        // Keep plan in sync for billing upgrades within the same browser session
        if (token.email) {
          const fresh = await findUserByEmail(String(token.email));
          if (fresh) session.user.plan = fresh.plan;
        }
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    "procurity-dev-secret-change-me",
});
