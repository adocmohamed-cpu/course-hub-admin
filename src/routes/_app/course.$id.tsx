import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Lock, PlayCircle, FileText, ClipboardCheck, ChevronDown, ChevronRight, Layers, BarChart3, BookOpen, Info } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { BUCKET, KIND_LABEL, imageUrls } from "@/lib/content";

export const Route = createFileRoute("/_app/course/$id")({
  head: () => ({
    meta: [
      { title: "محتوى الكورس | مستر محمد موسى" },
      { name: "description", content: "فيديوهات وواجبات وامتحانات الكورس للمشتركين." },
      { property: "og:title", content: "محتوى الكورس | مستر محمد موسى" },
      { property: "og:description", content: "فيديوهات وواجبات وامتحانات الكورس للمشتركين." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: CoursePage,
});

type Lesson = { id: string; unit_id: string; kind: string; title: string; body: string; file_path: string | null };
const ICON = { video: PlayCircle, homework: FileText, exam: ClipboardCheck } as const;
const ORD = ["أولاً", "ثانياً", "ثالثاً", "رابعاً", "خامساً", "سادساً", "سابعاً", "ثامناً", "تاسعاً", "عاشراً"];

function CoursePage() {
  const { id } = Route.useParams();
  const { user, isAdmin, loading } = useAuth();
  const [course, setCourse] = useState<any>(null);
  const [img, setImg] = useState<string>();
  const [units, setUnits] = useState<any[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrolled, setEnrolled] = useState(false);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [openU, setOpenU] = useState<string | null>(null);

  useEffect(() => {
    supabase.from("courses").select("*").eq("id", id).maybeSingle().then(async ({ data }) => {
      setCourse(data);
      if (data?.image_url) setImg((await imageUrls([data.image_url]))[data.image_url]);
    });
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
  const count = (k: string) => lessons.filter((l) => l.kind === k).length;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
      <div className="space-y-6">
        {/* Hero */}
        <section className="grid gap-6 rounded-3xl bg-primary p-6 text-primary-foreground md:grid-cols-2">
          <div className="space-y-3">
            <span className="inline-block rounded-full border border-secondary px-3 py-1 text-xs text-secondary">الصف {course.grade}</span>
            <h1 className="text-3xl font-black">{course.title}</h1>
            <p className="whitespace-pre-wrap text-sm opacity-85">{course.description}</p>
            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <Stat icon={Layers} label="الوحدات" value={units.length} />
              <Stat icon={PlayCircle} label="الفيديوهات" value={open ? count("video") : "—"} />
              <Stat icon={BarChart3} label="السعر" value={`${course.price} ج`} />
            </div>
            {open ? (
              <Button variant="secondary" className="rounded-full" onClick={() => setOpenU(units[0]?.id ?? null)}>متابعة التعلم</Button>
            ) : (
              <p className="flex items-center gap-2 font-bold text-secondary"><Lock className="h-4 w-4" /> {user ? "تواصل مع المستر لتفعيل اشتراكك" : "سجّل دخول لو انت مشترك"}</p>
            )}
            {!loading && !user && <Button asChild variant="secondary" className="rounded-full"><a href="/#login">تسجيل الدخول</a></Button>}
          </div>
          <div className="aspect-video w-full overflow-hidden rounded-2xl bg-background/10">
            {img ? <img src={img} alt={course.title} className="h-full w-full object-cover object-center" /> : <div className="flex h-full items-center justify-center"><BookOpen className="h-16 w-16 text-secondary" /></div>}
          </div>
        </section>

        {/* Units */}
        <section className="space-y-3 rounded-3xl border bg-card p-4">
          <h2 className="px-2 text-lg font-extrabold">المحتوى</h2>
          {units.map((u, i) => {
            const ls = lessons.filter((l) => l.unit_id === u.id);
            const isOpen = openU === u.id;
            return (
              <div key={u.id} className="rounded-2xl border">
                <button className="flex w-full items-center gap-4 p-3 text-start" onClick={() => setOpenU(isOpen ? null : u.id)}>
                  <span className={`flex h-12 w-16 shrink-0 items-center justify-center rounded-xl text-lg font-black ${i % 2 ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div className="flex-1">
                    <p className="font-extrabold text-primary">{ORD[i] ? `${ORD[i]}: ` : ""}{u.title}</p>
                    {open && <p className="text-xs text-muted-foreground">{ls.filter((l) => l.kind === "video").length} فيديو · {ls.filter((l) => l.kind === "homework").length} واجب · {ls.filter((l) => l.kind === "exam").length} امتحان</p>}
                  </div>
                  {open ? <ChevronDown className={`h-5 w-5 transition ${isOpen ? "rotate-180" : ""}`} /> : <Lock className="h-4 w-4 text-muted-foreground" />}
                </button>
                {open && isOpen && (
                  <div className="space-y-3 border-t p-3">
                    {ls.map((l) => {
                      const I = ICON[l.kind as keyof typeof ICON];
                      const url = l.file_path ? urls[l.file_path] : undefined;
                      return (
                        <div key={l.id} className="rounded-xl bg-muted p-3">
                          <div className="flex items-center gap-2 font-bold"><I className="h-5 w-5 text-primary" /> {l.title}<span className="rounded-full bg-secondary px-2 text-xs text-secondary-foreground">{KIND_LABEL[l.kind]}</span></div>
                          {l.body && <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">{l.body}</p>}
                          {url && l.kind === "video" && <video src={url} controls controlsList="nodownload" className="mt-3 w-full rounded-lg" />}
                          {url && l.kind !== "video" && <Button asChild size="sm" variant="secondary" className="mt-3"><a href={url} target="_blank" rel="noreferrer">فتح الملف</a></Button>}
                        </div>
                      );
                    })}
                    {ls.length === 0 && <p className="text-sm text-muted-foreground">لسه مفيش محتوى.</p>}
                  </div>
                )}
              </div>
            );
          })}
          {units.length === 0 && <p className="px-2 text-muted-foreground">لسه مفيش وحدات في الكورس ده.</p>}
        </section>
      </div>

      {/* Sidebar */}
      <aside className="space-y-4">
        <div className="space-y-1 rounded-3xl bg-primary p-3 text-primary-foreground">
          <a href="/#courses" className="flex items-center gap-2 rounded-xl p-3 text-sm"><ChevronRight className="h-4 w-4" /> العودة إلى الكورسات</a>
          <div className="flex items-center gap-2 rounded-xl bg-secondary p-3 font-bold text-secondary-foreground"><PlayCircle className="h-5 w-5" /> محتوى الكورس</div>
          <div className="flex items-center gap-2 p-3 text-sm"><Info className="h-5 w-5 text-secondary" /> الصف {course.grade}</div>
          {isAdmin && <Link to="/manage/$id" params={{ id }} className="flex items-center gap-2 p-3 text-sm text-secondary">تعديل المحتوى</Link>}
        </div>
        <div className="rounded-3xl border bg-card p-5 text-center">
          <p className="text-3xl font-black text-secondary">”</p>
          <p className="font-bold">الانضباط هو اللي بيوصلك، حتى لو مش متحمس.</p>
          <p className="mt-2 text-sm text-primary">مستر محمد موسى</p>
        </div>
      </aside>
    </div>
  );
}

function Stat({ icon: I, label, value }: { icon: any; label: string; value: any }) {
  return (
    <div className="rounded-xl bg-background/10 p-2">
      <I className="mx-auto mb-1 h-5 w-5 text-secondary" />
      <p className="opacity-80">{label}</p>
      <p className="font-extrabold">{value}</p>
    </div>
  );
}
