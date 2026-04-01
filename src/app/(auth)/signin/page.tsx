import { SignInForm } from "@/components/auth/SignInForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign In",
};

export default function SignInPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <SignInForm />
    </div>
  );
}
