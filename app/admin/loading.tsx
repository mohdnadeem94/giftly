import ElfLoader from "@/components/ElfLoader";

export default function Loading() {
  return <ElfLoader messages={["Checking every charity…", "Counting payment holds…", "Getting the admin console ready…"]} />;
}
