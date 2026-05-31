import { AppShell } from "@/components/app-shell/AppShell";
import { PageViewTracker } from "@/components/analytics/PageViewTracker";

export default function MainLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <AppShell>
      <PageViewTracker />
      {children}
    </AppShell>
  );
}
