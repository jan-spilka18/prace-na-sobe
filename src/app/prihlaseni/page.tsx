import { APP_NAME } from "@/lib/config";
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
          <div
            aria-hidden
            className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-[1.25rem] bg-turquoise text-[28px] font-bold text-white"
          >
            ↑
          </div>
          <h1 className="text-[28px] font-bold tracking-tight text-ink">
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
