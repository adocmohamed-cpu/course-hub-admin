import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import html from "@/platform/platform.html?raw";
import { installBridge } from "@/platform/bridge";

// The original platform page is rendered exactly as uploaded.
const style = html.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? "";
const bodyFull = html.match(/<body[^>]*>([\s\S]*)<\/body>/)?.[1] ?? "";
const script = bodyFull.match(/<script>([\s\S]*?)<\/script>/)?.[1] ?? "";
const body = bodyFull.replace(/<script>[\s\S]*?<\/script>/g, "");

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مستر محمد موسى | منصة اللغة الإنجليزية" },
      { name: "description", content: "منصة مستر محمد موسى لتعليم اللغة الإنجليزية لطلاب الثانوية العامة." },
      { property: "og:title", content: "مستر محمد موسى | منصة اللغة الإنجليزية" },
      { property: "og:description", content: "منصة مستر محمد موسى لتعليم اللغة الإنجليزية لطلاب الثانوية العامة." },
    ],
    links: [{ rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;800;900&display=swap" }],
  }),
  component: Platform,
});

function Platform() {
  useEffect(() => {
    new Function(script)();
    return installBridge();
  }, []);
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: style }} />
      <style
        dangerouslySetInnerHTML={{
          __html: `.cs{height:820px}.it{width:300px;height:533px}@media(max-width:640px){.cs{height:640px}.it{width:200px;height:356px}}`,
        }}
      />
      <div dangerouslySetInnerHTML={{ __html: body }} />
    </>
  );
}
