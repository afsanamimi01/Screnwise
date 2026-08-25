import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import "./CandidateLayout.css";

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
    <div className="candidate-layout">
      <Sidebar />
      <div className="candidate-layout__body">
        <Navbar />
        <main className="candidate-layout__main">
          <div className="candidate-layout__main-header">
            <div>
              <h1 className="candidate-layout__title">{title}</h1>
              {description ? <p className="candidate-layout__description">{description}</p> : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
        <footer className="candidate-layout__footer">
          <Users className="candidate-layout__footer-icon" /> Demo environment — all data is mock
          data and emails are simulated.
        </footer>
      </div>
    </div>
  );
}
