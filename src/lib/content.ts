import { supabase } from "@/integrations/supabase/client";

export const GRADES: string[] = ["الأول الثانوي", "الثاني الثانوي", "الثالث الثانوي"];
export const KIND_LABEL: Record<string, string> = { video: "فيديو", homework: "واجب", exam: "امتحان" };
export const BUCKET = "course-files";
export const IMG_BUCKET = "course-images";

/** Turns stored image paths into viewable links (bucket is private). */
export async function imageUrls(paths: (string | null | undefined)[]) {
  const list = paths.filter(Boolean) as string[];
  const m: Record<string, string> = {};
  if (!list.length) return m;
  const { data } = await supabase.storage.from(IMG_BUCKET).createSignedUrls(list, 60 * 60 * 24 * 7);
  data?.forEach((x) => x.path && x.signedUrl && (m[x.path] = x.signedUrl));
  return m;
}
