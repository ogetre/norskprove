import type { Metadata } from "next";
import { authEnabled } from "@/lib/auth-config";
import { Hub } from "./Hub";

export const metadata: Metadata = { title: "Trening" };

export default function TrainingPage() {
  return <Hub authEnabled={authEnabled} />;
}
