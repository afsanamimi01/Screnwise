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
import { Dashboard } from "@/hr/pages/Dashboard";
import { JobsList } from "@/hr/pages/JobsList";
import { JobNew } from "@/hr/pages/JobNew";
import { JobEdit } from "@/hr/pages/JobEdit";
import { JobUpload } from "@/hr/pages/JobUpload";
import { JobBoard } from "@/hr/pages/JobBoard";
import { JobShortlist } from "@/hr/pages/JobShortlist";
import { JobEmail } from "@/hr/pages/JobEmail";
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
            <Route
              path="/apply/:jobId"
              element={
                <ProtectedRoute allow={["candidate"]}>
                  <ApplyForm />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-applications"
              element={
                <ProtectedRoute allow={["candidate"]}>
                  <MyApplications />
                </ProtectedRoute>
              }
            />
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <Dashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobsList />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/new"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobNew />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/edit"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobEdit />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/upload"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobUpload />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/board"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobBoard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/shortlist"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobShortlist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/jobs/:jobId/email"
              element={
                <ProtectedRoute allow={["hr", "admin"]}>
                  <JobEmail />
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
