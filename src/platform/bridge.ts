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

export function installBridge() {
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
