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
  sec.innerHTML = `<style>
#mm-real-courses .mm-row{display:flex;gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;scroll-behavior:smooth;padding:10px 4px 20px;scrollbar-width:none}
#mm-real-courses .mm-row::-webkit-scrollbar{display:none}
#mm-real-courses .mm-card{flex:0 0 min(360px,85%);scroll-snap-align:start;display:flex;flex-direction:column;background:var(--soft);border:1px solid var(--line);border-radius:24px;padding:14px;transition:transform .4s cubic-bezier(.3,.8,.2,1),box-shadow .4s;opacity:0;transform:translateY(30px);animation:mmIn .7s forwards}
#mm-real-courses .mm-card:hover{transform:translateY(-8px);box-shadow:0 18px 40px rgba(0,0,0,.18)}
#mm-real-courses .mm-img{aspect-ratio:16/9;border-radius:16px;overflow:hidden;background:var(--green);display:flex;align-items:center;justify-content:center}
#mm-real-courses .mm-img img{width:100%;height:100%;object-fit:cover;transition:transform .6s}
#mm-real-courses .mm-card:hover .mm-img img{transform:scale(1.07)}
#mm-real-courses .mm-desc{color:var(--mut);font-size:.9rem;margin:6px 0 0;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
#mm-real-courses .mm-b{display:block;text-align:center;border-radius:14px;padding:11px;font-weight:800;margin-top:8px}
#mm-real-courses .mm-nav{width:44px;height:44px;border-radius:50%;border:1px solid var(--line);background:var(--soft);color:var(--ink);font-size:1.2rem;cursor:pointer}
@keyframes mmIn{to{opacity:1;transform:none}}
</style><div class="wrap"><div style="display:flex;justify-content:space-between;align-items:end;gap:12px"><div><span class="lab">كورسات المنصة</span><h2>كل <em>الكورسات</em></h2></div>
<div style="display:flex;gap:8px;margin-bottom:18px"><button class="mm-nav" data-d="1">→</button><button class="mm-nav" data-d="-1">←</button></div></div>
  <div class="mm-row">${data
    .map((c, i) => {
      const im = c.image_url && imgs[c.image_url];
      return `<div class="mm-card" style="animation-delay:${i * 0.12}s">
      <a href="/course/${c.id}" class="mm-img">${im ? `<img src="${im}" alt="">` : `<span style="color:var(--amber);font-size:3rem;font-weight:900">${esc(c.title.slice(0, 1))}</span>`}</a>
      <div style="padding:12px 4px 0;flex:1"><b style="display:block;font-size:1.15rem">${esc(c.title)}</b><strong style="display:block;color:var(--amber);margin-top:4px">${c.price} جنيه</strong>
      <small style="color:var(--mut)">الصف ${esc(c.grade)}</small><p class="mm-desc">${esc(c.description || "")}</p></div>
      <a href="/course/${c.id}" class="mm-b" style="background:var(--green);color:#fff">الدخول للكورس</a>
      <a href="#signup" class="mm-b" style="background:var(--amber);color:#14201a">الاشتراك في الكورس!</a></div>`;
    })
    .join("")}</div></div>`;
  sec.querySelectorAll<HTMLButtonElement>(".mm-nav").forEach((b) =>
    b.addEventListener("click", () => {
      const r = sec.querySelector(".mm-row")!;
      r.scrollBy({ left: -Number(b.dataset.d) * 380 });
    }),
  );
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
