import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_app/courses")({
  head: () => ({
    meta: [
      { title: "الكورسات | مستر محمد موسى" },
      { name: "description", content: "كل كورسات اللغة الإنجليزية مع مستر محمد موسى." },
      { property: "og:title", content: "الكورسات | مستر محمد موسى" },
      { property: "og:description", content: "كل كورسات اللغة الإنجليزية مع مستر محمد موسى." },
    ],
  }),
  component: Courses,
});

type Course = { id: string; title: string; description: string; grade: string; price: number };

function Courses() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  useEffect(() => {
    supabase.from("courses").select("*").order("created_at", { ascending: false }).then(({ data }) => setCourses(data ?? []));
  }, []);
  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">الكورسات</h1>
      {courses === null ? (
        <p className="text-muted-foreground">جاري التحميل...</p>
      ) : courses.length === 0 ? (
        <p className="text-muted-foreground">مفيش كورسات لسه.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <Link key={c.id} to="/course/$id" params={{ id: c.id }}>
              <Card className="h-full p-5 transition hover:border-secondary">
                <small className="text-muted-foreground">الصف {c.grade}</small>
                <h2 className="mt-1 text-xl font-extrabold">{c.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <p className="mt-4 font-extrabold text-primary">{c.price} جنيه</p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
