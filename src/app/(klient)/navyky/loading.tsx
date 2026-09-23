import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen title="Návyky">
      <LoadingLabel />
      <div className="space-y-2">
        {Array.from({ length: 4 }, (_, index) => (
          <Bone key={index} className="h-16 rounded-group" />
        ))}
      </div>
    </Screen>
  );
}
