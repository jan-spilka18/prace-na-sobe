import { APP_NAME } from "@/lib/config";
import { AppMark } from "@/components/AppMark";
import { SignInForm } from "./SignInForm";

export const metadata = { title: "Přihlášení" };

export default async function SignInPage({
  searchParams,
}: PageProps<"/prihlaseni">) {
  const { dal } = await searchParams;
  const next = typeof dal === "string" ? dal : "/";

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
