import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <Screen
      title={<Bone className="h-9 w-52" />}
      subtitle={<Bone className="mt-2 h-4 w-36" />}
      back={{ href: "/sezeni", label: "Sezení" }}
    >
      <LoadingLabel />
      <Bone className="h-[420px] rounded-group" />
    </Screen>
  );
}
