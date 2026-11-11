import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Finding your gifts…", "Checking where each one is…", "Opening your thank-you notes…"]} />;
}
