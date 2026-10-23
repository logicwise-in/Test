import { getDatabase } from "@netlify/database";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
function required(name: string) {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Netlify.env.get("RESEND_API_KEY"), from = Netlify.env.get("ORDER_FROM_EMAIL");
  if (!apiKey || !from) return false;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  return response.ok;
}

export default async (req: Request) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const raw = await req.text();
  const supplied = req.headers.get("x-razorpay-signature") || "";
  if (!supplied) return json({ error: "Missing webhook signature." }, 400);
  let expected: string;
  try { expected = await hmacHex(required("RAZORPAY_WEBHOOK_SECRET"), raw); }
  catch (error) { console.error("Webhook configuration error:", error); return json({ error: "Webhook is not configured." }, 503); }
  if (!safeEqual(expected, supplied)) return json({ error: "Invalid webhook signature." }, 400);

  let event: any;
  try { event = JSON.parse(raw); } catch { return json({ error: "Invalid JSON payload." }, 400); }
  if (!["payment.captured", "order.paid"].includes(event.event)) return json({ received: true, ignored: true });
  const payment = event.payload?.payment?.entity;
  const razorpayOrderId = payment?.order_id || event.payload?.order?.entity?.id;
  if (!razorpayOrderId) return json({ error: "Event has no Razorpay order ID." }, 400);

  const db = getDatabase();
  const rows = await db.sql<any>`SELECT * FROM service_orders WHERE razorpay_order_id = ${String(razorpayOrderId)} LIMIT 1`;
  const order = rows[0];
  if (!order) {
    console.error("Verified Razorpay event refers to an unknown order:", razorpayOrderId);
    return json({ error: "Order not found." }, 404);
  }
  if (payment && (Number(payment.amount) !== Number(order.total_paise) || payment.currency !== "INR" || payment.status !== "captured")) {
    return json({ error: "Captured payment amount/currency does not match the order." }, 400);
  }
  if (order.payment_status === "paid") return json({ received: true, alreadyProcessed: true });

  const paymentId = String(payment?.id || "");
  if (!paymentId) return json({ error: "Event has no payment ID." }, 400);
  const changed = await db.sql<any>`UPDATE service_orders SET razorpay_payment_id = ${paymentId}, payment_status = 'paid', order_status = 'new', updated_at = NOW() WHERE id = ${order.id} AND payment_status = 'pending' RETURNING id`;
  if (!changed.length) return json({ received: true, alreadyProcessed: true });

  const adminEmail = Netlify.env.get("ADMIN_EMAIL") || "";
  const features = Array.isArray(order.features) ? order.features.map((f: any) => escapeHtml(f.label)).join(", ") : "";
  const html = `<h2>Logic Wise website project</h2><p>Order: ${escapeHtml(order.id)}</p><p>Customer: ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)})</p><p>Project: ${escapeHtml(order.project_name)} — ${escapeHtml(order.project_type)}</p><p>Features: ${features}</p><p>Total paid: <strong>${rupees(Number(order.total_paise))}</strong></p><p>Brief: ${escapeHtml(order.project_brief)}</p><p>Preferred domain: ${escapeHtml(order.preferred_domain)}</p><p>Razorpay payment: ${escapeHtml(paymentId)}</p>`;
  const recipients: Array<{kind:"admin"|"customer";email:string}> = [];
  if (adminEmail) recipients.push({kind:"admin",email:adminEmail});
  if (order.customer_email) recipients.push({kind:"customer",email:order.customer_email});
  const results = await Promise.all(recipients.map(r => sendEmail(r.email, r.kind === "admin" ? `Paid website order: ${order.project_name}` : "Payment received — Logic Wise", html)));
  for (let i = 0; i < recipients.length; i++) {
    if (results[i]) {
      if (recipients[i].kind === "admin") await db.sql`UPDATE service_orders SET email_admin_sent_at = NOW() WHERE id = ${order.id}`;
      else await db.sql`UPDATE service_orders SET email_customer_sent_at = NOW() WHERE id = ${order.id}`;
    }
  }
  return json({ received: true, processed: true });
};
