// ============================================================
// User Transformer — Open edX account → FE User type
// ============================================================

import type { UserAccount } from "@/api/types";
import type { User } from "@/data/types";
import { sanitizeUrlToRelative } from "./staticUrlRewriter";

/**
 * Transform Open edX account data into the FE User interface.
 */
export function transformUserAccount(
  account: UserAccount,
  extra?: { streak?: number; overallProgress?: number }
): User {
  // Try to get job title from extended profile
  const jobTitle = account.extended_profile?.find(
    (f) => f.field_name === "job_title"
  )?.field_value;

  return {
    name: account.name || account.username,
    role: jobTitle || "",
    joinDate: formatJoinDate(account.date_joined),
    avatar: sanitizeUrlToRelative(
      account.profile_image?.has_image
        ? account.profile_image.image_url_medium
        : null
    ),
    streak: extra?.streak ?? 0,
    overallProgress: extra?.overallProgress ?? 0,
  };
}

function formatJoinDate(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${month}/${year}`;
  } catch {
    return "";
  }
}
