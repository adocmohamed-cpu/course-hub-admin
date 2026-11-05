// Connects the original platform page (kept unchanged) to real accounts.
import { supabase } from "@/integrations/supabase/client";

export const phoneToEmail = (phone: string) => `${phone.replace(/\s/g, "")}@students.mousaa.app`;
const validPhone = (v: string) => /^01[0-9]{9}$/.test(v.replace(/\s/g, ""));
const val = (id: string) => (document.getElementById(id) as HTMLInputElement | null)?.value ?? "";

function say(form: HTMLElement, msg: string, ok = false) {
  const q = form.querySelector(".err");
  if (!q) return;
  q.className = "err" + (ok ? " ok" : "");
  q.textContent = msg;
}

async function loadStudent(userId: string) {
  const { data } = await supabase.from("profiles").select("first_name, grade").eq("id", userId).maybeSingle();
  if (data) (window as any)._stu = { name: data.first_name, grade: data.grade };
}

async function refreshAdminButton() {
  document.getElementById("mm-admin-btn")?.remove();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin");
  if (!data?.length) return;
  const a = document.createElement("a");
  a.id = "mm-admin-btn";
  a.href = "/admin";
  a.className = "btn am";
  a.textContent = "لوحة التحكم";
  a.style.cssText = "position:fixed;bottom:20px;left:20px;z-index:9999;box-shadow:0 8px 24px rgba(0,0,0,.25)";
  document.body.appendChild(a);
}

// Adds the real courses (added from the control panel) under the original courses section.
async function renderRealCourses() {
  document.getElementById("mm-real-courses")?.remove();
  const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
  if (!data?.length) return;
  const paths = data.map((c) => c.image_url).filter(Boolean) as string[];
  const imgs: Record<string, string> = {};
  if (paths.length) {
    const { data: s } = await supabase.storage.from("course-images").createSignedUrls(paths, 604800);
    s?.forEach((x) => x.path && x.signedUrl && (imgs[x.path] = x.signedUrl));
  }
  const esc = (t: string) => t.replace(/[&<>"]/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[ch]!);
  const sec = document.createElement("section");
  sec.id = "mm-real-courses";
  sec.style.cssText = "padding:24px 0 64px";
  sec.innerHTML = `<div class="wrap"><span class="lab">كورسات المنصة</span><h2>كل <em>الكورسات</em></h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px">${data
    .map((c) => {
      const im = c.image_url && imgs[c.image_url];
      return `<a href="/course/${c.id}" style="display:flex;flex-direction:column;background:var(--soft);border:1px solid var(--line);border-radius:20px;overflow:hidden">
      <div style="aspect-ratio:9/16;background:var(--green);display:flex;align-items:center;justify-content:center">${im ? `<img src="${im}" alt="" style="width:100%;height:100%;object-fit:cover">` : `<span style="color:var(--amber);font-size:2.5rem;font-weight:900">${esc(c.title.slice(0, 1))}</span>`}</div>
      <div style="padding:16px"><small style="color:var(--mut)">الصف ${esc(c.grade)}</small><b style="display:block;font-size:1.15rem;margin:4px 0">${esc(c.title)}</b>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-top:10px"><strong style="color:var(--amber)">${c.price} جنيه</strong><span class="btn am" style="padding:6px 14px">ادخل الكورس</span></div></div></a>`;
    })
    .join("")}</div></div>`;
  document.getElementById("courses")?.after(sec);
}

export function installBridge() {
  renderRealCourses();
  const onSubmit = async (e: Event) => {
    const form = e.target as HTMLElement;
    if (form.id === "auSignup") {
      if (!val("auFn").trim() || !val("auLn").trim() || !validPhone(val("auPh")) || !val("auGr") || val("auPw").length < 8) return; // original shows message
      e.preventDefault();
      e.stopPropagation();
      say(form, "جاري إنشاء الحساب...", true);
      const { data, error } = await supabase.auth.signUp({
        email: phoneToEmail(val("auPh")),
        password: val("auPw"),
        options: { data: { first_name: val("auFn").trim(), last_name: val("auLn").trim(), grade: val("auGr") } },
      });
      if (error) return say(form, /registered|exists/i.test(error.message) ? "الرقم ده مسجّل بالفعل، سجّل دخول." : "حصلت مشكلة، حاول تاني.");
      (window as any)._stu = { name: val("auFn").trim(), grade: val("auGr") };
      if (data.user) await refreshAdminButton();
      location.replace("#student");
    } else if (form.id === "auLogin") {
      if (!validPhone(val("auLp")) || !val("auLw")) return;
      e.preventDefault();
      e.stopPropagation();
      say(form, "جاري الدخول...", true);
      const { data, error } = await supabase.auth.signInWithPassword({ email: phoneToEmail(val("auLp")), password: val("auLw") });
      if (error || !data.user) return say(form, "رقم الموبايل أو كلمة المرور غلط.");
      await loadStudent(data.user.id);
      await refreshAdminButton();
      location.replace("#student");
    }
  };
  document.addEventListener("submit", onSubmit, true);

  // Course "details" buttons in the student area open the real courses page.
  const onClick = (e: Event) => {
    const t = e.target as HTMLElement;
    if (t.closest("#stuGrid .cc2 button")) {
      e.preventDefault();
      location.href = "/courses";
    }
  };
  document.addEventListener("click", onClick);

  supabase.auth.getUser().then(({ data }) => {
    if (data.user) loadStudent(data.user.id);
    refreshAdminButton();
  });

  return () => {
    document.removeEventListener("submit", onSubmit, true);
    document.removeEventListener("click", onClick);
    document.getElementById("mm-admin-btn")?.remove();
  };
}
