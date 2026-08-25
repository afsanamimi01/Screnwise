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
import "./App.css";

function NotFound() {
  return (
    <div className="not-found-page">
      <div className="not-found-page__content">
        <h1 className="not-found-page__code">404</h1>
        <h2 className="not-found-page__title">Page not found</h2>
        <p className="not-found-page__description">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="not-found-page__action">
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
