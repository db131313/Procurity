"use server";

import { AuthError } from "next-auth";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn } from "@/lib/auth";
import { createUser } from "@/lib/users";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signupSchema = credentialsSchema.extend({
  name: z.string().min(2).max(80),
});

export type AuthFormState = {
  error?: string;
  ok?: boolean;
};

export async function loginAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter a valid email and password (8+ characters)." };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/map",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password." };
    }
    throw error;
  }

  return { ok: true };
}

export async function signupAction(
  _prev: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "Name, valid email, and password (8+ characters) are required.",
    };
  }

  try {
    await createUser(parsed.data);
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : "Could not create account. Try again.",
    };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirectTo: "/map",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect("/signin?created=1");
    }
    throw error;
  }

  return { ok: true };
}
