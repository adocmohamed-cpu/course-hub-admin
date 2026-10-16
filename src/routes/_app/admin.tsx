import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GRADES, IMG_BUCKET } from "@/lib/content";

export const Route = createFileRoute("/_app/admin")({
  head: () => ({
    meta: [
      { title: "لوحة التحكم | مستر محمد موسى" },
      { name: "description", content: "إدارة المستخدمين والكورسات." },
      { property: "og:title", content: "لوحة التحكم | مستر محمد موسى" },
      { property: "og:description", content: "إدارة المستخدمين والكورسات." },
    ],
  }),
  component: () => (
    <AdminGate>
      <Admin />
    </AdminGate>
  ),
});

function Admin() {
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [courses, setCourses] = useState<any[]>([]);
  const [enr, setEnr] = useState<any[]>([]);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ title: "", description: "", grade: GRADES[0] ?? "", price: "" });
  const [img, setImg] = useState<File | null>(null);

  const load = async () => {
    const [u, c, e] = await Promise.all([
      supabase.from("profiles").select("*").order("created_at", { ascending: false }),
      supabase.from("courses").select("*").order("created_at", { ascending: false }),
      supabase.from("enrollments").select("*"),
    ]);
    setUsers(u.data ?? []);
    setCourses(c.data ?? []);
    setEnr(e.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const addCourse = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!form.title.trim()) return toast.error("اكتب اسم الكورس");
    let image_url: string | null = null;
    if (img) {
      image_url = `${crypto.randomUUID()}.${img.name.split(".").pop()}`;
      const up = await supabase.storage.from(IMG_BUCKET).upload(image_url, img, { contentType: img.type });
      if (up.error) return toast.error("رفع الصورة فشل");
    }
    const { data, error } = await supabase.from("courses")
      .insert({ title: form.title.trim(), description: form.description, grade: form.grade, price: Number(form.price) || 0, image_url })
      .select().single();
    if (error) return toast.error("ماتحفظش الكورس");
    navigate({ to: "/manage/$id", params: { id: data.id } });
    return undefined;
  };

  const grant = async (user_id: string, course_id: string) => {
    if (!course_id) return;
    const { error } = await supabase.from("enrollments").insert({ user_id, course_id });
    if (error) toast.error("مشترك بالفعل أو حصلت مشكلة"); else { toast.success("تم تفعيل الاشتراك"); load(); }
  };
  const revoke = async (id: string) => { await supabase.from("enrollments").delete().eq("id", id); load(); };
  const delCourse = async (id: string) => { if (confirm("مسح الكورس بكل محتواه؟")) { await supabase.from("courses").delete().eq("id", id); load(); } };

  const title = (id: string) => courses.find((c) => c.id === id)?.title ?? "";
  const shown = users.filter((u) => !q || `${u.first_name} ${u.last_name} ${u.phone}`.includes(q));

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">لوحة التحكم</h1>
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[["الطلاب", users.length], ["الكورسات", courses.length], ["الاشتراكات", enr.length]].map(([l, n]) => (
          <Card key={l} className="bg-primary p-4 text-primary-foreground">
            <p className="text-sm opacity-80">{l}</p><p className="text-3xl font-black">{n}</p>
          </Card>
        ))}
      </div>
      <Tabs defaultValue="users" dir="rtl">
        <TabsList><TabsTrigger value="users">المستخدمون</TabsTrigger><TabsTrigger value="courses">الكورسات</TabsTrigger></TabsList>

        <TabsContent value="users" className="space-y-3">
          <Input placeholder="ابحث بالاسم أو الرقم" value={q} onChange={(e) => setQ(e.target.value)} />
          {shown.map((u) => (
            <Card key={u.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-extrabold">{u.first_name} {u.last_name}</p>
                  <p className="text-sm text-muted-foreground" dir="ltr">{u.phone}</p>
                  <p className="text-xs text-muted-foreground">الصف {u.grade}</p>
                </div>
                <select className="rounded-md border bg-card px-2 py-2 text-sm" value="" onChange={(e) => grant(u.id, e.target.value)}>
                  <option value="">+ تفعيل كورس</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {enr.filter((e) => e.user_id === u.id).map((e) => (
                  <span key={e.id} className="flex items-center gap-1 rounded-full bg-accent px-3 py-1 text-xs">
                    {title(e.course_id)}
                    <button onClick={() => revoke(e.id)} className="text-destructive" aria-label="إلغاء">✕</button>
                  </span>
                ))}
              </div>
            </Card>
          ))}
          {shown.length === 0 && <p className="text-muted-foreground">مفيش مستخدمين.</p>}
        </TabsContent>

        <TabsContent value="courses" className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-3 text-lg font-extrabold">إضافة كورس</h2>
            <form onSubmit={addCourse} className="grid gap-3 sm:grid-cols-2">
              <Input placeholder="اسم الكورس" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              <Input placeholder="السعر بالجنيه" inputMode="numeric" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <select className="rounded-md border bg-card px-2 py-2 text-sm" value={form.grade} onChange={(e) => setForm({ ...form, grade: e.target.value })}>
                {GRADES.map((g) => <option key={g}>{g}</option>)}
              </select>
              <label className="text-sm font-bold">صورة الكورس<Input type="file" accept="image/*" onChange={(e) => setImg(e.target.files?.[0] ?? null)} /></label>
              <Textarea placeholder="وصف الكورس" className="sm:col-span-2" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              <Button type="submit" variant="secondary" className="sm:col-span-2">إضافة وإدخال المحتوى</Button>
            </form>
          </Card>
          {courses.map((c) => (
            <Card key={c.id} className="flex flex-wrap items-center justify-between gap-2 p-4">
              <div><p className="font-extrabold">{c.title}</p><p className="text-sm text-muted-foreground">الصف {c.grade} · {c.price} جنيه</p></div>
              <div className="flex gap-2">
                <Button asChild size="sm"><Link to="/manage/$id" params={{ id: c.id }}>المحتوى</Link></Button>
                <Button size="sm" variant="destructive" onClick={() => delCourse(c.id)}>مسح</Button>
              </div>
            </Card>
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
