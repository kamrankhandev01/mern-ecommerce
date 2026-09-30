import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
// Same DNS pinning the server uses for Atlas SRV lookups.
dns.setServers(["8.8.8.8", "8.8.4.4"]);
import userModel from "../models/userModel.js";
import productModel from "../models/productModel.js";
import orderModel from "../models/orderModel.js";
import cartModel from "../models/cartModel.js";

const BASE = "http://localhost:3000";
const EMAIL = `smoke-${Date.now()}@astra.test`;
const ADDRESS = {
  fullName: "Smoke Tester",
  email: EMAIL,
  phone: "+15550000000",
  addressLine1: "1 Test Street",
  city: "Testville",
  region: "CA",
  postalCode: "90001",
  country: "US",
};
let cookie = "";
let failures = 0;

const check = (label, condition, extra) => {
  if (condition) {
    console.log(`  PASS  ${label}`);
  } else {
    failures += 1;
    console.log(`  FAIL  ${label}`, extra ?? "");
  }
};

const call = async (path, options = {}) => {
  const headers = { ...(options.headers || {}) };
  if (cookie) headers.Cookie = cookie;
  if (options.body && !(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const response = await fetch(BASE + path, { ...options, headers });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await response.text();
  let data = text;
  try {
    data = JSON.parse(text);
  } catch {
    /* keep raw text */
  }
  return { status: response.status, data };
};

const post = (path, body) =>
  call(path, { method: "POST", body: JSON.stringify(body) });

const order = (paymentMethod) =>
  post("/api/orders", { fromCart: true, paymentMethod, shippingAddress: ADDRESS });

const createdProducts = [];
let userId = null;

await mongoose.connect(process.env.MONGO_URI);

try {
  console.log("\n== auth ==");
  let response = await post("/api/auth/register", {
    name: "Smoke Tester",
    email: EMAIL,
    password: "sup3rsecret",
  });
  check("register returns 201 + session cookie", response.status === 201, response);
  userId = response.data?.user?._id;
  check("register returns a user", Boolean(userId), response);

  response = await call(`/api/auth/user/${userId}`);
  check("profile is readable when signed in", response.status === 200, response);

  const user = await userModel.findById(userId);
  user.role = "admin";
  await user.save();

  console.log("\n== cart (per-user, server-side) ==");
  response = await call("/api/cart");
  check("cart is empty for a new user", response.status === 200 && response.data.cart.items.length === 0, response);
  check("cart reports totals", response.data?.cart?.subtotal === 0, response);

  console.log("\n== catalog ==");
  const form = new FormData();
  form.append("name", "Smoke Test Product");
  form.append("description", "Temporary product for the smoke test.");
  form.append("price", "40");
  form.append("category", "Testing");
  form.append("stock", "5");
  form.append("isBestSeller", "false");
  form.append("attributes", JSON.stringify({ Colour: "Black" }));
  response = await call("/api/products/add-product", { method: "POST", body: form });
  check("admin can create a product", response.status === 201, response);
  const productId = response.data?._id;
  createdProducts.push(productId);
  check("product stores typed numbers", response.data?.price === 40 && response.data?.stock === 5, response);

  console.log("\n== cart writes ==");
  response = await post("/api/cart/items", { productId, quantity: 2 });
  check("add to cart", response.status === 200 && response.data.cart.items.length === 1, response);
  check("price recalculated server-side", response.data?.cart?.subtotal === 80, response);
  check("free shipping over threshold", response.data?.cart?.shipping === 0, response);

  response = await call(`/api/cart/items/${productId}`, {
    method: "PATCH",
    body: JSON.stringify({ quantity: 1 }),
  });
  check("update quantity", response.data?.cart?.items?.[0]?.quantity === 1, response);
  check("totals follow the update", response.data?.cart?.subtotal === 40, response);
  check("shipping applied below threshold", response.data?.cart?.shipping === 8, response);

  response = await post("/api/cart/merge", { items: [{ productId, quantity: 2 }] });
  check("merge combines quantities", response.data?.cart?.items?.[0]?.quantity === 3, response);

  console.log("\n== checkout (offline) ==");
  response = await order("offline");
  check("order is created from the server cart", response.status === 201, response);
  const offlineOrder = response.data?.order;
  check("order is priced by the server", offlineOrder?.subtotal === 120, offlineOrder);
  check("order starts unpaid/pending", offlineOrder?.paymentStatus === "unpaid" && offlineOrder?.status === "pending", offlineOrder);

  response = await call("/api/cart");
  check("cart is emptied after ordering", response.data?.cart?.items?.length === 0, response);

  response = await post(`/api/orders/${offlineOrder._id}/confirm`, {});
  check("confirm rejects offline orders", response.status === 400, response);

  const afterOrder = await productModel.findById(productId);
  check("stock was reserved (5 - 3)", afterOrder.stock === 2, afterOrder.stock);

  console.log("\n== payment providers ==");
  response = await call("/api/orders/payment-options");
  const methodIds = (response.data?.methods || []).map((entry) => entry.id);
  check("payment options include stripe", methodIds.includes("stripe"), methodIds);
  check("payment options include safepay", methodIds.includes("safepay"), methodIds);
  check("payment options include offline", methodIds.includes("offline"), methodIds);

  await post("/api/cart/items", { productId, quantity: 1 });
  response = await order("stripe");
  const stripeOrder = response.data?.order;
  check("stripe checkout session created", response.status === 201 && typeof response.data.checkoutUrl === "string", {
    status: response.status,
    message: response.data?.message,
  });
  check(
    "stripe returns a hosted checkout url",
    String(response.data?.checkoutUrl || "").startsWith("https://checkout.stripe.com"),
    response.data?.checkoutUrl,
  );
  check("order is pending payment", stripeOrder?.paymentStatus === "pending", stripeOrder);

  response = await post(`/api/orders/${stripeOrder?._id}/confirm`, {
    sessionId: "cs_test_definitely_not_a_real_session",
  });
  check("confirm refuses a bogus stripe session", response.status === 400, response);

  await post("/api/cart/items", { productId, quantity: 1 });
  response = await order("safepay");
  const safepayOrder = response.data?.order;
  check("safepay order created (live Safepay call)", response.status === 201, {
    status: response.status,
    message: response.data?.message,
  });
  console.log("         safepay checkout url:", response.data?.checkoutUrl ?? response.data?.message);
  check(
    "safepay returns a hosted checkout url",
    String(response.data?.checkoutUrl || "").includes("getsafepay.com"),
    response.data?.checkoutUrl,
  );

  response = await post(`/api/orders/${safepayOrder?._id}/confirm`, {
    tracker: "smoke-tracker",
    sig: "0".repeat(64),
  });
  check("confirm refuses a forged safepay signature", response.status === 400, response);

  console.log("\n== admin console endpoints ==");
  response = await call("/api/orders/admin/stats");
  check("admin stats load", response.status === 200 && response.data?.stats, response);
  check("stats count orders", response.data?.stats?.orders?.total >= 3, response.data?.stats?.orders);

  response = await call("/api/orders/admin?limit=5");
  check("admin order list paginates", response.status === 200 && Array.isArray(response.data?.orders) && response.data?.pagination, response);

  response = await call("/api/auth/users?limit=5");
  check("admin customer list loads", response.status === 200 && Array.isArray(response.data?.users), response);

  response = await call("/api/auth/users?search=" + encodeURIComponent(EMAIL.split("@")[0]));
  check("customer search matches", response.data?.users?.some((entry) => entry.email === EMAIL), response.data?.users);

  response = await call(`/api/auth/users/${userId}/role`, {
    method: "PATCH",
    body: JSON.stringify({ role: "user" }),
  });
  check("admins cannot change their own role", response.status === 409, response);

  response = await call("/api/products/all-products?search=Smoke&limit=100");
  check("admin can read the full catalogue", response.status === 200 && response.data.length >= 1, response);

  console.log("\n== analytics ==");
  response = await call("/api/orders/admin/analytics?range=30");
  const report = response.data?.report;
  check("analytics report loads", response.status === 200 && Boolean(report), response);
  check("series is densified to 30 days", report?.series?.length === 30, report?.series?.length);
  check(
    "every series point has a date and numbers",
    report?.series?.every(
      (point) => typeof point.date === "string" && typeof point.revenue === "number",
    ),
    report?.series?.[0],
  );
  check("kpis expose period-over-period deltas", typeof report?.kpis?.revenue?.delta === "number", report?.kpis);
  check("category split is present", Array.isArray(report?.categories), report?.categories);
  check("payment method split is present", Array.isArray(report?.paymentMethods), report?.paymentMethods);
  check("inventory value is computed", typeof report?.inventory?.value === "number", report?.inventory);

  response = await call("/api/orders/admin/analytics?range=7");
  check("range=7 returns 7 points", response.data?.report?.series?.length === 7, response.data?.report?.series?.length);

  response = await call("/api/orders/admin/analytics?range=bogus");
  check("invalid range falls back to 30", response.data?.report?.series?.length === 30, response.data?.report?.range);
} catch (error) {
  failures += 1;
  console.error("\nUnexpected error:", error);
} finally {
  if (userId) {
    await orderModel.deleteMany({ userId });
    await cartModel.deleteMany({ userId });
    await productModel.deleteMany({ _id: { $in: createdProducts.filter(Boolean) } });
    await userModel.deleteOne({ _id: userId });
  }
  await mongoose.disconnect();
  console.log(
    failures === 0 ? "\nALL CHECKS PASSED\n" : `\n${failures} CHECK(S) FAILED\n`,
  );
  process.exit(failures === 0 ? 0 : 1);
}
