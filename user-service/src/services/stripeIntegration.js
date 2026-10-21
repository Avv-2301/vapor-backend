const stripeRequest = async (path, options = {}) => {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    const error = new Error("Stripe is not configured. Set STRIPE_SECRET_KEY on the user service.");
    error.status = 503;
    throw error;
  }

  const response = await fetch(`https://api.stripe.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${secretKey}`,
      ...(options.body ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      ...options.headers,
    },
  });
  const result = await response.json();
  if (!response.ok) {
    const error = new Error(result.error?.message || "Stripe request failed.");
    error.status = 502;
    throw error;
  }
  return result;
};

const frontendUrl = () => (process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173").replace(/\/$/, "");

exports.createCheckoutSession = async ({ userId, email, purpose, amount, items }) => {
  const successPath = purpose === "purchase" ? "/checkout" : "/wallet";
  const params = new URLSearchParams();
  params.set("mode", "payment");
  params.set("success_url", `${frontendUrl()}${successPath}?stripe_session_id={CHECKOUT_SESSION_ID}`);
  params.set("cancel_url", `${frontendUrl()}${successPath}?payment=cancelled`);
  params.set("customer_email", email);
  params.set("client_reference_id", String(userId));
  params.set("metadata[userId]", String(userId));
  params.set("metadata[purpose]", purpose);

  if (purpose === "top-up") {
    params.set("metadata[amount]", String(amount));
    params.set("line_items[0][price_data][currency]", "inr");
    params.set("line_items[0][price_data][product_data][name]", "Vapor Wallet funds");
    params.set("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
    params.set("line_items[0][quantity]", "1");
  } else {
    items.forEach((item, index) => {
      params.set(`line_items[${index}][price_data][currency]`, "inr");
      params.set(`line_items[${index}][price_data][product_data][name]`, item.name);
      params.set(`line_items[${index}][price_data][unit_amount]`, String(Math.round(item.amount * 100)));
      params.set(`line_items[${index}][quantity]`, "1");
    });
  }

  return stripeRequest("/checkout/sessions", { method: "POST", body: params });
};

exports.getCheckoutSession = (sessionId) => stripeRequest(`/checkout/sessions/${encodeURIComponent(sessionId)}`);
