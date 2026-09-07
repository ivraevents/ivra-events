import { NextResponse } from "next/server";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { createClient } from "@/lib/supabase/server";
import { formatPaise, formatDate } from "@/lib/utils";

// Generates a simple, clean PDF invoice on the fly from the invoice +
// invoice_items rows. RLS on both tables means this route can only ever
// read an invoice the signed-in user owns (or an admin).
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: invoice } = await supabase.from("invoices").select("*").eq("id", id).single();
  if (!invoice) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { data: items } = await supabase.from("invoice_items").select("*").eq("invoice_id", id);

  const doc = await PDFDocument.create();
  const page = doc.addPage([595.28, 841.89]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const navy = rgb(0.04, 0.06, 0.13);
  const gold = rgb(0.79, 0.6, 0.18);
  const gray = rgb(0.4, 0.42, 0.48);

  let y = 800;
  page.drawText("IVRA EVENTS", { x: 40, y, size: 20, font: bold, color: navy });
  page.drawText(invoice.invoice_type === "gst" ? "TAX INVOICE" : "INVOICE", {
    x: 595.28 - 40 - font.widthOfTextAtSize(invoice.invoice_type === "gst" ? "TAX INVOICE" : "INVOICE", 12),
    y, size: 12, font: bold, color: gold,
  });

  y -= 30;
  page.drawText(invoice.business_name ?? "", { x: 40, y, size: 10, font, color: gray });
  y -= 14;
  if (invoice.business_address) {
    page.drawText(invoice.business_address, { x: 40, y, size: 9, font, color: gray });
    y -= 14;
  }
  if (invoice.gstin) {
    page.drawText(`GSTIN: ${invoice.gstin}`, { x: 40, y, size: 9, font, color: gray });
    y -= 14;
  }

  y -= 10;
  page.drawText(`Invoice #: ${invoice.invoice_number}`, { x: 40, y, size: 10, font: bold, color: navy });
  page.drawText(`Date: ${formatDate(invoice.created_at)}`, { x: 350, y, size: 10, font, color: gray });

  y -= 30;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;

  page.drawText("Description", { x: 40, y, size: 9, font: bold, color: gray });
  page.drawText("Qty", { x: 340, y, size: 9, font: bold, color: gray });
  page.drawText("Unit Price", { x: 400, y, size: 9, font: bold, color: gray });
  page.drawText("Amount", { x: 490, y, size: 9, font: bold, color: gray });
  y -= 16;

  for (const item of items ?? []) {
    page.drawText(item.description, { x: 40, y, size: 9, font, color: navy });
    page.drawText(String(item.quantity), { x: 340, y, size: 9, font, color: navy });
    page.drawText(formatPaise(item.unit_price_paise), { x: 400, y, size: 9, font, color: navy });
    page.drawText(formatPaise(item.amount_paise), { x: 490, y, size: 9, font, color: navy });
    y -= 16;
  }

  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 1, color: rgb(0.9, 0.9, 0.9) });
  y -= 20;

  page.drawText("Subtotal", { x: 400, y, size: 10, font, color: gray });
  page.drawText(formatPaise(invoice.subtotal_paise), { x: 490, y, size: 10, font, color: navy });
  y -= 16;
  page.drawText("Tax", { x: 400, y, size: 10, font, color: gray });
  page.drawText(formatPaise(invoice.tax_paise), { x: 490, y, size: 10, font, color: navy });
  y -= 16;
  page.drawText("Total", { x: 400, y, size: 12, font: bold, color: navy });
  page.drawText(formatPaise(invoice.total_paise), { x: 490, y, size: 12, font: bold, color: navy });

  const bytes = await doc.save();
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${invoice.invoice_number.replace(/\//g, "-")}.pdf"`,
    },
  });
}
