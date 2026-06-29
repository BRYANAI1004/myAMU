import type { User } from "@supabase/supabase-js";
import { getSupabaseAdminClient } from "./supabaseAdmin.js";

export async function findSupabaseAuthUserByEmail(
  email: string,
): Promise<User | null> {
  const admin = getSupabaseAdminClient();
  const target = email.trim().toLowerCase();
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find(
      (u) => (u.email ?? "").trim().toLowerCase() === target,
    );
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

/** Remove auth users that are not migrated students (synthetic email domain). */
export async function deleteNonStudentSupabaseAuthUsers(): Promise<number> {
  const admin = getSupabaseAdminClient();
  let page = 1;
  const perPage = 200;
  let deleted = 0;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    for (const user of data.users) {
      const email = (user.email ?? "").trim().toLowerCase();
      const meta = user.app_metadata as Record<string, unknown> | undefined;
      const isStudent =
        email.endsWith("@students.myamu.auth") || meta?.role === "student";
      if (!isStudent) {
        const { error: delErr } = await admin.auth.admin.deleteUser(user.id);
        if (delErr) throw delErr;
        deleted += 1;
      }
    }
    if (data.users.length < perPage) break;
    page += 1;
  }
  return deleted;
}

export async function upsertSupabaseAuthUserByEmail(input: {
  email: string;
  password: string;
  appMetadata: Record<string, unknown>;
  userMetadata?: Record<string, unknown>;
}): Promise<User> {
  const email = input.email.trim().toLowerCase();
  const admin = getSupabaseAdminClient();

  const created = await admin.auth.admin.createUser({
    email,
    password: input.password,
    email_confirm: true,
    app_metadata: input.appMetadata,
    user_metadata: input.userMetadata ?? {},
  });

  if (!created.error && created.data.user) {
    return created.data.user;
  }

  const msg = created.error?.message ?? "";
  const alreadyExists =
    msg.toLowerCase().includes("already") ||
    msg.toLowerCase().includes("registered") ||
    created.error?.status === 422;

  if (!alreadyExists) {
    throw created.error ?? new Error(`Failed to create Supabase auth user for ${email}.`);
  }

  const existing = await findSupabaseAuthUserByEmail(email);
  if (existing == null) {
    throw new Error(`Supabase auth user exists for ${email} but could not be loaded.`);
  }

  const updated = await admin.auth.admin.updateUserById(existing.id, {
    password: input.password,
    email_confirm: true,
    app_metadata: input.appMetadata,
    user_metadata: input.userMetadata ?? {},
  });
  if (updated.error) throw updated.error;
  if (!updated.data.user) {
    throw new Error(`Failed to update Supabase auth user for ${email}.`);
  }
  return updated.data.user;
}
