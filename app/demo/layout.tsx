import { Suspense } from "react";
import type { Metadata } from "next";
import { DemoShell } from "@/components/demo/demo-shell";
import { DemoLoading } from "@/components/demo/demo-ui";

// Standalone portfolio demo. Everything under /demo renders the same screens
// as the signed-in app (app/(dashboard)) but reads and writes a sample
// dataset kept in the visitor's own browser (lib/demo) — no Supabase
// session, no Server Actions, no external services. It therefore stays
// available when the hosted backend is paused, and it can't reach real data:
// nothing here authenticates anyone, and the real routes are untouched.
export const metadata: Metadata = {
  title: "myMeeting — Demo",
};

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return (
    <DemoShell>
      <Suspense fallback={<DemoLoading />}>{children}</Suspense>
    </DemoShell>
  );
}
