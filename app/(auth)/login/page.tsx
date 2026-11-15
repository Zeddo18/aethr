import { AuthForm } from "@/components/auth-form";

export const metadata = { title: "Sign in · AETHR" };

export default function LoginPage() {
  return (
    <>
      <h1 className="mb-6 font-display text-2xl font-semibold">Sign in</h1>
      <AuthForm mode="login" />
    </>
  );
}
