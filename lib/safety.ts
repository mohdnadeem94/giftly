// Child-safety filter for gift suggestions. Edit this list freely.
// A product is hidden if its title, description or brand contains any of these terms (whole words).

export const BLOCKED_TERMS: string[] = [
  // Weapons
  "gun", "guns", "handgun", "pistol", "rifle", "shotgun", "firearm", "firearms", "ammo", "ammunition",
  "airsoft", "bb gun", "pellet gun", "crossbow", "knife", "knives", "machete", "sword", "dagger", "switchblade",
  "brass knuckles", "taser", "stun gun", "pepper spray", "holster", "tactical", "scope mount",
  // Adult content
  "adult", "sexy", "lingerie", "erotic", "nsfw", "xxx", "sex", "nude", "bondage", "fetish", "condom", "vibrator",
  // Alcohol, tobacco, drugs
  "alcohol", "alcoholic", "beer", "wine", "vodka", "whiskey", "whisky", "rum", "tequila", "liquor", "cocktail",
  "cigarette", "cigar", "tobacco", "nicotine", "vape", "vaping", "e-cig", "hookah", "cbd", "thc", "cannabis",
  "marijuana", "kratom", "bong", "grinder",
  // Gambling and other unsafe items
  "casino", "gambling", "lottery", "fireworks", "lighter", "butane", "laser pointer",
];

const PATTERNS = BLOCKED_TERMS.map(
  (term) => new RegExp(`(^|[^a-z0-9])${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+")}($|[^a-z0-9])`, "i")
);

/** True when the text looks inappropriate for a child's gift. */
export function isUnsafeForChildren(text: string): boolean {
  const lower = text.toLowerCase();
  return PATTERNS.some((p) => p.test(lower));
}
