import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { HrLayout } from "@/hr/components/HrLayout";
import { JobTabs } from "@/hr/components/JobTabs";
import { Badge } from "@/shared/components/ui/badge";
import { Card, CardContent } from "@/shared/components/ui/card";
import { Progress } from "@/shared/components/ui/progress";
import { GoToRankBoardButton } from "@/hr/components/buttons/Buttons";
import { getJob, uploadCvs } from "@/shared/lib/api";
import { useAuth } from "@/shared/lib/auth";
import "./JobUpload.css";

type Row = { name: string; status: "uploaded" | "parsing" | "scored" | "review" };

export function JobUpload() {
  const { jobId = "" } = useParams<{ jobId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    document.title = "Bulk CV upload — Screenwise";
  }, []);

  const process = async (files: File[]) => {
    if (!files.length) return;
    const incoming: Row[] = files.map((f) => ({ name: f.name, status: "uploaded" }));
    setRows((prev) => [...prev, ...incoming]);
    await uploadCvs(jobId, files.map((f) => f.name), user?.name ?? "HR");
    incoming.forEach((row, i) => {
      setTimeout(() => {
        setRows((prev) => prev.map((r) => (r.name === row.name ? { ...r, status: "parsing" } : r)));
      }, 400 + i * 200);
      setTimeout(
        () => {
          setRows((prev) =>
            prev.map((r) => (r.name === row.name ? { ...r, status: i % 7 === 6 ? "review" : "scored" } : r)),
          );
        },
        1200 + i * 250,
      );
    });
  };

  const done = rows.length > 0 && rows.every((r) => r.status === "scored" || r.status === "review");
  const progress = rows.length
    ? Math.round(
        (rows.filter((r) => r.status === "scored" || r.status === "review").length / rows.length) * 100,
      )
    : 0;

  return (
    <HrLayout
      title={jobQuery.data ? `Upload CVs — ${jobQuery.data.title}` : "Upload CVs"}
      description="Every uploaded candidate is tagged as HR-uploaded and joins the same rank board."
    >
      <JobTabs jobId={jobId} />

      <Card className="job-upload__dropzone-card">
        <CardContent className="job-upload__dropzone-content">
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
            className={
              dragging
                ? "job-upload__dropzone job-upload__dropzone--active"
                : "job-upload__dropzone"
            }
          >
            <UploadCloud className="job-upload__dropzone-icon" />
            <span className="job-upload__dropzone-title">Drag and drop CVs here</span>
            <span className="job-upload__dropzone-subtitle">
              PDF and DOCX, as many files as you like
            </span>
            <input
              type="file"
              multiple
              accept=".pdf,.docx"
              className="job-upload__hidden-input"
              onChange={(e) => process(Array.from(e.target.files ?? []))}
            />
          </label>
        </CardContent>
      </Card>

      {rows.length > 0 ? (
        <Card className="job-upload__progress-card">
          <CardContent className="job-upload__progress-content">
            <Progress value={progress} />
            {rows.map((r) => (
              <div key={r.name} className="job-upload__row">
                <span className="job-upload__row-name">{r.name}</span>
                {r.status === "review" ? (
                  <Badge className="job-upload__badge job-upload__badge--review">
                    <AlertTriangle className="job-upload__badge-icon" /> Needs manual review
                  </Badge>
                ) : r.status === "scored" ? (
                  <Badge className="job-upload__badge job-upload__badge--scored">
                    <CheckCircle2 className="job-upload__badge-icon" /> Scored
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="job-upload__badge job-upload__badge--pending">
                    {r.status}…
                  </Badge>
                )}
              </div>
            ))}
            {done ? <GoToRankBoardButton onClick={() => navigate(`/jobs/${jobId}/board`)} /> : null}
          </CardContent>
        </Card>
      ) : null}
    </HrLayout>
  );
}
