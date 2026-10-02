import { APP_NAME } from "@/lib/config";
import { AppMark } from "@/components/AppMark";
import { SignInForm } from "./SignInForm";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { internalPath } from "@/lib/url";

export const metadata = { title: "Přihlášení" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/prihlaseni">) {
  const { dal } = await searchParams;
  const next = internalPath(typeof dal === "string" ? dal : "/");

  // Kdo je přihlášený, nemá tu co dělat. Stejná kontrola jako v rozvržení
  // aplikace, které sem posílá — proto se ty dvě nemůžou přehazovat dokola.
  if (await getProfile()) redirect(next);

  return (
    <div className="flex min-h-dvh flex-col justify-center bg-canvas px-5 py-12">
      <div className="mx-auto w-full max-w-sm">
        <div className="mb-10 text-center">
          <AppMark className="mx-auto mb-5 h-[72px] w-[72px]" />
          <h1 className="font-display text-[30px] font-bold tracking-tight text-ink">
            {APP_NAME}
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-600">
            Přihlas se přístupem, který jsi dostal/a od Honzy.
          </p>
        </div>

        <SignInForm next={next} />
      </div>
    </div>
  );
}
