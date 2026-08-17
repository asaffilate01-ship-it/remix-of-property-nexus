import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Copy, Loader2, MailPlus, Shield, Trash2, UserRound, Users } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TEAM_ROLES,
  createTeamInvitation,
  getTeamOverview,
  removeTeamMember,
  revokeTeamInvitation,
  updateTeamMember,
  type TeamRole,
} from "@/lib/team.functions";

export const Route = createFileRoute("/_authenticated/team")({
  head: () => ({ meta: [{ title: "Team — Gabley" }] }),
  component: TeamPage,
});

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  manager: "Manager",
  agent: "Agent",
  accounts: "Accounts",
  viewer: "Viewer",
};

type PendingInvitation = {
  id: string;
  email: string;
  role: TeamRole;
  expires_at: string;
  created_at: string;
};

function TeamPage() {
  const fetchOverview = useServerFn(getTeamOverview);
  const createInvite = useServerFn(createTeamInvitation);
  const updateMember = useServerFn(updateTeamMember);
  const removeMember = useServerFn(removeTeamMember);
  const revokeInvite = useServerFn(revokeTeamInvitation);
  const [overview, setOverview] = useState<Awaited<ReturnType<typeof fetchOverview>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("agent");
  const [busy, setBusy] = useState<string | null>(null);
  const [createdInvite, setCreatedInvite] = useState<{ url: string; expiresAt: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setOverview(await fetchOverview({}));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load the team");
    } finally {
      setLoading(false);
    }
  }, [fetchOverview]);

  useEffect(() => {
    void load();
  }, [load]);

  const invite = async () => {
    setBusy("invite");
    try {
      const result = await createInvite({ data: { email, role } });
      if ("error" in result) throw new Error(result.error);
      setCreatedInvite({ url: result.inviteUrl, expiresAt: result.expiresAt });
      setEmail("");
      setRole("agent");
      setInviteOpen(false);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to create invitation");
    } finally {
      setBusy(null);
    }
  };

  const copyInvite = async () => {
    if (!createdInvite) return;
    await navigator.clipboard.writeText(createdInvite.url);
    toast.success("Invitation link copied");
  };

  const changeRole = async (memberId: string, nextRole: TeamRole) => {
    setBusy(memberId);
    const result = await updateMember({ data: { memberId, role: nextRole } });
    if ("error" in result) toast.error(result.error);
    else toast.success("Role updated");
    await load();
    setBusy(null);
  };

  const remove = async (memberId: string) => {
    if (
      !window.confirm(
        "Remove this person from the agency? Their account will remain active, but agency access ends immediately.",
      )
    )
      return;
    setBusy(memberId);
    const result = await removeMember({ data: { memberId } });
    if ("error" in result) toast.error(result.error);
    else toast.success("Team access removed");
    await load();
    setBusy(null);
  };

  const revoke = async (invitationId: string) => {
    setBusy(invitationId);
    const result = await revokeInvite({ data: { invitationId } });
    if ("error" in result) toast.error(result.error);
    else toast.success("Invitation revoked");
    await load();
    setBusy(null);
  };

  if (loading) {
    return <div className="h-52 rounded-xl bg-muted animate-pulse" />;
  }
  if (!overview?.agencyId) {
    return (
      <Card className="border-dashed border-2 bg-transparent">
        <CardContent className="p-12 text-center text-muted-foreground">
          Create or join an agency before managing a team.
        </CardContent>
      </Card>
    );
  }

  const capacity = overview.seatLimit
    ? Math.min(100, (overview.occupiedSeats / overview.seatLimit) * 100)
    : 0;
  const atLimit = overview.seatLimit != null && overview.occupiedSeats >= overview.seatLimit;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`People with access to ${overview.agencyName}.`}
        actions={
          overview.isOwner ? (
            <Button
              onClick={() => setInviteOpen(true)}
              disabled={atLimit || !overview.hasSubscriptionAccess}
            >
              <MailPlus className="mr-2 h-4 w-4" /> Invite team member
            </Button>
          ) : undefined
        }
      />

      <Card className="border-0 shadow-card">
        <CardContent className="p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 font-semibold">
                <Users className="h-4 w-4 text-primary" /> Seat usage
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {overview.occupiedSeats} of {overview.seatLimit ?? "unlimited"} seats used
                {overview.invitations.length > 0 && ` · ${overview.invitations.length} pending`}
              </p>
            </div>
            {atLimit && <Badge variant="destructive">Plan limit reached</Badge>}
          </div>
          {overview.seatLimit && <Progress value={capacity} className="mt-4" />}
        </CardContent>
      </Card>

      {!overview.isOwner && (
        <Card className="border-0 bg-muted/40">
          <CardContent className="p-4 text-sm text-muted-foreground">
            Team management is read-only. Only the agency owner can invite people or change access.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3">
        {overview.members.map((member) => (
          <Card key={member.id} className="border-0 shadow-card">
            <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                {member.isOwner ? (
                  <Shield className="h-5 w-5" />
                ) : (
                  <UserRound className="h-5 w-5" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold truncate">{member.name}</div>
                <div className="text-sm text-muted-foreground truncate">{member.email}</div>
              </div>
              {member.isOwner || !overview.isOwner ? (
                <Badge variant="secondary">{ROLE_LABELS[member.role] ?? member.role}</Badge>
              ) : (
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    disabled={busy === member.id}
                    onValueChange={(value) => void changeRole(member.id, value as TeamRole)}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEAM_ROLES.map((item) => (
                        <SelectItem key={item} value={item}>
                          {ROLE_LABELS[item]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive"
                    disabled={busy === member.id}
                    onClick={() => void remove(member.id)}
                    aria-label={`Remove ${member.name}`}
                  >
                    {busy === member.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {overview.isOwner && overview.invitations.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-semibold text-lg">Pending invitations</h2>
          {(overview.invitations as PendingInvitation[]).map((invitation) => (
            <Card key={invitation.id} className="border-dashed">
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
                <MailPlus className="h-5 w-5 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium truncate">{invitation.email}</div>
                  <div className="text-xs text-muted-foreground">
                    {ROLE_LABELS[invitation.role]} · expires{" "}
                    {new Date(invitation.expires_at).toLocaleDateString("en-GB")}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === invitation.id}
                  onClick={() => void revoke(invitation.id)}
                >
                  Revoke
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite a team member</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            The invitation reserves one plan seat for seven days. Copy the secure link and send it
            to this email address.
          </p>
          <div className="space-y-2">
            <Label htmlFor="team-email">Email</Label>
            <Input
              id="team-email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select value={role} onValueChange={(value) => setRole(value as TeamRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TEAM_ROLES.map((item) => (
                  <SelectItem key={item} value={item}>
                    {ROLE_LABELS[item]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={() => void invite()} disabled={busy === "invite" || !email}>
              {busy === "invite" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create invitation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(createdInvite)}
        onOpenChange={(open) => !open && setCreatedInvite(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invitation ready</DialogTitle>
          </DialogHeader>
          <div className="rounded-lg bg-success/10 p-4 text-sm">
            <div className="flex items-center gap-2 font-medium text-success">
              <Check className="h-4 w-4" /> Secure link created
            </div>
            <p className="mt-1 text-muted-foreground">
              For security, this link is shown only once and expires in seven days.
            </p>
          </div>
          <Input
            value={createdInvite?.url ?? ""}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
          <DialogFooter>
            <Button onClick={() => void copyInvite()}>
              <Copy className="mr-2 h-4 w-4" /> Copy invitation link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
