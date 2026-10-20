import { PublicHeader } from "@/components/PublicHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled } from "@/lib/auth-config";

export default function TrialLayout({ children }: LayoutProps<"/provetest">) {
  return (
    <>
      <PublicHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-20 sm:px-8">{children}</main>
      <SiteFooter />
    </>
  );
}
