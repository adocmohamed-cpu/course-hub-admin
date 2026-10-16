import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, PlayCircle, FileText, ClipboardCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BUCKET, KIND_LABEL } from "@/lib/content";

export const Route = createFileRoute("/_app/course/$id")({
  head: () => ({
    meta: [
      { title: "محتوى الكورس | مستر محمد موسى" },
      { name: "description", content: "فيديوهات وواجبات وامتحانات الكورس للمشتركين." },
      { property: "og:title", content: "محتوى الكورس | مستر محمد موسى" },
      { property: "og:description", content: "فيديوهات وواجبات وامتحانات الكورس للمشتركين." },
    ],
  }),
  component: CoursePage,
});

type Lesson = { id: string; unit_id: string; kind: string; title: string; body: string; file_path: string | null };
const ICON = { video: PlayCircle, homework: FileText, exam: ClipboardCheck } as const;

function CoursePage() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [units, setUnits] = useState<any[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});

  useEffect(() => {
    supabase.from("courses").select("*").eq("id", id).maybeSingle().then(({ data }) => setCourse(data));
    supabase.from("units").select("*").eq("course_id", id).order("position").then(({ data }) => setUnits(data ?? []));
  }, [id]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: e } = await supabase.from("enrollments").select("id").eq("course_id", id).eq("user_id", user.id);
      setEnrolled(!!e?.length);
      const { data: l } = await supabase.from("lessons").select("*").eq("course_id", id).order("position");
      setLessons(l ?? []);
      const paths = (l ?? []).filter((x) => x.file_path).map((x) => x.file_path!);
      if (paths.length) {
        const { data: s } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 3600);
        const m: Record<string, string> = {};
        s?.forEach((x) => x.path && x.signedUrl && (m[x.path] = x.signedUrl));
        setUrls(m);
      }
    })();
  }, [user, id]);

  if (!course) return <p className="text-muted-foreground">جاري التحميل...</p>;
  const open = enrolled || isAdmin;

  return (
    <div className="space-y-6">
      <div>
        <small className="text-muted-foreground">الصف {course.grade}</small>
        <h1 className="text-3xl font-black">{course.title}</h1>
        <p className="mt-2 max-w-2xl text-muted-foreground">{course.description}</p>
      </div>

      {!loading && !open && (
        <Card className="flex flex-col items-center gap-3 border-secondary bg-accent p-8 text-center">
          <Lock className="h-10 w-10 text-primary" />
          <h2 className="text-xl font-extrabold">المحتوى مقفول</h2>
          <p className="text-muted-foreground">
            {user ? "الكورس ده متاح للمشتركين بس. تواصل مع المستر عشان يفعّل اشتراكك." : "سجّل دخول الأول، والمحتوى هيتفتح لو انت مشترك."}
          </p>
          <p className="font-extrabold text-primary">{course.price} جنيه</p>
          {!user && <Button asChild variant="secondary"><a href="/#login">تسجيل الدخول</a></Button>}
        </Card>
      )}

      {units.map((u) => (
        <Card key={u.id} className="p-5">
          <h2 className="mb-3 text-lg font-extrabold">{u.title}</h2>
          {!open ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><Lock className="h-4 w-4" /> محتوى الوحدة للمشتركين فقط</p>
          ) : (
            <div className="space-y-3">
              {lessons.filter((l) => l.unit_id === u.id).map((l) => {
                const I = ICON[l.kind as keyof typeof ICON];
                const url = l.file_path ? urls[l.file_path] : undefined;
                return (
                  <div key={l.id} className="rounded-lg border p-4">
                    <div className="flex items-center gap-2 font-bold">
                      <I className="h-5 w-5 text-primary" /> {l.title}
                      <span className="rounded-full bg-accent px-2 text-xs">{KIND_LABEL[l.kind]}</span>
                    </div>
                    {l.body && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{l.body}</p>}
                    {url && l.kind === "video" && <video src={url} controls controlsList="nodownload" className="mt-3 w-full rounded-lg" />}
                    {url && l.kind !== "video" && (
                      <Button asChild size="sm" variant="secondary" className="mt-3"><a href={url} target="_blank" rel="noreferrer">فتح الملف</a></Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      ))}
      {units.length === 0 && <p className="text-muted-foreground">لسه مفيش وحدات في الكورس ده.</p>}
    </div>
  );
}
