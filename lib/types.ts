export interface Profile {
  id: string; username: string | null; full_name: string | null;
  college_slug: string | null; branch: string | null; graduation_year: number | null;
  bio: string | null; linkedin_url: string | null; instagram_url: string | null;
  is_alumni: boolean; verification_status: "verified" | "pending" | "unverified";
  avatar_url: string | null; created_at: string;
}
export interface EventRow {
  id: string; title: string; description: string | null; college_slug: string;
  type: string; event_date: string; registration_link: string | null;
  open_to_outsiders: boolean; posted_by: string; club_id: string | null; created_at: string;
}
export interface Club {
  id: string; name: string; slug: string; college_slug: string; type: string;
  description: string | null; logo_url: string | null;
  social_links: Record<string, string>; status: string; created_by: string; created_at: string;
}
export interface Question {
  id: string; title: string; body: string | null; college_tag: string;
  topic_tag: string; asked_by: string | null; created_at: string;
}
export interface Answer { id: string; question_id: string; body: string; answered_by: string; created_at: string; }
export interface Review { id: string; college_slug: string; reviewer_id: string; rating: number; body: string; review_type: string; created_at: string; }
export interface Photo { id: string; college_slug: string; uploader_id: string; url: string; caption: string | null; created_at: string; }
export interface CutoffData {
  college: string; slug: string;
  branches: { name: string; code: string; rounds: { year: number; round: number; category: string; opening: number; closing: number }[] }[];
}
