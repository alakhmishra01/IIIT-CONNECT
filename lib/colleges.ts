export interface College {
  name: string;
  slug: string;
  emailSuffix: string;
  location: string;
  established: number;
}

export const COLLEGES: College[] = [
  // ── Independently Funded IIITs ──
  { name: "IIIT Hyderabad", slug: "iiit-hyderabad", emailSuffix: "iiit.ac.in", location: "Hyderabad, Telangana", established: 1998 },
  { name: "IIIT Bangalore", slug: "iiit-bangalore", emailSuffix: "iiitb.ac.in", location: "Bangalore, Karnataka", established: 1999 },
  { name: "IIIT Allahabad", slug: "iiit-allahabad", emailSuffix: "iiita.ac.in", location: "Prayagraj, Uttar Pradesh", established: 1999 },
  { name: "IIIT Delhi", slug: "iiit-delhi", emailSuffix: "iiitd.ac.in", location: "New Delhi", established: 2008 },
  { name: "ABV-IIITM Gwalior", slug: "iiitm-gwalior", emailSuffix: "iiitm.ac.in", location: "Gwalior, Madhya Pradesh", established: 1997 },
  { name: "IIITDM Jabalpur", slug: "iiitdm-jabalpur", emailSuffix: "iiitdmj.ac.in", location: "Jabalpur, Madhya Pradesh", established: 2005 },
  { name: "IIITDM Kancheepuram", slug: "iiitdm-kancheepuram", emailSuffix: "iiitdm.ac.in", location: "Chennai, Tamil Nadu", established: 2007 },

  // ── PPP Model IIITs (Public-Private Partnership) ──
  { name: "IIIT Sri City", slug: "iiit-sricity", emailSuffix: "iiits.in", location: "Sri City, Andhra Pradesh", established: 2013 },
  { name: "IIIT Guwahati", slug: "iiit-guwahati", emailSuffix: "iiitg.ac.in", location: "Guwahati, Assam", established: 2013 },
  { name: "IIIT Vadodara", slug: "iiit-vadodara", emailSuffix: "iiitvadodara.ac.in", location: "Vadodara, Gujarat", established: 2013 },
  { name: "IIIT Kota", slug: "iiit-kota", emailSuffix: "iiitkota.ac.in", location: "Kota, Rajasthan", established: 2013 },
  { name: "IIIT Tiruchirappalli", slug: "iiit-trichy", emailSuffix: "iiitt.ac.in", location: "Tiruchirappalli, Tamil Nadu", established: 2013 },
  { name: "IIIT Una", slug: "iiit-una", emailSuffix: "iiitu.ac.in", location: "Una, Himachal Pradesh", established: 2014 },
  { name: "IIIT Sonepat", slug: "iiit-sonepat", emailSuffix: "iiitsonepat.ac.in", location: "Sonepat, Haryana", established: 2014 },
  { name: "IIIT Kalyani", slug: "iiit-kalyani", emailSuffix: "iiitkalyani.ac.in", location: "Kalyani, West Bengal", established: 2014 },
  { name: "IIIT Lucknow", slug: "iiit-lucknow", emailSuffix: "iiitl.ac.in", location: "Lucknow, Uttar Pradesh", established: 2015 },
  { name: "IIIT Dharwad", slug: "iiit-dharwad", emailSuffix: "iiitdwd.ac.in", location: "Dharwad, Karnataka", established: 2015 },
  { name: "IIIT Kurnool", slug: "iiit-kurnool", emailSuffix: "iiitk.ac.in", location: "Kurnool, Andhra Pradesh", established: 2015 },
  { name: "IIIT Manipur", slug: "iiit-manipur", emailSuffix: "iiitmanipur.ac.in", location: "Imphal, Manipur", established: 2015 },
  { name: "IIIT Nagpur", slug: "iiit-nagpur", emailSuffix: "iiitn.ac.in", location: "Nagpur, Maharashtra", established: 2016 },
  { name: "IIIT Pune", slug: "iiit-pune", emailSuffix: "iiitp.ac.in", location: "Pune, Maharashtra", established: 2016 },
  { name: "IIIT Ranchi", slug: "iiit-ranchi", emailSuffix: "iiitranchi.ac.in", location: "Ranchi, Jharkhand", established: 2016 },
  { name: "IIIT Surat", slug: "iiit-surat", emailSuffix: "iiitsurat.ac.in", location: "Surat, Gujarat", established: 2017 },
  { name: "IIIT Bhopal", slug: "iiit-bhopal", emailSuffix: "iiitbhopal.ac.in", location: "Bhopal, Madhya Pradesh", established: 2017 },
  { name: "IIIT Bhagalpur", slug: "iiit-bhagalpur", emailSuffix: "iiitbh.ac.in", location: "Bhagalpur, Bihar", established: 2017 },
  { name: "IIIT Agartala", slug: "iiit-agartala", emailSuffix: "iiitamta.ac.in", location: "Agartala, Tripura", established: 2018 },
  { name: "IIIT Raichur", slug: "iiit-raichur", emailSuffix: "iiitr.ac.in", location: "Raichur, Karnataka", established: 2019 },
  // NOTE: Verify email domains before production — some PPP IIITs may use different suffixes
];

export const EVENT_TYPES = ["Hackathon", "Cultural Fest", "Workshop", "Seminar", "Sports", "Other"] as const;
export const CLUB_TYPES = ["Technical", "Cultural", "Sports", "Literary", "Social", "Other"] as const;
export const TOPIC_TAGS = ["Academics", "Hostel", "Placements", "Clubs", "Counselling", "Campus Life", "Other"] as const;
export const REVIEW_TYPES = ["Hostel", "Mess", "Infrastructure", "Campus Life"] as const;
export const CATEGORIES = ["OPEN", "OBC-NCL", "SC", "ST", "EWS", "OPEN-PwD"] as const;

export function detectCollegeFromEmail(email: string): College | null {
  const lower = email.toLowerCase();
  return COLLEGES.find(
    (c) => lower.endsWith(`@${c.emailSuffix}`) || lower.endsWith(`.${c.emailSuffix}`)
  ) ?? null;
}

export function getCollege(slug: string): College | null {
  return COLLEGES.find((c) => c.slug === slug) ?? null;
}
