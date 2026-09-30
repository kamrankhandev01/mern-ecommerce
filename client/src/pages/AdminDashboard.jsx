import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import {
  ArrowRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  Mail,
  PackagePlus,
  Pencil,
  RotateCw,
  Search,
  ShieldAlert,
  Star,
  Trash2,
  Truck,
  Users,
  X,
} from "lucide-react";
import api from "../lib/api";
import { formatDate, formatPrice, titleCase } from "../lib/format";
import {
  attributesToForm,
  CATEGORY_OPTIONS,
  fieldsForCategory,
  formToAttributes,
  hasCustomSchema,
} from "../lib/categoryAttributes";
import { useScrollLock } from "../hooks/useScrollLock";
import Overview from "./admin/Overview";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: CircleDollarSign },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "products", label: "Products", icon: Boxes },
  { id: "customers", label: "Customers", icon: Users },
  { id: "messages", label: "Messages", icon: Mail },
];

const MESSAGE_STATUSES = ["new", "read", "archived"];

const ORDER_STATUSES = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];
const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "refunded"];

/** Fulfillment can only move forward, except to cancellation. */
const nextStatuses = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

const statusStyles = {
  pending: "bg-amber-50 text-amber-900",
  processing: "bg-sky-50 text-sky-900",
  shipped: "bg-indigo-50 text-indigo-900",
  delivered: "bg-emerald-50 text-emerald-900",
  cancelled: "bg-neutral-100 text-neutral-700",
};

const initialProduct = {
  name: "",
  description: "",
  price: "",
  category: "",
  stock: "",
  isBestSeller: false,
  // Attribute values keyed by the schema field key, plus any unknown keys that
  // were already stored and must survive a save.
  attributeValues: {},
  attributeExtras: {},
};

const inputClass =
  "mt-1.5 h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950";

/**
 * One attribute control, chosen by the field's declared `type`.
 *
 * Every attribute is optional, so nothing here is required and nothing blocks
 * saving — an unfinished product simply shows fewer specs.
 */
const AttributeField = ({ field, value, onChange }) => {
  const id = `attr-${field.key.replace(/\s+/g, "-").toLowerCase()}`;
  const describedBy = field.placeholder ? `${id}-hint` : undefined;

  if (field.type === "boolean") {
    return (
      <div className="flex items-center gap-3 border border-neutral-200 bg-neutral-50 px-3 py-2.5">
        <input
          id={id}
          type="checkbox"
          checked={Boolean(value)}
          onChange={(event) => onChange(event.target.checked)}
          className="size-4 shrink-0 accent-neutral-950"
        />
        <label
          htmlFor={id}
          className="text-xs font-medium text-neutral-700"
        >
          {field.label}
        </label>
      </div>
    );
  }

  return (
    <label
      htmlFor={id}
      className="block text-xs font-medium text-neutral-700"
    >
      {field.label}
      {field.type === "select" ? (
        <select
          id={id}
          value={value || ""}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        >
          <option value="">Not specified</option>
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={id}
          type={field.type === "number" ? "number" : "text"}
          inputMode={field.type === "number" ? "numeric" : undefined}
          min={field.min}
          maxLength={field.type === "number" ? undefined : 80}
          value={value ?? ""}
          placeholder={field.placeholder}
          aria-describedby={describedBy}
          onChange={(event) => onChange(event.target.value)}
          className={inputClass}
        />
      )}
      {field.placeholder && (
        <span
          id={describedBy}
          className="mt-1 block text-[11px] font-normal text-neutral-400"
        >
          {field.placeholder}
        </span>
      )}
    </label>
  );
};

