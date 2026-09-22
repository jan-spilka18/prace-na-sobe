import { signOut } from "@/app/prihlaseni/actions";

export function SignOutButton() {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className="text-[17px] text-turquoise-700 active:opacity-60"
      >
        Odhlásit
      </button>
    </form>
  );
}
