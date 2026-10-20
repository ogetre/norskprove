import type { Metadata } from "next";
import Link from "next/link";
import { HomeLink, StatusLinks, StatusPage, statusPrimary } from "@/components/StatusPage";

export const metadata: Metadata = { title: "Fant ikke siden" };

export default function NotFound() {
  return (
    <StatusPage code="404" title="Fant ikke siden">
      <p>Siden finnes ikke, eller den har flyttet. Kanskje var det en skrivefeil i adressen?</p>
      <StatusLinks>
        <Link href="/trening" className={statusPrimary}>
          Gå til treningen
        </Link>
        <HomeLink />
      </StatusLinks>
    </StatusPage>
  );
}
