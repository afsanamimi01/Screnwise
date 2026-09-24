import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { AlertTriangle, CheckCircle2, UploadCloud } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { JobTabs } from "@/hr/components/JobTabs";
import { Shell } from "@/hr/components/Shell";
import { getJob, getMyCompany, uploadCvs } from "@/shared/lib/api";
import { usePageTitle } from "@/shared/lib/use-page-title";
import { useWorkspaceBase } from "@/shared/lib/workspace";
import "./JobUpload.css";

type Row = { name: string; status: "scoring" | "scored" | "review"; score?: number };

export default function JobUpload() {
  usePageTitle("Bulk CV upload - Screenwise");
  const { jobId = "" } = useParams();
  const navigate = useNavigate();
  const base = useWorkspaceBase();
  const queryClient = useQueryClient();
  const jobQuery = useQuery({ queryKey: ["job", jobId], queryFn: () => getJob(jobId) });
  const company = useQuery({ queryKey: ["company"], queryFn: getMyCompany });
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);

  const screeningLimit = company.data?.cvScreeningLimit ?? null;
  const screeningRemaining = company.data?.cvScreeningRemaining ?? null;
  const quotaExhausted = screeningLimit != null && (screeningRemaining ?? 0) <= 0;

  const process = async (files: File[]) => {
    if (!files.length || quotaExhausted) return;
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
      await queryClient.invalidateQueries({ queryKey: ["company"] });
    } catch (err) {
      // Nothing was screened - the whole batch was refused (e.g. the
      // monthly screening limit), so drop the optimistic rows rather than
      // showing them as scored-but-flagged.
      setRows((prev) => prev.filter((r) => !incoming.some((x) => x.name === r.name)));
      toast.error(err instanceof Error ? err.message : "Could not upload the CVs.");
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
    <Shell allow={["hr", "manager"]}>
      <div className="hr-upload">
        <div className="hr-upload__intro">
          <h1 className="hr-upload__intro-title">
            {jobQuery.data ? `Upload CVs - ${jobQuery.data.title}` : "Upload CVs"}
          </h1>
          <p className="hr-upload__intro-text">
            Every uploaded candidate is tagged as HR-uploaded and joins the same rank board.
          </p>
        </div>

        {company.data ? (
          <div className="hr-upload__quota">
            CV screenings this month:{" "}
            <span className="hr-upload__quota-num">
              {company.data.cvScreeningUsed}
              {screeningLimit != null ? ` / ${screeningLimit}` : " (unlimited)"}
            </span>
            {quotaExhausted ? (
              <span className="hr-upload__quota-warn">
                Monthly limit reached - upgrade the plan to screen more this month
              </span>
            ) : null}
          </div>
        ) : null}

        <JobTabs jobId={jobId} />

        <label
          onDragOver={(e) => {
            e.preventDefault();
            if (!quotaExhausted) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            process(Array.from(e.dataTransfer.files));
          }}
          className={
            "hr-upload__drop" +
            (dragging ? " hr-upload__drop--active" : "") +
            (quotaExhausted ? " hr-upload__drop--disabled" : "")
          }
        >
          <UploadCloud size={28} className="hr-upload__drop-icon" />
          <span className="hr-upload__drop-title">
            {quotaExhausted ? "Monthly screening limit reached" : "Drag and drop CVs here"}
          </span>
          <span className="hr-upload__drop-hint">PDF and DOCX, as many files as you like</span>
          <input
            type="file"
            multiple
            accept=".pdf,.docx"
            className="hr-upload__file"
            disabled={quotaExhausted}
            onChange={(e) => process(Array.from(e.target.files ?? []))}
          />
        </label>

        {rows.length > 0 ? (
          <div className="hr-upload__panel">
            <div className="hr-upload__track">
              <div className="hr-upload__bar" style={{ width: `${progress}%` }} />
            </div>
            {rows.map((r) => (
              <div key={r.name} className="hr-upload__row">
                <span className="hr-upload__row-name">{r.name}</span>
                {r.status === "review" ? (
                  <span className="hr-upload__tag hr-upload__tag--review">
                    <AlertTriangle size={12} /> Needs manual review
                  </span>
                ) : r.status === "scored" ? (
                  <span className="hr-upload__tag hr-upload__tag--scored">
                    <CheckCircle2 size={12} /> Scored
                    {typeof r.score === "number" ? ` · ${r.score}%` : ""}
                  </span>
                ) : (
                  <span className="hr-upload__tag">{r.status}…</span>
                )}
              </div>
            ))}
            {done ? (
              <button
                type="button"
                className="hr-upload__btn"
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
