import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";

export function AdminGate({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useAuth();
  if (loading) return <p className="text-muted-foreground">جاري التحميل...</p>;
  if (!isAdmin) return <p className="text-muted-foreground">الصفحة دي للمستر بس. <a className="underline" href="/#login">تسجيل الدخول</a></p>;
  return <>{children}</>;
}
