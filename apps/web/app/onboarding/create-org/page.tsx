"use client";

import { useForm } from "react-hook-form";
import { useRouter } from "next/navigation";

type Values = {
  name: string;
  type: "COMPANY" | "TRAINING_PROVIDER" | "NGO" | "UNIVERSITY" | "GOVERNMENT_PROGRAM";
  country: string;
  province: string;
  contactPerson: string;
};

export default function CreateOrgPage() {
  const { register, handleSubmit, formState } = useForm<Values>({ defaultValues: { type: "COMPANY" } });
  const router = useRouter();

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Create organisation workspace</h1>
      <form
        className="mt-6 space-y-3"
        onSubmit={handleSubmit(async (values) => {
          const res = await fetch("/api/onboarding/create-org", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(values) });
          if (!res.ok) return;
          router.push("/onboarding/verify-org");
        })}
      >
        <input {...register("name")} placeholder="FutureSkills Institute" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <select {...register("type")} className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3">
          <option value="COMPANY">Company</option>
          <option value="TRAINING_PROVIDER">Training Provider</option>
          <option value="NGO">NGO</option>
          <option value="UNIVERSITY">University</option>
          <option value="GOVERNMENT_PROGRAM">Government Program</option>
        </select>
        <input {...register("country")} placeholder="Country" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <input {...register("province")} placeholder="Province" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <input {...register("contactPerson")} placeholder="Contact person" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <button disabled={formState.isSubmitting} className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950">Create and continue</button>
      </form>
    </div>
  );
}
