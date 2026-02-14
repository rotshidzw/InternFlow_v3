"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { otpRequestSchema } from "@internflow/shared/src/schemas";
import { z } from "zod";

const schema = otpRequestSchema;
type FormValues = z.infer<typeof schema>;

export default function LoginPage() {
  const { register, handleSubmit, formState } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    await fetch("/api/auth/otp", { method: "POST", body: JSON.stringify(values) });
    alert("OTP sent. Check MailHog inbox at http://localhost:8025");
  };

  return (
    <div className="mx-auto max-w-md rounded-2xl border bg-white p-6 dark:bg-slate-900">
      <h1 className="text-2xl font-bold">Email OTP Login</h1>
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-3">
        <input {...register("email")} placeholder="student@demo.com" className="w-full rounded-lg border px-3 py-2" />
        <button disabled={formState.isSubmitting} className="w-full rounded-lg bg-emerald-600 py-2 text-white">Send OTP</button>
      </form>
    </div>
  );
}
