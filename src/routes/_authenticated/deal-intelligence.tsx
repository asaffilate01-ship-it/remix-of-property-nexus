import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { BrainCircuit, Building2, Landmark, Loader2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { createDealOpportunity, listDealOpportunities, startDealIntelligence } from "@/lib/deal-intelligence.functions";

export const Route=createFileRoute("/_authenticated/deal-intelligence")({
 head:()=>({meta:[{title:"Deal intelligence — Gabley"}]}),
 component:DealIntelligencePage,
});

type Row={
 id:string;title:string;postcode:string|null;purchase_price:number;conservative_exit_value:number;works_cost:number;other_costs:number;
 investor_profit_target:number;proposed_fee:number;status:string;ai_run_id:string|null;domureva_case_ref:string|null;analysis:any;
};
const initial={title:"",postcode:"",purchasePrice:"",conservativeExitValue:"",worksCost:"0",otherCosts:"0",investorProfitTarget:"0",proposedFee:"0"};

function DealIntelligencePage(){
 const list=useServerFn(listDealOpportunities),create=useServerFn(createDealOpportunity),start=useServerFn(startDealIntelligence);
 const [rows,setRows]=useState<Row[]>([]),[connected,setConnected]=useState(false),[open,setOpen]=useState(false),[busy,setBusy]=useState<string|null>(null),[form,setForm]=useState(initial);
 const load=async()=>{try{const out=await list();setRows((out.rows??[]) as Row[]);setConnected(out.omniqoraConnected);}catch(e:any){toast.error(String(e?.message??e));}};
 useEffect(()=>{void load();},[]);
 const save=async()=>{setBusy("create");try{await create({data:{
  title:form.title,postcode:form.postcode||null,purchasePrice:Number(form.purchasePrice),conservativeExitValue:Number(form.conservativeExitValue),
  worksCost:Number(form.worksCost),otherCosts:Number(form.otherCosts),investorProfitTarget:Number(form.investorProfitTarget),proposedFee:Number(form.proposedFee),
 }});setOpen(false);setForm(initial);toast.success("Deal opportunity created");await load();}catch(e:any){toast.error(String(e?.message??e));}finally{setBusy(null);}};
 const analyse=async(id:string)=>{setBusy(id);try{const out=await start({data:{opportunityId:id,serviceKey:"omniqora.deal-detective"}});toast.success(`Deal Detective queued: ${out.status}`);await load();}catch(e:any){toast.error(String(e?.message??e));}finally{setBusy(null);}};
 return <div className="space-y-6">
  <PageHeader title="Deal intelligence" description="Underwrite seller opportunities, run Omniqora Deal Detective and attach reviewed DOMUREVA regeneration funding." actions={<Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>New opportunity</Button>}/>
  <div className="grid gap-3 sm:grid-cols-3">
   <Card className="border-0 shadow-card"><CardContent className="p-4"><BrainCircuit className="h-5 w-5 mb-2"/><div className="text-sm font-medium">Omniqora intelligence</div><Badge variant="outline" className="mt-2">{connected?"tenant mapped":"mapping required"}</Badge></CardContent></Card>
   <Card className="border-0 shadow-card"><CardContent className="p-4"><Landmark className="h-5 w-5 mb-2"/><div className="text-sm font-medium">DOMUREVA funding</div><div className="text-xs text-muted-foreground mt-2">Only reviewed assessments are accepted.</div></CardContent></Card>
   <Card className="border-0 shadow-card"><CardContent className="p-4"><Building2 className="h-5 w-5 mb-2"/><div className="text-sm font-medium">Gabley system of record</div><div className="text-xs text-muted-foreground mt-2">Seller, buyer, fee and transaction remain here.</div></CardContent></Card>
  </div>
  <div className="grid gap-4 lg:grid-cols-2">
   {rows.map(r=>{const econ=r.analysis?.economics??{};const dom=r.analysis?.domureva;return <Card key={r.id} className="border-0 shadow-card"><CardContent className="p-5 space-y-3">
    <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">{r.title}</div><div className="text-xs text-muted-foreground">{r.postcode||"No postcode"} · {r.status}</div></div><Badge variant="secondary">£{Number(r.purchase_price).toLocaleString()}</Badge></div>
    <div className="grid grid-cols-2 gap-2 text-sm"><div><span className="text-muted-foreground">Conservative exit</span><div className="font-medium">£{Number(r.conservative_exit_value).toLocaleString()}</div></div><div><span className="text-muted-foreground">Fee headroom</span><div className="font-medium">£{Number(econ.feeHeadroom??0).toLocaleString()}</div></div><div><span className="text-muted-foreground">Proposed fee</span><div className="font-medium">£{Number(r.proposed_fee).toLocaleString()}</div></div><div><span className="text-muted-foreground">Investor buffer</span><div className="font-medium">£{Number(econ.investorBufferAfterFee??0).toLocaleString()}</div></div></div>
    {dom&&<div className="rounded-md border p-3 text-xs"><div className="font-medium">DOMUREVA: {dom.eligibility}</div><div className="text-muted-foreground">{dom.schemes?.length??0} reviewed scheme(s) · case {dom.caseRef}</div></div>}
    <Button size="sm" onClick={()=>analyse(r.id)} disabled={!connected||busy===r.id}>{busy===r.id?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Sparkles className="mr-2 h-4 w-4"/>}Run Deal Detective</Button>
   </CardContent></Card>})}
   {rows.length===0&&<Card className="border-dashed"><CardContent className="p-10 text-center text-sm text-muted-foreground">No deal opportunities yet.</CardContent></Card>}
  </div>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent><DialogHeader><DialogTitle>New deal opportunity</DialogTitle></DialogHeader>
   <div className="grid grid-cols-2 gap-3">{[
    ["title","Title"],["postcode","Postcode"],["purchasePrice","Seller / purchase price"],["conservativeExitValue","Conservative exit value"],["worksCost","Works"],["otherCosts","Other costs"],["investorProfitTarget","Investor profit target"],["proposedFee","Proposed fee"]
   ].map(([key,label])=><div key={key} className={key==="title"||key==="postcode"?"col-span-2":""}><Label>{label}</Label><Input type={["title","postcode"].includes(key)?"text":"number"} value={(form as any)[key]} onChange={e=>setForm({...form,[key]:e.target.value})}/></div>)}</div>
   <DialogFooter><Button onClick={save} disabled={busy==="create"||!form.title||!form.purchasePrice||!form.conservativeExitValue}>{busy==="create"?"Saving…":"Create"}</Button></DialogFooter>
  </DialogContent></Dialog>
 </div>;
}
