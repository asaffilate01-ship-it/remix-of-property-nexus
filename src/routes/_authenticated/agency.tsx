import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getAgencyProfile, saveAgencyProfile } from "@/lib/agency.functions";

type AgencyForm = {
  name: string;
  description: string;
  phone: string;
  email: string;
  website: string;
  logo_url: string;
  city: string;
};

const emptyForm: AgencyForm = {
  name: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  logo_url: "",
  city: "",
};

export const Route = createFileRoute("/_authenticated/agency")({
  head: () => ({ meta: [{ title: "Agency profile — Gabley" }] }),
  component: AgencyPage,
});

function AgencyPage() {
  const fetchProfile = useServerFn(getAgencyProfile);
  const persistProfile = useServerFn(saveAgencyProfile);
  const [agency, setAgency] = useState<Awaited<ReturnType<typeof fetchProfile>>["agency"]>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [form, setForm] = useState<AgencyForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchProfile({});
      setAgency(result.agency);
      setIsOwner(result.isOwner);
      if (result.agency) {
        setForm({
          name: result.agency.name,
          description: result.agency.description ?? "",
          phone: result.agency.phone ?? "",
          email: result.agency.email ?? "",
          website: result.agency.website ?? "",
          logo_url: result.agency.logo_url ?? "",
          city: result.agency.city ?? "",
        });
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to load agency profile");
    } finally {
      setLoading(false);
    }
  }, [fetchProfile]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    setSaving(true);
    try {
      const result = await persistProfile({ data: form });
      toast.success(result.created ? "Agency created" : "Agency profile saved");
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to save agency profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="h-72 rounded-xl bg-muted animate-pulse" />;
  const readOnly = Boolean(agency && !isOwner);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold">{agency ? "Agency profile" : "Create your agency"}</h1>
          <p className="text-muted-foreground text-sm">
            {readOnly
              ? "Only the agency owner can change this public profile."
              : "Complete the details shown on your public agency page."}
          </p>
        </div>
        {agency && (
          <Button variant="outline" asChild>
            <Link to="/agencies/$slug" params={{ slug: agency.slug }}>
              View public page <ExternalLink className="ml-2 h-3 w-3" />
            </Link>
          </Button>
        )}
      </div>
      {readOnly && (
        <Card className="border-0 bg-muted/40">
          <CardContent className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
            <Lock className="h-4 w-4" /> Read-only agency details
          </CardContent>
        </Card>
      )}
      <Card className="border-0 shadow-card">
        <CardContent className="p-6 space-y-4">
          <Field
            label="Name"
            value={form.name}
            disabled={readOnly}
            onChange={(name) => setForm({ ...form, name })}
          />
          <Field
            label="City"
            value={form.city}
            disabled={readOnly}
            onChange={(city) => setForm({ ...form, city })}
          />
          <div>
            <Label>Description</Label>
            <Textarea
              rows={4}
              disabled={readOnly}
              value={form.description}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
            />
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field
              label="Phone"
              value={form.phone}
              disabled={readOnly}
              onChange={(phone) => setForm({ ...form, phone })}
            />
            <Field
              label="Email"
              type="email"
              value={form.email}
              disabled={readOnly}
              onChange={(email) => setForm({ ...form, email })}
            />
          </div>
          <Field
            label="Website"
            type="url"
            value={form.website}
            disabled={readOnly}
            onChange={(website) => setForm({ ...form, website })}
          />
          <Field
            label="Logo URL"
            type="url"
            value={form.logo_url}
            disabled={readOnly}
            onChange={(logo_url) => setForm({ ...form, logo_url })}
          />
          {!readOnly && (
            <Button onClick={() => void save()} disabled={saving || form.name.trim().length < 2}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {agency ? "Save changes" : "Create agency"}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  disabled,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled: boolean;
  type?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <Input
        type={type}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </div>
  );
}