const AdminDashboard = () => {
  const user = useSelector((state) => state.user.user);
  const [section, setSection] = useState("overview");
  const [refreshToken, setRefreshToken] = useState(0);
  const refresh = () => setRefreshToken((value) => value + 1);

  // overview / analytics
  const [range, setRange] = useState(30);
  const [report, setReport] = useState(null);
  const [reportError, setReportError] = useState("");
  const [reportKey, setReportKey] = useState(null);
  const reportRequestKey = `${refreshToken}:${range}`;
  const reportLoading = reportKey !== reportRequestKey;

  // orders
  const [orders, setOrders] = useState([]);
  const [orderPage, setOrderPage] = useState(1);
  const [orderPages, setOrderPages] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [orderSearch, setOrderSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("");
  const [savingOrderId, setSavingOrderId] = useState("");
  const [noteDrafts, setNoteDrafts] = useState({});
  const [ordersKey, setOrdersKey] = useState(null);
  const ordersRequestKey = `${refreshToken}:${orderPage}:${statusFilter}:${paymentFilter}:${orderSearch}`;
  const ordersLoading = ordersKey !== ordersRequestKey;

  // products
  const [products, setProducts] = useState([]);
  const [productsKey, setProductsKey] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [productDialog, setProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [productForm, setProductForm] = useState(initialProduct);
  const [productFiles, setProductFiles] = useState([]);
  const [keptImages, setKeptImages] = useState([]);
  const [savingProduct, setSavingProduct] = useState(false);
  const [formError, setFormError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const productsLoading = productsKey !== refreshToken;

  // Both the product editor and the delete confirmation cover the screen.
  useScrollLock(productDialog || Boolean(deleteTarget));

  // customers
  const [users, setUsers] = useState([]);
  const [userPage, setUserPage] = useState(1);
  const [userPages, setUserPages] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearch, setUserSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [savingUserId, setSavingUserId] = useState("");
  const [usersKey, setUsersKey] = useState(null);
  const usersRequestKey = `${refreshToken}:${userPage}:${roleFilter}:${userSearch}`;
  const usersLoading = usersKey !== usersRequestKey;

  // contact messages
  const [messages, setMessages] = useState([]);
  const [messagePage, setMessagePage] = useState(1);
  const [messagePages, setMessagePages] = useState(1);
  const [messageTotal, setMessageTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [messageSearch, setMessageSearch] = useState("");
  const [messageStatus, setMessageStatus] = useState("");
  const [openMessage, setOpenMessage] = useState(null);
  const [messagesKey, setMessagesKey] = useState(null);
  const messagesRequestKey = `${refreshToken}:${messagePage}:${messageStatus}:${messageSearch}`;
  const messagesLoading = messagesKey !== messagesRequestKey;

  // Shared inline failure area — an admin action that fails should say so next
  // to the thing that failed, not in a floating toast.
  const [actionError, setActionError] = useState("");

  /* ----------------------------------------------------------------- loads */

  useEffect(() => {
    const controller = new AbortController();
    api
      .get(`/api/orders/admin/analytics?range=${range}`, {
        signal: controller.signal,
      })
      .then(({ data }) => {
        setReport(data.report);
        setReportError("");
        setReportKey(reportRequestKey);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setReportError(
          error.response?.data?.message ||
            "Could not build the analytics report.",
        );
        setReportKey(reportRequestKey);
      });
    return () => controller.abort();
  }, [range, refreshToken, reportRequestKey]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(orderPage),
      limit: "15",
    });
    if (statusFilter) params.set("status", statusFilter);
    if (paymentFilter) params.set("paymentStatus", paymentFilter);
    if (orderSearch.trim()) params.set("search", orderSearch.trim());

    api
      .get("/api/orders/admin", { params, signal: controller.signal })
      .then(({ data }) => {
        setOrders(Array.isArray(data.orders) ? data.orders : []);
        setOrderPages(data.pagination?.pages || 1);
        setOrderTotal(data.pagination?.total || 0);
        setOrdersKey(ordersRequestKey);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        // Background refresh failures stay inline; a toast per retry is noise.
        setOrders([]);
        setOrdersKey(ordersRequestKey);
      });
    return () => controller.abort();
  }, [orderPage, orderSearch, ordersRequestKey, paymentFilter, statusFilter]);

  useEffect(() => {
    const controller = new AbortController();
    api
      .get("/api/products/all-products?sort=newest&limit=100", {
        signal: controller.signal,
      })
      .then(({ data }) => {
        setProducts(Array.isArray(data) ? data : []);
        setProductsKey(refreshToken);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setProducts([]);
        setProductsKey(refreshToken);
      });
    return () => controller.abort();
  }, [refreshToken]);

  useEffect(() => {
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(userPage),
      limit: "15",
    });
    if (roleFilter) params.set("role", roleFilter);
    if (userSearch.trim()) params.set("search", userSearch.trim());

    api
      .get("/api/auth/users", { params, signal: controller.signal })
      .then(({ data }) => {
        setUsers(Array.isArray(data.users) ? data.users : []);
        setUserPages(data.pagination?.pages || 1);
        setUserTotal(data.pagination?.total || 0);
        setUsersKey(usersRequestKey);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setUsers([]);
        setUsersKey(usersRequestKey);
      });
    return () => controller.abort();
  }, [refreshToken, roleFilter, userPage, userSearch, usersRequestKey]);

  useEffect(() => {
    if (section !== "messages") return;
    const controller = new AbortController();
    const params = new URLSearchParams({
      page: String(messagePage),
      limit: "15",
    });
    if (messageStatus) params.set("status", messageStatus);
    if (messageSearch.trim()) params.set("search", messageSearch.trim());

    api
      .get("/api/contact", { params, signal: controller.signal })
      .then(({ data }) => {
        setMessages(Array.isArray(data.messages) ? data.messages : []);
        setMessagePages(data.pagination?.pages || 1);
        setMessageTotal(data.pagination?.total || 0);
        setUnread(data.unread || 0);
        setMessagesKey(messagesRequestKey);
      })
      .catch((error) => {
        if (error.code === "ERR_CANCELED") return;
        setMessages([]);
        setMessagesKey(messagesRequestKey);
        setActionError(error.response?.data?.message || "Could not load messages.");
      });
    return () => controller.abort();
  }, [
    messagePage,
    messageSearch,
    messageStatus,
    messagesRequestKey,
    refreshToken,
    section,
  ]);

  /* -------------------------------------------------------------- derived */

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;
    return products.filter((product) =>
      `${product.name} ${product.category} ${product.stock}`
        .toLowerCase()
        .includes(term),
    );
  }, [products, productSearch]);

  /* -------------------------------------------------------------- handlers */

  const openNewProduct = () => {
    setEditingProduct(null);
    setProductForm(initialProduct);
    setProductFiles([]);
    setKeptImages([]);
    setFormError("");
    setProductDialog(true);
  };

  /**
   * Changing category swaps the attribute fields, but values the new schema has
   * no home for are carried over as "extras" instead of being thrown away.
   */
  const changeCategory = (category) => {
    const carried = formToAttributes(
      productForm.attributeValues,
      productForm.attributeExtras,
      productForm.category,
    );
    const { values, extras } = attributesToForm(carried, category);
    setProductForm({
      ...productForm,
      category,
      attributeValues: values,
      attributeExtras: extras,
    });
  };

  const setAttributeValue = (key, value) => {
    setProductForm((current) => ({
      ...current,
      attributeValues: { ...current.attributeValues, [key]: value },
    }));
  };

  const setAttributeExtra = (key, value) => {
    setProductForm((current) => ({
      ...current,
      attributeExtras: { ...current.attributeExtras, [key]: value },
    }));
  };

  const removeAttributeExtra = (key) => {
    setProductForm((current) => {
      const next = { ...current.attributeExtras };
      delete next[key];
      return { ...current, attributeExtras: next };
    });
  };

  const addAttributeExtra = () => {
    setProductForm((current) => {
      const used = new Set(
        fieldsForCategory(current.category).map((field) =>
          field.key.toLowerCase(),
        ),
      );
      let name = "Custom";
      let counter = 2;
      while (
        used.has(name.toLowerCase()) ||
        Object.keys(current.attributeExtras).some(
          (key) => key.toLowerCase() === name.toLowerCase(),
        )
      ) {
        name = `Custom ${counter}`;
        counter += 1;
      }
      return {
        ...current,
        attributeExtras: { ...current.attributeExtras, [name]: "" },
      };
    });
  };

  const openEditProduct = (product) => {
    setEditingProduct(product);
    // Mongoose returns `attributes` as a Map; normalise before reading it.
    const stored = product.attributes
      ? product.attributes instanceof Map
        ? Object.fromEntries(product.attributes)
        : product.attributes
      : {};
    const { values, extras } = attributesToForm(stored, product.category);
    setProductForm({
      name: product.name || "",
      description: product.description || "",
      price: String(product.price ?? ""),
      category: product.category || "",
      stock: String(product.stock ?? ""),
      isBestSeller: Boolean(product.isBestSeller),
      attributeValues: values,
      attributeExtras: extras,
    });
    setProductFiles([]);
    setKeptImages(
      (product.images || []).map((image) => image.public_id).filter(Boolean),
    );
    setFormError("");
    setProductDialog(true);
  };

  const toggleKeptImage = (publicId) => {
    setKeptImages((current) =>
      current.includes(publicId)
        ? current.filter((entry) => entry !== publicId)
        : [...current, publicId],
    );
  };

  const saveProduct = async (event) => {
    event.preventDefault();
    setSavingProduct(true);
    setFormError("");

    // Built from the typed fields, so it is always a flat string map.
    const attributes = formToAttributes(
      productForm.attributeValues,
      productForm.attributeExtras,
      productForm.category,
    );

    const price = Number(productForm.price);
    const stock = Math.trunc(Number(productForm.stock));
    if (!productForm.name.trim() || !productForm.category.trim()) {
      setFormError("Name and category are required.");
      setSavingProduct(false);
      return;
    }
    if (!Number.isFinite(price) || price < 0) {
      setFormError("Enter a valid price of 0 or more.");
      setSavingProduct(false);
      return;
    }
    if (!Number.isFinite(stock) || stock < 0) {
      setFormError("Enter a valid stock quantity of 0 or more.");
      setSavingProduct(false);
      return;
    }

    try {
      const body = new FormData();
      body.append("name", productForm.name.trim());
      body.append("description", productForm.description.trim());
      body.append("price", String(price));
      body.append("category", productForm.category.trim());
      body.append("stock", String(stock));
      body.append("isBestSeller", String(productForm.isBestSeller));
      body.append("attributes", JSON.stringify(attributes));
      if (editingProduct) {
        // Images not ticked here are deleted from Cloudinary by the server.
        body.append("existingImages", JSON.stringify(keptImages));
      }
      productFiles.forEach((file) => body.append("files", file));

      await api[editingProduct ? "put" : "post"](
        editingProduct
          ? `/api/products/update-product/${editingProduct._id}`
          : "/api/products/add-product",
        body,
      );
      // The row disappears from the list on refresh, which is the feedback.
      setProductDialog(false);
      refresh();
    } catch (error) {
      setFormError(
        error.response?.data?.message ||
          error.message ||
          "Could not save the product.",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const deleteProduct = async () => {
    if (!deleteTarget) return;
    setActionError("");
    try {
      await api.delete(`/api/products/delete-product/${deleteTarget._id}`);
      setDeleteTarget(null);
      refresh();
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Could not delete this product.",
      );
    }
  };

  const updateOrder = async (order, updates) => {
    setSavingOrderId(order._id);
    setActionError("");
    try {
      const { data } = await api.patch(`/api/orders/admin/${order._id}`, updates);
      if (!data.success) {
        throw new Error(data.message || "Could not update the order.");
      }
      setOrders((current) =>
        current.map((entry) =>
          entry._id === order._id ? { ...entry, ...data.order } : entry,
        ),
      );
    } catch (error) {
      setActionError(
        error.response?.data?.message ||
          error.message ||
          "Could not update the order.",
      );
    } finally {
      setSavingOrderId("");
    }
  };

  const saveNote = (order) => {
    const note = noteDrafts[order._id] ?? order.adminNote ?? "";
    updateOrder(order, { adminNote: note });
  };

  const changeRole = async (target, role) => {
    setSavingUserId(target._id);
    setActionError("");
    try {
      const { data } = await api.patch(`/api/auth/users/${target._id}/role`, {
        role,
      });
      setUsers((current) =>
        current.map((entry) =>
          entry._id === target._id ? { ...entry, ...data.user } : entry,
        ),
      );
    } catch (error) {
      setActionError(
        error.response?.data?.message || "Could not change that role.",
      );
    } finally {
      setSavingUserId("");
    }
  };

  const setMessageState = async (message, status) => {
    setActionError("");
    const previous = messages;
    // Optimistic: the select is the feedback, so update it in place.
    setMessages((current) =>
      current.map((entry) =>
        entry._id === message._id ? { ...entry, status } : entry,
      ),
    );
    if (openMessage?._id === message._id) {
      setOpenMessage({ ...openMessage, status });
    }
    try {
      await api.patch(`/api/contact/${message._id}`, { status });
      refresh();
    } catch (error) {
      setMessages(previous);
      setActionError(
        error.response?.data?.message || "Could not update that message.",
      );
    }
  };

  /* ----------------------------------------------------------------- render */

  if (user?.role !== "admin") {
    return (
      <main className="flex min-h-[65vh] items-center justify-center bg-[#f4f3ef] px-5">
        <section className="max-w-md border border-neutral-200 bg-white p-8 text-center">
          <ShieldAlert
            size={26}
            className="mx-auto text-amber-800"
            aria-hidden="true"
          />
          <h1 className="mt-4 text-2xl font-medium">Admin access required</h1>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            Sign in with an administrator account to manage the Astra store.
          </p>
          <Link
            to="/account"
            className="mt-5 inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-amber-700"
          >
            Go to account <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f4f3ef] px-4 py-7 sm:px-7 sm:py-10 lg:px-12">
      <div className="mx-auto max-w-360">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
              Astra / Operations
            </p>
            <h1 className="mt-2 text-3xl font-medium sm:text-4xl">
              Store console
            </h1>
            <p className="mt-2 text-sm text-neutral-600">
              Revenue, fulfilment, inventory and customer accounts.
            </p>
          </div>
          <button
            type="button"
            onClick={refresh}
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-neutral-300 bg-white px-4 text-sm font-medium hover:border-neutral-950"
          >
            <RotateCw size={14} aria-hidden="true" /> Refresh
          </button>
        </div>

        <div className="scrollbar-none mt-7 flex gap-2 overflow-x-auto border-b border-neutral-300 sm:gap-6">
          {SECTIONS.map((entry) => {
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => setSection(entry.id)}
                aria-current={section === entry.id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-2 border-b-2 px-2 py-3 text-sm font-semibold transition-colors ${section === entry.id ? "border-neutral-950 text-neutral-950" : "border-transparent text-neutral-500 hover:text-neutral-800"}`}
              >
                <Icon size={15} aria-hidden="true" /> {entry.label}
              </button>
            );
          })}
        </div>

        {section === "overview" && (
          <Overview
            report={report}
            loading={reportLoading}
            error={reportError}
            range={range}
            onRangeChange={setRange}
            onRetry={refresh}
          />
        )}

        {section === "orders" && (
          <section className="mt-6" aria-label="Order management">
            <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-3">
                <label className="block text-xs font-medium text-neutral-700">
                  Search
                  <span className="relative mt-1.5 block">
                    <Search
                      size={14}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                      aria-hidden="true"
                    />
                    <input
                      value={orderSearch}
                      onChange={(event) => {
                        setOrderSearch(event.target.value);
                        setOrderPage(1);
                      }}
                      placeholder="Order number, name or email"
                      className={inputClass.replace("mt-1.5 ", "pl-9 ")}
                    />
                  </span>
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Fulfillment
                  <select
                    value={statusFilter}
                    onChange={(event) => {
                      setStatusFilter(event.target.value);
                      setOrderPage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All statuses</option>
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Payment
                  <select
                    value={paymentFilter}
                    onChange={(event) => {
                      setPaymentFilter(event.target.value);
                      setOrderPage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All payments</option>
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-neutral-500">
                {orderTotal} {orderTotal === 1 ? "order" : "orders"} · page{" "}
                {orderPage} of {orderPages}
              </p>
            </div>

            {ordersLoading ? (
              <div className="mt-6 flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading orders
              </div>
            ) : orders.length === 0 ? (
              <EmptyState
                title="No orders match"
                detail="Adjust the filters, or wait for the next order to arrive."
              />
            ) : (
              <div className="mt-4 space-y-3">
                {orders.map((order) => {
                  const transitions = nextStatuses[order.status] || [];
                  const customer =
                    order.userId?.name || order.shippingAddress?.fullName;
                  const saving = savingOrderId === order._id;
                  return (
                    <article
                      key={order._id}
                      className="border border-neutral-200 bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <Link
                              to={`/orders/${order._id}`}
                              className="text-sm font-semibold hover:underline"
                            >
                              {order.orderNumber}
                            </Link>
                            <span className="text-xs text-neutral-500">
                              {formatDate(order.createdAt)}
                            </span>
                            <span
                              className={`px-2.5 py-1 text-xs font-semibold capitalize ${statusStyles[order.status]}`}
                            >
                              {order.status}
                            </span>
                            <span className="px-2.5 py-1 text-xs font-semibold capitalize text-neutral-700">
                              {order.paymentStatus}
                            </span>
                          </div>
                          <p className="mt-1 text-xs text-neutral-600">
                            {customer} · {order.shippingAddress?.email} ·{" "}
                            {order.shippingAddress?.city},{" "}
                            {order.shippingAddress?.country}
                          </p>
                          <ul className="mt-3 flex flex-wrap gap-2">
                            {order.items.map((item) => (
                              <li
                                key={item.productId}
                                className="flex items-center gap-2 border border-neutral-200 bg-[#faf9f6] px-2 py-1.5 text-xs"
                              >
                                {item.image && (
                                  <img
                                    src={item.image}
                                    alt=""
                                    className="size-6 object-cover"
                                  />
                                )}
                                <span className="max-w-40 truncate">
                                  {item.name}
                                </span>
                                <span className="text-neutral-500">
                                  ×{item.quantity}
                                </span>
                              </li>
                            ))}
                          </ul>
                          <p className="mt-3 text-xs text-neutral-600">
                            Paid by {titleCase(order.paymentMethod)} · total{" "}
                            <span className="font-semibold text-neutral-950">
                              {formatPrice(order.total)}
                            </span>{" "}
                            ·{" "}
                            {order.shipping > 0
                              ? `${formatPrice(order.shipping)} shipping`
                              : "complimentary shipping"}
                          </p>
                        </div>

                        <div className="flex w-full shrink-0 flex-col gap-2 xl:w-64">
                          {transitions.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {transitions.map((next) => (
                                <button
                                  key={next}
                                  type="button"
                                  disabled={saving}
                                  onClick={() =>
                                    updateOrder(order, { status: next })
                                  }
                                  className="min-h-9 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950 disabled:opacity-50"
                                >
                                  {next === "cancelled"
                                    ? "Cancel order"
                                    : `Mark ${next}`}
                                </button>
                              ))}
                            </div>
                          )}
                          <label className="text-xs font-medium text-neutral-700">
                            Payment status
                            <select
                              value={order.paymentStatus}
                              disabled={saving}
                              onChange={(event) =>
                                updateOrder(order, {
                                  paymentStatus: event.target.value,
                                })
                              }
                              className={inputClass}
                            >
                              {PAYMENT_STATUSES.map((status) => (
                                <option key={status} value={status}>
                                  {titleCase(status)}
                                </option>
                              ))}
                            </select>
                          </label>
                          <label className="text-xs font-medium text-neutral-700">
                            Internal note
                            <textarea
                              rows={2}
                              maxLength={500}
                              disabled={saving}
                              value={noteDrafts[order._id] ?? order.adminNote ?? ""}
                              onChange={(event) =>
                                setNoteDrafts((current) => ({
                                  ...current,
                                  [order._id]: event.target.value,
                                }))
                              }
                              className="mt-1.5 w-full border border-neutral-300 bg-white p-2 text-sm outline-none focus:border-neutral-950"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => saveNote(order)}
                            className="inline-flex min-h-9 items-center justify-center gap-2 border border-neutral-300 text-xs font-semibold hover:border-neutral-950 disabled:opacity-50"
                          >
                            {saving && (
                              <LoaderCircle
                                size={12}
                                className="animate-spin"
                                aria-hidden="true"
                              />
                            )}
                            Save note
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {orderPages > 1 && (
              <Pagination
                page={orderPage}
                pages={orderPages}
                onChange={setOrderPage}
              />
            )}
          </section>
        )}

        {section === "products" && (
          <section className="mt-6" aria-label="Product inventory">
            <div className="flex flex-col justify-between gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end">
              <div>
                <h2 className="text-sm font-semibold">Product inventory</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  {products.length} products · {filteredProducts.length} shown
                </p>
              </div>
              <div className="flex gap-2">
                <label className="flex h-10 min-w-0 items-center gap-2 border border-neutral-300 bg-white px-3 sm:w-60">
                  <Search
                    size={15}
                    className="shrink-0 text-neutral-400"
                    aria-hidden="true"
                  />
                  <input
                    value={productSearch}
                    onChange={(event) => setProductSearch(event.target.value)}
                    aria-label="Search products"
                    placeholder="Name, category or stock"
                    className="w-full min-w-0 text-sm outline-none"
                  />
                </label>
                <button
                  type="button"
                  onClick={openNewProduct}
                  className="inline-flex h-10 shrink-0 items-center gap-2 bg-neutral-950 px-3 text-xs font-semibold text-white hover:bg-amber-700 sm:px-4"
                >
                  <PackagePlus size={15} aria-hidden="true" /> Add product
                </button>
              </div>
            </div>

            {productsLoading ? (
              <div className="mt-6 flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading products
              </div>
            ) : filteredProducts.length === 0 ? (
              <EmptyState
                title="No matching products"
                detail="Try another search, or create the first product."
              />
            ) : (
              <div className="mt-4 overflow-hidden border border-neutral-200 bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_130px_100px_110px_90px] gap-4 border-b border-neutral-200 bg-[#faf9f6] px-4 py-3 text-[10px] font-semibold tracking-widest text-neutral-500 uppercase sm:grid">
                  <span>Product</span>
                  <span>Category</span>
                  <span>Stock</span>
                  <span className="text-right">Price</span>
                  <span className="text-right">Actions</span>
                </div>
                {filteredProducts.map((product) => {
                  const image = product.images?.find(
                    (entry) => entry.url,
                  )?.url;
                  const stock = Number(product.stock) || 0;
                  return (
                    <article
                      key={product._id}
                      className="grid gap-3 border-b border-neutral-100 p-3 last:border-0 sm:grid-cols-[minmax(0,1fr)_130px_100px_110px_90px] sm:items-center sm:gap-4 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="size-12 shrink-0 overflow-hidden bg-neutral-100">
                          {image && (
                            <img
                              src={image}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-neutral-950">
                            {product.name}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {product.isBestSeller && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-semibold tracking-wide text-amber-800 uppercase">
                                <Star size={10} aria-hidden="true" /> Featured
                              </span>
                            )}
                            {(product.images?.length || 0) > 1 && (
                              <span className="text-[10px] text-neutral-500">
                                {product.images.length} images
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="truncate text-xs text-neutral-600">
                        {product.category}
                      </span>
                      <span
                        className={`text-xs font-semibold ${stock === 0 ? "text-red-700" : stock <= 5 ? "text-amber-800" : "text-neutral-800"}`}
                      >
                        {stock}
                      </span>
                      <span className="text-xs text-right tabular-nums">
                        {formatPrice(product.price)}
                      </span>
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/product/${product._id}`}
                          aria-label={`View ${product.name}`}
                          className="inline-flex size-8 items-center justify-center border border-neutral-300 hover:border-neutral-950"
                        >
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        <button
                          type="button"
                          onClick={() => openEditProduct(product)}
                          aria-label={`Edit ${product.name}`}
                          className="inline-flex size-8 items-center justify-center border border-neutral-300 hover:border-neutral-950"
                        >
                          <Pencil size={14} aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(product)}
                          aria-label={`Delete ${product.name}`}
                          className="inline-flex size-8 items-center justify-center border border-neutral-300 text-neutral-500 hover:border-red-700"
                        >
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {section === "customers" && (
          <section className="mt-6" aria-label="Customer accounts">
            <div className="flex flex-col justify-between gap-3 border border-neutral-200 bg-white p-4 sm:flex-row sm:items-end">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-neutral-700">
                  Search customers
                  <span className="relative mt-1.5 block">
                    <Search
                      size={14}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                      aria-hidden="true"
                    />
                    <input
                      value={userSearch}
                      onChange={(event) => {
                        setUserSearch(event.target.value);
                        setUserPage(1);
                      }}
                      placeholder="Name or email"
                      className={inputClass.replace("mt-1.5 ", "pl-9 ")}
                    />
                  </span>
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Role
                  <select
                    value={roleFilter}
                    onChange={(event) => {
                      setRoleFilter(event.target.value);
                      setUserPage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All roles</option>
                    <option value="user">Customers</option>
                    <option value="admin">Administrators</option>
                  </select>
                </label>
              </div>
              <p className="text-xs text-neutral-500">
                {userTotal} {userTotal === 1 ? "account" : "accounts"} · page{" "}
                {userPage} of {userPages}
              </p>
            </div>

            {usersLoading ? (
              <div className="mt-6 flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading customers
              </div>
            ) : users.length === 0 ? (
              <EmptyState
                title="No customers match"
                detail="Try a different search or role filter."
              />
            ) : (
              <div className="mt-4 overflow-hidden border border-neutral-200 bg-white">
                <div className="hidden grid-cols-[minmax(0,1fr)_150px_130px_120px] gap-4 border-b border-neutral-200 bg-[#faf9f6] px-4 py-3 text-[10px] font-semibold tracking-widest text-neutral-500 uppercase sm:grid">
                  <span>Account</span>
                  <span>Joined</span>
                  <span>Email status</span>
                  <span className="text-right">Access</span>
                </div>
                {users.map((account) => {
                  const isSelf = account._id === user?._id;
                  const saving = savingUserId === account._id;
                  return (
                    <article
                      key={account._id}
                      className="grid gap-3 border-b border-neutral-100 p-4 last:border-0 sm:grid-cols-[minmax(0,1fr)_150px_130px_120px] sm:items-center sm:gap-4 sm:px-4"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        {account.profileImage ? (
                          <img
                            src={account.profileImage}
                            alt=""
                            className="size-9 shrink-0 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-xs font-semibold text-neutral-600">
                            {(account.name || "?").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-neutral-950">
                            {account.name}
                            {isSelf && (
                              <span className="ml-2 text-[10px] font-normal text-neutral-500">
                                (you)
                              </span>
                            )}
                          </p>
                          <p className="truncate text-xs text-neutral-500">
                            {account.email}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-neutral-600">
                        {formatDate(account.createdAt)}
                      </span>
                      <span
                        className={`w-fit px-2.5 py-1 text-xs font-semibold ${account.isVerified ? "bg-emerald-50 text-emerald-900" : "bg-neutral-100 text-neutral-600"}`}
                      >
                        {account.isVerified ? "Verified" : "Unverified"}
                      </span>
                      <div className="flex items-center justify-end">
                        <button
                          type="button"
                          disabled={isSelf || saving}
                          onClick={() =>
                            changeRole(
                              account,
                              account.role === "admin" ? "user" : "admin",
                            )
                          }
                          className="min-h-9 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {saving
                            ? "Saving…"
                            : account.role === "admin"
                              ? "Revoke admin"
                              : "Make admin"}
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {userPages > 1 && (
              <Pagination
                page={userPage}
                pages={userPages}
                onChange={setUserPage}
              />
            )}
          </section>
        )}

        {section === "messages" && (
          <section className="mt-6" aria-label="Contact messages">
            <div className="flex flex-col gap-3 border border-neutral-200 bg-white p-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="grid flex-1 gap-3 sm:grid-cols-2">
                <label className="block text-xs font-medium text-neutral-700">
                  Search
                  <span className="relative mt-1.5 block">
                    <Search
                      size={14}
                      className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-neutral-400"
                      aria-hidden="true"
                    />
                    <input
                      value={messageSearch}
                      onChange={(event) => {
                        setMessageSearch(event.target.value);
                        setMessagePage(1);
                      }}
                      placeholder="Name, email or subject"
                      className={inputClass.replace("mt-1.5 ", "pl-9 ")}
                    />
                  </span>
                </label>
                <label className="block text-xs font-medium text-neutral-700">
                  Status
                  <select
                    value={messageStatus}
                    onChange={(event) => {
                      setMessageStatus(event.target.value);
                      setMessagePage(1);
                    }}
                    className={inputClass}
                  >
                    <option value="">All messages</option>
                    {MESSAGE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {titleCase(status)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p className="text-xs text-neutral-500">
                {unread} unread · {messageTotal}{" "}
                {messageTotal === 1 ? "message" : "messages"} · page{" "}
                {messagePage} of {messagePages}
              </p>
            </div>

            {messagesLoading ? (
              <div className="mt-6 flex min-h-48 items-center justify-center gap-3 text-sm text-neutral-500">
                <LoaderCircle
                  size={18}
                  className="animate-spin"
                  aria-hidden="true"
                />
                Loading messages
              </div>
            ) : messages.length === 0 ? (
              <EmptyState
                title="No messages yet"
                detail="Enquiries from the contact page will land here."
              />
            ) : (
              <div className="mt-6 space-y-3">
                {messages.map((message) => {
                  const isOpen = openMessage?._id === message._id;
                  return (
                    <article
                      key={message._id}
                      className="border border-neutral-200 bg-white p-4 sm:p-5"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-neutral-950">
                            {message.name}
                            {message.status === "new" && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold tracking-wide text-amber-900 uppercase">
                                New
                              </span>
                            )}
                          </p>
                          <a
                            href={`mailto:${message.email}`}
                            className="text-xs text-neutral-500 underline underline-offset-4 hover:text-amber-800"
                          >
                            {message.email}
                          </a>
                        </div>
                        <span className="text-xs text-neutral-500">
                          {formatDate(message.createdAt)}
                        </span>
                      </div>

                      <p className="mt-2 text-sm font-medium text-neutral-900">
                        {message.subject}
                      </p>
                      <p
                        className={`mt-1 text-sm leading-6 text-neutral-600 ${isOpen ? "" : "line-clamp-2"}`}
                      >
                        {message.message}
                      </p>

                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setOpenMessage(isOpen ? null : message)}
                          className="min-h-9 border border-neutral-300 px-3 text-xs font-semibold hover:border-neutral-950"
                        >
                          {isOpen ? "Show less" : "Read in full"}
                        </button>
                        <a
                          href={`mailto:${message.email}?subject=${encodeURIComponent(`Re: ${message.subject}`)}`}
                          className="inline-flex min-h-9 items-center gap-1.5 bg-neutral-950 px-3 text-xs font-semibold text-white hover:bg-amber-700"
                        >
                          <Mail size={13} aria-hidden="true" /> Reply
                        </a>
                        <select
                          value={message.status}
                          aria-label={`Status for ${message.subject}`}
                          onChange={(event) =>
                            setMessageState(message, event.target.value)
                          }
                          className="h-9 border border-neutral-300 bg-white px-2 text-xs outline-none focus:border-neutral-950"
                        >
                          {MESSAGE_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {titleCase(status)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {messagePages > 1 && (
              <Pagination
                page={messagePage}
                pages={messagePages}
                onChange={setMessagePage}
              />
            )}
          </section>
        )}

        {actionError && (
          <p
            role="alert"
            className="mt-6 flex items-start justify-between gap-3 border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          >
            <span>{actionError}</span>
            <button
              type="button"
              onClick={() => setActionError("")}
              aria-label="Dismiss"
              className="shrink-0 text-red-700 hover:text-red-900"
            >
              <X size={15} aria-hidden="true" />
            </button>
          </p>
        )}
      </div>

      {productDialog && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="product-dialog-title"
          className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-neutral-950/60 p-4 sm:p-8"
        >
          <section className="w-full max-w-2xl border border-neutral-200 bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.12em] text-amber-800 uppercase">
                  Inventory
                </p>
                <h2
                  id="product-dialog-title"
                  className="mt-2 text-xl font-semibold"
                >
                  {editingProduct ? "Edit product" : "New product"}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setProductDialog(false)}
                className="inline-flex size-9 items-center justify-center border border-neutral-300 hover:border-neutral-950"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>

            <form onSubmit={saveProduct} className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                Name
                <input
                  required
                  maxLength={160}
                  value={productForm.name}
                  onChange={(event) =>
                    setProductForm({ ...productForm, name: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                Description
                <textarea
                  required
                  rows={3}
                  maxLength={5000}
                  value={productForm.description}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      description: event.target.value,
                    })
                  }
                  className="mt-1.5 w-full border border-neutral-300 bg-white p-3 text-sm outline-none focus:border-neutral-950"
                />
              </label>
              <label className="text-xs font-medium text-neutral-700">
                Price
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  value={productForm.price}
                  onChange={(event) =>
                    setProductForm({ ...productForm, price: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-medium text-neutral-700">
                Stock
                <input
                  required
                  type="number"
                  min="0"
                  step="1"
                  value={productForm.stock}
                  onChange={(event) =>
                    setProductForm({ ...productForm, stock: event.target.value })
                  }
                  className={inputClass}
                />
              </label>
              <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                Category
                <input
                  list="astra-categories"
                  required
                  maxLength={80}
                  value={productForm.category}
                  onChange={(event) => changeCategory(event.target.value)}
                  className={inputClass}
                />
                <datalist id="astra-categories">
                  {CATEGORY_OPTIONS.map((option) => (
                    <option key={option} value={option} />
                  ))}
                </datalist>
                <span className="mt-1 block text-[11px] font-normal text-neutral-500">
                  {hasCustomSchema(productForm.category)
                    ? "Attribute fields are chosen by category. Anything you leave blank is not shown on the product page."
                    : "No attribute set for this category yet — use the general fields below, or add your own."}
                </span>
              </label>

              <fieldset className="sm:col-span-2">
                <legend className="text-xs font-medium text-neutral-700">
                  Attributes
                  {productForm.category && (
                    <span className="ml-1.5 font-normal text-neutral-500">
                      for {productForm.category}
                    </span>
                  )}
                </legend>

                {!productForm.category.trim() ? (
                  <p className="mt-2 border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs text-neutral-500">
                    Choose a category to see the fields that make sense for it.
                  </p>
                ) : (
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    {fieldsForCategory(productForm.category).map((field) => (
                      <AttributeField
                        key={field.key}
                        field={field}
                        value={productForm.attributeValues?.[field.key]}
                        onChange={(next) =>
                          setAttributeValue(field.key, next)
                        }
                      />
                    ))}
                  </div>
                )}

                {Object.keys(productForm.attributeExtras || {}).length > 0 && (
                  <div className="mt-5 border-t border-neutral-200 pt-4">
                    <p className="text-xs font-medium text-neutral-700">
                      Other attributes
                    </p>
                    <p className="mt-1 text-[11px] text-neutral-500">
                      Kept from the saved product because they do not match this
                      category's fields.
                    </p>
                    <div className="mt-3 grid gap-4 sm:grid-cols-2">
                      {Object.entries(productForm.attributeExtras).map(
                        ([key, value]) => (
                          <div key={key} className="flex items-end gap-2">
                            <label className="min-w-0 flex-1 text-xs font-medium text-neutral-700">
                              <input
                                value={key}
                                onChange={(event) => {
                                  const nextKey = event.target.value;
                                  setProductForm((current) => {
                                    const extras = {};
                                    for (const [existingKey, existingValue] of
                                      Object.entries(
                                        current.attributeExtras,
                                      )) {
                                      extras[
                                        existingKey === key
                                          ? nextKey
                                          : existingKey
                                      ] = existingValue;
                                    }
                                    return { ...current, attributeExtras: extras };
                                  });
                                }}
                                className="mt-1.5 h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950"
                              />
                              <span className="mt-1.5 block text-[11px] font-normal text-neutral-500">
                                Name
                              </span>
                            </label>
                            <label className="min-w-0 flex-[2] text-xs font-medium text-neutral-700">
                              <input
                                value={value}
                                onChange={(event) =>
                                  setAttributeExtra(key, event.target.value)
                                }
                                className="mt-1.5 h-11 w-full border border-neutral-300 bg-white px-3 text-sm outline-none focus:border-neutral-950"
                              />
                              <span className="mt-1.5 block text-[11px] font-normal text-neutral-500">
                                Value
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => removeAttributeExtra(key)}
                              aria-label={`Remove ${key}`}
                              className="mb-6 inline-flex size-9 shrink-0 items-center justify-center border border-neutral-300 text-neutral-500 transition-colors hover:border-red-300 hover:text-red-700"
                            >
                              <X size={14} aria-hidden="true" />
                            </button>
                          </div>
                        ),
                      )}
                    </div>
                  </div>
                )}

                {productForm.category.trim() && (
                  <button
                    type="button"
                    onClick={addAttributeExtra}
                    className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-neutral-700 underline underline-offset-4 transition-colors hover:text-neutral-950"
                  >
                    <PackagePlus size={14} aria-hidden="true" />
                    Add another attribute
                  </button>
                )}
              </fieldset>

              {editingProduct && (editingProduct.images?.length || 0) > 0 && (
                <fieldset className="sm:col-span-2">
                  <legend className="text-xs font-medium text-neutral-700">
                    Existing images
                  </legend>
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Untick an image to delete it from storage when you save.
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {editingProduct.images.map((image) => {
                      const kept = keptImages.includes(image.public_id);
                      return (
                        <button
                          key={image.public_id}
                          type="button"
                          onClick={() => toggleKeptImage(image.public_id)}
                          aria-pressed={kept}
                          className={`relative size-16 overflow-hidden border-2 ${kept ? "border-neutral-950" : "border-red-300 opacity-60"}`}
                        >
                          <img
                            src={image.url}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute inset-x-0 bottom-0 bg-neutral-950/70 py-0.5 text-[9px] text-white">
                            {kept ? "Kept" : "Delete"}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <label className="text-xs font-medium text-neutral-700 sm:col-span-2">
                Add images
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(event) =>
                    setProductFiles([...event.target.files].slice(0, 10))
                  }
                  className="mt-1.5 block w-full text-xs file:mr-3 file:border file:border-neutral-300 file:bg-white file:px-3 file:py-2 file:text-xs file:font-semibold"
                />
                {productFiles.length > 0 && (
                  <span className="mt-1.5 block text-[11px] text-neutral-500">
                    {productFiles.length} new{" "}
                    {productFiles.length === 1 ? "image" : "images"} ready to
                    upload
                  </span>
                )}
              </label>

              <label className="flex items-center gap-2 text-xs font-medium text-neutral-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={productForm.isBestSeller}
                  onChange={(event) =>
                    setProductForm({
                      ...productForm,
                      isBestSeller: event.target.checked,
                    })
                  }
                  className="size-4 accent-amber-700"
                />
                Feature in best sellers
              </label>
              {formError && (
                <p role="alert" className="text-sm text-red-700 sm:col-span-2">
                  {formError}
                </p>
              )}
              <div className="flex justify-end gap-2 border-t border-neutral-200 pt-4 sm:col-span-2">
                <button
                  type="button"
                  onClick={() => setProductDialog(false)}
                  className="min-h-10 border border-neutral-300 px-4 text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProduct}
                  className="inline-flex min-h-10 items-center gap-2 bg-neutral-950 px-4 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                >
                  {savingProduct && (
                    <LoaderCircle
                      size={15}
                      className="animate-spin"
                      aria-hidden="true"
                    />
                  )}
                  {editingProduct ? "Save changes" : "Create product"}
                </button>
              </div>
            </form>
          </section>
        </div>
      )}

      {deleteTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-product-title"
          className="fixed inset-0 z-100 flex items-center justify-center bg-neutral-950/60 p-4"
        >
          <section className="w-full max-w-md border border-neutral-200 bg-white p-6 shadow-2xl">
            <p className="text-xs font-semibold tracking-[0.12em] text-red-700 uppercase">
              Remove inventory
            </p>
            <h2
              id="delete-product-title"
              className="mt-2 text-xl font-semibold"
            >
              Delete {deleteTarget.name}?
            </h2>
            <p className="mt-2 text-sm leading-6 text-neutral-600">
              This removes the product and its stored images. Existing order
              records keep their item snapshots.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="min-h-10 border border-neutral-300 px-4 text-sm font-medium"
              >
                Keep product
              </button>
              <button
                type="button"
                onClick={deleteProduct}
                className="min-h-10 bg-red-700 px-4 text-sm font-semibold text-white hover:bg-red-800"
              >
                Delete product
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
};

const EmptyState = ({ title, detail }) => (
  <div className="mt-6 flex min-h-48 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center">
    <Truck size={22} className="text-neutral-400" aria-hidden="true" />
    <p className="mt-3 text-sm font-semibold text-neutral-950">{title}</p>
    <p className="mt-1 text-xs text-neutral-500">{detail}</p>
  </div>
);

const Pagination = ({ page, pages, onChange }) => (
  <div className="mt-5 flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
    <button
      type="button"
      disabled={page <= 1}
      onClick={() => onChange(page - 1)}
      className="min-h-9 border border-neutral-300 px-3 text-xs font-semibold transition-colors hover:border-neutral-950 disabled:opacity-40"
    >
      Previous
    </button>
    <span className="text-xs text-neutral-600 tabular-nums">
      Page {page} of {pages}
    </span>
    <button
      type="button"
      disabled={page >= pages}
      onClick={() => onChange(page + 1)}
      className="min-h-9 border border-neutral-300 px-3 text-xs font-semibold transition-colors hover:border-neutral-950 disabled:opacity-40"
    >
      Next
    </button>
  </div>
);

export default AdminDashboard;
