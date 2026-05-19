import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { login, getActiveBusiness, getUserInfo, getAccessConfig } from "../../services/api"
import { useAuth } from '../../services/AuthProvider'
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner"
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
import { formatConfig } from "../../services/utils";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  remember: z.boolean().optional(),
});

const Login = () => {
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login: authLogIn } = useAuth()
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      remember: false,
    },
  });

  const onSubmit = async (data) => {
    try{
      const accessToken = await login(data)
      if (accessToken){
        const userData   = await getUserInfo(accessToken)
        const business = await getActiveBusiness(accessToken)
        const config = formatConfig(business.config, userData.role)
        
        authLogIn(accessToken, userData, business.id, config)
        
        setIsLoading(false)
        navigate('/')
      }else{
        setIsLoading(false)
        toast.error("Please provide correct credentials.")
      }
    }catch(error){
      setIsLoading(false)
      console.log(error)
      toast.error("There was an error logging in. Please try again.")
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Welcome Back</h1>
          <p className="text-muted-foreground mt-2">Sign in to your Market Pro account</p>
        </div>

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

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        type={showPassword ? "text" : "password"}
                        placeholder="Enter your password"
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

            {/* <div className="flex items-center justify-between">
              <FormField
                control={form.control}
                name="remember"
                render={({ field }) => (
                  <div className="flex items-center space-x-2">
                    <input
                      id="remember"
                      type="checkbox"
                      className="rounded border-[#ADB5BD]"
                      checked={field.value}
                      onChange={field.onChange}
                    />
                    <Label htmlFor="remember" className="text-sm">
                      Remember me
                    </Label>
                  </div>
                )}
              />
              <Link
                to="/forgot-password"
                className="text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div> */}

            <Button type="submit" className="w-full">
              Sign In
            </Button>
          </form>
        </Form>

        {/* <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            Don't have an account?{" "}
            <Link to="/register" className="text-primary hover:underline font-medium">
              Sign up
            </Link>
          </p>
        </div> */}
      </div>
    </div>
  );
};

export default Login;