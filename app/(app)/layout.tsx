import { AppSidebar } from "@/components/layout/app-sidebar";

export default function AppAreaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <AppSidebar />
      <main className="min-w-0 flex-1 bg-ili-cinza-100 p-6 lg:p-8">{children}</main>
    </div>
  );
}
