const $ = (id) => document.getElementById(id);
const money = (amount) => "₹" + Number(amount).toLocaleString("en-IN", { maximumFractionDigits: 0 });
const addonLabels = {multi:"Multi-page website",catalog:"Product / service catalogue",whatsapp:"WhatsApp contact button",leadform:"Enquiry / lead form",booking:"Appointment / booking request",seo:"Basic SEO setup",cms:"Editable content setup",payments:"Payment gateway integration",store:"Cart / online store features"};
const ownerCoupons = {LOGICWISE10:10};
let activeCoupon = "";
let toastTimer;
$("year").textContent = new Date().getFullYear();
const menuToggle = $("menuToggle");
menuToggle.addEventListener("click", () => { const open = $("navLinks").classList.toggle("open"); menuToggle.setAttribute("aria-expanded", String(open)); });
document.querySelectorAll("#navLinks a").forEach(a => a.addEventListener("click", () => { $("navLinks").classList.remove("open"); menuToggle.setAttribute("aria-expanded","false"); }));
$("accountBtn").addEventListener("click", () => { $("authModal").hidden = false; document.body.style.overflow = "hidden"; });
$("builderSignIn").addEventListener("click", () => { $("authModal").hidden = false; document.body.style.overflow = "hidden"; });
function closeAuth(){ $("authModal").hidden = true; document.body.style.overflow = ""; }
$("closeAuth").addEventListener("click", closeAuth);
$("authModal").addEventListener("click", e => { if(e.target === $("authModal")) closeAuth(); });
document.addEventListener("keydown", e => { if(e.key === "Escape" && !$("authModal").hidden) closeAuth(); });
function toast(message){ const el=$("toast");el.textContent=message;el.classList.add("show");clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),3800); }
function selectedAddonItems(){ return [...document.querySelectorAll("#serviceOptions input:checked")].map(el=>({id:el.dataset.addon,price:Number(el.dataset.price),label:addonLabels[el.dataset.addon]})); }
function updateServiceQuote(){
 const items=selectedAddonItems(),subtotal=3000+items.reduce((sum,item)=>sum+item.price,0),discount=activeCoupon?Math.round(subtotal*ownerCoupons[activeCoupon]/100):0;
 $("selectedAddons").replaceChildren();
 items.forEach(item=>{const row=document.createElement("div");row.className="summary-line";const label=document.createElement("span");label.textContent=item.label;const price=document.createElement("strong");price.textContent="+"+money(item.price);row.append(label,price);$("selectedAddons").append(row);});
 $("serviceSubtotal").textContent=money(subtotal);$("discountLine").hidden=!discount;$("serviceDiscount").textContent="−"+money(discount);$("serviceTotal").textContent=money(subtotal-discount);
 $("capNote").textContent=items.length?"Selected features: "+items.length+". Maximum estimate before discount: ₹10,000.":"Choose add-ons to build your package, up to ₹10,000.";
 $("submitProject").disabled=subtotal>10000;return {items,subtotal,discount,total:subtotal-discount};
}
document.querySelectorAll("#serviceOptions input").forEach(input=>input.addEventListener("change",()=>{const quote=updateServiceQuote();if(quote.subtotal>10000){input.checked=false;toast("That feature would exceed the ₹10,000 package limit. Remove another add-on first.");updateServiceQuote();}}));
$("applyCoupon").addEventListener("click",()=>{const code=$("couponCode").value.trim().toUpperCase();if(ownerCoupons[code]){activeCoupon=code;$("couponStatus").textContent=code+" applied — "+ownerCoupons[code]+"% off.";$("couponStatus").style.color="#8fc6a2";}else{activeCoupon="";$("couponStatus").textContent=code?"That code isn't valid. Check the code and try again.":"Enter a discount code first.";$("couponStatus").style.color="#e6a18b";}updateServiceQuote();});
$("couponCode").addEventListener("input",()=>{activeCoupon="";$("couponStatus").textContent="Have a code? Enter it above.";$("couponStatus").style.color="";updateServiceQuote();});
function currentUser(){return window.shopwiseFirebaseUser||null;}
async function checkoutApi(user,body){
 const token=await user.getIdToken(),isAdmin=body.action==="admin-orders";
 const response=await fetch("/.netlify/functions/checkout",{method:isAdmin?"GET":"POST",headers:{"Content-Type":"application/json","Authorization":"Bearer "+token},body:isAdmin?undefined:JSON.stringify(body)});
 const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"The request could not be completed.");return data;
}
function setStatus(message){$("serviceStatus").textContent=message;}
window.addEventListener("shopwise-auth-state",event=>{
 const user=event.detail&&event.detail.user;$("serviceGate").hidden=!!user;$("serviceBuilder").hidden=!user;
 if(user){$("accountBtn").textContent="♙ "+(user.displayName||"My account");$("authTitle").textContent="You're signed in";$("authDescription").textContent="Your Google account is ready to use with your Logic Wise project.";setStatus("Signed in as "+(user.email||user.displayName||"your Google account")+". Configure your project below.");closeAuth();}
 else $("accountBtn").textContent="♙ Account";
});
$("submitProject").addEventListener("click",async()=>{
 const projectName=$("projectName").value.trim();if(!projectName){$("projectName").focus();setStatus("Please enter your business or project name.");return;}
 const user=currentUser();if(!user){setStatus("Please sign in with Google first.");$("authModal").hidden=false;return;}
 const quote=updateServiceQuote();if(quote.subtotal>10000){setStatus("Please adjust your selected features to stay within ₹10,000.");return;}
 const button=$("submitProject");button.disabled=true;setStatus("Creating a secure payment order…");
 try{
  const created=await checkoutApi(user,{action:"create-order",projectName,projectType:$("projectType").value,brief:$("projectBrief").value.trim(),domain:$("projectDomain").value.trim(),features:quote.items.map(i=>i.id),discountCode:activeCoupon||""});
  if(!window.Razorpay)await new Promise((resolve,reject)=>{const script=document.createElement("script");script.src="https://checkout.razorpay.com/v1/checkout.js";script.onload=resolve;script.onerror=()=>reject(new Error("Could not load Razorpay Checkout."));document.head.appendChild(script);});
  const checkout=new Razorpay({key:created.keyId,amount:created.amount,currency:created.currency,name:"Logic Wise",description:"Website project: "+projectName,order_id:created.razorpayOrderId,prefill:created.customer,theme:{color:"#ffc34a"},handler:async response=>{
    setStatus("Payment submitted to Razorpay; verifying securely…");
    try{const verified=await checkoutApi(user,{action:"verify-payment",orderId:response.razorpay_order_id,paymentId:response.razorpay_payment_id,signature:response.razorpay_signature});setStatus("Payment verified. Order reference: "+verified.orderId+".");toast("Payment verification confirmed.");}
    catch(error){setStatus("Payment was submitted, but automatic verification could not be confirmed. Do not pay again; contact logicwise.in@gmail.com with payment ID "+response.razorpay_payment_id+".");}
  },modal:{ondismiss:()=>setStatus("Checkout closed. If you completed a payment, contact us if confirmation doesn't appear.")}});
  checkout.on("payment.failed",response=>setStatus("Payment failed: "+(response.error&&response.error.description||"Please try again.")));checkout.open();
 }catch(error){setStatus(error.message+" Checkout is not ready until server credentials and database setup are complete. No payment should be attempted until this is resolved.");}
 finally{button.disabled=false;}
});
$("adminButton").addEventListener("click",async()=>{
 const user=currentUser();if(!user){setStatus("Sign in with your authorized Google account first.");$("authModal").hidden=false;return;}
 $("adminPanel").hidden=false;$("adminOrdersList").textContent="Loading orders…";
 try{const data=await checkoutApi(user,{action:"admin-orders"}),list=$("adminOrdersList");list.replaceChildren();if(!data.orders||!data.orders.length){list.textContent="No orders yet.";return;}
 data.orders.forEach(order=>{const card=document.createElement("div");card.className="admin-order";const title=document.createElement("strong");title.textContent=order.project_name+" — "+money(Number(order.total_paise)/100)+" · "+order.payment_status;const detail=document.createElement("span");detail.textContent=(order.customer_name||"Customer")+" ("+(order.customer_email||"")+") · "+(order.project_type||"Project")+" · "+new Date(order.created_at).toLocaleString();card.append(title,detail);list.append(card);});
 }catch(error){$("adminOrdersList").textContent=error.message;}
});
updateServiceQuote();
