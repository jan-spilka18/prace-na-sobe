import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen title="Nastavení">
      <LoadingLabel />
      <div className="space-y-5">
        <Bone className="h-24 rounded-group" />
        <Bone className="h-36 rounded-group" />
      </div>
    </Screen>
  );
}
