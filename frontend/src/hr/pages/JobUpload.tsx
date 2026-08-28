import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { HrShell } from "@/hr/components/HrShell";
import { JobTabs } from "@/hr/components/JobTabs";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { getJob, uploadCvs } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";

type Row = { name: string; status: "uploaded" | "parsing" | "scored" | "review" };

export default function JobUpload() {
  usePageTitle("Bulk CV upload — Screenwise");
  const { jobId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  const process = async (files: File[]) => {
    if (!files.length) return;
    const incoming: Row[] = files.map((f) => ({ name: f.name, status: "uploaded" }));
    setRows((prev) => [...prev, ...incoming]);
    await uploadCvs(jobId, files.map((f) => f.name));
    incoming.forEach((row, i) => {
      setTimeout(() => {
        setRows((prev) =>
          prev.map((r) => (r.name === row.name ? { ...r, status: "parsing" } : r)),
        );
      }, 400 + i * 200);
      setTimeout(
        () => {
          setRows((prev) =>
            prev.map((r) =>
              r.name === row.name
                ? { ...r, status: i % 7 === 6 ? "review" : "scored" }
                : r,
            ),
          );
        },
        1200 + i * 250,
      );
    });
  };

  const done = rows.length > 0 && rows.every((r) => r.status === "scored" || r.status === "review");
  const progress = rows.length
    ? Math.round(
        (rows.filter((r) => r.status === "scored" || r.status === "review").length / rows.length) *
          100,
      )
    : 0;

  return (
    <HrShell
      allow={["hr", "admin"]}
      title={jobQuery.data ? `Upload CVs — ${jobQuery.data.title}` : "Upload CVs"}
      description="Every uploaded candidate is tagged as HR-uploaded and joins the same rank board."
    >
      <JobTabs jobId={jobId} />

      <Card className="shadow-card">
        <CardContent className="pt-6">
          <label
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              process(Array.from(e.dataTransfer.files));
            }}
            className={`flex cursor-pointer flex-col items-center rounded-xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
              dragging ? "border-primary bg-primary-soft" : "border-border"
            }`}
          >
            <UploadCloud className="mb-3 h-7 w-7 text-primary" />
            <span className="font-medium">Drag and drop CVs here</span>
            <span className="mt-1 text-sm text-muted-foreground">
              PDF and DOCX, as many files as you like
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx"
              className="hidden"
              onChange={(e) => process(Array.from(e.target.files ?? []))}
            />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card className="mt-6 shadow-card">
          <CardContent className="space-y-3 pt-6">
            <Progress value={progress} />
            {rows.map((r) => (
              <div
                key={r.name}
                className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm"
              >
                <span className="truncate">{r.name}</span>
                {r.status === "review" ? (
                  <Badge className="gap-1 bg-warning-soft font-normal text-warning-foreground">
                    <AlertTriangle className="h-3 w-3" /> Needs manual review
                  </Badge>
                ) : r.status === "scored" ? (
                  <Badge className="gap-1 bg-success-soft font-normal text-success">
                    <CheckCircle2 className="h-3 w-3" /> Scored
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="font-normal capitalize">
                    {r.status}…
                  </Badge>
                )}
              </div>
            ))}
            {done ? (
              <Button className="w-full" onClick={() => navigate(`/jobs/${jobId}/board`)}>
                Go to the rank board
              </Button>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </HrShell>
  );
}
