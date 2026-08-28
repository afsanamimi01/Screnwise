import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shell } from "@/admin/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { getUsers, updateUser } from "@/shared/lib/api";
import { roleLabels } from "@/shared/lib/auth";
import { usePageTitle } from "@/shared/lib/use-page-title";
import "./Users.css";

/** Table columns — reorder / rename here. */
const COLUMNS = ["Name", "Email", "Role", "Company", "Joined", "Active"] as const;

export default function Users() {
  usePageTitle("Users — Screenwise");
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const setActive = async (id: string, active: boolean) => {
    try {
      await updateUser({ id, active });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("Account updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the account.");
    }
  };

  return (
    <Shell allow={["superadmin"]}>
      <main className="users">
        <div className="users__intro">
          <h1 className="users__intro-title">Users</h1>
          <p className="users__intro-text">
            Every account on the platform. Roles and company membership are set at signup — you can
            deactivate an account here.
          </p>
        </div>

        {isLoading ? <LoadingRows rows={4} /> : null}
        {isError ? <ErrorState message="We couldn't load users." onRetry={() => refetch()} /> : null}

        {data ? (
          <div className="users__table-wrap">
            <table className="users__table">
              <thead>
                <tr>
                  {COLUMNS.map((c) => (
                    <th key={c}>{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.map((u) => (
                  <tr key={u.id}>
                    <td className="users__cell--name">{u.name}</td>
                    <td className="users__cell--muted">{u.email}</td>
                    <td>
                      <span className="users__role">{roleLabels[u.role]}</span>
                    </td>
                    <td className="users__cell--muted">{u.companyName ?? "—"}</td>
                    <td className="users__cell--muted">{u.createdAt}</td>
                    <td>
                      <label className="users__toggle">
                        <input
                          type="checkbox"
                          className="users__switch"
                          checked={u.active}
                          onChange={(e) => setActive(u.id, e.target.checked)}
                        />
                        <span className="users__pill">{u.active ? "active" : "inactive"}</span>
                      </label>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </main>
    </Shell>
  );
}
