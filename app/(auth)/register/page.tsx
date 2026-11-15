import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Create account · AETHR" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-2xl font-semibold">Create your account</h1>
      <AuthForm mode="register" />
    </>
  );
}
