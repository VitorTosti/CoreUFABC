/**
 * Supabase Auth client using the official SDK.
 * Used only for authentication (Google OAuth).
 * Data fetching still uses the thin REST client in supabase.js.
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

/**
 * Sign in with Google OAuth.
 * Restricts to @aluno.ufabc.edu.br and @ufabc.edu.br domains via hd hint.
 */
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: window.location.origin,
      queryParams: {
        hd: "aluno.ufabc.edu.br", // hint: prefer UFABC student accounts
      },
    },
  });
  if (error) throw new Error(error.message);
}

/**
 * Sign out the current user.
 */
export async function signOut() {
  await supabase.auth.signOut();
}

/**
 * Get the current session (null if not logged in).
 */
export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}

/**
 * Subscribe to auth state changes.
 * Returns the unsubscribe function.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session);
  });
  return () => data.subscription.unsubscribe();
}

/**
 * Extract RA from a UFABC email address.
 * e.g. "11202600000@aluno.ufabc.edu.br" → "11202600000"
 * Returns null if email is not a UFABC student email.
 */
export function extractRaFromEmail(email) {
  if (!email) return null;
  const match = email.match(/^(\d{8,14})@aluno\.ufabc\.edu\.br$/i);
  return match ? match[1] : null;
}

/**
 * Returns true if the email belongs to UFABC (student or staff).
 */
export function isUfabcEmail(email) {
  return Boolean(email?.match(/@(aluno\.)?ufabc\.edu\.br$/i));
}
