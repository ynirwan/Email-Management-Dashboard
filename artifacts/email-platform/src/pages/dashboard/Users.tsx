import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, Button, Input, Badge, Modal, Label, Spinner } from "@/components/ui/core";
import { Search, MoreVertical, Edit2, Trash2, ShieldAlert } from "lucide-react";
import { useUsers, useUpdateUser, useUpdateUserPlan, useDeleteUser } from "@/hooks/use-users";
import { formatNumber } from "@/lib/utils";
import { format } from "date-fns";

export function Users() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useUsers(1, 50, search);
  
  const [editingUser, setEditingUser] = useState<any>(null);
  const [deletingUser, setDeletingUser] = useState<any>(null);

  const updateMutation = useUpdateUser();
  const updatePlanMutation = useUpdateUserPlan();
  const deleteMutation = useDeleteUser();

  const handleToggleStatus = (user: any) => {
    updateMutation.mutate({ id: user.id, data: { isActive: !user.isActive } });
  };

  const handleSavePlan = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    updatePlanMutation.mutate(
      { id: editingUser.id, plan: formData.get("plan") as string },
      { onSuccess: () => setEditingUser(null) }
    );
  };

  const confirmDelete = () => {
    if (deletingUser) {
      deleteMutation.mutate(deletingUser.id, {
        onSuccess: () => setDeletingUser(null)
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold">User Management</h1>
          <p className="text-muted-foreground mt-1">Manage accounts, plans, and access.</p>
        </div>
        
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search users..." 
            className="pl-10"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Card className="overflow-hidden border-border/50">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-muted-foreground uppercase bg-muted/50 border-b border-border/50">
              <tr>
                <th className="px-6 py-4 font-semibold">User</th>
                <th className="px-6 py-4 font-semibold">Status</th>
                <th className="px-6 py-4 font-semibold">Plan</th>
                <th className="px-6 py-4 font-semibold">Usage</th>
                <th className="px-6 py-4 font-semibold">Joined</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <Spinner className="mx-auto" />
                  </td>
                </tr>
              ) : data?.users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-muted-foreground">
                    No users found matching "{search}"
                  </td>
                </tr>
              ) : (
                data?.users.map((user) => (
                  <tr key={user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold">
                          {user.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground">{user.name}</div>
                          <div className="text-xs text-muted-foreground">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button onClick={() => handleToggleStatus(user)} className="focus:outline-none">
                        <Badge variant={user.isActive ? "success" : "default"} className={user.isActive ? "" : "bg-muted text-muted-foreground"}>
                          {user.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </button>
                    </td>
                    <td className="px-6 py-4 capitalize font-medium">
                      {user.plan}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center justify-between text-xs w-24">
                          <span className="text-muted-foreground">Emails</span>
                          <span className="font-medium">{formatNumber(user.emailsUsed)}</span>
                        </div>
                        <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary" style={{ width: `${Math.min(100, (user.emailsUsed/user.emailsLimit)*100)}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(user.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => setEditingUser(user)} title="Edit Plan">
                          <Edit2 className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeletingUser(user)} title="Delete User">
                          <Trash2 className="w-4 h-4 text-destructive/70 hover:text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Plan Modal */}
      <Modal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        title="Change Plan"
        description={`Update subscription tier for ${editingUser?.name}`}
      >
        <form onSubmit={handleSavePlan} className="space-y-6">
          <div className="space-y-2">
            <Label>Select Plan</Label>
            <select 
              name="plan" 
              defaultValue={editingUser?.plan}
              className="flex h-12 w-full rounded-xl border-2 border-input bg-background px-4 py-2 text-sm focus-visible:outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/10 transition-all capitalize"
            >
              <option value="starter">Starter</option>
              <option value="pro">Pro</option>
              <option value="agency">Agency</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button type="submit" isLoading={updatePlanMutation.isPending}>Save Changes</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Modal */}
      <Modal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        title="Delete User"
      >
        <div className="flex flex-col items-center text-center space-y-4 py-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 text-destructive flex items-center justify-center mb-2">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <p className="text-lg font-medium text-foreground">Are you absolutely sure?</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            This action cannot be undone. This will permanently delete <strong>{deletingUser?.name}</strong>'s account and remove all their data from our servers.
          </p>
        </div>
        <div className="flex justify-end gap-3 mt-8">
          <Button variant="outline" onClick={() => setDeletingUser(null)}>Cancel</Button>
          <Button variant="destructive" onClick={confirmDelete} isLoading={deleteMutation.isPending}>Yes, delete user</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
