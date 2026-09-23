import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen title="Přehled" subtitle={<Bone className="mt-2 h-4 w-32" />}>
      <LoadingLabel />
      <div className="space-y-5">
        <Bone className="h-[150px] rounded-group" />
        <div className="flex gap-5 px-1">
          <Bone className="h-14 flex-1" />
          <Bone className="h-14 flex-1" />
        </div>
        <Bone className="h-[420px] rounded-group" />
      </div>
    </Screen>
  );
}
