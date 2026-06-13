import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, MapPin, Phone, Mail, ThumbsUp, ThumbsDown, Clock } from "lucide-react";
import { IsoIcon } from "@/components/iso/IsoIcon";

export const Route = createFileRoute("/_authenticated/viewings")({ component: ViewingsPage });

type Viewing = {
  id: string;
  time: string;
  property: string;
  applicant: string;
  phone: string;
  email: string;
  agent: string;
  status: "confirmed" | "pending" | "completed" | "no_show";
  feedback?: "positive" | "negative" | "offer";
};

const DAYS = ["Mon 16", "Tue 17", "Wed 18", "Thu 19", "Fri 20"];

const VIEWINGS: Record<string, Viewing[]> = {
  "Mon 16": [
    { id: "1", time: "10:00", property: "12 Marylebone Mews, W1", applicant: "Amelia Cross", phone: "07700 900111", email: "a.cross@…", agent: "Sarah W.", status: "confirmed" },
    { id: "2", time: "14:30", property: "Flat 4, Beacon Court, BS1", applicant: "David Liu", phone: "07700 900222", email: "d.liu@…", agent: "James O.", status: "confirmed" },
  ],
  "Tue 17": [
    { id: "3", time: "11:00", property: "8 Chorlton Road, M16", applicant: "Rachel Adeyemi", phone: "07700 900333", email: "r.a@…", agent: "Priya S.", status: "pending" },
  ],
  "Wed 18": [
    { id: "4", time: "09:30", property: "22 Northstar Heights, E14", applicant: "Tom Bauer", phone: "07700 900444", email: "t.b@…", agent: "Sarah W.", status: "completed", feedback: "offer" },
    { id: "5", time: "16:00", property: "12 Marylebone Mews, W1", applicant: "Sofia Marin", phone: "07700 900555", email: "s.m@…", agent: "Sarah W.", status: "completed", feedback: "positive" },
  ],
  "Thu 19": [
    { id: "6", time: "13:00", property: "Flat 4, Beacon Court, BS1", applicant: "Mohammed Ali", phone: "07700 900666", email: "m.a@…", agent: "James O.", status: "no_show" },
  ],
  "Fri 20": [
    { id: "7", time: "11:30", property: "8 Chorlton Road, M16", applicant: "Eve Lockhart", phone: "07700 900777", email: "e.l@…", agent: "Priya S.", status: "confirmed" },
  ],
};

const STATUS_BADGE: Record<Viewing["status"], string> = {
  confirmed: "bg-success text-success-foreground",
  pending: "bg-warning text-warning-foreground",
  completed: "bg-muted text-muted-foreground",
  no_show: "bg-destructive text-destructive-foreground",
};

function ViewingsPage() {
  const [day, setDay] = useState(DAYS[2]);
  const list = VIEWINGS[day] ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          <IsoIcon name="agent" size={56} className="shrink-0 hidden sm:block" />
          <div className="min-w-0">
            <h1 className="text-2xl font-bold truncate">Viewings diary</h1>
            <p className="text-muted-foreground text-sm">Book, confirm and capture feedback across the team.</p>
          </div>
        </div>
        <Button><Plus className="mr-2 h-4 w-4" /> Book viewing</Button>
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {DAYS.map((d) => {
          const count = (VIEWINGS[d] ?? []).length;
          const active = d === day;
          return (
            <button
              key={d}
              onClick={() => setDay(d)}
              className={`shrink-0 rounded-lg border px-4 py-3 text-left transition-colors ${active ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <div className="text-xs text-muted-foreground">Jun</div>
              <div className="font-semibold">{d}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{count} viewings</div>
            </button>
          );
        })}
      </div>

      <Card className="border-0 shadow-card">
        <CardContent className="p-0">
          {list.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <Calendar className="h-10 w-10 mx-auto opacity-50 mb-2" />
              <p>No viewings on {day}</p>
            </div>
          ) : (
            <div className="divide-y">
              {list.map((v) => (
                <div key={v.id} className="p-4 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 sm:gap-4">
                  <div className="text-center shrink-0 w-14">
                    <div className="text-lg font-bold leading-none">{v.time}</div>
                    <div className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1"><Clock className="h-3 w-3" /> 30m</div>
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium truncate">{v.applicant}</div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{v.property}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate flex items-center gap-3 mt-0.5">
                      <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{v.phone}</span>
                      <span className="flex items-center gap-1 hidden sm:inline-flex"><Mail className="h-3 w-3" />{v.email}</span>
                      <span>· {v.agent}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {v.feedback === "offer" && <Badge className="bg-primary text-primary-foreground">Offer in</Badge>}
                    {v.feedback === "positive" && <ThumbsUp className="h-4 w-4 text-success" />}
                    {v.feedback === "negative" && <ThumbsDown className="h-4 w-4 text-destructive" />}
                    <Badge className={STATUS_BADGE[v.status]}>{v.status.replace("_", " ")}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
