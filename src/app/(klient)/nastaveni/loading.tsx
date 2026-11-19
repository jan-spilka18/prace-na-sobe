import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen eyebrow={<Bone className="h-3 w-32" />} title="Nastavení">
      <LoadingLabel />
      <div className="space-y-5">
        <Bone className="h-24 rounded-group" />
        <Bone className="h-36 rounded-group" />
      </div>
    </Screen>
  );
}
