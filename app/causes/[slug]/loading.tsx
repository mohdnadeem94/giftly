import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Opening this cause's story…", "Counting gifts on their way…", "The Elf is helping you give…"]} />;
}
