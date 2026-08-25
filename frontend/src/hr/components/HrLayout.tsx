import type { ReactNode } from "react";
import { Users } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Navbar } from "./Navbar";
import "./HrLayout.css";

export function HrLayout({
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
    <div className="hr-layout">
      <Sidebar />
      <div className="hr-layout__body">
        <Navbar />
        <main className="hr-layout__main">
          <div className="hr-layout__main-header">
            <div>
              <h1 className="hr-layout__title">{title}</h1>
              {description ? <p className="hr-layout__description">{description}</p> : null}
            </div>
            {actions}
          </div>
          {children}
        </main>
        <footer className="hr-layout__footer">
          <Users className="hr-layout__footer-icon" /> Demo environment — all data is mock data and
          emails are simulated.
        </footer>
      </div>
    </div>
  );
}
