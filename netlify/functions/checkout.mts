import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getDatabase } from "@netlify/database";

const json = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: { "Cache-Control": "no-store" } });

const PRICE: Record<string, number> = {
  multi: 100000, catalog: 100000, whatsapp: 50000, leadform: 50000,
  booking: 100000, seo: 50000, cms: 100000, payments: 200000, store: 250000
};
const LABEL: Record<string, string> = {
  multi: "Multi-page website", catalog: "Product / service catalogue",
  whatsapp: "WhatsApp contact button", leadform: "Enquiry / lead form",
  booking: "Appointment / booking request", seo: "Basic SEO setup",
  cms: "Editable content setup", payments: "Payment gateway integration",
  store: "Cart / online store features"
};
const BASE = 300000;
const MAX = 1000000;
const COUPONS: Record<string, number> = { LOGICWISE10: 10 };

function required(name: string) {
  const value = Netlify.env.get(name);
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}
async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return [...new Uint8Array(sig)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function firebaseAuth() {
  if (!getApps().length) {
    const raw = required("FIREBASE_SERVICE_ACCOUNT_JSON");
    initializeApp({ credential: cert(JSON.parse(raw)) });
  }
  return getAuth();
}
async function userFrom(req: Request) {
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) throw new Error("Please sign in with Google again.");
  return firebaseAuth().verifyIdToken(token);
}
async function sendEmail(to: string, subject: string, html: string) {
  const apiKey = Netlify.env.get("RESEND_API_KEY");
  const from = Netlify.env.get("ORDER_FROM_EMAIL");
  if (!apiKey || !from) return false;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: [to], subject, html })
  });
  if (!res.ok) {
    console.error("Order email delivery failed:", res.status, await res.text());
    return false;
  }
  return true;
}
const rupees = (paise: number) => "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 2 });
function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

