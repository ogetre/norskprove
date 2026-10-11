import { AppHeader } from "@/components/AppHeader";
import { authEnabled } from "@/lib/auth-config";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <AppHeader authEnabled={authEnabled} />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-8 pb-20 sm:px-8 sm:pt-10">{children}</main>
      <footer className="border-t border-ice">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-granite sm:flex-row sm:justify-between sm:px-8">
          <span>© 2026 NorskprøveKlar</span>
          <span>Uavhengig tjeneste, ikke tilknyttet HK-dir.</span>
        </div>
      </footer>
    </>
  );
}
