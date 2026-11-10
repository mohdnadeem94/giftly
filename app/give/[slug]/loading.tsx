import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Getting your gift ready…", "Checking today's wishlist…", "The Elf is helping you give…"]} />;
}
