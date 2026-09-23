import { requireProfile, usesAdminPassword } from "@/lib/auth";
import { Screen } from "@/components/ui/Screen";
import { ListGroup, ListRow } from "@/components/ui/List";
import { SignOutButton } from "@/components/SignOutButton";
import { APP_NAME } from "@/lib/config";
import { NotificationSettings } from "@/components/NotificationSettings";
import { publicVapidKey } from "@/lib/push";
import { cookies } from "next/headers";
import { ThemePicker } from "@/components/ThemePicker";
import { ProfileForm } from "@/components/ProfileForm";
import { THEME_COOKIE, parseTheme } from "@/lib/theme";

export const metadata = { title: "Nastavení" };

export default async function SettingsPage() {
  const profile = await requireProfile();
  const adminPassword = await usesAdminPassword();
  const vapidKey = publicVapidKey();
  const theme = parseTheme((await cookies()).get(THEME_COOKIE)?.value);

  return (
    <Screen title="Nastavení" subtitle={profile.full_name || profile.email}>
      <div className="space-y-5">
        {adminPassword && (
          <div className="rounded-group border-l-4 border-sun bg-surface py-3.5 pl-3.5 pr-4">
            <p className="text-[15px] font-semibold text-ink">
              Pořád máš heslo od Honzy
            </p>
            <p className="mt-1 text-[14px] leading-snug text-ink-600">
              Nastav si vlastní. To původní zná i on a putovalo k tobě mimo
              aplikaci.
            </p>
          </div>
        )}

        {/*
          Dokud na serveru nejsou klíče, notifikace nikdo zapnout nemůže.
          Mrtvý přepínač s vysvětlivkou, proč nejde zmáčknout, je horší
          než žádný — klient neřeší, co se děje na serveru.
        */}
        {vapidKey !== "" && <NotificationSettings publicKey={vapidKey} />}

        {/*
          Tady si klient doplní, co v průvodci přeskočil. Stejný formulář
          jako v průvodci, ať se nemusí učit dva.
        */}
        <section className="space-y-2">
          <h2 className="px-4 text-[13px] font-semibold uppercase tracking-wide text-ink-500">
            O tobě
          </h2>
          <ProfileForm
            initial={{
              fullName: profile.full_name,
              phone: profile.phone ?? "",
              birthDay: profile.birth_day ?? null,
              birthMonth: profile.birth_month ?? null,
            }}
            submitLabel="Uložit"
          />
        </section>

        <ThemePicker initial={theme} />

        <ListGroup title="Účet">
          <ListRow title="E-mail" trailing={profile.email} />
          <ListRow title="Změnit heslo" href="/zmena-hesla" />
          <ListRow title="Appka na plochu" href="/nastaveni/instalace" />
        </ListGroup>

        <section className="space-y-2">
          <div className="overflow-hidden rounded-group bg-surface">
            <div className="flex min-h-[48px] items-center justify-center px-4 py-3">
              <SignOutButton />
            </div>
          </div>
          <p className="px-4 text-[13px] leading-snug text-ink-500">
            Odhlásí jen tenhle telefon. {APP_NAME} na ostatních zařízeních
            zůstane přihlášená.
          </p>
        </section>
      </div>
    </Screen>
  );
}
