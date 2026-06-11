import { useState } from "react";
import { Link } from "react-router-dom";
import { UserPlus, Mail, Lock, User, ArrowRight, Loader } from "lucide-react";
import { motion } from "framer-motion";
import { useUserStore } from "../../stores/useUserStore";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const signupSchema = z
  .object({
    name: z.string().min(1, "Full name is required"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords must match",
    path: ["confirmPassword"], // Roots the error to the confirmPassword field
  });

const SignUpPage = () => {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });
  const { signup, loading } = useUserStore();

  const onSubmit = (data) => {
    signup(data);
  };
  return (
    <div className="flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <motion.div
        className="sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      >
        <h2 className="mt-6 text-3xl font-extrabold text-center text-accent">
          Create your account
        </h2>
      </motion.div>

      <motion.div
        className="mt-8 sm:mx-auto sm:w-full sm:max-w-md"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 0.3, ease: "easeInOut" }}
      >
        <div className="px-4 py-8 border shadow bg-panel sm:rounded-lg sm:px-10 border-line">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label
                htmlFor="name"
                className="block text-sm font-medium text-muted"
              >
                Full name
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <User className="w-5 h-5 text-mutedAlt" aria-hidden="true" />
                </div>
                <input
                  id="name"
                  type="text"
                  {...register("name")}
                  className="block w-full px-3 py-2 pl-10 border rounded-md shadow-sm placeholder-mutedAlt bg-panelAlt border-line focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  placeholder="John Doe"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.name.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-muted"
              >
                Email address
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="w-5 h-5 text-mutedAlt" aria-hidden="true" />
                </div>
                <input
                  id="email"
                  type="text"
                  {...register("email")}
                  className="block w-full px-3 py-2 pl-10 border rounded-md shadow-sm placeholder-mutedAlt bg-panelAlt border-line focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  placeholder="you@example.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-muted"
              >
                Password
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-mutedAlt" aria-hidden="true" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register("password")}
                  className="block w-full px-3 py-2 pl-10 border rounded-md shadow-sm placeholder-mutedAlt bg-panelAlt border-line focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.password.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="confirmPassword"
                className="block text-sm font-medium text-muted"
              >
                Confirm Password
              </label>
              <div className="relative mt-1 rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Lock className="w-5 h-5 text-mutedAlt" aria-hidden="true" />
                </div>
                <input
                  id="confirmPassword"
                  type="password"
                  {...register("confirmPassword")}
                  className="block w-full px-3 py-2 pl-10 border rounded-md shadow-sm placeholder-mutedAlt bg-panelAlt border-line focus:outline-none focus:ring-accent focus:border-accent sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-500">
                  {errors.confirmPassword.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              className="flex justify-center w-full px-4 py-2 text-sm font-medium transition duration-150 ease-in-out border border-transparent rounded-md shadow-sm text-ink bg-accent hover:bg-accentHover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader
                    className="w-5 h-5 mr-2 animate-spin"
                    aria-hidden="true"
                  />
                  Loading...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5 mr-2" aria-hidden="true" />
                  Sign up
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-sm text-center text-mutedAlt">
            Already have an account?{" "}
            <Link
              to="/login"
              className="font-medium text-accent hover:text-accentSoft"
            >
              Login here <ArrowRight className="inline w-4 h-4" />
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};
export default SignUpPage;
