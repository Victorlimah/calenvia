import Link from "next/link";
import { Logo } from "@/components/logo";
import { siteUrl } from "@/lib/hosts";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-paper flex min-h-dvh flex-col">
      <header className="mx-auto w-full max-w-md px-4 pt-8">
        <Link href={siteUrl()} aria-label="Calenvia — página inicial">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
