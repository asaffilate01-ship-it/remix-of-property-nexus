import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { FileText, FileImage, FileSpreadsheet, FileSignature, ShieldCheck, FolderTree, Upload, Search, Lock, Download, Eye, Clock, Trash2, FolderPlus, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/documents")({ component: DocumentsPage });

type Doc = {
  id: string;
  name: string;
  folder: "Compliance" | "Tenancies" | "Properties" | "Finance" | "Maintenance" | "HR & Agency" | "Legal";
  type: "PDF" | "DOCX" | "XLSX" | "JPG" | "Signed";
  size: string;
  property?: string;
  uploaded: string;
  expires?: string;
  uploadedBy: string;
  retention: string;
  tags: string[];
  locked?: boolean;
};

const SEED: Doc[] = [
  { id: "1", name: "Gas Safety Certificate (CP12) — 12 Acacia Ave.pdf", folder: "Compliance", type: "PDF", size: "412 KB", property: "12 Acacia Avenue", uploaded: "2026-03-14", expires: "2027-03-14", uploadedBy: "S. Patel", retention: "6 years", tags: ["CP12", "Gas Safe"] },
  { id: "2", name: "EICR Report — Flat 4B Camden.pdf", folder: "Compliance", type: "PDF", size: "1.8 MB", property: "Flat 4B Camden Lock", uploaded: "2025-11-02", expires: "2030-11-02", uploadedBy: "NICEIC Partner", retention: "5 years", tags: ["EICR", "NICEIC"], locked: true },
  { id: "3", name: "EPC Certificate Band C.pdf", folder: "Compliance", type: "PDF", size: "298 KB", property: "12 Acacia Avenue", uploaded: "2024-09-10", expires: "2034-09-10", uploadedBy: "Domestic Energy", retention: "10 years", tags: ["EPC", "MEES"] },
  { id: "4", name: "AST — Mr & Mrs Khan (signed).pdf", folder: "Tenancies", type: "Signed", size: "624 KB", property: "12 Acacia Avenue", uploaded: "2026-04-01", uploadedBy: "DocuSign", retention: "12 years", tags: ["AST", "e-signed"], locked: true },
  { id: "5", name: "Inventory & Schedule of Condition.pdf", folder: "Tenancies", type: "PDF", size: "5.2 MB", property: "12 Acacia Avenue", uploaded: "2026-04-02", uploadedBy: "Inventory Clerk", retention: "6 years", tags: ["Check-in"] },
  { id: "6", name: "DPS Deposit Prescribed Information.pdf", folder: "Compliance", type: "PDF", size: "188 KB", property: "12 Acacia Avenue", uploaded: "2026-04-05", uploadedBy: "Auto-issued", retention: "6 years", tags: ["Deposit", "DPS"] },
  { id: "7", name: "Right to Rent — Passport & Share Code.pdf", folder: "Compliance", type: "PDF", size: "920 KB", property: "Flat 4B Camden Lock", uploaded: "2026-02-20", expires: "2027-02-20", uploadedBy: "S. Patel", retention: "1 year post-tenancy", tags: ["RtR", "GDPR-Sensitive"], locked: true },
  { id: "8", name: "Rent statement Q1 2026.xlsx", folder: "Finance", type: "XLSX", size: "44 KB", uploaded: "2026-04-08", uploadedBy: "Xero sync", retention: "7 years (HMRC)", tags: ["Statement"] },
  { id: "9", name: "Roof leak invoice — Apex Roofing.pdf", folder: "Maintenance", type: "PDF", size: "76 KB", property: "Flat 4B Camden Lock", uploaded: "2026-05-22", uploadedBy: "Contractor portal", retention: "7 years", tags: ["Invoice", "Roof"] },
  { id: "10", name: "Boiler replacement quote.pdf", folder: "Maintenance", type: "PDF", size: "112 KB", property: "12 Acacia Avenue", uploaded: "2026-05-30", uploadedBy: "British Gas", retention: "7 years", tags: ["Quote"] },
  { id: "11", name: "Title Deed TR1 — 12 Acacia.pdf", folder: "Legal", type: "PDF", size: "1.1 MB", property: "12 Acacia Avenue", uploaded: "2023-06-11", uploadedBy: "HM Land Registry", retention: "Permanent", tags: ["HMLR", "Deed"], locked: true },
  { id: "12", name: "Section 21 Notice — served 03/06/26.pdf", folder: "Legal", type: "Signed", size: "201 KB", property: "Flat 4B Camden Lock", uploaded: "2026-06-03", uploadedBy: "Solicitor", retention: "12 years", tags: ["S21"] },
  { id: "13", name: "Agency PI Insurance 2026.pdf", folder: "HR & Agency", type: "PDF", size: "330 KB", uploaded: "2026-01-15", expires: "2027-01-15", uploadedBy: "Hiscox", retention: "7 years", tags: ["PI", "Insurance"] },
  { id: "14", name: "Floorplan — 12 Acacia.jpg", folder: "Properties", type: "JPG", size: "2.3 MB", property: "12 Acacia Avenue", uploaded: "2024-09-10", uploadedBy: "EPC Surveyor", retention: "Lifetime", tags: ["Floorplan"] },
];

const FOLDERS = ["All", "Compliance", "Tenancies", "Properties", "Finance", "Maintenance", "HR & Agency", "Legal"] as const;

function typeIcon(t: Doc["type"]) {
  if (t === "PDF") return <FileText className="h-4 w-4 text-destructive" />;
  if (t === "DOCX") return <FileText className="h-4 w-4 text-primary" />;
  if (t === "XLSX") return <FileSpreadsheet className="h-4 w-4 text-success" />;
  if (t === "JPG") return <FileImage className="h-4 w-4 text-warning" />;
  return <FileSignature className="h-4 w-4 text-primary" />;
}

function DocumentsPage() {
  const [folder, setFolder] = useState<(typeof FOLDERS)[number]>("All");
  const [q, setQ] = useState("");

  const rows = useMemo(() => SEED.filter(d =>
    (folder === "All" || d.folder === folder) &&
    (q === "" || (d.name + d.property + d.tags.join(" ")).toLowerCase().includes(q.toLowerCase()))
  ), [folder, q]);

  const expiringSoon = SEED.filter(d => d.expires && new Date(d.expires) < new Date("2026-09-01")).length;
  const totalSize = "27.4 MB";

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Document vault</h1>
          <p className="text-sm text-muted-foreground">Encrypted, audit-logged storage for compliance, tenancy and legal records. GDPR & ICO compliant.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FolderPlus className="h-4 w-4 mr-2" />New folder</Button>
          <Button><Upload className="h-4 w-4 mr-2" />Upload</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Total documents", value: SEED.length, icon: FileText },
          { label: "Storage used", value: totalSize, icon: FolderTree, sub: "of 50 GB" },
          { label: "Expiring < 90 days", value: expiringSoon, icon: Clock, tone: "warning" as const },
          { label: "Locked / audit-only", value: SEED.filter(d => d.locked).length, icon: Lock },
        ].map((s) => (
          <Card key={s.label}><CardContent className="p-4">
            <div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">{s.label}</span><s.icon className="h-4 w-4 text-muted-foreground" /></div>
            <div className={`text-2xl font-bold mt-1 ${s.tone === "warning" ? "text-warning" : ""}`}>{s.value}</div>
            {s.sub && <div className="text-xs text-muted-foreground">{s.sub}</div>}
          </CardContent></Card>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search by name, property, tag (CP12, EPC, AST…)" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Button variant="outline" size="sm"><Filter className="h-4 w-4 mr-2" />Filters</Button>
      </div>

      <Tabs value={folder} onValueChange={(v) => setFolder(v as typeof folder)}>
        <TabsList className="flex flex-wrap h-auto">
          {FOLDERS.map(f => <TabsTrigger key={f} value={f}>{f}</TabsTrigger>)}
        </TabsList>

        <TabsContent value={folder} className="mt-4">
          <Card>
            <CardContent className="p-0">
              <div className="hidden md:grid grid-cols-12 gap-2 px-4 py-2 border-b text-xs font-medium text-muted-foreground bg-muted/30">
                <div className="col-span-5">Name</div>
                <div className="col-span-2">Property</div>
                <div className="col-span-1">Size</div>
                <div className="col-span-2">Uploaded</div>
                <div className="col-span-1">Retention</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>
              <div className="divide-y">
                {rows.map(d => (
                  <div key={d.id} className="grid grid-cols-1 md:grid-cols-12 gap-2 px-4 py-3 hover:bg-muted/30 transition-colors">
                    <div className="col-span-5 flex items-start gap-3 min-w-0">
                      {typeIcon(d.type)}
                      <div className="min-w-0">
                        <div className="font-medium text-sm truncate flex items-center gap-2">
                          {d.name}
                          {d.locked && <Lock className="h-3 w-3 text-muted-foreground shrink-0" />}
                        </div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {d.tags.map(t => <Badge key={t} variant="outline" className="text-[10px] py-0">{t}</Badge>)}
                          {d.expires && <Badge variant="secondary" className="text-[10px] py-0">Expires {d.expires}</Badge>}
                        </div>
                      </div>
                    </div>
                    <div className="col-span-2 text-sm text-muted-foreground truncate">{d.property ?? "—"}</div>
                    <div className="col-span-1 text-sm text-muted-foreground">{d.size}</div>
                    <div className="col-span-2 text-sm text-muted-foreground">
                      <div>{d.uploaded}</div>
                      <div className="text-xs">by {d.uploadedBy}</div>
                    </div>
                    <div className="col-span-1 text-xs text-muted-foreground">{d.retention}</div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <Button size="icon" variant="ghost"><Eye className="h-4 w-4" /></Button>
                      <Button size="icon" variant="ghost"><Download className="h-4 w-4" /></Button>
                      {!d.locked && <Button size="icon" variant="ghost"><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </div>
                ))}
                {rows.length === 0 && <div className="p-8 text-center text-sm text-muted-foreground">No documents match.</div>}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Card>
        <CardContent className="p-4 flex items-start gap-3">
          <ShieldCheck className="h-5 w-5 text-success mt-0.5" />
          <div className="text-sm">
            <div className="font-medium">Audit trail enabled</div>
            <p className="text-muted-foreground">Every view, download, edit, share and deletion is logged with user, IP and timestamp. Retention policies enforced per category (HMRC 7yr, AST 12yr, RtR 1yr post-tenancy). Sensitive docs auto-redact for non-privileged roles.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
