// Use only donor-approved display names; mask contact details even if typed into the name field.
export function publicDonorLabel(donor: { displayName: string; anonymous: boolean } | null): string {
  if (!donor) return "Guest";
  if (donor.anonymous) return "Anonymous";
  const name = donor.displayName.trim();
  return !name || name.includes("@") || /(?:\d[\s()+.-]*){7,}/.test(name) ? "Donor" : name;
}
