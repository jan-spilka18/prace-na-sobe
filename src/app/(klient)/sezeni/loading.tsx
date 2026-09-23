import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen title="Sezení" subtitle="Zápisy z našich setkání">
      <LoadingLabel />
      <div className="space-y-2.5">
        <Bone className="mx-1 h-6 w-36" />
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Bone key={index} className="h-[124px] rounded-group" />
          ))}
        </div>
      </div>
    </Screen>
  );
}
