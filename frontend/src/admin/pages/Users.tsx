import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Shell } from "@/admin/components/Shell";
import { ErrorState, LoadingRows } from "@/shared/components/StateViews";
import { Badge } from "@/shared/components/ui/badge";
import { Card } from "@/shared/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { getUsers, updateUser } from "@/shared/lib/api";
import { roleLabels, useAuth } from "@/shared/lib/auth";
import type { Role } from "@/shared/lib/types";
import { usePageTitle } from "@/shared/lib/use-page-title";

/** Column headers for the users table, left to right. */
const COLUMNS = ["Name", "Email", "Role", "Joined", "Active"] as const;

export default function Users() {
  usePageTitle("Users and roles — Screenwise");
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, refetch } = useQuery({ queryKey: ["users"], queryFn: getUsers });

  const save = async (id: string, patch: Partial<{ role: Role; active: boolean }>) => {
    try {
      await updateUser({ id, ...patch });
      await queryClient.invalidateQueries({ queryKey: ["users"] });
      toast.success("User updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the user.");
    }
  };

  return (
    <Shell
      allow={["admin"]}
      title="Users and roles"
      description="Change a role or deactivate an account."
    >
      {isLoading ? <LoadingRows rows={4} /> : null}
      {isError ? <ErrorState message="We couldn't load users." onRetry={() => refetch()} /> : null}
      {data ? (
        <Card className="overflow-hidden p-0 shadow-card">
          <Table>
            <TableHeader>
              <TableRow>
                {COLUMNS.map((c) => (
                  <TableHead key={c}>{c}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell>
                    <Select value={u.role} onValueChange={(v) => save(u.id, { role: v as Role })}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {(Object.keys(roleLabels) as Role[]).map((r) => (
                          <SelectItem key={r} value={r}>
                            {roleLabels[r]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.createdAt}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={u.active}
                        onCheckedChange={(v) => save(u.id, { active: v })}
                      />
                      <Badge variant="outline" className="font-normal">
                        {u.active ? "active" : "inactive"}
                      </Badge>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : null}
    </Shell>
  );
}
