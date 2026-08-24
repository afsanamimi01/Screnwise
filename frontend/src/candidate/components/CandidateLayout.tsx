import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";

export function CandidateLayout({
  children,
  title,
  description,
  actions,
}: {
  children: ReactNode;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen w-full bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Navbar />
        <main className="mx-auto w-full max-w-7xl flex-1 px-5 py-7 md:px-8">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{title}</h1>
              {description ? (
                <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
              ) : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
        <footer className="border-t px-5 py-4 text-xs text-muted-foreground md:px-8">
          <Users className="mr-1 inline h-3 w-3" /> Demo environment — all data is mock data and
          emails are simulated.
        </footer>
      </div>
    </div>
  );
}
