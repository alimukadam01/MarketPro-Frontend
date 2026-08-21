import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { ArrowLeft, Eye, EyeOff, Lock } from "lucide-react";
import { confirmPasswordReset } from "../../services/api"

const resetPasswordSchema = z.object({
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((values) => values.password === values.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

const ResetPassword = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  // The email link carries these; without both there is nothing to confirm.
  const [searchParams] = useSearchParams()
  const uid = searchParams.get("uid")
  const token = searchParams.get("token")

  const form = useForm({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true)
    try {
      const { success, errors } = await confirmPasswordReset(uid, token, data.password)

      if (success) {
        toast.success("Password changed. Please sign in.")
        navigate("/login", { replace: true })
        return
      }

      // Djoser rejects weak passwords and spent links through the same call,
      // so surface exactly what it objected to.
      const detail =
        errors?.new_password?.[0] ||
        errors?.token?.[0] ||
        errors?.uid?.[0] ||
        errors?.detail

      if (errors?.token || errors?.uid) {
        toast.error("This reset link is no longer valid. Please request a new one.")
      } else {
        toast.error(detail || "Could not reset the password. Please try again.")
      }
    } catch (error) {
      console.log(error)
      toast.error("Could not reset the password. Please try again.")
    } finally {
      setIsLoading(false)
    }
  };

  if (!uid || !token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
            <p className="text-muted-foreground mt-2">This link is incomplete</p>
          </div>

          <div className="bg-card rounded-lg border p-6">
            <p className="text-sm text-muted-foreground">
              The reset link is missing information, which usually means it was
              only partly copied. Open the link from your email again, or
              request a new one.
            </p>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={() => navigate("/forgot-password")}
          >
            Request a new link
          </Button>

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
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Reset Password</h1>
          <p className="text-muted-foreground mt-2">Choose a new password for your account</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your new password"
                        className="pl-10 pr-10 border border-[#ADB5BD]"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Confirm Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showConfirm ? "text" : "password"}
                        placeholder="Re-enter your new password"
                        className="pl-10 pr-10 border border-[#ADB5BD]"
                        {...field}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirm(!showConfirm)}
                        className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                      >
                        {showConfirm ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Saving..." : "Reset Password"}
            </Button>
          </form>
        </Form>

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

export default ResetPassword;
