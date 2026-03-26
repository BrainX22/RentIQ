import AuthForm from "@/components/auth/AuthForm";

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <AuthForm mode="signup" />
    </div>
  );
}
