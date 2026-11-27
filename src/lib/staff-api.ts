import type { AdminRole } from "@/lib/admin-access";
import { db } from "@/lib/products-api";
import {
  changeStaffRole,
  inviteStaff,
  setStaffActive,
  type StaffResult,
} from "@/lib/staff.functions";

export interface StaffMember {
  user_id: string;
  email: string;
  role: AdminRole;
  is_active: boolean;
  created_at: string;
  last_sign_in_at: string | null;
  accepted: boolean;
}

export const STAFF_KEY = ["admin-staff"] as const;

/** Owner-only: the list_staff() database function rejects every other role. */
export async function fetchStaff(): Promise<StaffMember[]> {
  const { data, error } = await db.rpc("list_staff");
  if (error) throw error;
  return data as StaffMember[];
}

function unwrap<T extends object>(result: StaffResult<T>): T {
  if (!result.ok) throw new Error(result.error);
  return result;
}

export const invite = async (email: string, role: "manager" | "staff") =>
  unwrap(await inviteStaff({ data: { email, role } }));
export const changeRole = async (userId: string, role: "manager" | "staff") =>
  unwrap(await changeStaffRole({ data: { userId, role } }));
export const setActive = async (userId: string, active: boolean) =>
  unwrap(await setStaffActive({ data: { userId, active } }));
