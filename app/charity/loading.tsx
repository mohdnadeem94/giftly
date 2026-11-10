import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Gathering incoming gifts…", "Sorting the gift list…", "Getting the dashboard ready…"]} />;
}
