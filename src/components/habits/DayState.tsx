"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { DayStatus, EntryStatus } from "@/lib/database.types";

/*
  Stav dne sdílený mezi kolečky, kartou dne a týdenním pásem.

  Dřív si každé kolečko pamatovalo svůj stav samo. Odškrtnutí se v něm
  ukázalo hned, ale karta „1 ze 3" a kolečko dne v pásu čekaly, až server
  uloží, přepočítá a pošle celou stránku zpátky. Teď se všechny tři změní
  ve stejné chvíli, kdy člověk klepne.
*/

type Statuses = Record<string, EntryStatus | null>;

type DayState = {
  statuses: Statuses;
  setStatus: (habitId: string, status: EntryStatus | null) => void;
};

const Context = createContext<DayState | null>(null);

/**
 * Musí dostat `key` podle data. Bez něj by React při přepnutí na jiný den
 * nechal starý stav a kolečka by ukazovala, co člověk odškrtal včera.
 */
export function DayStateProvider({
  initial,
  children,
}: {
  initial: Statuses;
  children: React.ReactNode;
}) {
  const [statuses, setStatuses] = useState(initial);

  const setStatus = useCallback(
    (habitId: string, status: EntryStatus | null) =>
      setStatuses((current) => ({ ...current, [habitId]: status })),
    [],
  );

  const value = useMemo(() => ({ statuses, setStatus }), [statuses, setStatus]);

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

/** null mimo DayStateProvider — komponenty pak použijí data ze serveru. */
export function useDayState(): DayState | null {
  return useContext(Context);
}

/**
 * Stav dne podle toho, co je právě odškrtnuté.
 *
 * Stejná pravidla jako dayStatus() v lib/habits: stačí jeden nevyplněný
 * návyk a den je nevyplněný, jeden nesplněný a den je nesplněný.
 */
export function liveDayStatus(statuses: Statuses, fallback: DayStatus): DayStatus {
  const values = Object.values(statuses);
  if (values.length === 0) return fallback;
  if (values.some((status) => status === null)) return "empty";
  if (values.some((status) => status === "missed")) return "incomplete";
  return "complete";
}
