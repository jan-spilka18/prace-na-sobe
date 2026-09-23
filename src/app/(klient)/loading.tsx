import { Screen } from "@/components/ui/Screen";
import { Bone, LoadingLabel } from "@/components/ui/Skeleton";

/**
 * Obrazovka Dnes, než dorazí data.
 *
 * Ukáže se hned po klepnutí — dřív se po klepnutí nedělo nic, dokud server
 * neodpověděl, a appka působila zamrzle. Titulek je kostra, ne „Dnes":
 * stejná obrazovka slouží i pro včerejšek a starší dny.
 */
export default function Loading() {
  return (
    <Screen title={<Bone className="h-9 w-28" />} subtitle={<Bone className="mt-2 h-4 w-40" />}>
      <LoadingLabel />
      <div className="space-y-4">
        <div className="flex justify-between gap-1">
          {Array.from({ length: 7 }, (_, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1.5 py-1">
              <Bone className="h-3 w-5" />
              <Bone className="h-10 w-10 rounded-full" />
            </div>
          ))}
        </div>

        <div className="h-[118px] rounded-sheet bg-night motion-safe:animate-pulse" />

        <Bone className="mx-1 h-6 w-48" />
        <div className="space-y-2">
          {Array.from({ length: 3 }, (_, index) => (
            <Bone key={index} className="h-[76px] rounded-group" />
          ))}
        </div>
      </div>
    </Screen>
  );
}
