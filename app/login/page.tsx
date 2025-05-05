'use client'; // Required for form handling and hooks

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { useState, useEffect } from "react"; // Import useEffect
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // For displaying errors

// Zod schema for login validation
const loginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address." }),
  password: z.string().min(1, { message: "Password is required." }), // Min 1, actual length checked by backend
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams(); // Get search params
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null); // State for error message

  // Read error from query params on component mount/update
  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      // Map known error codes to user-friendly messages
      if (errorParam === 'CredentialsSignin') {
        // This covers both invalid credentials and unconfirmed email now
        setErrorMessage("Invalid credentials or email not confirmed. Please check your details or confirm your email.");
      } else {
        setErrorMessage("An unexpected login error occurred. Please try again.");
      }
    } else {
      setErrorMessage(null); // Clear error if no error param
    }
  }, [searchParams]);


  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setIsLoading(true);
    setErrorMessage(null); // Clear previous errors

    // Call signIn without redirect: false - let next-auth handle redirects
    // On success, it redirects to callbackUrl (default: originating page or '/')
    // On failure, it redirects back to this page with ?error=...
    await signIn("credentials", {
      email: values.email,
      password: values.password,
      callbackUrl: '/dashboard', // Explicitly redirect to dashboard on success
      // redirect: true is the default
    });

    // Note: Code here might not run if redirect happens immediately.
    // Error handling is now primarily done via reading searchParams.
    // We might set isLoading to false here, but it could cause a flicker if redirect is fast.
    // It might be better to rely on the page reload after redirect.
    // For robustness, let's keep it, but be aware of potential flicker.
    setIsLoading(false);
  };

  // Placeholder handlers for social logins
  const handleSocialLogin = (provider: 'google' | 'facebook') => {
    // Potentially disable button or show loading state
    console.log(`Attempting login with ${provider}...`);
    signIn(provider); // This will trigger the full page redirect flow
  };


  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login to ReactShare</CardTitle>
          <CardDescription>Enter your email and password to access your account</CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-4">
              {errorMessage && ( // Use errorMessage state derived from searchParams
                <Alert variant="destructive">
                  <AlertTitle>Login Failed</AlertTitle>
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              )}
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="m@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <div className="flex items-center justify-between">
                      <FormLabel>Password</FormLabel>
                      <Link href="#" className="text-sm text-primary hover:underline"> {/* TODO: Implement forgot password */}
                        Forgot password?
                      </Link>
                    </div>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              {/* Removed "Remember me" for simplicity */}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Logging in..." : "Login"}
              </Button>
              <div className="relative flex items-center justify-center">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="px-2 text-muted-foreground text-sm">Or continue with</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {/* Update social login buttons */}
                <Button variant="outline" type="button" onClick={() => handleSocialLogin('google')} disabled={isLoading}>
                  {/* Google SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21"></path></svg>
                  Google
                </Button>
                <Button variant="outline" type="button" onClick={() => handleSocialLogin('facebook')} disabled={isLoading}>
                  {/* Facebook SVG */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
                  Facebook
                </Button>
              </div>
              <div className="text-center text-sm">
                Don't have an account?{" "}
                <Link href="/signup" className="text-primary hover:underline">
                  Sign up
                </Link>
              </div>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </div>
  );
}