export default async (req: Request) => {
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  let user;
  try { user = await userFrom(req); }
  catch (error) { return json({ error: error instanceof Error ? error.message : "Authentication failed." }, 401); }

  const db = getDatabase();
  if (req.method === "GET") {
    const adminEmail = (Netlify.env.get("ADMIN_EMAIL") || "").toLowerCase();
    if (!adminEmail || (user.email || "").toLowerCase() !== adminEmail) return json({ error: "Admin access required." }, 403);
    const rows = await db.sql`SELECT id, created_at, customer_name, customer_email, project_name, project_type, features, subtotal_paise, discount_code, discount_paise, total_paise, payment_status, order_status, razorpay_payment_id FROM service_orders ORDER BY created_at DESC LIMIT 200`;
    return json({ orders: rows });
  }

  let body: any;
  try { body = await req.json(); } catch { return json({ error: "Invalid JSON body." }, 400); }
  if (body.action === "create-order") {
    const projectName = String(body.projectName || "").trim().slice(0, 120);
    const projectType = String(body.projectType || "Business website").slice(0, 80);
    const brief = String(body.brief || "").trim().slice(0, 3000);
    const domain = String(body.domain || "").trim().slice(0, 253);
    if (!projectName) return json({ error: "Enter your business or project name." }, 400);
    const ids = Array.isArray(body.features) ? [...new Set(body.features.map(String))] : [];
    if (ids.some((id: string) => !(id in PRICE))) return json({ error: "An invalid feature was selected." }, 400);
    const features = ids.map((id: string) => ({ id, label: LABEL[id], pricePaise: PRICE[id] }));
    const subtotal = BASE + features.reduce((sum: number, item: {pricePaise:number}) => sum + item.pricePaise, 0);
    if (subtotal > MAX) return json({ error: "Selected features exceed the ₹10,000 package limit." }, 400);
    const code = String(body.discountCode || "").trim().toUpperCase();
    const percent = COUPONS[code] || 0;
    const discount = Math.round(subtotal * percent / 100);
    const total = subtotal - discount;
    if (total < 100) return json({ error: "Order total is too low." }, 400);

    const keyId = required("RAZORPAY_KEY_ID");
    const keySecret = required("RAZORPAY_KEY_SECRET");
    const orderId = crypto.randomUUID();
    const auth = btoa(`${keyId}:${keySecret}`);
    const rp = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/json" },
      body: JSON.stringify({ amount: total, currency: "INR", receipt: orderId, notes: { internal_order_id: orderId, project_name: projectName, customer_uid: user.uid } })
    });
    const rpBody: any = await rp.json().catch(() => ({}));
    if (!rp.ok || !rpBody.id) {
      console.error("Razorpay order creation failed:", rp.status, rpBody);
      return json({ error: "Payment provider could not create an order. Please try again later." }, 502);
    }
    await db.sql`INSERT INTO service_orders (id, firebase_uid, customer_name, customer_email, project_type, project_name, project_brief, preferred_domain, features, subtotal_paise, discount_code, discount_paise, total_paise, razorpay_order_id) VALUES (${orderId}, ${user.uid}, ${String(user.name || user.email || "Customer").slice(0,120)}, ${String(user.email || "")}, ${projectType}, ${projectName}, ${brief}, ${domain}, ${JSON.stringify(features)}::jsonb, ${subtotal}, ${percent ? code : null}, ${discount}, ${total}, ${rpBody.id})`;
    return json({ orderId, razorpayOrderId: rpBody.id, amount: total, currency: "INR", keyId, customer: { name: user.name || "", email: user.email || "" } }, 201);
  }

  if (body.action === "verify-payment") {
    const orderId = String(body.orderId || "");
    const paymentId = String(body.paymentId || "");
    const signature = String(body.signature || "");
    if (!orderId || !paymentId || !signature) return json({ error: "Payment verification details are incomplete." }, 400);
    const rows = await db.sql<{id:string;firebase_uid:string;customer_name:string;customer_email:string;project_name:string;project_type:string;project_brief:string;preferred_domain:string;features:any;subtotal_paise:number;discount_code:string|null;discount_paise:number;total_paise:number;payment_status:string;razorpay_order_id:string}>`SELECT * FROM service_orders WHERE razorpay_order_id = ${orderId} LIMIT 1`;
    const order = rows[0];
    if (!order || order.firebase_uid !== user.uid) return json({ error: "Order not found for this account." }, 404);
    const expected = await hmacHex(required("RAZORPAY_KEY_SECRET"), `${orderId}|${paymentId}`);
    if (!safeEqual(expected, signature)) return json({ error: "Payment signature verification failed." }, 400);
    if (order.payment_status !== "paid") {
      await db.sql`UPDATE service_orders SET razorpay_payment_id = ${paymentId}, payment_status = 'paid', order_status = 'new', updated_at = NOW() WHERE id = ${order.id} AND payment_status = 'pending'`;
      const adminEmail = Netlify.env.get("ADMIN_EMAIL") || "";
      const features = Array.isArray(order.features) ? order.features.map((f: any) => escapeHtml(f.label)).join(", ") : "";
      const common = `<h2>Logic Wise website project</h2><p>Order: ${escapeHtml(order.id)}</p><p>Customer: ${escapeHtml(order.customer_name)} (${escapeHtml(order.customer_email)})</p><p>Project: ${escapeHtml(order.project_name)} — ${escapeHtml(order.project_type)}</p><p>Features: ${features}</p><p>Subtotal: ${rupees(order.subtotal_paise)}; discount: ${rupees(order.discount_paise)}; paid: <strong>${rupees(order.total_paise)}</strong></p><p>Brief: ${escapeHtml(order.project_brief)}</p><p>Preferred domain: ${escapeHtml(order.preferred_domain)}</p><p>Razorpay payment: ${escapeHtml(paymentId)}</p>`;
      const tasks = [];
      if (adminEmail) tasks.push(sendEmail(adminEmail, `Paid website order: ${order.project_name}`, common));
      if (order.customer_email) tasks.push(sendEmail(order.customer_email, "Payment received — Logic Wise", common));
      const sent = await Promise.all(tasks);
      await db.sql`UPDATE service_orders SET email_admin_sent_at = CASE WHEN ${Boolean(adminEmail && sent[0])} THEN NOW() ELSE email_admin_sent_at END, email_customer_sent_at = CASE WHEN ${Boolean(order.customer_email && sent[sent.length - 1])} THEN NOW() ELSE email_customer_sent_at END WHERE id = ${order.id}`;
    }
    return json({ verified: true, orderId: order.id, message: "Payment signature verified. Your project order has been recorded." });
  }
  return json({ error: "Unknown action." }, 400);
};
