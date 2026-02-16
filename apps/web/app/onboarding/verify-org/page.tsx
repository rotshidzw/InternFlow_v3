"use client";

import { useForm } from "react-hook-form";

type Values = {
  companyRegistration: FileList;
  taxPin?: FileList;
  ckNumber: string;
  popiaContact: string;
};

export default function VerifyOrgPage() {
  const { register, handleSubmit, formState } = useForm<Values>();

  return (
    <div className="mx-auto mt-10 max-w-2xl rounded-3xl border border-white/20 bg-white/10 p-8 text-slate-100 backdrop-blur-xl">
      <h1 className="text-3xl font-semibold">Verify organisation</h1>
      <p className="mt-2 text-sm text-slate-200">Upload compliance documents for InternFlow admin approval.</p>
      <form
        className="mt-6 space-y-3"
        onSubmit={handleSubmit(async (values) => {
          const formData = new FormData();
          formData.append("ckNumber", values.ckNumber);
          formData.append("popiaContact", values.popiaContact);
          if (values.companyRegistration?.[0]) formData.append("companyRegistration", values.companyRegistration[0]);
          if (values.taxPin?.[0]) formData.append("taxPin", values.taxPin[0]);
          await fetch("/api/onboarding/verify-org", { method: "POST", body: formData });
          alert("Submitted for review. You can track status in /workspaces.");
        })}
      >
        <input type="file" {...register("companyRegistration")} className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <input type="file" {...register("taxPin")} className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" />
        <input {...register("ckNumber")} placeholder="CK Number" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <input {...register("popiaContact")} placeholder="POPIA contact details" className="w-full rounded-xl border border-white/20 bg-slate-950/40 px-3 py-3" required />
        <button disabled={formState.isSubmitting} className="w-full rounded-xl bg-emerald-500 py-3 font-medium text-slate-950">Submit for approval</button>
      </form>
    </div>
  );
}
