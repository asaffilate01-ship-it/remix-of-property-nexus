import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid=z.string().uuid();
const money=z.coerce.number().min(0).max(100_000_000);
const service=z.enum([
  "omniqora.property-intelligence",
  "omniqora.property-scout",
  "omniqora.deal-detective",
  "omniqora.property-underwriter",
  "omniqora.property-match",
  "omniqora.vacancy-scout",
]);

const createSchema=z.object({
  title:z.string().trim().min(1).max(240),
  postcode:z.string().trim().max(12).optional().nullable(),
  source:z.enum(["manual","seller","agent","auction","omniqora_scout","domureva"]).default("manual"),
  askingPrice:money.optional().nullable(),
  purchasePrice:money,
  conservativeExitValue:money,
  worksCost:money.default(0),
  otherCosts:money.default(0),
  investorProfitTarget:money.default(0),
  proposedFee:money.default(0),
});

export function dealEconomics(input:{
 purchasePrice:number;conservativeExitValue:number;worksCost:number;otherCosts:number;investorProfitTarget:number;proposedFee:number;
}){
 const feeHeadroom=Math.max(0,input.conservativeExitValue-input.purchasePrice-input.worksCost-input.otherCosts-input.investorProfitTarget);
 const investorBufferAfterFee=feeHeadroom-input.proposedFee;
 return {
  acquisitionSubtotal:round(input.purchasePrice+input.proposedFee),
  feeHeadroom:round(feeHeadroom),
  investorBufferAfterFee:round(investorBufferAfterFee),
  viableAtProposedFee:investorBufferAfterFee>=0,
 };
}
const round=(n:number)=>Math.round(n*100)/100;

async function agencyAccess(supabase:any,userId:string){
 const owned=await supabase.from("agencies").select("id,omniqora_tenant_id").eq("owner_id",userId).limit(1).maybeSingle();
 if(owned.error)throw new Error(owned.error.message);
 if(owned.data)return owned.data as {id:string;omniqora_tenant_id:string|null};
 const member=await supabase.from("agency_members").select("agency_id").eq("user_id",userId).limit(1).maybeSingle();
 if(member.error)throw new Error(member.error.message);
 if(!member.data?.agency_id)throw new Error("Agency access required");
 const agency=await supabase.from("agencies").select("id,omniqora_tenant_id").eq("id",member.data.agency_id).single();
 if(agency.error||!agency.data)throw new Error("Agency access required");
 return agency.data as {id:string;omniqora_tenant_id:string|null};
}

export const listDealOpportunities=createServerFn({method:"GET"})
.middleware([requireSupabaseAuth])
.handler(async({context})=>{
 const agency=await agencyAccess(context.supabase,context.userId);
 const {data,error}=await (context.supabase as any).from("deal_opportunities")
  .select("*").eq("agency_id",agency.id).order("updated_at",{ascending:false}).limit(100);
 if(error)throw new Error(error.message);
 return {agencyId:agency.id,omniqoraConnected:Boolean(agency.omniqora_tenant_id),rows:data??[]};
});

export const createDealOpportunity=createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.validator((v:unknown)=>createSchema.parse(v))
.handler(async({data,context})=>{
 const agency=await agencyAccess(context.supabase,context.userId);
 const economics=dealEconomics({
  purchasePrice:data.purchasePrice,conservativeExitValue:data.conservativeExitValue,
  worksCost:data.worksCost,otherCosts:data.otherCosts,investorProfitTarget:data.investorProfitTarget,proposedFee:data.proposedFee,
 });
 const {data:row,error}=await (context.supabase as any).from("deal_opportunities").insert({
  agency_id:agency.id,title:data.title,postcode:data.postcode||null,source:data.source,
  asking_price:data.askingPrice??null,purchase_price:data.purchasePrice,conservative_exit_value:data.conservativeExitValue,
  works_cost:data.worksCost,other_costs:data.otherCosts,investor_profit_target:data.investorProfitTarget,
  proposed_fee:data.proposedFee,analysis:{economics},created_by:context.userId,
 }).select("*").single();
 if(error)throw new Error(error.message);
 return row;
});

