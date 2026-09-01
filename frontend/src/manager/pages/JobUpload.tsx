import { useQuery } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { JobTabs } from "@/manager/components/JobTabs";
import { Shell } from "@/manager/components/Shell";
import { getJob, uploadCvs } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobUpload.css";

type Row = { name: string; status: "scoring" | "scored" | "review"; score?: number };

export default function JobUpload() {
  usePageTitle("Bulk CV upload - Screenwise");
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const base = useWorkspaceBase();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  const process = async (files: File[]) => {
    if (!files.length) return;
    const incoming: Row[] = files.map((f) => ({ name: f.name, status: "scoring" }));
    setRows((prev) => [...prev, ...incoming]);
    try {
      const scored = await uploadCvs(jobId, files);
      setRows((prev) =>
        prev.map((r) => {
          if (!incoming.some((x) => x.name === r.name)) return r;
          const hit = scored.find((s) => s.cvFileName === r.name);
          if (!hit) return r;
          return { ...r, status: hit.needsManualReview ? "review" : "scored", score: hit.score };
        }),
      );
    } catch {
      setRows((prev) =>
        prev.map((r) => (incoming.some((x) => x.name === r.name) ? { ...r, status: "review" } : r)),
      );
    }
  };

  const done = rows.length > 0 && rows.every((r) => r.status === "scored" || r.status === "review");
  const progress = rows.length
    ? Math.round(
        (rows.filter((r) => r.status === "scored" || r.status === "review").length / rows.length) *
          100,
      )
    : 0;

  return (
    <Shell allow={["manager"]}>
      <div className="manager-upload">
        <div className="manager-upload__intro">
          <h1 className="manager-upload__intro-title">
            {jobQuery.data ? `Upload CVs - ${jobQuery.data.title}` : "Upload CVs"}
          </h1>
          <p className="manager-upload__intro-text">
            Every uploaded candidate is tagged as HR-uploaded and joins the same rank board.
          </p>
        </div>

        <JobTabs jobId={jobId} />

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
          className={"manager-upload__drop" + (dragging ? " manager-upload__drop--active" : "")}
        >
          <UploadCloud size={28} className="manager-upload__drop-icon" />
          <span className="manager-upload__drop-title">Drag and drop CVs here</span>
          <span className="manager-upload__drop-hint">
            PDF and DOCX, as many files as you like
          </span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx"
            className="manager-upload__file"
            onChange={(e) => process(Array.from(e.target.files ?? []))}
          />
        </label>

        {rows.length > 0 ? (
          <div className="manager-upload__panel">
            <div className="manager-upload__track">
              <div className="manager-upload__bar" style={{ width: `${progress}%` }} />
            </div>
            {rows.map((r) => (
              <div key={r.name} className="manager-upload__row">
                <span className="manager-upload__row-name">{r.name}</span>
                {r.status === "review" ? (
                  <span className="manager-upload__tag manager-upload__tag--review">
                    <AlertTriangle size={12} /> Needs manual review
                  </span>
                ) : r.status === "scored" ? (
                  <span className="manager-upload__tag manager-upload__tag--scored">
                    <CheckCircle2 size={12} /> Scored
                    {typeof r.score === "number" ? ` · ${r.score}%` : ""}
                  </span>
                ) : (
                  <span className="manager-upload__tag">{r.status}…</span>
                )}
              </div>
            ))}
            {done ? (
              <button
                type="button"
                className="manager-upload__btn"
                onClick={() => navigate(`${base}/${jobId}/board`)}
              >
                Go to the rank board
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </Shell>
  );
}
