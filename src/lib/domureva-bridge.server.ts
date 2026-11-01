import { createHash, timingSafeEqual } from "node:crypto";
import { z } from "zod";

const assessmentSchema=z.object({
 operation:z.literal("funding.assessment"),
 agencyId:z.string().uuid(),
 opportunityId:z.string().uuid(),
 domurevaCaseRef:z.string().min(1).max(200),
 checkedAt:z.string().datetime({offset:true}),
 reviewStatus:z.literal("approved"),
 assessment:z.object({
  eligibility:z.enum(["eligible","potentially_eligible","ineligible","unknown"]),
  schemes:z.array(z.object({
   schemeRef:z.string().min(1).max(200),
   name:z.string().min(1).max(300),
   fundingType:z.enum(["grant","loan","guarantee","energy_support","other"]),
   maximumAmount:z.number().min(0).nullable(),
   conditions:z.array(z.string().max(500)).max(50).default([]),
   sourceUrl:z.string().url().max(1200),
   sourceCheckedAt:z.string().datetime({offset:true}),
  })).max(50),
  fundingSummary:z.object({totalWorks:z.number().min(0),funded:z.number().min(0),ownerContribution:z.number().min(0)}).optional(),
  warnings:z.array(z.string().max(500)).max(50).default([]),
 }).strict(),
}).strict();

function authorised(request:Request){
 const expected=process.env.DOMUREVA_SYNC_SECRET?.trim();
 const header=request.headers.get("authorization")??"";
 if(!expected||expected.length<32||!header.startsWith("Bearer "))return false;
 const actual=header.slice(7);
 const a=createHash("sha256").update(actual).digest(),b=createHash("sha256").update(expected).digest();
 return a.length===b.length&&timingSafeEqual(a,b);
}
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"cache-control":"no-store","x-content-type-options":"nosniff"}});

export async function serveDomurevaBridge(request:Request){
 try{
  if(!authorised(request))return reply({error:"Invalid DOMUREVA credential"},401);
  const raw=await request.text();if(raw.length>131072)return reply({error:"Payload too large"},413);
  const input=assessmentSchema.parse(JSON.parse(raw));
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
  const db=supabaseAdmin as any;
  const current=await db.from("deal_opportunities").select("id,agency_id,analysis")
   .eq("id",input.opportunityId).eq("agency_id",input.agencyId).maybeSingle();
  if(current.error||!current.data)return reply({error:"Opportunity not found"},404);
  const analysis={
   ...(current.data.analysis??{}),
   domureva:{caseRef:input.domurevaCaseRef,checkedAt:input.checkedAt,reviewStatus:input.reviewStatus,...input.assessment},
  };
  const updated=await db.from("deal_opportunities").update({
   domureva_case_ref:input.domurevaCaseRef,analysis,updated_at:new Date().toISOString(),
  }).eq("id",input.opportunityId).eq("agency_id",input.agencyId);
  if(updated.error)throw new Error(updated.error.message);
  return reply({ok:true,opportunityId:input.opportunityId,domurevaCaseRef:input.domurevaCaseRef});
 }catch(error){
  if(error instanceof z.ZodError)return reply({error:"Invalid DOMUREVA funding assessment"},422);
  if(error instanceof SyntaxError)return reply({error:"Invalid JSON"},400);
  return reply({error:"DOMUREVA bridge unavailable"},503);
 }
}
