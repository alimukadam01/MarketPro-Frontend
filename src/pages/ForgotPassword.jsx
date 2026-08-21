import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Mail } from "lucide-react";
import { requestPasswordReset } from "../../services/api"

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

const ForgotPassword = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { success, notFound } = await requestPasswordReset(data.email)

      if (success) {
        setSent(true)
      } else if (notFound) {
        form.setError("email", {
          message: "No account is registered with this email address",
        })
      } else {
        toast.error("There was an error sending the reset link. Please try again.")
      }
    } catch (error) {
      console.log(error)
      toast.error("There was an error sending the reset link. Please try again.")
    } finally {
      setIsLoading(false)
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Forgot Password</h1>
          <p className="text-muted-foreground mt-2">
            {sent
              ? "Check your inbox for the reset link"
              : "We'll email you a link to reset your password"}
          </p>
        </div>

        {sent ? (
          <div className="space-y-6">
            <div className="bg-card rounded-lg border p-6">
              <p className="text-sm text-muted-foreground">
                A password reset link has been sent to{" "}
                <strong>{form.getValues("email")}</strong>. The link can only be
                used once, and stops working as soon as the password is changed.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => setSent(false)}
            >
              Use a different email
            </Button>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 border border-[#ADB5BD]"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Sending..." : "Send Reset Link"}
              </Button>
            </form>
          </Form>
        )}

        <div className="mt-6 text-center">
          <Link
            to="/login"
            className="text-sm text-primary hover:underline inline-flex items-center gap-1"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
