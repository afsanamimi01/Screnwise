import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/shared/lib/auth";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { Toaster } from "@/shared/components/ui/sonner";
import { GoHomeButton } from "@/shared/components/buttons/Buttons";
import { Landing } from "@/shared/pages/Landing";
import { Login } from "@/shared/pages/Login";
import { Register } from "@/shared/pages/Register";
import { ApplyForm } from "@/candidate/pages/ApplyForm";
import { MyApplications } from "@/candidate/pages/MyApplications";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <GoHomeButton />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/apply/:jobId" element={<ApplyForm />} />
            <Route
              path="/my-applications"
              element={
                <ProtectedRoute allow={["candidate"]}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
