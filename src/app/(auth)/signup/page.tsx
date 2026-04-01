import { SignUpForm } from "@/components/auth/SignUpForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign Up",
};

export default function SignUpPage() {
  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4">
      <SignUpForm />
    </div>
  );
}
