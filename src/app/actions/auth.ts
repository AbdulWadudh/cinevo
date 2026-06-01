"use server";

import { createClient } from "@/lib/supabase/server";
import { getCurrentUser, getOrCreateProfile } from "@/lib/auth";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { getSiteURL } from "@/lib/site-url";

export interface AuthState {
  error?: string;
  message?: string;
  success?: boolean;
}

/** Email + password sign in. */
export async function signInWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const redirectTo = String(formData.get("redirect") || "/");

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { error: error.message };

  await getOrCreateProfile();
  revalidatePath("/", "layout");
  redirect(redirectTo);
}

/** Email + password sign up. */
export async function signUpWithPassword(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  if (password.length < 6) return { error: "Password must be at least 6 characters." };

  const siteUrl = getSiteURL(await headers());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${siteUrl}/auth/callback?next=/` },
  });
  if (error) return { error: error.message };

  // If email confirmation is enabled there is no session yet.
  if (!data.session) {
    return { message: "Check your email to confirm your account, then sign in." };
  }

  await getOrCreateProfile();
  revalidatePath("/", "layout");
  redirect("/");
}

/** Begin Google OAuth — redirects to Google's consent screen. */
export async function signInWithGoogle(formData: FormData): Promise<void> {
  const next = String(formData.get("redirect") || "/");
  const siteUrl = getSiteURL(await headers());
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect(`/login?error=${encodeURIComponent(error.message)}`);
  if (data.url) redirect(data.url);
}

/** Sign the user out and return to the login page. */
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

/** Lightweight profile info for the nav avatar (app source of truth). */
export async function getProfileBrief(): Promise<{ avatarUrl: string | null; initial: string } | null> {
  const profile = await getOrCreateProfile();
  if (!profile) return null;
  const name = profile.username || profile.email || "U";
  return { avatarUrl: profile.avatarUrl ?? null, initial: String(name).charAt(0).toUpperCase() };
}

/** Update the current user's profile (username + avatar URL). */
export async function updateProfile(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const username = String(formData.get("username") || "").trim();
  const avatarUrl = String(formData.get("avatarUrl") || "").trim();

  try {
    await db.profile.update({
      where: { id: user.id },
      data: {
        username: username || null,
        avatarUrl: avatarUrl || null,
      },
    });
    revalidatePath("/profile");
    revalidatePath("/", "layout");
    return { success: true, message: "Profile updated." };
  } catch (e) {
    console.error("Failed to update profile:", e);
    return { error: "Could not update profile." };
  }
}
