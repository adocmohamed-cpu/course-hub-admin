import { createFileRoute, Outlet } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_app")({
  head: () => ({
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <a href="/" className="text-lg font-extrabold">مستر محمد موسى</a>
          <nav className="flex gap-4 text-sm font-semibold">
            <a href="/courses" className="hover:text-secondary">الكورسات</a>
            <a href="/" className="hover:text-secondary">المنصة</a>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <Outlet />
      </main>
      <Toaster />
    </div>
  );
}
