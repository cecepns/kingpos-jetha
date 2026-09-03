import { useForm } from "react-hook-form";
import { useNavigate, useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../api/client";
import { useAuthStore } from "../store/authStore";
import logoSrc from "../assets/logo.png";

export default function Login() {
  const navigate = useNavigate();
  const loc = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { register, handleSubmit, setValue, formState } = useForm({
    defaultValues: { email: "", password: "" },
  });

  const handleDemoFill = () => {
    setValue("email", "admin@pos.local", { shouldValidate: true });
    setValue("password", "admin123", { shouldValidate: true });
  };

  async function onSubmit(values) {
    const t = toast.loading("Masuk...");
    try {
      const { data } = await api.post("/api/auth/login", values);
      setAuth(data.token, data.user);
      toast.success(`Selamat datang, ${data.user.name}`, { id: t });
      navigate(loc.state?.from?.pathname || "/app/dashboard", { replace: true });
    } catch {
      toast.dismiss(t);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-brand-900 via-brand-700 to-emerald-800 p-6">
      <div className="w-full max-w-md rounded-3xl bg-white p-8 shadow-soft dark:bg-slate-900">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <img
            src={logoSrc}
            alt="KingPOS Logo"
            className="h-16 w-auto object-contain"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            King POS
          </h1>
          <p className="text-sm text-slate-500">Masuk untuk melanjutkan</p>
        </div>
        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Email</label>
            <input
              type="email"
              autoComplete="username"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...register("email", { required: true })}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">Password</label>
            <input
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none ring-brand-500 focus:ring-2 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              {...register("password", { required: true })}
            />
          </div>
          <button
            type="submit"
            disabled={formState.isSubmitting}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white shadow-soft transition hover:bg-brand-700 disabled:opacity-60"
          >
            {formState.isSubmitting ? "Memproses..." : "Masuk"}
          </button>
        </form>

        <div className="mt-6 rounded-2xl border border-slate-100 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Akun Demo Admin</p>
              <p className="text-xs text-slate-500">admin@pos.local / admin123</p>
            </div>
            <button
              type="button"
              onClick={handleDemoFill}
              className="rounded-lg bg-brand-100 px-3 py-1.5 text-xs font-medium text-brand-700 transition hover:bg-brand-200 dark:bg-brand-900/40 dark:text-brand-300 dark:hover:bg-brand-900/60"
            >
              Isi Form
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
