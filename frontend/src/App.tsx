import { Component, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "@/shared/lib/auth";
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
import Team from "@/manager/pages/Team";
import Billing from "@/manager/pages/Billing";
import ManagerDashboard from "@/manager/pages/Dashboard";
import ManagerJobs from "@/manager/pages/Jobs";
import ManagerJobNew from "@/manager/pages/JobNew";
import ManagerJobEdit from "@/manager/pages/JobEdit";
import ManagerJobBoard from "@/manager/pages/JobBoard";
import ManagerJobShortlist from "@/manager/pages/JobShortlist";
import ManagerJobUpload from "@/manager/pages/JobUpload";
import ManagerJobEmail from "@/manager/pages/JobEmail";
import AdminDashboard from "@/admin/pages/Dashboard";
import AdminCompanies from "@/admin/pages/Companies";
import AdminUsers from "@/admin/pages/Users";
import AdminAuditLog from "@/admin/pages/AuditLog";
import AdminPricing from "@/admin/pages/Pricing";

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

/** Recruiter pages: managers get their own copy, HR keeps theirs. */
function Recruiter({ hr, manager }: { hr: ReactNode; manager: ReactNode }) {
  const { user } = useAuth();
  return <>{user?.role === "manager" ? manager : hr}</>;
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

              {/* recruiter workspace — hr and manager have their own page copies */}
              <Route
                path="/dashboard"
                element={<Recruiter hr={<Dashboard />} manager={<ManagerDashboard />} />}
              />

              <Route
                path="/jobs"
                element={<Recruiter hr={<Jobs />} manager={<ManagerJobs />} />}
              />
              <Route
                path="/jobs/new"
                element={<Recruiter hr={<JobNew />} manager={<ManagerJobNew />} />}
              />
              <Route
                path="/jobs/:jobId/edit"
                element={<Recruiter hr={<JobEdit />} manager={<ManagerJobEdit />} />}
              />
              <Route
                path="/jobs/:jobId/board"
                element={<Recruiter hr={<JobBoard />} manager={<ManagerJobBoard />} />}
              />
              <Route
                path="/jobs/:jobId/shortlist"
                element={<Recruiter hr={<JobShortlist />} manager={<ManagerJobShortlist />} />}
              />
              <Route
                path="/jobs/:jobId/upload"
                element={<Recruiter hr={<JobUpload />} manager={<ManagerJobUpload />} />}
              />
              <Route
                path="/jobs/:jobId/email"
                element={<Recruiter hr={<JobEmail />} manager={<ManagerJobEmail />} />}
              />

              {/* independent CV screening — same pages, kind: "screening" */}
              <Route
                path="/screen"
                element={<Recruiter hr={<Jobs />} manager={<ManagerJobs />} />}
              />
              <Route
                path="/screen/new"
                element={<Recruiter hr={<JobNew />} manager={<ManagerJobNew />} />}
              />
              <Route
                path="/screen/:jobId/edit"
                element={<Recruiter hr={<JobEdit />} manager={<ManagerJobEdit />} />}
              />
              <Route
                path="/screen/:jobId/board"
                element={<Recruiter hr={<JobBoard />} manager={<ManagerJobBoard />} />}
              />
              <Route
                path="/screen/:jobId/shortlist"
                element={<Recruiter hr={<JobShortlist />} manager={<ManagerJobShortlist />} />}
              />
              <Route
                path="/screen/:jobId/upload"
                element={<Recruiter hr={<JobUpload />} manager={<ManagerJobUpload />} />}
              />
              <Route
                path="/screen/:jobId/email"
                element={<Recruiter hr={<JobEmail />} manager={<ManagerJobEmail />} />}
              />

              {/* company manager only */}
              <Route path="/team" element={<Team />} />
              <Route path="/billing" element={<Billing />} />

              {/* super admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/companies" element={<AdminCompanies />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/audit" element={<AdminAuditLog />} />
              <Route path="/admin/pricing" element={<AdminPricing />} />

              <Route path="*" element={<NotFound />} />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryClientProvider>
  );
}
