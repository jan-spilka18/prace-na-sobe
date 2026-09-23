import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

/**
 * Kostra pro všechny obrazovky adminu. Každá je jiná, ale všechny začínají
 * titulkem a pod ním kartami — pro pár set milisekund to stačí.
 */
export default function Loading() {
  return (
    <Screen title={<Bone className="h-9 w-40" />} subtitle={<Bone className="mt-2 h-4 w-28" />}>
      <LoadingLabel />
      <div className="space-y-5">
        <div className="h-24 rounded-group bg-night motion-safe:animate-pulse" />
        <Bone className="h-56 rounded-group" />
      </div>
    </Screen>
  );
}
