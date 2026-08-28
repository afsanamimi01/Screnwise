import { Component, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/shared/lib/auth";
import { Toaster } from "@/shared/components/ui/sonner";
import Landing from "@/shared/pages/Landing";
import Login from "@/shared/pages/Login";
import Register from "@/shared/pages/Register";
import NotFound from "@/shared/pages/NotFound";
import Apply from "@/candidate/pages/Apply";
import MyApplications from "@/candidate/pages/MyApplications";
import OpenRoles from "@/candidate/pages/OpenRoles";
import Dashboard from "@/hr/pages/Dashboard";
import Jobs from "@/hr/pages/Jobs";
import JobNew from "@/hr/pages/JobNew";
import JobEdit from "@/hr/pages/JobEdit";
import JobBoard from "@/hr/pages/JobBoard";
import JobShortlist from "@/hr/pages/JobShortlist";
import JobUpload from "@/hr/pages/JobUpload";
import JobEmail from "@/hr/pages/JobEmail";
import ReviewShortlists from "@/manager/pages/ReviewShortlists";
import Users from "@/admin/pages/Users";
import AuditLog from "@/admin/pages/AuditLog";

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  override state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  override componentDidCatch(error: Error) {
    console.error(error);
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            This page didn't load
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => this.setState({ error: null })}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              Go home
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default function App() {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              {/* shared / public */}
              <Route path="/" element={<Landing />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              {/* candidate */}
              <Route path="/apply/:jobId" element={<Apply />} />
              <Route path="/my-applications" element={<MyApplications />} />
              <Route path="/open-roles" element={<OpenRoles />} />

              {/* hr / recruiter */}
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/new" element={<JobNew />} />
              <Route path="/jobs/:jobId/edit" element={<JobEdit />} />
              <Route path="/jobs/:jobId/board" element={<JobBoard />} />
              <Route path="/jobs/:jobId/shortlist" element={<JobShortlist />} />
              <Route path="/jobs/:jobId/upload" element={<JobUpload />} />
              <Route path="/jobs/:jobId/email" element={<JobEmail />} />

              {/* manager */}
              <Route path="/manager" element={<ReviewShortlists />} />

              {/* admin */}
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/audit" element={<AuditLog />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
