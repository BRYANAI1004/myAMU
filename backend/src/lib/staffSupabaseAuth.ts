import type { AdminJwtRole } from "./adminAuthToken.js";
import {
  getSupabaseAnonClient,
  isSupabaseConfigured,
} from "./supabaseAdmin.js";
import { upsertSupabaseAuthUserByEmail } from "./supabaseAuthCommon.js";

export type StaffSeedRow = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  role: AdminJwtRole;
};

export const STAFF_SEED_ROWS: readonly StaffSeedRow[] = [
  {
    displayName: "dr.Wu",
    username: "drwu",
    email: "drwu@alhambrahospital.com",
    password: "Welcome2026!",
    role: "admin",
  },
  {
    displayName: "dr. Jiang",
    username: "drjiang",
    email: "consult@amu.edu",
    password: "Jia@7g",
    role: "admin",
  },
  {
    displayName: "Lilian",
    username: "lilian",
    email: "cao@amu.edu",
    password: "Lil#6n",
    role: "admin",
  },
  {
    displayName: "Ms. Ma",
    username: "msma",
    email: "start@amu.edu",
    password: "MsM@5a",
    role: "admin",
  },
  {
    displayName: "Xiaoting",
    username: "xiaoting",
    email: "registrar@amu.edu",
    password: "Xia#8g",
    role: "admin",
  },
  {
    displayName: "Qiuyang",
    username: "qiuyang",
    email: "office@amu.edu",
    password: "Qiu@6g",
    role: "admin",
  },
  {
    displayName: "Megan",
    username: "megan",
    email: "director@amu.edu",
    password: "Meg#7n",
    role: "super_admin",
  },
  {
    displayName: "Dr.Chu",
    username: "kchu",
    email: "clinicdean@amu.edu",
    password: "Chu@7k",
    role: "clinical_admin",
  },
  {
    displayName: "Wenjing",
    username: "wenjing",
    email: "clinic@amu.edu",
    password: "Wen#8g",
    role: "clinical_admin",
  },
  {
    displayName: "Ariel",
    username: "ariel",
    email: "ariel@amu.edu",
    password: "Ariel@9l",
    role: "admin",
  },
  {
    displayName: "Ari",
    username: "ari",
    email: "wanpanelami@gmail.com",
    password: "Boss123!",
    role: "admin",
  },
  {
    displayName: "Bingchen",
    username: "bingchen",
    email: "bingchen.li@wanpanel.ai",
    password: "amu123",
    role: "admin",
  },
  {
    displayName: "Mona",
    username: "mona",
    email: "mona.weng@wanpanel.ai",
    password: "amu123",
    role: "admin",
  },
] as const;

export async function upsertStaffSupabaseAuthUser(row: StaffSeedRow): Promise<void> {
  await upsertSupabaseAuthUserByEmail({
    email: row.email,
    password: row.password,
    appMetadata: {
      account_type: "staff",
      staff_username: row.username,
      role: row.role,
    },
    userMetadata: {
      display_name: row.displayName,
    },
  });
}

export async function signInStaffWithSupabasePassword(
  email: string,
  password: string,
): Promise<boolean> {
  const anon = getSupabaseAnonClient();
  if (anon == null) return false;
  const { data, error } = await anon.auth.signInWithPassword({
    email: email.trim().toLowerCase(),
    password,
  });
  if (error || !data.session || !data.user) return false;
  const meta = data.user.app_metadata as Record<string, unknown> | undefined;
  return meta?.account_type === "staff";
}

export function supabaseStaffAuthEnabled(): boolean {
  return isSupabaseConfigured() && getSupabaseAnonClient() != null;
}
