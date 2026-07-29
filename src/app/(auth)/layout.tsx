import { Logo } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/shared/theme-toggle";

/**
 * Centred auth layout. Deliberately free of marketing copy — whoever reaches
 * this screen already decided to sign in, so the form is the only content and
 * it sits in the optical centre of the viewport on every breakpoint.
 */
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex min-h-dvh items-center justify-center px-6 py-12">
      <div aria-hidden className="grid-backdrop absolute inset-0 opacity-40" />
      <div
        aria-hidden
        className="bg-primary/10 absolute -top-40 left-1/2 size-[34rem] -translate-x-1/2 rounded-full blur-3xl"
      />

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6">
        <ThemeToggle />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Not a link: the root redirects straight back here, so there is
            nowhere for it to go. */}
        <Logo className="mx-auto mb-10 w-fit" />

        {children}
      </div>
    </div>
  );
}