const startSchema=z.object({opportunityId:uuid,serviceKey:service.default("omniqora.deal-detective")});
export const startDealIntelligence=createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.validator((v:unknown)=>startSchema.parse(v))
.handler(async({data,context})=>{
 const agency=await agencyAccess(context.supabase,context.userId);
 if(!agency.omniqora_tenant_id)throw new Error("This agency is not mapped to an Omniqora tenant yet");
 const opportunity=await (context.supabase as any).from("deal_opportunities").select("*")
  .eq("id",data.opportunityId).eq("agency_id",agency.id).maybeSingle();
 if(opportunity.error||!opportunity.data)throw new Error("Opportunity not found");

 const endpoint=process.env.OMNIQORA_INTELLIGENCE_URL?.trim();
 const token=process.env.OMNIQORA_SERVICE_TOKEN?.trim();
 if(!endpoint||!token)throw new Error("Omniqora intelligence is not configured");
 let url:URL;try{url=new URL(endpoint);}catch{throw new Error("Invalid Omniqora intelligence URL");}
 if(url.protocol!=="https:"||url.username||url.password)throw new Error("Omniqora intelligence must use HTTPS");

 const row=opportunity.data;
 const economics=dealEconomics({
  purchasePrice:Number(row.purchase_price),conservativeExitValue:Number(row.conservative_exit_value),
  worksCost:Number(row.works_cost),otherCosts:Number(row.other_costs),investorProfitTarget:Number(row.investor_profit_target),
  proposedFee:Number(row.proposed_fee),
 });
 const response=await fetch(url,{
  method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
  body:JSON.stringify({
   operation:"run.start",tenantId:agency.omniqora_tenant_id,productKey:"gabley",serviceKey:data.serviceKey,
   profile:data.serviceKey==="omniqora.property-underwriter"?"finance":"transaction",
   goal:"Review this Gabley property opportunity using only supplied evidence. Explain price/discount risks, missing evidence and next human checks. Do not invent valuations, seller motivation, funding or legal conclusions.",
   maxSteps:8,inputVersion:"gabley.deal-intelligence.v1",
   context:{
    opportunityId:row.id,title:row.title,postcode:row.postcode,source:row.source,askingPrice:row.asking_price,
    purchasePrice:row.purchase_price,conservativeExitValue:row.conservative_exit_value,worksCost:row.works_cost,
    otherCosts:row.other_costs,investorProfitTarget:row.investor_profit_target,proposedFee:row.proposed_fee,
    feeDisclosed:row.fee_disclosed,economics,domurevaCaseRef:row.domureva_case_ref,
   },
   sourceRefs:Array.isArray(row.source_refs)?row.source_refs.filter((value:unknown):value is string=>typeof value==="string").slice(0,200):[],
  }),
 });
 const body=await response.json().catch(()=>({}));
 if(!response.ok||typeof body?.runId!=="string")throw new Error(body?.error||"Omniqora intelligence request was refused");
 const update=await (context.supabase as any).from("deal_opportunities")
  .update({ai_run_id:body.runId,analysis:{...(row.analysis??{}),economics,lastIntelligence:{runId:body.runId,serviceKey:data.serviceKey,status:body.status}}})
  .eq("id",row.id).eq("agency_id",agency.id);
 if(update.error)throw new Error(update.error.message);
 return {runId:body.runId,status:body.status,serviceKey:data.serviceKey};
});

export const getDealIntelligenceRun=createServerFn({method:"POST"})
.middleware([requireSupabaseAuth])
.validator((v:unknown)=>z.object({runId:uuid}).parse(v))
.handler(async({data,context})=>{
 const agency=await agencyAccess(context.supabase,context.userId);
 if(!agency.omniqora_tenant_id)throw new Error("This agency is not mapped to an Omniqora tenant yet");
 const endpoint=process.env.OMNIQORA_INTELLIGENCE_URL?.trim();
 const token=process.env.OMNIQORA_SERVICE_TOKEN?.trim();
 if(!endpoint||!token)throw new Error("Omniqora intelligence is not configured");
 const response=await fetch(endpoint,{method:"POST",headers:{authorization:`Bearer ${token}`,"content-type":"application/json"},
  body:JSON.stringify({operation:"run.get",tenantId:agency.omniqora_tenant_id,productKey:"gabley",runId:data.runId})});
 const body=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(body?.error||"Unable to read Omniqora intelligence run");
 return body;
});
