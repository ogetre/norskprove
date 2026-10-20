import { AppHeader } from "@/components/AppHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { authEnabled } from "@/lib/auth-config";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-8 sm:pt-10">{children}</main>
      <SiteFooter />
    </>
  );
}
