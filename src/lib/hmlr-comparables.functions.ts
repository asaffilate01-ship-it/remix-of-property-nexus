import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { agencyAccess } from "@/lib/deal-intelligence.functions";
import { suggestPricePaidComparables, type PricePaidRow } from "@/lib/price-paid-csv";
import { HMLR_ATTRIBUTION } from "@/lib/hmlr-ingestion";

const requestSchema = z.object({
  postcode: z.string().trim().min(5).max(12),
  propertyType: z.enum(["house","flat","bungalow","studio","commercial","land"]),
  limit: z.number().int().min(3).max(25).default(12),
}).strict();

export const getStoredLandRegistryComparables = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => requestSchema.parse(input))
  .handler(async ({ data, context }) => {
    await agencyAccess(context.supabase, context.userId);
    if (data.propertyType !== "house" && data.propertyType !== "flat") {
      return { comparables: [], recordsSampled: 0, availability: "unsupported_type" as const, attribution: HMLR_ATTRIBUTION };
    }
    const postcode = data.postcode.toUpperCase().replace(/\s+/g, "");
    const outward = postcode.replace(/[0-9][A-Z]{2}$/, "");
    if (!/^[A-Z]{1,2}[0-9][0-9A-Z]?$/.test(outward)) {
      throw new Error("Enter a valid England or Wales full postcode.");
    }
    const today = new Date().toISOString().slice(0, 10);
    const earliest = new Date(Date.now() - 1096 * 86400000).toISOString().slice(0, 10);
    const kinds = data.propertyType === "flat" ? ["F"] : ["D","S","T"];
    const result = await (context.supabase as any).from("deal_hmlr_sales")
      .select("transaction_id,price,sold_at,postcode,property_code,paon,saon,street,town,category")
      .eq("outcode", outward)
      .eq("category", "A")
      .in("property_code", kinds)
      .neq("record_status", "D")
      .gte("sold_at", earliest).lte("sold_at", today)
      .order("sold_at", { ascending: false })
      .limit(400);
    if (result.error) throw new Error(result.error.message);
    const rows: PricePaidRow[] = (result.data ?? []).map((sale: any) => ({
      transactionId: String(sale.transaction_id),
      price: Number(sale.price),
      soldAt: String(sale.sold_at),
      postcode: String(sale.postcode),
      propertyCode: sale.property_code as PricePaidRow["propertyCode"],
      category: "A",
      town: String(sale.town ?? ""),
      addressKey: [
        String(sale.postcode ?? ""),
        String(sale.paon ?? ""),
        String(sale.saon ?? ""),
        String(sale.street ?? ""),
      ].join("|").toUpperCase(),
    }));
    return {
      comparables: suggestPricePaidComparables(rows, {
        postcode: data.postcode, propertyType: data.propertyType, assessedAt: today,
      }, data.limit),
      recordsSampled: rows.length,
      availability: rows.length ? "available" as const : "not_imported_or_no_sales" as const,
      sampleCapped: rows.length === 400,
      attribution: HMLR_ATTRIBUTION,
      note: "Official registered sale prices can lag by months. Price Paid Data does not include beds, condition, floor area or a qualified valuation. Review individual sales before relying on a price estimate.",
    };
  });
