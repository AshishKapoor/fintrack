import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { UserAuthForm } from "@/components/user-auth-form";

export default function AuthenticationPage() {
  return (
    <>
      <div className="flex flex-col items-center justify-center">
        <div className="w-full px-4 md:px-0">
          {/* Main content */}
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-0">
            {/* Login button */}
            <Link
              to="/login"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "absolute right-4 top-4 md:right-8 md:top-8"
              )}
            >
              Login
            </Link>

            {/* Left side - Brand section */}
            <div className="hidden lg:flex h-full flex-col p-10 text-foreground bg-background">
              <div className="relative z-20 flex items-center text-lg font-medium">
                <img
                  src="/images/logo/logo.png"
                  alt="Logo"
                  className="h-8 w-auto mr-2"
                />
                FinTrack
              </div>
              <div className="mt-auto">
                <blockquote className="space-y-2"></blockquote>
                <p className="text-lg">
                  &ldquo; The future depends on what we do in the present&rdquo;
                </p>
                <footer className="text-sm">- Mahatma Gandhi</footer>
              </div>
            </div>

            {/* Right side - Form section */}
            <div className="w-full px-4 py-8 lg:p-8">
              <div className="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div className="flex flex-col space-y-2 text-center">
                  <h1 className="text-2xl font-semibold tracking-tight">
                    Create an account
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Enter your email below to create your account
                  </p>
                </div>
                <UserAuthForm />
                <p className="px-4 md:px-8 text-center text-sm text-muted-foreground">
                  By clicking continue, you agree to our{" "}
                  <Link
                    to="/terms"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy"
                    className="underline underline-offset-4 hover:text-primary"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
