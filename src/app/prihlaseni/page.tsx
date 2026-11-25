import { APP_NAME } from "@/lib/config";
import { BrandMark } from "@/components/Brand";
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
          <BrandMark className="mx-auto h-[84px] w-[84px]" />
          <h1 className="mt-6 font-display text-[28px] font-bold leading-[1.15] text-ink">
            {APP_NAME}
          </h1>
          <p className="mt-1.5 text-[16px] leading-normal text-ink-600">
            Přihlas se přístupem, který jsi dostal od Honzy.
          </p>
        </div>

        <SignInForm next={next} />
      </div>
    </div>
  );
}
