export function getYearLevel(graduationYear: number | null): number {
  if (!graduationYear) return 0;
  const now = new Date();
  const academicYear = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const admissionYear = graduationYear - 4;
  return Math.max(1, Math.min(4, academicYear - admissionYear + 1));
}

export function getYearLabel(level: number): string {
  if (level <= 0) return 'Guest';
  if (level >= 5) return 'Alumni';
  const labels = ['', '1st Year', '2nd Year', '3rd Year', '4th Year'];
  return labels[level];
}

export function isSenior(graduationYear: number | null): boolean {
  return getYearLevel(graduationYear) >= 3;
}
