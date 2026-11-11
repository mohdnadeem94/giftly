import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Finding causes that need you…", "Checking the wishlists twice…", "The Elf is helping you give…"]} />;
}
