import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AdminGate } from "@/components/AdminGate";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BUCKET, KIND_LABEL } from "@/lib/content";

export const Route = createFileRoute("/_app/manage/$id")({
  head: () => ({
    meta: [
      { title: "محتوى الكورس | لوحة التحكم" },
      { name: "description", content: "رفع الفيديوهات والواجبات والامتحانات وتنظيم الوحدات." },
      { property: "og:title", content: "محتوى الكورس | لوحة التحكم" },
      { property: "og:description", content: "رفع الفيديوهات والواجبات والامتحانات وتنظيم الوحدات." },
    ],
  }),
  component: () => (
    <AdminGate>
      <Manage />
    </AdminGate>
  ),
});

function Manage() {
  const { id } = Route.useParams();
  const [course, setCourse] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [lessons, setLessons] = useState<any[]>([]);
  const [unitTitle, setUnitTitle] = useState("");

  const load = async () => {
    const [c, u, l] = await Promise.all([
      supabase.from("courses").select("*").eq("id", id).maybeSingle(),
      supabase.from("units").select("*").eq("course_id", id).order("position"),
      supabase.from("lessons").select("*").eq("course_id", id).order("position"),
    ]);
    setCourse(c.data); setUnits(u.data ?? []); setLessons(l.data ?? []);
  };
  useEffect(() => { load(); }, [id]);

  const addUnit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!unitTitle.trim()) return;
    await supabase.from("units").insert({ course_id: id, title: unitTitle.trim(), position: units.length });
    setUnitTitle(""); load();
  };
  const delUnit = async (uid: string) => { if (confirm("مسح الوحدة بكل محتواها؟")) { await supabase.from("units").delete().eq("id", uid); load(); } };
  const delLesson = async (l: any) => {
    if (!confirm("مسح العنصر ده؟")) return;
    if (l.file_path) await supabase.storage.from(BUCKET).remove([l.file_path]);
    await supabase.from("lessons").delete().eq("id", l.id); load();
  };

  if (!course) return <p className="text-muted-foreground">جاري التحميل...</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div><Link to="/admin" className="text-sm text-muted-foreground">← لوحة التحكم</Link><h1 className="text-3xl font-black">{course.title}</h1></div>
        <Button asChild variant="outline"><Link to="/course/$id" params={{ id }}>معاينة صفحة الكورس</Link></Button>
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-extrabold">إضافة وحدة دراسية</h2>
        <form onSubmit={addUnit} className="flex gap-2">
          <Input placeholder="اسم الوحدة (مثلاً: Unit 1)" value={unitTitle} onChange={(e) => setUnitTitle(e.target.value)} />
          <Button type="submit" variant="secondary">إضافة</Button>
        </form>
      </Card>

      {units.map((u) => (
        <Card key={u.id} className="space-y-4 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-extrabold">{u.title}</h2>
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => delUnit(u.id)}>مسح الوحدة</Button>
          </div>
          {lessons.filter((l) => l.unit_id === u.id).map((l) => (
            <div key={l.id} className="flex items-center justify-between rounded-lg border p-3 text-sm">
              <span><span className="rounded-full bg-accent px-2 text-xs">{KIND_LABEL[l.kind]}</span> {l.title} {l.file_path && "📎"}</span>
              <button className="text-destructive" onClick={() => delLesson(l)}>مسح</button>
            </div>
          ))}
          <div className="grid gap-3 md:grid-cols-3">
            {(["video", "homework", "exam"] as const).map((k) => (
              <AddItem key={k} kind={k} courseId={id} unitId={u.id} position={lessons.length} onDone={load} />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddItem({ kind, courseId, unitId, position, onDone }: { kind: "video" | "homework" | "exam"; courseId: string; unitId: string; position: number; onDone: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const label = KIND_LABEL[kind];

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return toast.error("اكتب العنوان");
    if (kind === "video" && !file) return toast.error("اختار ملف الفيديو");
    setBusy(true);
    let file_path: string | null = null;
    if (file) {
      const ext = file.name.split(".").pop();
      file_path = `${courseId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(BUCKET).upload(file_path, file, { contentType: file.type });
      if (error) { setBusy(false); return toast.error("الرفع فشل: " + error.message); }
    }
    const { error } = await supabase.from("lessons").insert({ course_id: courseId, unit_id: unitId, kind, title: title.trim(), body, file_path, position });
    setBusy(false);
    if (error) return toast.error("ماتحفظش");
    toast.success(`تم إضافة ال${label}`);
    setTitle(""); setBody(""); setFile(null); (e.target as HTMLFormElement).reset(); onDone();
    return undefined;
  };

  return (
    <form onSubmit={submit} className="space-y-2 rounded-lg bg-muted p-3">
      <p className="font-bold">رفع {label}</p>
      <Input placeholder={`عنوان ال${label}`} value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder={kind === "video" ? "وصف (اختياري)" : "الأسئلة أو التعليمات أو رابط"} value={body} onChange={(e) => setBody(e.target.value)} />
      <Input type="file" accept={kind === "video" ? "video/*" : undefined} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
      <Button type="submit" size="sm" disabled={busy} className="w-full">{busy ? "جاري الرفع..." : "إضافة"}</Button>
    </form>
  );
}
