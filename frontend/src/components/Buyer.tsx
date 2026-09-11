"use client";

import {
  useEffect,
  useMemo,
  useState,
  type ChangeEvent,
  type ReactNode,
} from "react";

import type { LucideIcon } from "lucide-react";

import {
  ArrowLeft,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  Clock3,
  Download,
  Eye,
  FileText,
  HelpCircle,
  Home,
  LayoutDashboard,
  Leaf,
  LineChart,
  Map as MapIcon,
  MapPin,
  Menu,
  Minus,
  Package,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  ShoppingCart,
  Star,
  Store,
  Trash2,
  Truck,
  Upload,
  User,
  UserCircle,
  X,
  XCircle,
} from "lucide-react";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./Buyer.css";
import Link from "next/link";
/* =========================================================
   TYPES
========================================================= */

type View =
  | "Dashboard"
  | "Marketplace"
  | "Orders"
  | "Shipment"
  | "Analytics"
  | "Help"
  | "Profile";

type OrderType = "Marketplace";

type OrderStatus =
  | "Confirmed"
  | "Processing"
  | "In Transit"
  | "Delivered"
  | "Pending";

type RequirementStatus =
  | "Draft"
  | "Searching"
  | "Matched"
  | "Pending"
  | "Confirmed"
  | "Not Found"
  | "Closed";

type OfferStatus =
  | "Not Sent"
  | "Requested"
  | "Negotiating"
  | "Accepted"
  | "Rejected";

type AnalyticsRange = "week" | "month" | "custom";
type RequirementUnit = "kg" | "L" | "ton" | "dozen";

interface FarmerListing {
  id: string;
  productId: string;
  category?: string;
  produce: string;
  availableQuantity: number;
  pricePerKg: number;
  unit: RequirementUnit;
}

interface Farmer {
  id: string;
  name: string;
  phoneNumber: string;
  location: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  verified: boolean;
  avatar: string;
  farm: string;
  about: string;
  listings: FarmerListing[];
}

interface Product {
  id: string;
  listingId: string;
  productId: string;
  farmerId: string;
  farmerName: string;
  name: string;
  category: string;
  quantityAvailable: number;
  pricePerKg: number;
  rating: number;
  reviews: number;
  deliveryTime: string;
  image: string;
}

interface CartItem {
  id: string;
  productId: string;
  farmerId: string;
  farmerName: string;
  product: string;
  quantity: number;
  pricePerKg: number;
  deliveryTime: string;
  image: string;
}

interface RequirementItem {
  id: string;
  productId?: string;
  produce: string;
  quantity: number;
  unit?: RequirementUnit;
  minPrice: number;
  maxPrice: number;
  requiredBy: string;
  location: string;
}

interface Requirement {
  id: string;
  buyerId: string;
  createdAt: string;
  status: RequirementStatus;
  items: RequirementItem[];
  matchedFarmerIds?: string[];
}

interface FarmerOffer {
  id: string;
  requirementId: string;
  farmerId: string;
  selectedListingIds: string[];
  selectedQuantities?: Record<string, number>;
  productId?: string;
  requestedQuantity?: number;
  requestedUnit?: RequirementUnit;
  originalPrice?: number;
  offeredPrice: number;
  buyerConfirmed: boolean;
  farmerConfirmed: boolean;
  status: OfferStatus;
}

interface Order {
  id: string;
  type: OrderType;
  product: string;
  quantity: number;
  unit: "kg";
  cost: number;
  seller: string;
  sellerId: string;
  buyer: string;
  buyerId: string;
  deliveryDate: string;
  status: OrderStatus;
  createdAt: string;
  paymentStatus?: string;
  paymentExpiresAt?: string;
  shipmentStatus?: string;
  pickupLocation?: string;
  deliveryLocation?: string;
  distanceKm?: number;
  etaMinutes?: number;
  currentLocation?: string;
  logisticsName?: string;
  logisticsRating?: number;
}

interface FarmerReview {
  id: string;
  farmerId: string;
  orderId: string;
  buyerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "order" | "shipment" | "system";
  read: boolean;
  createdAt: string;
}

interface SupportTicket {
  id: string;
  subject: string;
  message: string;
  status?: string;
  createdAt: string;
}

interface BuyerSession {
  username: string;
  phoneNumber: string;
  buyerId: string;
  profileImage?: string;
  email?: string;
  company?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
}

/* =========================================================
   UTILITY FUNCTIONS
========================================================= */

const formatCurrency = (value: number) =>
  `₹${value.toLocaleString("en-IN")}`;

const toKg = (quantity: number, unit: RequirementUnit = "kg") => {
  if (unit === "ton") return quantity * 1000;
  if (unit === "dozen") return quantity * 12;
  // For liquid listings, keep 1 L as the working 1 kg equivalent in this backend catalog.
  if (unit === "L") return quantity;
  return quantity;
};

const fromKg = (quantityKg: number, unit: RequirementUnit = "kg") => {
  if (unit === "ton") return quantityKg / 1000;
  if (unit === "dozen") return quantityKg / 12;
  return quantityKg;
};

const minimumQuantityForUnit = (unit: RequirementUnit) => fromKg(100, unit);

const pricePerSelectedUnit = (pricePerKg: number, unit: RequirementUnit) =>
  unit === "ton" ? pricePerKg * 1000 :
  unit === "dozen" ? pricePerKg * 12 :
  pricePerKg;

const formatQuantity = (quantity: number, unit: RequirementUnit = "kg") =>
  `${Number.isInteger(quantity) ? quantity : Number(quantity.toFixed(2))} ${unit}`;

const isImageSource = (value: string) =>
  value.startsWith("http://") ||
  value.startsWith("https://") ||
  value.startsWith("data:image/") ||
  value.startsWith("/");

const getProductImage = (product: string) => {
  const normalized = product.toLowerCase();
  const images: Record<string, string> = {
    tomato: "https://images.unsplash.com/photo-1546094096-0df4bcaaa337?auto=format&fit=crop&w=900&q=85",
    potato: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85",
    onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?auto=format&fit=crop&w=900&q=85",
    spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=900&q=85",
    carrot: "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=900&q=85",
    cabbage: "https://images.unsplash.com/photo-1594282486552-05b4d80fbb9f?auto=format&fit=crop&w=900&q=85",
    mango: "https://images.unsplash.com/photo-1553279768-865429fa0078?auto=format&fit=crop&w=900&q=85",
    banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=900&q=85",
    apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=900&q=85",
    orange: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=900&q=85",
    grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=900&q=85",
  };
  const key = Object.keys(images).find((name) => normalized.includes(name));
  return key ? images[key] : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85";
};

const renderAvatar = (value: string, name: string) =>
  isImageSource(value) ? <img src={value} alt={name} /> : (value || getInitials(name));

const downloadPdf = (filename: string, title: string, lines: string[]) => {
  const escape = (value: string) =>
    value
      .replace(/₹/g, "INR ")
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");

  const allLines = [title, "", ...lines];
  const chunks: string[][] = [];
  for (let index = 0; index < allLines.length; index += 46) {
    chunks.push(allLines.slice(index, index + 46));
  }
  if (chunks.length === 0) chunks.push([title]);

  const pageObjects: string[] = [];
  const contentObjects: string[] = [];
  chunks.forEach((chunk) => {
    let stream = "BT\n/F1 10 Tf\n50 760 Td\n";
    chunk.forEach((line, index) => {
      if (index) stream += "0 -15 Td\n";
      stream += `(${escape(line)}) Tj\n`;
    });
    stream += "ET";
    contentObjects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  });

  const objects: string[] = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "",
  ];
  const pageRefs: string[] = [];
  let objectNumber = 3;
  chunks.forEach((_, index) => {
    const pageObjectNumber = objectNumber++;
    const contentObjectNumber = objectNumber++;
    pageRefs.push(`${pageObjectNumber} 0 R`);
    pageObjects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${2 + chunks.length * 2 + 1} 0 R >> >> /Contents ${contentObjectNumber} 0 R >>`,
    );
  });

  objects[1] = `<< /Type /Pages /Kids [${pageRefs.join(" ")}] /Count ${chunks.length} >>`;
  pageObjects.forEach((page) => objects.push(page));
  contentObjects.forEach((content) => objects.push(content));
  const fontObjectNumber = objects.length + 1;
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");

  // Correct page font references now that the final font object number is known.
  const pageStart = 2;
  for (let index = 0; index < chunks.length; index += 1) {
    const pageObjectIndex = pageStart + index;
    objects[pageObjectIndex] = objects[pageObjectIndex].replace(/\/F1 \d+ 0 R/, `/F1 ${fontObjectNumber} 0 R`);
  }

  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index < offsets.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;

  const blob = new Blob([pdf], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
};

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const todayString = () => {
  const date = new Date();

  return date.toISOString().slice(0, 10);
};

const futureDate = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);

  return date.toISOString().slice(0, 10);
};

const downloadTextFile = (
  filename: string,
  content: string,
  type = "text/plain",
) => {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();

  URL.revokeObjectURL(url);
};

/*
 * Browser-only PDF fallback.
 *
 * Later replace this function with a real PDF library such as
 * jsPDF or a backend-generated PDF endpoint.
 */
const exportOrdersPdf = (orders: Order[], selectedOrder?: Order) => {
  const target = selectedOrder ? [selectedOrder] : orders;
  const lines = target.flatMap((order) => [
    `Order ID: ${order.id}`,
    `Type: ${order.type}`,
    `Product: ${order.product}`,
    `Quantity: ${order.quantity} kg`,
    `Cost: ${formatCurrency(order.cost)}`,
    `Seller: ${order.seller}`,
    `Buyer: ${order.buyer}`,
    `Delivery: ${order.deliveryDate}`,
    `Status: ${order.status}`,
    `Created: ${new Date(order.createdAt).toLocaleString("en-IN")}`,
    "----------------------------------------",
  ]);
  downloadPdf(selectedOrder ? `khetlink-order-${selectedOrder.id}.pdf` : `khetlink-all-orders-${todayString()}.pdf`, selectedOrder ? "KHETLINK — ORDER DETAIL" : "KHETLINK — ALL ORDERS REPORT", lines);
};

const exportAnalytics = (orders: Order[], barData: { name: string; quantity: number }[], pieData: { name: string; value: number }[]) => {
  const lines = [
    `Generated: ${new Date().toLocaleString("en-IN")}`,
    `Orders: ${orders.length}`,
    `Total Quantity: ${orders.reduce((sum, order) => sum + order.quantity, 0)} kg`,
    `Total Spend: ${formatCurrency(orders.reduce((sum, order) => sum + order.cost, 0))}`,
    "", "PRODUCT QUANTITY", ...barData.map((item) => `${item.name}: ${item.quantity} kg`),
    "", "ORDER STATUS", ...pieData.map((item) => `${item.name}: ${item.value}`),
  ];
  downloadPdf(`khetlink-analytics-${todayString()}.pdf`, "KHETLINK — ANALYTICS REPORT", lines);
};

/* =========================================================
   NAVIGATION
========================================================= */

const navItems: {
  label: Exclude<View, "Profile">;
  icon: LucideIcon;
}[] = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Marketplace",
    icon: Store,
  },
  {
    label: "Orders",
    icon: ShoppingCart,
  },
  {
    label: "Shipment",
    icon: Truck,
  },
  {
    label: "Analytics",
    icon: LineChart,
  },
  {
    label: "Help",
    icon: CircleHelp,
  },
];

/* =========================================================
   URL NAVIGATION
   ---------------------------------------------------------
   Keeps the existing in-memory navigation/state intact while
   giving every buyer view its own reloadable URL.
========================================================= */

const VIEW_QUERY_VALUES: Record<Exclude<View, "Profile"> | "Profile", string> = {
  Dashboard: "dashboard",
  Marketplace: "marketplace",
  Orders: "orders",
  Shipment: "shipment",
  Analytics: "analytics",
  Help: "help",
  Profile: "profile",
};

const viewFromLocation = (): View => {
  if (typeof window === "undefined") return "Dashboard";

  const value = new URLSearchParams(window.location.search).get("view");

  if (value === "procurement") return "Marketplace";

  const match = (Object.keys(VIEW_QUERY_VALUES) as View[]).find(
    (view) => VIEW_QUERY_VALUES[view] === value,
  );

  return match ?? "Dashboard";
};

const viewHref = (view: View) => {
  if (view === "Dashboard") {
    return "/buyer";
  }

  return `/buyer?view=${VIEW_QUERY_VALUES[view]}`;
};

/* =========================================================
   MAIN COMPONENT
========================================================= */

export default function Buyer() {
  const [activeTab, setActiveTab] =
  useState<View>("Dashboard");

  const [session, setSession] =
    useState<BuyerSession>({
      username: "", phoneNumber: "", buyerId: "", language: "English",
    });

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [selectedFarmer, setSelectedFarmer] =
    useState<Farmer | null>(null);

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [requirements, setRequirements] =
    useState<Requirement[]>([]);

  const [offers, setOffers] =
    useState<FarmerOffer[]>([]);

  const [orders, setOrders] =
    useState<Order[]>([]);

  const [farmerReviews, setFarmerReviews] =
    useState<FarmerReview[]>([]);

  const [notifications, setNotifications] =
    useState<Notification[]>([]);

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [support, setSupport] = useState({ subject: "", message: "" });

  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [toast, setToast] =
    useState<string | null>(null);

  const [orderFilter, setOrderFilter] =
    useState("All");

  const [orderSearch, setOrderSearch] =
    useState("");

  const [analyticsRange, setAnalyticsRange] =
    useState<AnalyticsRange>("week");

  const [customStart, setCustomStart] =
    useState("");

  const [customEnd, setCustomEnd] =
    useState("");

  const [category, setCategory] =
    useState("All");

  const [marketplaceSearch, setMarketplaceSearch] =
    useState("");

  /* -------------------------------------------------------
     BACKEND DATA
  ------------------------------------------------------- */

  const API = async (path: string, init?: RequestInit) => {
    const response = await fetch(path, {
      ...init, credentials: "include",
      headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload?.error ?? `Request failed (${response.status})`);
    return payload;
  };

  const mapStatus = (status: string): OfferStatus => ({
    OFFERED: "Requested", COUNTERED: "Negotiating", NEGOTIATING: "Negotiating",
    ACCEPTED: "Accepted", REJECTED: "Rejected",
  }[status] as OfferStatus ?? "Requested");

  const mapOrderStatus = (status: string): OrderStatus => ({
    PROCESSING: "Processing", IN_TRANSIT: "In Transit", DELIVERED: "Delivered",
    CANCELLED: "Pending", CONFIRMED: "Confirmed",
  }[status] as OrderStatus ?? "Confirmed");

  const loadBuyerData = async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const [profileData, listingData, requirementData, orderData, notificationData, supportData] =
        await Promise.all([API("/api/profile/me"), API("/api/listings"), API("/api/requirements"), API("/api/orders"), API("/api/notifications?role=BUYER"), API("/api/support")]);

      const user = profileData.user;
      const buyerRole = (user.roles ?? []).find((r: any) => r.role === "BUYER");
      setSession({
        username: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Buyer",
        phoneNumber: user.phone ?? "", buyerId: buyerRole?.roleCode ?? user.id,
        profileImage: user.profileImage ?? undefined, email: user.email ?? undefined,
        company: user.buyer?.company ?? undefined, location: user.location ?? undefined,
        latitude: user.latitude ?? null, longitude: user.longitude ?? null,
        language: user.language ?? "English",
      });

      const farmerMap = new Map<string, Farmer>();
      for (const row of listingData.listings ?? []) {
        const f = row.farmer; if (!f) continue;
        let farmer = farmerMap.get(f.id);
        if (!farmer) {
          farmer = { id: f.id, name: `${f.firstName ?? ""} ${f.lastName ?? ""}`.trim() || "Farmer",
            phoneNumber: "", location: f.location ?? "Location not shared", distanceKm: Number(row.distanceKm ?? 0),
            rating: Number(f.rating ?? 0), reviews: Number(f.reviews ?? 0), verified: !!f.farmer?.verified,
            avatar: f.profileImage ?? `${f.firstName?.[0] ?? ""}${f.lastName?.[0] ?? ""}`,
            farm: f.farmer?.farmName ?? "Farm", about: "", listings: [] };
          farmerMap.set(f.id, farmer);
        }
        farmer.distanceKm = row.distanceKm ?? farmer.distanceKm;
        farmer.listings.push({ id: row.id, productId: row.product?.id ?? row.productId, category: row.product?.category?.name, produce: row.product?.name ?? "Product",
          availableQuantity: Number(row.quantity ?? 0), pricePerKg: Number(row.price ?? 0), unit: (row.unit === "ton" || row.unit === "dozen" || row.unit === "L" ? row.unit : "kg") as RequirementUnit });
      }
      const nextFarmers = [...farmerMap.values()];
      setFarmers(nextFarmers);

      const listingById = new Map<string, any>((listingData.listings ?? []).map((l: any) => [l.id, l]));
      const reviewRows: FarmerReview[] = [];
      for (const row of listingData.listings ?? []) for (const review of row.reviewDetails ?? []) {
        if (!reviewRows.some(x => x.id === review.id)) reviewRows.push({ id: review.id, farmerId: row.farmerId,
          orderId: review.orderId, buyerName: review.reviewerName ?? "Buyer", rating: Number(review.rating),
          comment: review.comment ?? "", createdAt: review.createdAt });
      }
      setFarmerReviews(reviewRows);

      const backendRequirements: Requirement[] = (requirementData.requirements ?? []).filter((r: any) => r.status !== "BROWSE_PRODUCTS").map((r: any) => ({
        id: r.id, buyerId: r.buyerId, createdAt: r.createdAt,
        status: ({BROWSE_PRODUCTS:"Draft",PENDING:"Pending",NOT_FOUND:"Not Found",CONFIRMED:"Confirmed",CLOSED:"Closed"} as Record<string, RequirementStatus>)[r.status] ?? "Pending",
        matchedFarmerIds: r.matchedFarmerIds ?? [],
        items: (r.items ?? []).map((i: any) => ({ id:i.id, productId:i.productId, produce:i.product?.name ?? "Product", quantity:Number(i.quantity),
          unit:i.unit as RequirementUnit, minPrice:Number(i.minPrice), maxPrice:Number(i.maxPrice), requiredBy:i.requiredBy ?? futureDate(7), location:i.location ?? r.location ?? "" }))
      }));
      setRequirements(current => [...current.filter(r => r.status === "Draft"), ...backendRequirements]);

      const mappedOffers: FarmerOffer[] = [];
      for (const r of requirementData.requirements ?? []) for (const o of r.offers ?? []) {
        const firstItem = (o.items ?? [])[0]; const listing = firstItem ? listingById.get(firstItem.listingId) : undefined;
        mappedOffers.push({ id:o.id, requirementId:o.requirementId, farmerId:o.farmerId, selectedListingIds:(o.items ?? []).map((x:any)=>x.listingId),
          selectedQuantities:Object.fromEntries((o.items ?? []).map((x:any)=>[x.listingId,Number(x.quantity)])), productId:listing?.productId,
          requestedQuantity:firstItem?.quantity, requestedUnit:((r.items ?? []).find((i:any)=>i.productId===listing?.productId)?.unit ?? firstItem?.unit) as RequirementUnit|undefined, originalPrice:o.originalPrice == null ? undefined : Number(o.originalPrice) * toKg(1, (((r.items ?? []).find((i:any)=>i.productId===listing?.productId)?.unit ?? firstItem?.unit) as RequirementUnit|undefined) ?? "kg"),
          offeredPrice:Number(o.offeredPrice) * toKg(1, ((((r.items ?? []).find((i:any)=>i.productId===listing?.productId)?.unit ?? firstItem?.unit) as RequirementUnit|undefined) ?? "kg")), buyerConfirmed:!!o.buyerConfirmed, farmerConfirmed:!!o.farmerConfirmed, status:mapStatus(o.status) });
      }
      setOffers(mappedOffers);

      setOrders((orderData.orders ?? []).map((o:any) => { const first=o.items?.[0]; return {
        id:o.id,type:"Marketplace",product:first?.product?.name ?? "Order",quantity:Number(first?.quantity ?? 0),unit:"kg",cost:Number(o.total ?? 0),
        seller:`${o.seller?.firstName ?? ""} ${o.seller?.lastName ?? ""}`.trim() || "Farmer",sellerId:o.sellerId,
        buyer:`${o.buyer?.firstName ?? ""} ${o.buyer?.lastName ?? ""}`.trim() || "Buyer",buyerId:o.buyerId,deliveryDate:o.createdAt,
        status:mapOrderStatus(o.status),createdAt:o.createdAt,paymentStatus:o.paymentStatus,paymentExpiresAt:o.paymentExpiresAt,
        shipmentStatus:o.shipment?.status,pickupLocation:o.shipment?.pickupLocation,deliveryLocation:o.shipment?.deliveryLocation,distanceKm:o.shipment?.distanceKm,etaMinutes:o.shipment?.etaMinutes,currentLocation:o.shipment?.currentLocation,
        logisticsName:o.assignments?.find((a:any)=>a.status==="ACCEPTED")?.logistics?.user ? `${o.assignments.find((a:any)=>a.status==="ACCEPTED").logistics.user.firstName} ${o.assignments.find((a:any)=>a.status==="ACCEPTED").logistics.user.lastName}`.trim() : undefined,
        logisticsRating:o.assignments?.find((a:any)=>a.status==="ACCEPTED")?.logistics?.rating }; }));

      setNotifications((notificationData.notifications ?? []).map((n:any) => ({ id:n.id,title:n.title,message:n.message,
        type:n.type === "SHIPMENT" ? "shipment" : n.type === "SYSTEM" ? "system" : "order",read:!!n.read,createdAt:n.createdAt })));
      setTickets((supportData.tickets ?? []).map((t:any) => ({ id:t.id, subject:t.subject, message:t.message, status:t.status, createdAt:t.createdAt })));
    } catch (error) {
      console.error("Buyer data load failed:", error);
      showToast(error instanceof Error ? error.message : "Unable to load Buyer data.");
    } finally { setDataLoading(false); }
  };

  useEffect(() => {
    void loadBuyerData();
    const timer = window.setInterval(() => void loadBuyerData(true), 5000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!toast) return;

    const timer = window.setTimeout(() => {
      setToast(null);
    }, 3000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [toast]);

  /* -------------------------------------------------------
     DERIVED PRODUCT CATALOG
  ------------------------------------------------------- */

  const products = useMemo<Product[]>(() => farmers.flatMap((farmer) =>
    farmer.listings.map((listing) => ({ id:listing.id, listingId:listing.id, productId:listing.productId, farmerId:farmer.id, farmerName:farmer.name,
      name:listing.produce, category:listing.category ?? "Other", quantityAvailable:listing.availableQuantity, pricePerKg:listing.pricePerKg,
      rating:farmer.rating, reviews:farmer.reviews, deliveryTime:"Based on backend logistics", image:getProductImage(listing.produce) }))
  ), [farmers]);

  const categories = useMemo(() => {
    return ["All", ...Array.from(new Set(products.map(product => product.category).filter(Boolean)))];
  }, [products]);

  /* -------------------------------------------------------
     NOTIFICATIONS
  ------------------------------------------------------- */

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;


  /* -------------------------------------------------------
     NAVIGATION
  ------------------------------------------------------- */

  const navigate = (view: View) => {
    setMobileMenuOpen(false);
    setNotificationOpen(false);

    if (typeof window === "undefined") {
      setActiveTab(view);
      return;
    }

    // Use the same real URL that the navigation links expose.  Updating the
    // address bar and then notifying the view listener keeps navigation,
    // back/forward, and a hard refresh on the selected page in sync.
    const url = new URL(window.location.href);
    if (view === "Dashboard") {
      url.searchParams.delete("view");
    } else {
      url.searchParams.set("view", VIEW_QUERY_VALUES[view]);
    }

    const href = `${url.pathname}${url.search}${url.hash}`;
    window.history.pushState({ view }, "", href);
    setActiveTab(viewFromLocation());
    window.dispatchEvent(new PopStateEvent("popstate"));
  };

  useEffect(() => {
    setActiveTab(viewFromLocation());

    const handlePopState = () => {
      setActiveTab(viewFromLocation());
      setMobileMenuOpen(false);
      setNotificationOpen(false);
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);


  /* -------------------------------------------------------
     CART
  ------------------------------------------------------- */

  const addToCart = (
    product: Product,
    quantity: number,
  ) => {
    const safeQuantity = Math.max(
      1,
      Math.min(
        quantity,
        product.quantityAvailable,
      ),
    );

    setCart((current) => {
      const existing = current.find(
        (item) =>
          item.productId === product.id,
      );

      if (existing) {
        return current.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: Math.min(
                  item.quantity + safeQuantity,
                  product.quantityAvailable,
                ),
              }
            : item,
        );
      }

      return [
        {
          id: createId("CART"),
          productId: product.id,
          farmerId: product.farmerId,
          farmerName: product.farmerName,
          product: product.name,
          quantity: safeQuantity,
          pricePerKg: product.pricePerKg,
          deliveryTime: product.deliveryTime,
          image: product.image,
        },
        ...current,
      ];
    });

    showToast(
      `${product.name} added to your cart.`,
    );
  };

  const updateCartQuantity = (
    itemId: string,
    change: number,
  ) => {
    setCart((current) =>
      current
        .map((item) => {
          if (item.id !== itemId) {
            return item;
          }

          const product = products.find(
            (productItem) =>
              productItem.id === item.productId,
          );

          const maximum =
            product?.quantityAvailable ?? 999999;

          return {
            ...item,
            quantity: Math.min(
              maximum,
              Math.max(1, item.quantity + change),
            ),
          };
        })
        .filter((item) => item.quantity > 0),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCart((current) =>
      current.filter((item) => item.id !== itemId),
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce(
      (total, item) =>
        total +
        item.quantity * item.pricePerKg,
      0,
    );
  }, [cart]);

  const purchaseCart = async () => {
    if (!cart.length) { showToast("Your cart is empty."); return; }
    try {
      const created: Order[] = [];
      for (const item of cart) {
        const product = products.find(p => p.id === item.productId); if (!product) continue;
        const payload = await API("/api/orders", { method:"POST", body:JSON.stringify({ sellerId:item.farmerId, items:[{ productId:product.productId, listingId:product.listingId, quantity:item.quantity, unit:"kg", unitPrice:item.pricePerKg }] }) });
        const o=payload.order; if(o) created.push({id:o.id,type:"Marketplace",product:product.name,quantity:item.quantity,unit:"kg",cost:Number(o.total ?? item.quantity*item.pricePerKg),seller:item.farmerName,sellerId:item.farmerId,buyer:session.username,buyerId:session.buyerId,deliveryDate:o.createdAt,status:"Confirmed",createdAt:o.createdAt});
      }
      setOrders(current=>[...created,...current]); setCart([]); showToast(created.length?"Purchase successful. Your orders are confirmed.":"No order could be created."); if(created.length)void loadBuyerData();
    } catch(error){showToast(error instanceof Error?error.message:"Unable to create order.");}
  };

  /* -------------------------------------------------------
     PROCUREMENT
  ------------------------------------------------------- */

  const [requirementForm, setRequirementForm] =
    useState<RequirementItem>({
      id: "",
      produce: "",
      quantity: 100,
      unit: "kg",
      minPrice: 1,
      maxPrice: 100,
      requiredBy: futureDate(7),
      location: "",
    });

  const [editingRequirementItemId, setEditingRequirementItemId] =
    useState<string | null>(null);

  const resetRequirementForm = () => {
    setRequirementForm({
      id: "",
      produce: "",
      quantity: 100,
      unit: "kg",
      minPrice: 1,
      maxPrice: 100,
      requiredBy: futureDate(7),
      location: "",
    });

    setEditingRequirementItemId(null);
  };

  const addOrUpdateRequirementItem = () => {
    const produce =
      requirementForm.produce.trim();

    if (!produce) {
      showToast("Enter a produce name.");
      return;
    }

    if (toKg(requirementForm.quantity, requirementForm.unit ?? "kg") < 100) {
      showToast("Minimum quantity is 100 kg equivalent.");
      return;
    }

    if (
      requirementForm.minPrice < 0 ||
      requirementForm.maxPrice < 0 ||
      requirementForm.minPrice >
        requirementForm.maxPrice
    ) {
      showToast(
        "Enter a valid price range.",
      );
      return;
    }

    if (!requirementForm.requiredBy) {
      showToast(
        "Select a required-by date.",
      );
      return;
    }

    if (!requirementForm.location.trim()) {
      showToast("Enter a delivery location.");
      return;
    }

    const item: RequirementItem = {
      ...requirementForm,
      id:
        editingRequirementItemId ??
        createId("REQ-ITEM"),
      produce,
      location:
        requirementForm.location.trim(),
    };

    setRequirements((current) => {
      const draftIndex = current.findIndex(
        (requirement) =>
          requirement.status === "Draft",
      );

      if (draftIndex === -1) {
        return [
          {
            id: createId("REQ"),
            buyerId: session.buyerId,
            createdAt:
              new Date().toISOString(),
            status: "Draft",
            items: [item],
          },
          ...current,
        ];
      }

      const next = [...current];
      const draft = next[draftIndex];

      if (editingRequirementItemId) {
        next[draftIndex] = {
          ...draft,
          items: draft.items.map(
            (existing) =>
              existing.id ===
              editingRequirementItemId
                ? item
                : existing,
          ),
        };
      } else {
        next[draftIndex] = {
          ...draft,
          items: [...draft.items, item],
        };
      }

      return next;
    });

    resetRequirementForm();

    showToast(
      editingRequirementItemId
        ? "Requirement item updated."
        : "Requirement item added.",
    );
  };

  const draftRequirement =
    requirements.find(
      (requirement) =>
        requirement.status === "Draft",
    );

  const updateRequirementItem = (
    item: RequirementItem,
  ) => {
    setRequirementForm(item);
    setEditingRequirementItemId(item.id);
  };

  const deleteRequirementItem = (
    itemId: string,
  ) => {
    setRequirements((current) =>
      current
        .map((requirement) => {
          if (
            requirement.status !== "Draft"
          ) {
            return requirement;
          }

          return {
            ...requirement,
            items: requirement.items.filter(
              (item) => item.id !== itemId,
            ),
          };
        })
        .filter(
          (requirement) =>
            requirement.items.length > 0,
        ),
    );

    if (
      editingRequirementItemId === itemId
    ) {
      resetRequirementForm();
    }

    showToast("Requirement item removed.");
  };

  const submitRequirement = async (requirementId:string) => {
    const requirement=requirements.find(x=>x.id===requirementId); if(!requirement?.items.length){showToast("Add at least one requirement.");return;}
    try {
      const catalog=await API("/api/catalog"); const byName=new Map<string,any>((catalog??[]).map((x:any)=>[x.name.toLowerCase(),x]));
      const items=requirement.items.map(i=>({productId:i.productId??byName.get(i.produce.toLowerCase())?.id,quantity:i.quantity,unit:i.unit??"kg",minPrice:i.minPrice,maxPrice:i.maxPrice,requiredBy:i.requiredBy?new Date(i.requiredBy).toISOString():undefined,location:i.location}));
      if(items.some(x=>!x.productId)){showToast("A requested product is not in the backend catalog.");return;}
      const result=await API("/api/requirements",{method:"POST",body:JSON.stringify({location:requirement.items[0]?.location||session.location,items})});
      setRequirements(current=>current.filter(x=>x.id!==requirementId)); showToast(result.status==="NOT_FOUND"?"No farmers currently match your requirements.":"Requirement submitted successfully."); void loadBuyerData();
    }catch(error){showToast(error instanceof Error?error.message:"Unable to submit requirement.");}
  };

  const getEligibleListings = (
    farmer: Farmer,
    requirement: Requirement,
  ) => {
    return farmer.listings.filter((listing) => requirement.items.some((item) =>
      listing.produce.toLowerCase() === item.produce.toLowerCase() &&
      listing.pricePerKg >= item.minPrice && listing.pricePerKg <= item.maxPrice &&
      listing.availableQuantity > 0
    ));
  };

  const [selectedListingIds, setSelectedListingIds] =
    useState<Record<string, string[]>>({});

  const [selectedListingQuantities, setSelectedListingQuantities] = useState<Record<string, Record<string, number>>>({});

  const toggleListing = (
    farmerId: string,
    listingId: string,
  ) => {
    setSelectedListingIds((current) => {
      const selected =
        current[farmerId] ?? [];

      return {
        ...current,
        [farmerId]: selected.includes(
          listingId,
        )
          ? selected.filter(
              (id) => id !== listingId,
            )
          : [...selected, listingId],
      };
    });
  };

  const setListingQuantity = (farmerId: string, listingId: string, quantity: number) => {
    setSelectedListingQuantities((current) => ({ ...current, [farmerId]: { ...(current[farmerId] ?? {}), [listingId]: quantity } }));
  };

  const sendProcurementRequest = async (requirement:Requirement, farmer:Farmer) => {
    const eligible=getEligibleListings(farmer,requirement); const selected=selectedListingIds[farmer.id]??[]; const ids=(selected.length?selected:eligible.map(l=>l.id)).filter(id=>eligible.some(l=>l.id===id));
    if(!ids.length){showToast("Select at least one matching produce.");return;}
    const items=ids.map(listingId=>{const l=farmer.listings.find(x=>x.id===listingId)!;const r=requirement.items.find(x=>x.produce.toLowerCase()===l.produce.toLowerCase());return{listingId,quantity:Math.min(selectedListingQuantities[farmer.id]?.[listingId]??fromKg(toKg(r?.quantity??0,r?.unit??"kg"),l.unit),l.availableQuantity)}}).filter(x=>x.quantity>0);
    const price=Math.round(items.reduce((sum,x)=>sum+(farmer.listings.find(l=>l.id===x.listingId)?.pricePerKg??0),0)/Math.max(items.length,1));
    try {const result=await API(`/api/requirements/${requirement.id}/offer`,{method:"POST",body:JSON.stringify({farmerId:farmer.id,offeredPrice:price,items})});const o=result.offer;setOffers(current=>[...current.filter(x=>!(x.requirementId===requirement.id&&x.farmerId===farmer.id)),{id:o.id,requirementId:o.requirementId,farmerId:o.farmerId,selectedListingIds:items.map(x=>x.listingId),selectedQuantities:Object.fromEntries(items.map(x=>[x.listingId,x.quantity])),productId:farmer.listings.find(l=>l.id===items[0]?.listingId)?.productId,offeredPrice:Number(o.offeredPrice),originalPrice:Number(o.originalPrice??o.offeredPrice),buyerConfirmed:false,farmerConfirmed:false,status:"Requested"}]);showToast(`Request sent to ${farmer.name}. Waiting for farmer response…`);void loadBuyerData();}catch(error){showToast(error instanceof Error?error.message:"Unable to send request.");}
  };


  const negotiateOffer = async (requirementId:string, farmerId:string, price:number) => {
    const offer=offers.find(x=>x.requirementId===requirementId&&x.farmerId===farmerId); if(!offer)return;
    if(!offer.farmerConfirmed){showToast("Wait for the farmer to accept the request first.");return;}
    try { const result=await API(`/api/requirements/${requirementId}/counter`,{method:"POST",body:JSON.stringify({farmerId,price:Math.max(1,Number(price)||offer.offeredPrice) / (toKg(1,offer.requestedUnit ?? "kg") || 1)})}); const o=result.offer;
      setOffers(current=>current.map(x=>x.id===offer.id?{...x,offeredPrice:Number(o.offeredPrice),buyerConfirmed:false,farmerConfirmed:false,status:"Negotiating"}:x));
      showToast("Negotiated price sent. Waiting for the farmer…"); void loadBuyerData();
    } catch(error){showToast(error instanceof Error?error.message:"Unable to negotiate.");}
  };

  const farmerAcceptOffer = (_requirementId:string,_farmerId:string)=>{};

  const finalizeProcurementOrder = async (requirementId:string, farmerId:string) => {
    const offer=offers.find(x=>x.requirementId===requirementId&&x.farmerId===farmerId); if(!offer)return;
    if(!offer.farmerConfirmed){showToast("The farmer must accept the offer first.");return;}
    try { const result=await API(`/api/requirements/${requirementId}/accept`,{method:"POST",body:JSON.stringify({farmerId})});
      setOffers(current=>current.map(x=>x.id===offer.id?{...x,buyerConfirmed:true,farmerConfirmed:!!result.offer?.farmerConfirmed,status:result.orderCreated?"Accepted":"Negotiating"}:x));
      showToast(result.orderCreated?"Both parties accepted. Order confirmed.":"Your acceptance is recorded. Waiting for the farmer to confirm.");
      if(result.orderCreated) void loadBuyerData();
    } catch(error){showToast(error instanceof Error?error.message:"Unable to accept offer.");}
  };

  const clearMarketplaceOfferAfterDelay = (_requirementId:string,_farmerId:string)=>{};

  const declineOffer = async (requirementId:string, farmerId:string) => {
    try { await API(`/api/requirements/${requirementId}/decline`,{method:"POST",body:JSON.stringify({farmerId})});
      setOffers(current=>current.map(x=>x.requirementId===requirementId&&x.farmerId===farmerId?{...x,status:"Rejected",buyerConfirmed:false,farmerConfirmed:false}:x));
      showToast("Offer declined."); void loadBuyerData();
    } catch(error){showToast(error instanceof Error?error.message:"Unable to decline offer.");}
  };

  const closeRequirement = async (requirementId:string) => {
    try { await API(`/api/requirements/${requirementId}/close`,{method:"POST"});
      setRequirements(current=>current.filter(x=>x.id!==requirementId)); setOffers(current=>current.filter(x=>x.requirementId!==requirementId)); showToast("Requirement closed.");
    } catch(error){showToast(error instanceof Error?error.message:"Unable to close requirement.");}
  };


const dismissRequirement = (requirementId: string) => {
  setRequirements((current) =>
    current.filter(
      (requirement) => requirement.id !== requirementId,
    ),
  );
};

  const payOrder = async (orderId:string) => {
    try { await API(`/api/orders/${orderId}/pay`,{method:"POST"}); showToast("Demo payment successful. Logistics search started."); void loadBuyerData(); }
    catch(error){showToast(error instanceof Error?error.message:"Unable to complete payment.");}
  };

  const submitFarmerReview = async (order:Order,rating:number,comment:string) => {
    const trimmed=comment.trim(); if(!rating||!trimmed){showToast("Please select a rating and write a review.");return false;}
    if(farmerReviews.some(r=>r.orderId===order.id)){showToast("You have already reviewed this order.");return false;}
    try { const result=await API(`/api/orders/${order.id}/review`,{method:"POST",body:JSON.stringify({rating,comment:trimmed})});
      setFarmerReviews(current=>[{id:result.review.id,farmerId:order.sellerId,orderId:order.id,buyerName:session.username,rating,comment:trimmed,createdAt:result.review.createdAt},...current]); showToast("Review submitted successfully."); return true;
    } catch(error){showToast(error instanceof Error?error.message:"Unable to submit review.");return false;}
  };

  /* -------------------------------------------------------
     ORDER FILTERING
  ------------------------------------------------------- */

  const filteredOrders =
    useMemo(() => {
      const query =
        orderSearch
          .trim()
          .toLowerCase();

      return orders.filter(
        (order) => {
          const statusMatch =
            orderFilter === "All" ||
            order.status ===
              orderFilter;

          const searchMatch =
            !query ||
            `${order.id} ${order.product} ${order.seller} ${order.type} ${order.buyer}`
              .toLowerCase()
              .includes(query);

          return (
            statusMatch &&
            searchMatch
          );
        },
      );
    }, [
      orders,
      orderFilter,
      orderSearch,
    ]);

  /* -------------------------------------------------------
     ANALYTICS
  ------------------------------------------------------- */

  const analyticsOrders =
    useMemo(() => {
      const now =
        Date.now();

      let start = 0;
      let end = now;

      if (
        analyticsRange ===
        "week"
      ) {
        start =
          now -
          7 *
            24 *
            60 *
            60 *
            1000;
      }

      if (
        analyticsRange ===
        "month"
      ) {
        start =
          now -
          30 *
            24 *
            60 *
            60 *
            1000;
      }

      if (
        analyticsRange ===
        "custom"
      ) {
        if (customStart) {
          start =
            new Date(
              `${customStart}T00:00:00`,
            ).getTime();
        }

        if (customEnd) {
          end =
            new Date(
              `${customEnd}T23:59:59`,
            ).getTime();
        }
      }

      return orders.filter(
        (order) => {
          const time =
            new Date(
              order.createdAt,
            ).getTime();

          return (
            time >= start &&
            time <= end
          );
        },
      );
    }, [
      analyticsRange,
      customStart,
      customEnd,
      orders,
    ]);

  const barData =
    useMemo(() => {
      const map =
        new Map<
          string,
          number
        >();

      analyticsOrders.forEach(
        (order) => {
          map.set(
            order.product,
            (map.get(
              order.product,
            ) ?? 0) +
              order.quantity,
          );
        },
      );

      return Array.from(
        map.entries(),
      ).map(
        ([name, quantity]) => ({
          name,
          quantity,
        }),
      );
    }, [analyticsOrders]);

  const pieData = useMemo(() => {
  const colors = [
    "#16834a",
    "#f1b51b",
    "#3b82f6",
    "#ef8b2c",
    "#9ca3af",
  ];
  const statuses: OrderStatus[] = [
    "Confirmed",
    "Processing",
    "In Transit",
    "Delivered",
  ];

  return statuses.map((name, index) => ({
    name,
    value: analyticsOrders.filter(
      (order) => order.status === name,
    ).length,
    fill: colors[index],
  }));
}, [analyticsOrders]);

  /* -------------------------------------------------------
     DASHBOARD METRICS
  ------------------------------------------------------- */

  const totalSpend =
    orders.reduce(
      (sum, order) =>
        sum + order.cost,
      0,
    );

  const totalQuantity =
    orders.reduce(
      (sum, order) =>
        sum + order.quantity,
      0,
    );

  const activeShipments =
    orders.filter(
      (order) =>
        order.status ===
        "In Transit",
    ).length;

  const confirmedOrders =
    orders.filter(
      (order) =>
        order.status ===
        "Confirmed",
    ).length;

  /* -------------------------------------------------------
     MARKETPLACE FILTER
  ------------------------------------------------------- */

  const filteredProducts =
    useMemo(() => {
      const query =
        marketplaceSearch
          .trim()
          .toLowerCase();

      const filtered = products.filter((product) => {
        const categoryMatch = category === "All" || product.category === category || (category === "Organic" && product.farmerName.toLowerCase().includes("sharma"));
        const searchMatch = !query || `${product.name} ${product.farmerName} ${product.category}`.toLowerCase().includes(query);
        return categoryMatch && searchMatch;
      });
      return filtered.sort((a, b) => {
        if (!query) return a.name.localeCompare(b.name);
        const rank = (product: Product) => { const name = product.name.toLowerCase(); if (name === query) return 0; if (name.startsWith(query)) return 1; if (name.includes(query)) return 2; if (product.farmerName.toLowerCase().startsWith(query)) return 3; return 4; };
        return rank(a) - rank(b) || a.name.localeCompare(b.name);
      });
    }, [
      products,
      category,
      marketplaceSearch,
    ]);

  const addMarketplaceProductToRequirement = async (product:Product, quantity:number, unit:RequirementUnit) => {
    const farmer=farmers.find(x=>x.id===product.farmerId); if(!farmer)return;
    const safeQuantity=Math.min(fromKg(product.quantityAvailable,unit),Math.max(minimumQuantityForUnit(unit),quantity));
    try {
      // Browse-product requests are intentionally kept separate from the
      // Create Requirement flow. The backend stores them as BROWSE_PRODUCTS
      // so they can carry the offer/negotiation state without appearing in
      // Submitted Requirements or Matching Farmers.
      const requirementPayload=await API("/api/requirements",{method:"POST",body:JSON.stringify({browse:true,location:session.location,items:[{productId:product.productId,quantity:safeQuantity,unit,minPrice:product.pricePerKg,maxPrice:product.pricePerKg,requiredBy:futureDate(7)}]})});
      const requirementId=requirementPayload.requirementId;
      const offerPayload=await API(`/api/requirements/${requirementId}/offer`,{method:"POST",body:JSON.stringify({farmerId:farmer.id,offeredPrice:product.pricePerKg,items:[{listingId:product.listingId,quantity:safeQuantity}]})});
      const o=offerPayload.offer;
      setOffers(current=>[...current.filter(x=>x.id!==o.id),{id:o.id,requirementId,farmerId:farmer.id,productId:product.productId,selectedListingIds:[product.listingId],selectedQuantities:{[product.listingId]:safeQuantity},requestedQuantity:safeQuantity,requestedUnit:unit,offeredPrice:Number(o.offeredPrice),originalPrice:Number(o.originalPrice??o.offeredPrice),buyerConfirmed:false,farmerConfirmed:false,status:"Requested"}]);
      showToast(`Request sent to ${farmer.name}. Waiting for farmer response…`); void loadBuyerData();
    }catch(error){showToast(error instanceof Error?error.message:"Unable to send request.");}
  };

  const sendSupport = async (event: React.FormEvent) => {
    event.preventDefault();
    const subject = support.subject.trim();
    const message = support.message.trim();
    if (!subject || !message) { showToast("Please enter a subject and describe the issue."); return; }
    try {
      const result = await API("/api/support", { method: "POST", body: JSON.stringify({ subject, message }) });
      if (result.ticket) setTickets(current => [result.ticket, ...current]);
      setSupport({ subject: "", message: "" });
      showToast("Support request submitted successfully.");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to contact support.");
    }
  };

  /* -------------------------------------------------------
     RENDER
  ------------------------------------------------------- */

  return (
    <div className="buyer-page">
      <Header
        activeTab={activeTab}
        session={session}
        unreadCount={unreadCount}
        notificationOpen={
          notificationOpen
        }
        notifications={
          notifications
        }
        onMenu={() =>
          setMobileMenuOpen(true)
        }
        onNavigate={navigate}
        onProfile={() =>
          navigate("Profile")
        }
        onNotifications={() => {setNotificationOpen((value) => !value);}}
        onMarkNotifications={async () => {
          const unread=notifications.filter(n=>!n.read);
          try { await Promise.all(unread.map(n=>API(`/api/notifications/${n.id}/read`,{method:"POST"}))); setNotifications([]); setNotificationOpen(false); }
          catch(error){showToast(error instanceof Error?error.message:"Unable to mark notifications as read.");}
        }}
      />

      <div className="buyer-layout">
        <Sidebar
          activeTab={activeTab}
          open={mobileMenuOpen}
          onClose={() =>
            setMobileMenuOpen(false)
          }
          onNavigate={navigate}
        />

        <main className="buyer-content" data-buyer-view={activeTab}>
          {activeTab ===
            "Dashboard" && (
            <Dashboard
              session={session}
              orders={orders}
              requirements={requirements}
              farmers={
                farmers
              }
              totalSpend={
                totalSpend
              }
              totalQuantity={
                totalQuantity
              }
              confirmedOrders={
                confirmedOrders
              }
              activeShipments={
                activeShipments
              }
              onNavigate={
                navigate
              }
              onFarmer={
                setSelectedFarmer
              }
            />
          )}

          {activeTab ===
            "Marketplace" && (
            <Marketplace
              products={
                filteredProducts
              }
              categories={
                categories
              }
              category={
                category
              }
              search={
                marketplaceSearch
              }
              onCategory={
                setCategory
              }
              onSearch={
                setMarketplaceSearch
              }
              onProduct={(product) => {
                const farmer = farmers.find((item) => item.id === product.farmerId);
                if (farmer) setSelectedFarmer(farmer);
              }}
              procurement={{
                form: requirementForm,
                draft: draftRequirement,
                requirements,
                farmers: farmers,
                offers,
                selectedListingIds,
                selectedListingQuantities,
                editingItemId: editingRequirementItemId,
                onFormChange: setRequirementForm,
                onAdd: addOrUpdateRequirementItem,
                onUpdate: updateRequirementItem,
                onDelete: deleteRequirementItem,
                onCancelUpdate: resetRequirementForm,
                onSubmit: submitRequirement,
                onToggleListing: toggleListing,
                onSetQuantity: setListingQuantity,
                onSendRequest: sendProcurementRequest,
                onNegotiate: negotiateOffer,
                onFarmerAccept: farmerAcceptOffer,
                onConfirm: finalizeProcurementOrder,
                onDeclineOffer: declineOffer,
                onCloseRequirement: closeRequirement,
                onDismissRequirement: dismissRequirement,
                onFarmer: setSelectedFarmer,
              }}
              onAddToRequest={addMarketplaceProductToRequirement}
              farmers={farmers}
            />
          )}

          {activeTab ===
            "Orders" && (
            <Orders
              orders={
                filteredOrders
              }
              allOrders={
                orders
              }
              filter={
                orderFilter
              }
              search={
                orderSearch
              }
              onFilter={
                setOrderFilter
              }
              onSearch={
                setOrderSearch
              }
              onSubmitReview={submitFarmerReview}
              onPayOrder={payOrder}
            />
          )}

          {activeTab ===
            "Shipment" && (
            <Shipment
              orders={orders}
            />
          )}

          {activeTab ===
            "Analytics" && (
            <Analytics
              orders={
                analyticsOrders
              }
              requirements={
                requirements
              }
              barData={
                barData
              }
              pieData={
                pieData
              }
              range={
                analyticsRange
              }
              customStart={
                customStart
              }
              customEnd={
                customEnd
              }
              onRange={
                setAnalyticsRange
              }
              onStart={
                setCustomStart
              }
              onEnd={
                setCustomEnd
              }
              onExport={() =>
                exportAnalytics(
                  analyticsOrders,
                  barData,
                  pieData,
                )
              }
            />
          )}

          {activeTab ===
            "Help" && (
            <Help
              onNavigate={navigate}
              support={support}
              setSupport={setSupport}
              sendSupport={sendSupport}
              tickets={tickets}
            />
          )}

          {activeTab ===
            "Profile" && (
            <Profile
              session={
                session
              }
              orders={
                orders
              }
              onSessionChange={
                setSession
              }
              onNavigate={
                navigate
              }
              showToast={
                showToast
              }
              onSaveProfile={async (nextSession) => {
                try {
                  const payload=await API("/api/profile/me",{method:"PATCH",body:JSON.stringify({firstName:nextSession.username.split(" ")[0],lastName:nextSession.username.split(" ").slice(1).join(" ")||"Buyer",phone:nextSession.phoneNumber,email:nextSession.email,profileImage:nextSession.profileImage,location:nextSession.location,language:nextSession.language,company:nextSession.company})});
                  const user=payload.user; setSession(current=>({...current,username:`${user.firstName??""} ${user.lastName??""}`.trim()||current.username,phoneNumber:user.phone??current.phoneNumber,email:user.email??current.email,profileImage:user.profileImage??current.profileImage,location:user.location??current.location,language:user.language??current.language,company:nextSession.company}));
                  showToast("Profile updated successfully.");
                } catch(error){showToast(error instanceof Error?error.message:"Unable to update profile.");}
              }}
            />
          )}
        </main>
      </div>

      {selectedFarmer && (
        <FarmerModal
          farmer={selectedFarmer}
          reviews={farmerReviews.filter((review) => review.farmerId === selectedFarmer.id)}
          onClose={() =>
            setSelectedFarmer(
              null,
            )
          }
          onNavigate={
            navigate
          }
        />
      )}

      {toast && (
        <div className="buyer-toast">
          <CheckCircle2
            size={17}
          />
          <span>
            {toast}
          </span>
          <button
            type="button"
            onClick={() =>
              setToast(null)
            }
          >
            <X
              size={15}
            />
          </button>
        </div>
      )}
    </div>
  );

  function showToast(
    message: string,
  ) {
    setToast(message);
  }
}

/* =========================================================
   HEADER
========================================================= */

function Header({
  activeTab,
  session,
  unreadCount,
  notificationOpen,
  notifications,
  onMenu,
  onNavigate,
  onProfile,
  onNotifications,
  onMarkNotifications,
}: {
  activeTab: View;
  session: BuyerSession;
  unreadCount: number;
  notificationOpen: boolean;
  notifications: Notification[];
  onMenu: () => void;
  onNavigate: (view: View) => void;
  onProfile: () => void;
  onNotifications: () => void;
  onMarkNotifications: () => void | Promise<void>;
}) {
  return (
    <header className="buyer-header">
      <div className="buyer-header-inner">
        <button
          type="button"
          className="buyer-mobile-menu-button"
          onClick={onMenu}
          aria-label="Open navigation"
        >
          <Menu size={22} />
        </button>

        <button
          type="button"
          className="buyer-brand"
          onClick={() =>
            onNavigate("Dashboard")
          }
        >
          <span className="buyer-brand-mark">
            <img src="/Khetlink_Logo.svg" alt="KhetLink Logo" width={38} height={38}/>
          </span>
          <span>
            <strong>KhetLink</strong>
            <small> Farm Fresh • Smart Supply </small>
          </span>
        </button>

        <nav className="buyer-top-nav" aria-label="Buyer navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <a
              key={label}
              href={viewHref(label)}
              className={activeTab === label ? "active" : ""}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(label);
              }}
            >
              <Icon size={14} strokeWidth={2} />
              <span>{label}</span>
            </a>
          ))}
        </nav>

        <div className="buyer-header-spacer" />

        <div className="buyer-header-actions">
          <div className="buyer-notification-wrapper">
            <button
              type="button"
              className={`buyer-icon-button ${
                notificationOpen
                  ? "active"
                  : ""
              }`}
              onClick={
                onNotifications
              }
              aria-label="Notifications"
            >
              <Bell size={20} />

              {unreadCount >
                0 && (
                <span className="buyer-notification-count">
                  {unreadCount >
                  9
                    ? "9+"
                    : unreadCount}
                </span>
              )}
            </button>

            {notificationOpen && (
              <div className="buyer-notification-dropdown">
                <div className="notification-dropdown-header">
                  <div>
                    <strong>
                      Notifications
                    </strong>
                    <small>
                      {unreadCount} unread
                    </small>
                  </div>

                  {notifications.length >
                    0 && (
                    <button
                      type="button"
                      onClick={
                        onMarkNotifications
                      }
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                {notifications.length ===
                0 ? (
                  <div className="notification-empty">
                    <Bell
                      size={25}
                    />
                    <p>
                      No notifications
                      yet.
                    </p>
                  </div>
                ) : (
                  notifications
                    .filter((notification) => !notification.read)
                    .map(
                      (
                        notification,
                      ) => (
                        <div
                          className={`notification-item ${
                            notification.read
                              ? ""
                              : "unread"
                          }`}
                          key={
                            notification.id
                          }
                        >
                          <span>
                            <CheckCircle2
                              size={
                                17
                              }
                            />
                          </span>

                          <div>
                            <strong>
                              {
                                notification.title
                              }
                            </strong>
                            <p>
                              {
                                notification.message
                              }
                            </p>
                          </div>
                        </div>
                      ),
                    )
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className="buyer-profile-button"
            onClick={onProfile}
          >
            <span className="buyer-profile-avatar">
              {session.profileImage ? (
                <img
                  src={
                    session.profileImage
                  }
                  alt={
                    session.username
                  }
                />
              ) : (
                getInitials(
                  session.username,
                )
              )}
            </span>

            <span className="buyer-profile-copy">
              <strong>
                {session.username}
              </strong>
              <small>
                {activeTab}
              </small>
            </span>

            <ChevronDown
              size={15}
            />
          </button>
        </div>
      </div>
    </header>
  );
}

/* =========================================================
   SIDEBAR
========================================================= */

function Sidebar({
  activeTab,
  open,
  onClose,
  onNavigate,
}: {
  activeTab: View;
  open: boolean;
  onClose: () => void;
  onNavigate: (view: View) => void;
}) {
  return (
    <>
      {open && (
        <button
          type="button"
          className="buyer-sidebar-backdrop"
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`buyer-sidebar ${
          open
            ? "mobile-open"
            : ""
        }`}
      >
        <div className="buyer-sidebar-mobile-header">
          <strong>
            Buyer Menu
          </strong>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <p className="buyer-sidebar-label">
          Workspace
        </p>

        <nav className="buyer-sidebar-nav">
          {navItems.map(
            ({
              label,
              icon: Icon,
            }) => (
              <button
                type="button"
                key={label}
                className={
                  activeTab ===
                  label
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onNavigate(
                    label,
                  )
                }
              >
                <Icon
                  size={18}
                  strokeWidth={
                    2
                  }
                />
                <span>
                  {label}
                </span>
              </button>
            ),
          )}
        </nav>
      </aside>
    </>
  );
}

/* =========================================================
   DASHBOARD
========================================================= */

function Dashboard({
  session,
  orders,
  requirements,
  farmers,
  totalSpend,
  totalQuantity,
  confirmedOrders,
  activeShipments,
  onNavigate,
  onFarmer,
}: {
  session: BuyerSession;
  orders: Order[];
  requirements: Requirement[];
  farmers: Farmer[];
  totalSpend: number;
  totalQuantity: number;
  confirmedOrders: number;
  activeShipments: number;
  onNavigate: (view: View) => void;
  onFarmer: (farmer: Farmer) => void;
}) {
  const [summaryRange, setSummaryRange] = useState<"week" | "month">("month");
  const summaryStart = Date.now() - (summaryRange === "week" ? 7 : 30) * 24 * 60 * 60 * 1000;
  const summaryOrders = orders.filter((order) => new Date(order.createdAt).getTime() >= summaryStart);
  const summarySpend = summaryOrders.reduce((sum, order) => sum + order.cost, 0);
  const summaryQuantity = summaryOrders.reduce((sum, order) => sum + order.quantity, 0);

  const hasData = orders.length > 0;

  return (
    <div className="buyer-main dashboard-main">
      <section className="dashboard-welcome">
        <div className="dashboard-welcome-copy">
          <h1>
            Smarter Procurement
            <span> for a Fresh Tomorrow.</span>
          </h1>
          <p>
            Source fresh, quality produce directly from reliable farmers and logistics partners — all in one place.
          </p>
        </div>

        <div className="dashboard-quick-actions">
          <button
            type="button"
            className="buyer-primary-button"
            onClick={() =>
              onNavigate(
                "Marketplace",
              )
            }
          >
            <Store size={17} />
            Marketplace
          </button>

        </div>
      </section>

      <section className="dashboard-kpi-grid">
        <DashboardMetric
          label="Total Spend"
          value={
            hasData
              ? formatCurrency(
                  totalSpend,
                )
              : "—"
          }
          icon={
            <ShoppingCart />
          }
        />

        <DashboardMetric
          label="Total Quantity"
          value={
            hasData
              ? `${totalQuantity} kg`
              : "—"
          }
          icon={
            <Package />
          }
        />

        <DashboardMetric
          label="Confirmed Orders"
          value={
            hasData
              ? String(
                  confirmedOrders,
                )
              : "—"
          }
          icon={
            <CheckCircle2 />
          }
        />

        <DashboardMetric
          label="Active Shipments"
          value={
            hasData
              ? String(
                  activeShipments,
                )
              : "—"
          }
          icon={<Truck />}
        />
        <DashboardInsights orders={orders} requirements={requirements}/>
      </section>

      <section className="dashboard-two-column">
        <article className="buyer-card dashboard-orders-card">
          <SectionHeader
            title="Recent Orders"
            action="View All"
            onClick={() =>
              onNavigate("Orders")
            }
          />

          {orders.length === 0 ? (
            <InlineEmpty
              icon={
                <ShoppingCart />
              }
              text="Your confirmed marketplace orders will appear here."
            />
          ) : (
            <div className="recent-orders-table">
              <div className="recent-orders-row recent-orders-head">
                <span>
                  Order ID
                </span>
                <span>
                  Product
                </span>
                <span>
                  Quantity
                </span>
                <span>
                  Status
                </span>
                <span>
                  Delivery
                </span>
              </div>

              {orders
                .slice(0, 5)
                .map(
                  (order) => (
                    <div
                      className="recent-orders-row"
                      key={
                        order.id
                      }
                    >
                      <strong>
                        {order.id}
                      </strong>
                      <span>
                        {
                          order.product
                        }
                      </span>
                      <span>
                        {
                          order.quantity
                        }{" "}
                        kg
                      </span>
                      <StatusBadge
                        status={
                          order.status
                        }
                      />
                      <span>
                        {
                          order.deliveryDate
                        }
                      </span>
                    </div>
                  ),
                )}
            </div>
          )}
        </article>

        <article className="buyer-card procurement-summary-card">
          <div className="section-header">
            <div><h2>Procurement Summary</h2></div>
            <button type="button" onClick={() => onNavigate("Analytics")}>Analytics <ArrowRight size={14} /></button>
          </div>
          <div className="dashboard-summary-toggle"><button type="button" className={summaryRange === "week" ? "active" : ""} onClick={() => setSummaryRange("week")}>This Week</button><button type="button" className={summaryRange === "month" ? "active" : ""} onClick={() => setSummaryRange("month")}>This Month</button></div>

          <SummaryMetric
            icon={
              <ShoppingCart />
            }
            label="Total Spend"
            value={
              summaryOrders.length > 0
                ? formatCurrency(summarySpend)
                : "—"
            }
          />

          <SummaryMetric
            icon={
              <Package />
            }
            label="Cost per Kg"
            value={
              summaryOrders.length > 0
                ? formatCurrency(Math.round(summarySpend / Math.max(summaryQuantity, 1)))
                : "—"
            }
          />

          <SummaryMetric icon={<Truck />} label="Avg. Delivery Time" value={summaryOrders.length ? "1.5 Days" : "—"} />

          <SummaryMetric icon={<Star />} label="Supplier Score" value={farmers.length ? `${(farmers.reduce((sum, farmer) => sum + farmer.rating, 0) / farmers.length).toFixed(1)}/5` : "—"} />
        </article>
      </section>

      <section className="dashboard-three-column">
        <article className="buyer-card shipment-mini-card">
          <SectionHeader
            title="Shipment Tracking"
            action="View All"
            onClick={() =>
              onNavigate(
                "Shipment",
              )
            }
          />

          {activeShipments ===
          0 ? (
            <InlineEmpty
              icon={<Truck />}
              text="Live shipment tracking will appear after a confirmed order enters transit."
            />
          ) : (
            <div className="mini-shipment">
              <div className="mini-map">
                <MapIcon size={30} />
                <span>
                  Live delivery
                </span>
              </div>
            </div>
          )}
        </article>

        <article className="buyer-card trusted-suppliers-card">
          <SectionHeader
            title="Your Trusted Suppliers"
            action="View All"
            onClick={() =>
              onNavigate(
                "Marketplace",
              )
            }
          />

          {farmers
            .slice(0, 3)
            .map(
              (farmer) => (
                <button
                  type="button"
                  className="supplier-row"
                  key={
                    farmer.id
                  }
                  onClick={() =>
                    onFarmer(
                      farmer,
                    )
                  }
                >
                  <span className="supplier-avatar">{renderAvatar(farmer.avatar, farmer.name)}</span>

                  <span className="supplier-info">
                    <strong>
                      {
                        farmer.name
                      }
                    </strong>

                    <small>
                      {
                        farmer.location
                      }
                    </small>
                  </span>

                  <span className="supplier-rating">
                    <Star
                      size={13}
                      fill="currentColor"
                    />
                    {
                      farmer.rating
                    }
                  </span>
                </button>
              ),
            )}
        </article>

        <article className="buyer-card dashboard-help-card">
          <div className="dashboard-help-icon">
            <HelpCircle
              size={28}
            />
          </div>

          <p className="eyebrow">
            KHETLINK SUPPORT
          </p>

          <h3>
            Need assistance?
          </h3>

          <p>
            Get help with
            purchases,
            procurement or
            shipments.
          </p>

          <button
            type="button"
            onClick={() =>
              onNavigate("Help")
            }
          >
            Open Help
            <ArrowRight
              size={15}
            />
          </button>
        </article>
      </section>
    </div>
  );
}

function DashboardInsights({ orders, requirements }: { orders: Order[]; requirements: Requirement[] }) {
  const current = orders;

  const quantityMap = new Map<string, number>();
  current.forEach((order) => {
    quantityMap.set(
      order.product,
      (quantityMap.get(order.product) ?? 0) + order.quantity,
    );
  });
  const barData = Array.from(quantityMap.entries()).map(([name, quantity]) => ({
    name,
    quantity,
  }));

  const pieData = ["Confirmed", "Processing", "In Transit", "Delivered"].map((name) => ({
    name,
    value: current.filter((order) => order.status === name).length,
  }));

  const requirementData = ["Matched", "Pending", "Not Found", "Confirmed", "Closed"].map((name) => ({
    name,
    value: requirements.filter((item) =>
      name === "Pending"
        ? ["Draft", "Searching", "Pending"].includes(item.status)
        : item.status === name,
    ).length,
  }));

  return (
    <section className="dashboard-insights analytics-chart-grid">
      <article className="buyer-card analytics-chart-card">
        <SectionHeader title="Product Quantity" />

        {barData.length === 0 ? (
          <ChartEmpty text="Your product volume chart will appear after you place an order." />
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis label={{ value: "Quantity (kg)", angle: -90, position: "insideLeft" }} />
                <Tooltip />
                <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                  {barData.map((item, index) => (
                    <Cell key={`${item.name}-${index}`} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6", "#0f766e"][index % 6]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="buyer-card analytics-chart-card">
        <SectionHeader title="Order Distribution" />
        {pieData.every((item) => item.value === 0) ? (
          <ChartEmpty text="Your order status distribution will appear after your first purchase." />
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {pieData.map((item, index) => (
                    <Cell key={item.name} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c"][index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>

      <article className="buyer-card analytics-chart-card">
        <SectionHeader title="Requirement Status" />
        {requirementData.every((item) => item.value === 0) ? (
          <ChartEmpty text="Requirement status will appear after you create a procurement requirement." />
        ) : (
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={requirementData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                  {requirementData.map((item, index) => (
                    <Cell key={item.name} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6"][index]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </article>
    </section>
  );
}

/* =========================================================
   MARKETPLACE
========================================================= */

function Marketplace({
  products,
  categories,
  category,
  search,
  onCategory,
  onSearch,
  onProduct,
  procurement,
  onAddToRequest,
  farmers,
}: {
  products: Product[];
  categories: string[];
  category: string;
  search: string;
  onCategory: (
    category: string,
  ) => void;
  onSearch: (
    value: string,
  ) => void;
  onProduct: (
    product: Product,
  ) => void;
  procurement: Parameters<typeof Procurement>[0];
  onAddToRequest: (product: Product, quantity: number, unit: RequirementUnit) => void;
  farmers: Farmer[];
}) {
  const [sortBy, setSortBy] = useState("relevance");
  const displayProducts = useMemo(() => {
    const list = [...products];
    const deliveryDays = (value: string) => Number(value.match(/\d+/)?.[0] ?? 99);
    if (sortBy === "delivery") list.sort((a, b) => deliveryDays(a.deliveryTime) - deliveryDays(b.deliveryTime));
    if (sortBy === "produce") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === "rating") list.sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);
    if (sortBy === "price") list.sort((a, b) => a.pricePerKg - b.pricePerKg);
    if (sortBy === "quantity") list.sort((a, b) => b.quantityAvailable - a.quantityAvailable);
    return list;
  }, [products, sortBy]);

  return (
    <div className="buyer-main marketplace-main">
      <section className="marketplace-hero">
        <p className="eyebrow green">
          KHETLINK MARKETPLACE
        </p>

        <h1>
          Fresh produce,
          <span>
            {" "}
            directly from farmers.
          </span>
        </h1>

        <p className="marketplace-description">
          Buy everyday produce
          from verified farmers
          and manage your
          purchases in one place.
        </p>


      </section>

      <section className="marketplace-browse-section">
        <div className="marketplace-section-divider">
          <p className="eyebrow green">2. BROWSE PRODUCTS</p>
          <h2>Fresh produce from farmers</h2>
          <p>Browse individual listings below. Send a request directly to the farmer, then negotiate and confirm from the same card.</p>
        </div>

        <div className="marketplace-search marketplace-browse-search">
          <Search size={19} />
          <input value={search} onChange={(event) => onSearch(event.target.value)} placeholder="Search produce or farmer" />
        </div>

      <div className="marketplace-category-sort-wrap">
        <div className="marketplace-category-row">
          {categories.map(
            (item) => (
              <button
                type="button"
                key={item}
                className={
                  category ===
                  item
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onCategory(item)
                }
              >
                {item}
              </button>
            ),
          )}
        </div>

        <div className="marketplace-sort-row">
        <span>Sort by</span>
        <button type="button" className={sortBy === "delivery" ? "active" : ""} onClick={() => setSortBy("delivery")}>Delivery Time</button>
        <button type="button" className={sortBy === "produce" ? "active" : ""} onClick={() => setSortBy("produce")}>Produce</button>
        <button type="button" className={sortBy === "rating" ? "active" : ""} onClick={() => setSortBy("rating")}>Ratings</button>
        <button type="button" className={sortBy === "price" ? "active" : ""} onClick={() => setSortBy("price")}>Price</button>
        <button type="button" className={sortBy === "quantity" ? "active" : ""} onClick={() => setSortBy("quantity")}>Quantity Available</button>
        </div>
      </div>

      <div className="marketplace-heading">
        <div>
          <p className="eyebrow">
            AVAILABLE NOW
          </p>

          <h2>
            Fresh from farmers
          </h2>
        </div>

        <span>
          {displayProducts.length}{" "}
          products
        </span>
      </div>

      {displayProducts.length ===
      0 ? (
        <section className="buyer-card empty-state-large">
          <Search
            size={40}
          />
          <h2>
            No products found
          </h2>
          <p>
            Try another
            search or category.
          </p>
        </section>
      ) : (
        <div className="product-grid">
          {displayProducts.map(
            (product) => (
              <ProductCard
                key={
                  product.id
                }
                product={
                  product
                }
                farmer={farmers.find(f => f.id === product.farmerId)}
                onView={() =>
                  onProduct(
                    product,
                  )
                }
                offer={procurement.offers.find((item) => (item.productId === product.productId || item.selectedListingIds.includes(product.listingId)) && item.farmerId === product.farmerId)}
                onAddToRequest={(quantity, unit) => onAddToRequest(product, quantity, unit)}
                onNegotiate={(price) => { const o=procurement.offers.find(x=>(x.productId===product.productId || x.selectedListingIds.includes(product.listingId))&&x.farmerId===product.farmerId); if(o) procurement.onNegotiate(o.requirementId,product.farmerId,price); }}
                onConfirm={() => { const o=procurement.offers.find(x=>(x.productId===product.productId || x.selectedListingIds.includes(product.listingId))&&x.farmerId===product.farmerId); if(o) procurement.onConfirm(o.requirementId,product.farmerId); }}
                onDecline={() => { const o=procurement.offers.find(x=>(x.productId===product.productId || x.selectedListingIds.includes(product.listingId))&&x.farmerId===product.farmerId); if(o) procurement.onDeclineOffer(o.requirementId,product.farmerId); }}
              />
            ),
          )}
        </div>
      )}
      </section>

      <section className="marketplace-procurement-section">
        <div className="marketplace-section-divider">
          <p className="eyebrow green">1. STATE YOUR REQUIREMENTS</p>
          <h2>Need produce at scale?</h2>
          <p>Create a requirement, choose quantity and unit, match farmers, then request, negotiate, confirm or decline from the same Marketplace.</p>
        </div>
        <Procurement {...procurement} />
      </section>

    </div>
  );
}

function ProductCard({
  product,
  farmer,
  onView,
  onAddToRequest,
  offer,
  onNegotiate,
  onConfirm,
  onDecline,
}: {
  product: Product;
  farmer?: Farmer;
  onView: () => void;
  onAddToRequest: (quantity: number, unit: RequirementUnit) => void;
  offer?: FarmerOffer;
  onNegotiate: (price: number) => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const [quantity, setQuantity] = useState(100);
  const [unit, setUnit] = useState<RequirementUnit>("kg");
  const [price, setPrice] = useState(offer?.offeredPrice ?? product.pricePerKg);
  const [visibleOffer, setVisibleOffer] = useState<FarmerOffer | undefined>(offer);

  const availableForUnit = fromKg(product.quantityAvailable, unit);
  const minimumForUnit = minimumQuantityForUnit(unit);
  const quantityStep = unit === "ton" ? 0.01 : unit === "dozen" ? 1 : 1;
  const priceForUnit = pricePerSelectedUnit(product.pricePerKg, unit);
  const negotiatedPriceForUnit = price;

  useEffect(() => {
    setVisibleOffer(offer);
    if (offer) {
      setPrice(offer.offeredPrice);
      if (offer.requestedUnit) setUnit(offer.requestedUnit);
      if (offer.status === "Accepted" || offer.status === "Rejected") {
        const timer = window.setTimeout(() => setVisibleOffer(undefined), 4500);
        return () => window.clearTimeout(timer);
      }
    }
  }, [offer]);

  const changeUnit = (nextUnit: RequirementUnit) => {
    const currentKg = toKg(quantity, unit);
    const nextMax = fromKg(product.quantityAvailable, nextUnit);
    const nextMin = minimumQuantityForUnit(nextUnit);
    const converted = fromKg(currentKg, nextUnit);
    setUnit(nextUnit);
    setQuantity(Math.min(nextMax, Math.max(nextMin, Number(converted.toFixed(2)))));
  };

  const setTypedQuantity = (value: string) => {
    if (value === "") {
      setQuantity(0);
      return;
    }
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) return;
    setQuantity(parsed);
  };

  const adjustQuantity = (delta: number) => {
    setQuantity((value) =>
      Math.min(availableForUnit, Math.max(minimumForUnit, Number((value + delta).toFixed(2)))),
    );
  };

  return (
    <article className="product-card">
      <div className="product-image"><img src={product.image} alt={product.name} /></div>

      <div className="product-content">
        <div className="product-top">
          <div>
            <h3>{product.name}</h3>
            <p>{product.farmerName}</p>
          </div>
          <span className="product-rating"><Star size={12} fill="currentColor" />{product.rating}</span>
          <small className="product-review-count">{product.reviews} reviews</small>
        </div>

        <div className="product-location"><Truck size={13} />{product.deliveryTime}</div>

        <div className="product-price">
          <strong>{formatCurrency(priceForUnit)}</strong>
          <span>/ {unit}</span>
        </div>
        <small className="product-availability">{availableForUnit.toLocaleString()} {unit} available</small>

        <div className="product-card-quantity">
          <span>Request quantity</span>
          <div>
            <button type="button" onClick={() => adjustQuantity(-quantityStep)}><Minus size={13} /></button>
            <input type="number" min={minimumForUnit} max={availableForUnit} step={quantityStep} value={quantity === 0 ? "" : quantity} onChange={(event) => setTypedQuantity(event.target.value)} onBlur={() => setQuantity(Math.min(availableForUnit, Math.max(minimumForUnit, Number(quantity) || minimumForUnit)))} />
            <button type="button" onClick={() => adjustQuantity(quantityStep)}><Plus size={13} /></button>
            <select value={unit} onChange={(event) => changeUnit(event.target.value as RequirementUnit)}>
              <option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option>
            </select>
          </div>
        </div>

        <div className="product-actions">
          <button type="button" className="product-details-btn" onClick={onView}><Eye size={14} />Details</button>
          {(!visibleOffer) && (
            <button type="button" className="product-request-btn" onClick={() => { const safeQuantity = Math.min(availableForUnit, Math.max(minimumForUnit, Number(quantity) || 0)); if (safeQuantity < minimumForUnit) return; setQuantity(safeQuantity); onAddToRequest(safeQuantity, unit); }}>
              <Send size={14} />{"Send Request"}
            </button>
          )}
        </div>

        {visibleOffer && visibleOffer.status === "Accepted" && (
          <div className="farmer-negotiation-box product-card-negotiation product-card-confirmed-state">
            <div>
              <span>Order confirmed</span>
              <strong>{formatCurrency(visibleOffer.offeredPrice)} / {visibleOffer.requestedUnit ?? unit}</strong>
            </div>
            <StatusOffer status="Accepted" />
            <span className="farmer-response-waiting">Your order is confirmed. The product card will be ready for a new request shortly.</span>
          </div>
        )}

        {visibleOffer && visibleOffer.status !== "Accepted" && (
          <div className="farmer-negotiation-box product-card-negotiation">
            <div>
              <span>Negotiated price</span>
              <div className="negotiation-input"><span>₹</span><input type="number" min="1" value={price} onChange={(event) => setPrice(Number(event.target.value))} /><span>/ {visibleOffer.requestedUnit ?? unit}</span></div>
              <small className="negotiated-unit-price">{formatCurrency(negotiatedPriceForUnit)} / {visibleOffer.requestedUnit ?? unit}</small>
            </div>
            <StatusOffer status={visibleOffer.status} />
            <div className="negotiation-actions">
              {visibleOffer.status !== "Rejected" && visibleOffer.farmerConfirmed && !visibleOffer.buyerConfirmed && (
                <button type="button" onClick={() => onNegotiate(price)}>
                  Send New Price
                </button>
              )}
              {visibleOffer.status === "Negotiating" && visibleOffer.farmerConfirmed && !visibleOffer.buyerConfirmed && (
                <button type="button" className="buyer-primary-button small" onClick={onConfirm}>Accept Price</button>
              )}
              {visibleOffer.status === "Negotiating" && !visibleOffer.buyerConfirmed && (
                <button type="button" className="product-decline-btn" onClick={onDecline}>Decline</button>
              )}
              {!visibleOffer.farmerConfirmed && visibleOffer.status !== "Rejected" && visibleOffer.status !== "Accepted" && (
                <span className="farmer-response-waiting">Waiting for farmer response…</span>
              )}
            </div>
            {farmer && <AcceptanceStatus farmer={farmer} offer={visibleOffer} />}
          </div>
        )}
      </div>
    </article>
  );
}

/* =========================================================
   PROCUREMENT
========================================================= */

function Procurement({
  form,
  draft,
  requirements,
  farmers,
  offers,
  selectedListingIds,
  selectedListingQuantities,
  editingItemId,
  onFormChange,
  onAdd,
  onUpdate,
  onDelete,
  onCancelUpdate,
  onSubmit,
  onToggleListing,
  onSetQuantity,
  onSendRequest,
  onNegotiate,
  onFarmerAccept,
  onConfirm,
  onDeclineOffer,
  onCloseRequirement,
  onDismissRequirement,
  onFarmer,
}: {
  form: RequirementItem;
  draft?: Requirement;
  requirements: Requirement[];
  farmers: Farmer[];
  offers: FarmerOffer[];
  selectedListingIds: Record<string, string[]>;
  selectedListingQuantities: Record<string, Record<string, number>>;
  editingItemId: string | null;
  onFormChange: (
    value: RequirementItem,
  ) => void;
  onAdd: () => void;
  onUpdate: (
    item: RequirementItem,
  ) => void;
  onDelete: (
    itemId: string,
  ) => void;
  onCancelUpdate: () => void;
  onSubmit: (
    requirementId: string,
  ) => void;
  onToggleListing: (farmerId: string, listingId: string) => void;
  onSetQuantity: (farmerId: string, listingId: string, quantity: number) => void;
  onSendRequest: (
    requirement: Requirement,
    farmer: Farmer,
  ) => void;
  onNegotiate: (
    requirementId: string,
    farmerId: string,
    price: number,
  ) => void;
  onFarmerAccept: (
    requirementId: string,
    farmerId: string,
  ) => void;
  onConfirm: (requirementId: string, farmerId: string) => void;
  onDeclineOffer: (requirementId: string, farmerId: string) => void;
  onCloseRequirement: (requirementId: string) => void;
  onDismissRequirement: (requirementId: string) => void;
  onFarmer: (
    farmer: Farmer,
  ) => void;
}) {
  const submittedRequirements =
    requirements.filter(
      (requirement) =>
        requirement.status !==
        "Draft",
    );

  return (
    <div className="procurement-main marketplace-procurement">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            BULK PROCUREMENT
          </p>

          <h1>
            Procure at scale
          </h1>

          <p>
            Create multiple
            requirements,
            discover matching
            farmers and negotiate
            the final price.
          </p>
        </div>
      </div>

      <section className="procurement-stepper buyer-card">
        {[["1", "Define Requirement"], ["2", "Buyer Process"], ["3", "Supplier Selection"], ["4", "Negotiation"], ["5", "Summary"]].map(([number, label], index) => (
          <div className="procurement-stepper-item" key={number}>
            <span>{number}</span>
            <strong>{label}</strong>
            {index < 4 && <ArrowRight size={15} />}
          </div>
        ))}
      </section>

      <section className="procurement-form buyer-card">
        <div className="section-heading">
          <div>
            <h2>
              Create Requirement
            </h2>
            <p>
              Add each product
              separately.
            </p>
          </div>

          <span className="requirement-step">
            Step 1
          </span>
        </div>

        <div className="procurement-input-grid">
          <Field label="Produce">
            <input list="buyer-produce-options" value={form.produce} onChange={(event) => onFormChange({ ...form, produce: event.target.value })} placeholder="Type or select produce" />
            <datalist id="buyer-produce-options">
              {[...new Set(farmers.flatMap((farmer) => farmer.listings.map((listing) => listing.produce)).concat(["Mango", "Banana", "Apple", "Orange", "Grapes"]))].map((produce) => <option value={produce} key={produce} />)}
            </datalist>
          </Field>

          <Field label="Quantity">
            <div className="buyer-quantity-control">
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), form.quantity - 1) })}><Minus size={14} /></button>
              <input type="number" min={minimumQuantityForUnit(form.unit ?? "kg")} value={form.quantity === 0 ? "" : form.quantity} onChange={(event) => { const raw = event.target.value; onFormChange({ ...form, quantity: raw === "" ? 0 : Number(raw) }); }} onBlur={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), Number(form.quantity) || minimumQuantityForUnit(form.unit ?? "kg")) })} />
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.min(fromKg(999999, form.unit ?? "kg"), form.quantity + 1) })}><Plus size={14} /></button>
              <select value={form.unit ?? "kg"} onChange={(event) => { const nextUnit = event.target.value as RequirementUnit; const kg = toKg(form.quantity, form.unit ?? "kg"); onFormChange({ ...form, unit: nextUnit, quantity: Math.max(minimumQuantityForUnit(nextUnit), Number(fromKg(kg, nextUnit).toFixed(2))) }); }}><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select>
            </div>
          </Field>

          <Field
            label="Minimum Price / kg"
          >
            <input
              type="number"
              min="0"
              value={
                form.minPrice
              }
              onChange={(event) =>
                onFormChange({
                  ...form,
                  minPrice:
                    Number(
                      event.target
                        .value,
                    ),
                })
              }
            />
          </Field>

          <Field
            label="Maximum Price / kg"
          >
            <input
              type="number"
              min="0"
              value={
                form.maxPrice
              }
              onChange={(event) =>
                onFormChange({
                  ...form,
                  maxPrice:
                    Number(
                      event.target
                        .value,
                    ),
                })
              }
            />
          </Field>

          <Field
            label="Required By"
          >
            <input
              type="date"
              min={todayString()}
              value={
                form.requiredBy
              }
              onChange={(event) =>
                onFormChange({
                  ...form,
                  requiredBy:
                    event.target
                      .value,
                })
              }
            />
          </Field>

          <Field
            label="Delivery Location"
          >
            <input
              value={
                form.location
              }
              onChange={(event) =>
                onFormChange({
                  ...form,
                  location:
                    event.target
                      .value,
                })
              }
              placeholder="e.g. Pune"
            />
          </Field>
        </div>

        <div className="procurement-form-actions">
          {editingItemId && (
            <button
              type="button"
              className="buyer-outline-button"
              onClick={onCancelUpdate}
            >
              Cancel Update
            </button>
          )}

          <button
            type="button"
            className="buyer-primary-button"
            onClick={onAdd}
          >
            {editingItemId ? (
              <>
                <Check
                  size={16}
                />
                Update Item
              </>
            ) : (
              <>
                <Plus
                  size={16}
                />
                Add Requirement
              </>
            )}
          </button>
        </div>
      </section>

      {draft && (
        <section className="procurement-requirement-box buyer-card">
          <div className="section-heading">
            <div>
              <p className="eyebrow">
                DRAFT REQUIREMENT
              </p>

              <h2>
                Your procurement
                list
              </h2>

              <small>
                {draft.id}
              </small>
            </div>

            <span className="requirement-status draft">
              Draft
            </span>
          </div>

          <div className="requirement-items">
            {draft.items.map(
              (item) => (
                <div
                  className="requirement-item"
                  key={item.id}
                >
                 <div className="requirement-product-icon"><img src={getProductImage(item.produce)} alt={item.produce}/></div>
                  <div className="requirement-item-copy">
                    <strong>
                      {
                        item.produce
                      }
                    </strong>

                    <span>
                      {formatQuantity(item.quantity, item.unit ?? "kg")}
                    </span>

                    <small>
                      ₹
                      {
                        item.minPrice
                      } – ₹
                      {
                        item.maxPrice
                      }{" "}
                      / kg
                    </small>
                  </div>

                  <div className="requirement-item-meta">
                    <span>
                      <MapPin
                        size={
                          13
                        }
                      />
                      {
                        item.location
                      }
                    </span>

                    <span>
                      <Clock3
                        size={
                          13
                        }
                      />
                      {
                        item.requiredBy
                      }
                    </span>
                  </div>

                  <div className="requirement-item-actions">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdate(
                          item,
                        )
                      }
                      title="Update"
                    >
                      <Pencil
                        size={
                          15
                        }
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        onDelete(
                          item.id,
                        )
                      }
                      title="Remove"
                    >
                      <Trash2
                        size={
                          15
                        }
                      />
                    </button>
                  </div>
                </div>
              ),
            )}
          </div>

          <div className="requirement-submit-row">
            <span>
              {draft.items.length}{" "}
              item
              {draft.items.length !==
              1
                ? "s"
                : ""}{" "}
              added
            </span>

            <button
              type="button"
              className="buyer-primary-button"
              disabled={
                draft.items.length ===
                0
              }
              onClick={() =>
                onSubmit(
                  draft.id,
                )
              }
            >
              <Send size={16} />
              Submit Request
            </button>
          </div>
        </section>
      )}

      {submittedRequirements.length > 0 && (
        <section className="procurement-submitted-list buyer-card">
          <div className="section-heading"><div><p className="eyebrow">YOUR REQUIREMENTS</p><h2>Submitted Requirements</h2></div><span>{submittedRequirements.length} active</span></div>
          <div className="submitted-requirement-table">
            {submittedRequirements.map((requirement) => (
              <div className="submitted-requirement-row" key={requirement.id}>
                <strong>{requirement.id}</strong>
                <span>{requirement.items.map((item) => `${item.produce} · ${formatQuantity(item.quantity, item.unit ?? "kg")}`).join(" | ")}</span>
                <span className={`requirement-status ${requirement.status.toLowerCase().replace(/\s+/g, "-")}`}>{requirement.status}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {submittedRequirements.map(
        (requirement) => (
          <ProcurementRequest
            key={
              requirement.id
            }
            requirement={
              requirement
            }
            farmers={farmers}
            offers={offers}
            selectedListingIds={selectedListingIds}
            selectedListingQuantities={selectedListingQuantities}
            onToggleListing={onToggleListing}
            onSetQuantity={onSetQuantity}
            onSendRequest={
              onSendRequest
            }
            onNegotiate={
              onNegotiate
            }
            onFarmerAccept={
              onFarmerAccept
            }
            onConfirm={onConfirm}
            onDeclineOffer={onDeclineOffer}
            onCloseRequirement={onCloseRequirement}
            onDismissRequirement={onDismissRequirement}
            onFarmer={
              onFarmer
            }
          />
        ),
      )}
    </div>
  );
}

/* =========================================================
   PROCUREMENT REQUEST + MATCHING
========================================================= */

function ProcurementRequest({
  requirement,
  farmers,
  offers,
  selectedListingIds,
  selectedListingQuantities,
  onToggleListing,
  onSetQuantity,
  onSendRequest,
  onNegotiate,
  onFarmerAccept,
  onConfirm,
  onDeclineOffer,
  onCloseRequirement,
  onDismissRequirement,
  onFarmer,
}: {
  requirement: Requirement;
  farmers: Farmer[];
  offers: FarmerOffer[];
  selectedListingIds: Record<string, string[]>;
  selectedListingQuantities: Record<string, Record<string, number>>;
  onToggleListing: (farmerId: string, listingId: string) => void;
  onSetQuantity: (farmerId: string, listingId: string, quantity: number) => void;
  onSendRequest: (
    requirement: Requirement,
    farmer: Farmer,
  ) => void;
  onNegotiate: (
    requirementId: string,
    farmerId: string,
    price: number,
  ) => void;
  onFarmerAccept: (
    requirementId: string,
    farmerId: string,
  ) => void;
  onConfirm: (requirementId: string, farmerId: string) => void;
  onDeclineOffer: (requirementId: string, farmerId: string) => void;
  onCloseRequirement: (requirementId: string) => void;
  onDismissRequirement: (requirementId: string) => void;
  onFarmer: (
    farmer: Farmer,
  ) => void;
}) {
  const matchedFarmers = farmers
    .filter((farmer) => requirement.matchedFarmerIds?.length ? requirement.matchedFarmerIds.includes(farmer.id) : farmer.listings.some((listing) => requirement.items.some((item) => listing.produce.toLowerCase() === item.produce.toLowerCase())))
    .sort((a, b) => {
      const satisfied = (farmer: Farmer) =>
        requirement.items.reduce((sum, item) => {
          const listing = farmer.listings.find(
            (candidate) =>
              candidate.produce.toLowerCase() ===
              item.produce.toLowerCase(),
          );
          return (
            sum +
            Math.min(
              toKg(item.quantity, item.unit),
              listing?.availableQuantity ?? 0,
            )
          );
        }, 0);

      const price = (farmer: Farmer) =>
        Math.min(
          ...farmer.listings.map(
            (listing) => listing.pricePerKg,
          ),
        );

      return (
        satisfied(b) -
        satisfied(a) ||
        b.rating - a.rating ||
        price(a) - price(b) ||
        a.distanceKm - b.distanceKm
      );
    });

  return (
    <section className="procurement-results buyer-card">
      <div className="section-heading">
        <div>
          <p className="eyebrow">
            REQUIREMENT
          </p>

          <h2>
            {requirement.id}
          </h2>

          <p>
            {requirement.items.length}{" "}
            product
            {requirement.items.length !==
            1
              ? "s"
              : ""}{" "}
            requested
          </p>
        </div>

        <span
          className={`requirement-status ${requirement.status
            .toLowerCase()
            .replace(
              /\s+/g,
              "-",
            )}`}
        >
          {requirement.status}
        </span>
        { requirement.status !== "Confirmed" &&
          requirement.status !== "Not Found" &&
          requirement.status !== "Closed" && (<button type="button" className="buyer-outline-button small requirement-close-text" onClick={() => onCloseRequirement(requirement.id)}>Close Requirement</button>)}
      </div>
      {requirement.status === "Not Found" || requirement.status === "Closed" ? (
        <InlineEmpty
          icon={
            <XCircle />
          }
          text={requirement.status === "Closed" ? "This requirement is closed and will be removed shortly." : "No farmer currently matches these requirements."}
        />
      ) : (
        <>
          <div className="matching-header">
            <div>
              <h3>
                Matching Farmers
              </h3>

              <p>
                A farmer qualifies
                when they match at
                least one requested
                product.
              </p>
            </div>

            <strong>
              {
                matchedFarmers.length
              }{" "}
              matches
            </strong>
          </div>

          <div className="matched-farmer-grid">
            {matchedFarmers.map(
              (farmer) => (
                <MatchedFarmerCard
                  key={
                    farmer.id
                  }
                  farmer={
                    farmer
                  }
                  requirement={
                    requirement
                  }
                  offer={offers.find(
                    (offer) =>
                      offer.requirementId ===
                        requirement.id &&
                      offer.farmerId ===
                        farmer.id,
                  )}
                  selected={selectedListingIds[farmer.id] ?? []}
                  selectedQuantities={selectedListingQuantities[farmer.id] ?? {}}
                  onView={() =>
                    onFarmer(
                      farmer,
                    )
                  }
                  onToggle={(
                    listingId,
                  ) =>
                    onToggleListing(
                      farmer.id,
                      listingId,
                    )
                  }
                  onSetQuantity={(
                    listingId,
                    quantity,
                  ) =>
                    onSetQuantity(
                      farmer.id,
                      listingId,
                      quantity,
                    )
                  }
                  onSend={() =>
                    onSendRequest(
                      requirement,
                      farmer,
                    )
                  }
                  onNegotiate={(
                    price,
                  ) =>
                    onNegotiate(
                      requirement.id,
                      farmer.id,
                      price,
                    )
                  }
                  onFarmerAccept={() =>
                    onFarmerAccept(
                      requirement.id,
                      farmer.id,
                    )
                  }
                  onConfirm={() => onConfirm(requirement.id, farmer.id)}
                  onDecline={() => onDeclineOffer(requirement.id, farmer.id)}
                />
              ),
            )}
          </div>
        </>
      )}
    </section>
  );
}

function MatchedFarmerCard({
  farmer,
  requirement,
  offer,
  selected,
  selectedQuantities,
  onView,
  onToggle,
  onSetQuantity,
  onSend,
  onNegotiate,
  onFarmerAccept,
  onConfirm,
  onDecline,
}: {
  farmer: Farmer;
  requirement: Requirement;
  offer?: FarmerOffer;
  selected: string[];
  selectedQuantities: Record<string, number>;
  onView: () => void;
  onToggle: (listingId: string) => void;
  onSetQuantity: (listingId: string, quantity: number) => void;
  onSend: () => void;
  onNegotiate: (
    price: number,
  ) => void;
  onFarmerAccept: () => void;
  onConfirm: () => void;
  onDecline: () => void;
}) {
  const eligible =
    farmer.listings.filter(
      (listing) =>
        requirement.items.some(
          (item) =>
            item.produce.toLowerCase() ===
              listing.produce.toLowerCase() &&
            toKg(listing.availableQuantity, listing.unit) >=
              toKg(item.quantity, item.unit),
        ),
    );

  const [price, setPrice] =
    useState(
      offer?.offeredPrice ??
        eligible[0]?.pricePerKg ??
        1,
    );

  useEffect(() => {
    if (offer) {
      setPrice(
        offer.offeredPrice,
      );
    }
  }, [offer]);

  return (
    <article className="matched-farmer-card">
      <div className="farmer-photo">
        <span>{renderAvatar(farmer.avatar, farmer.name)}</span>

        {farmer.verified && (
          <em>
            Verified
          </em>
        )}
      </div>

      <div className="matched-farmer-copy">
        <div className="matched-title">
          <strong>
            {farmer.name}
          </strong>

          <button
            type="button"
            onClick={onView}
            title="View farmer"
          >
            <Eye size={14} />
          </button>
        </div>

        <small>
          {farmer.location}{" "}
          •{" "}
          {
            farmer.distanceKm
          }{" "}
          km
        </small>

        <div className="farmer-rating">
          <Star
            size={13}
            fill="currentColor"
          />
          {
            farmer.rating
          }{" "}
          ({farmer.reviews})
        </div>

        <div className="matching-listings">
          {eligible.map(
            (listing) => (
              <label
                key={
                  listing.id
                }
              >
                <input
                  type="checkbox"
                  checked={selected.includes(
                    listing.id,
                  )}
                  onChange={() =>
                    onToggle(
                      listing.id,
                    )
                  }
                />

                <span>
                  <b>{listing.produce}</b>{" "}
                  {listing.availableQuantity} kg @ {formatCurrency(listing.pricePerKg)}/kg
                </span>
                <div className="matching-quantity-control">
                  <button type="button" onClick={(event) => { event.preventDefault(); onToggle(listing.id); }}>{selected.includes(listing.id) ? "✓" : "Select"}</button>
                  <input type="number" min="1" max={listing.availableQuantity} value={selectedQuantities[listing.id] ?? ""} onChange={(event) => { const raw = event.target.value; const next = raw === "" ? 0 : Number(raw); if (next > 0 && !selected.includes(listing.id)) onToggle(listing.id); if (next === 0 && selected.includes(listing.id)) onToggle(listing.id); onSetQuantity(listing.id, Number.isFinite(next) ? next : 0); }} onBlur={() => { const current = selectedQuantities[listing.id] ?? 0; if (current > 0) onSetQuantity(listing.id, Math.max(1, Math.min(listing.availableQuantity, current))); }} />
                  <span>kg</span>
                </div>
              </label>
            ),
          )}
        </div>

        <button
          type="button"
          className="buyer-primary-button small"
          onClick={onSend}
        >
          <Send size={14} />
          Send Request
        </button>

        {offer && (
          <div className="farmer-negotiation-box">
            <div>
              <span>
                Negotiated price
              </span>

              <div className="negotiation-input">
                <span>
                  ₹
                </span>

                <input
                  type="number"
                  min="1"
                  value={
                    price
                  }
                  onChange={(
                    event,
                  ) =>
                    setPrice(
                      Number(
                        event
                          .target
                          .value,
                      ),
                    )
                  }
                />

                <span>
                  /kg
                </span>
              </div>
            </div>

            <StatusOffer
              status={
                offer.status
              }
            />

            <div className="negotiation-actions">
              {offer.status !== "Accepted" && offer.farmerConfirmed && !offer.buyerConfirmed && (
                <button type="button" onClick={() => onNegotiate(price)}>Negotiate</button>
              )}

              {!offer.buyerConfirmed && offer.status === "Negotiating" && offer.farmerConfirmed && (
                <button type="button" onClick={onDecline}>Decline</button>
              )}

              {false && (
                <button
                  type="button"
                  onClick={
                    onFarmerAccept
                  }
                >
                  Farmer Accept
                </button>
              )}

              {!offer.buyerConfirmed && offer.status === "Negotiating" && offer.farmerConfirmed && (
                <button
                  type="button"
                  className="buyer-primary-button small"
                  onClick={
                    onConfirm
                  }
                >
                  Confirm
                </button>
              )}
            </div>
            {!offer.farmerConfirmed && offer.status !== "Rejected" && offer.status !== "Accepted" && (
              <span className="farmer-response-waiting">Waiting for farmer response…</span>
            )}

            <AcceptanceStatus
              farmer={farmer}
              offer={offer}
            />
          </div>
        )}
      </div>
    </article>
  );
}

function StatusOffer({
  status,
}: {
  status: OfferStatus;
}) {
  return (
    <span
      className={`offer-status ${status
        .toLowerCase()
        .replace(
          /\s+/g,
          "-",
        )}`}
    >
      {status}
    </span>
  );
}

function AcceptanceStatus({
  farmer,
  offer,
}: {
  farmer: Farmer;
  offer?: FarmerOffer;
}) {
  return (
    <div className="acceptance-row">
      <span className="supplier-avatar">{renderAvatar(farmer.avatar, farmer.name)}</span>

      <div>
        <strong>
          {farmer.name}
        </strong>

        <small>
          Request:{" "}
          {offer
            ? "Sent"
            : "Not sent"}
        </small>
      </div>

      <div className="acceptance-steps">
        <span
          className={
            offer?.buyerConfirmed ||
            offer?.status ===
              "Accepted"
              ? "done"
              : ""
          }
        >
          <Check size={12} />
          Buyer confirmed
        </span>

        <span
          className={
            offer?.farmerConfirmed ||
            offer?.status ===
              "Accepted"
              ? "done"
              : ""
          }
        >
          <Check size={12} />
          Farmer accepted
        </span>

        <span
          className={
            offer?.status ===
            "Accepted"
              ? "done"
              : ""
          }
        >
          <Check size={12} />
          Contract confirmed
        </span>
      </div>
    </div>
  );
}

/* =========================================================
   ORDERS
========================================================= */

function Orders({
  orders,
  allOrders,
  filter,
  search,
  onFilter,
  onSearch,
  onSubmitReview,
  onPayOrder,
}: {
  orders: Order[];
  allOrders: Order[];
  filter: string;
  search: string;
  onSubmitReview: (order: Order, rating: number, comment: string) => Promise<boolean>;
  onPayOrder: (orderId:string) => Promise<void>;
  onFilter: (
    value: string,
  ) => void;
  onSearch: (
    value: string,
  ) => void;
}) {
  const filters = [
    "All",
    "Confirmed",
    "Processing",
    "In Transit",
    "Delivered",
  ];

  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id ?? null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState("");

  return (
    <div className="buyer-main orders-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            ORDERS
          </p>

          <h1>
            Orders & Live
            Delivery
          </h1>

          <p>
            All confirmed purchases and negotiated requests are part of your Marketplace order history.
          </p>
        </div>

        <div className="orders-export-actions">
          <button type="button" className="buyer-outline-button" onClick={() => exportOrdersPdf(allOrders, selectedOrder)}><Download size={16} /> Export Order PDF</button>
          <button type="button" className="buyer-primary-button" onClick={() => exportOrdersPdf(allOrders)}><Download size={16} /> Export All</button>
        </div>
      </div>

      <div className="order-toolbar">
        <div className="order-filters">
          {filters.map(
            (item) => (
              <button
                type="button"
                key={item}
                className={
                  filter === item
                    ? "active"
                    : ""
                }
                onClick={() =>
                  onFilter(
                    item,
                  )
                }
              >
                {item}
              </button>
            ),
          )}
        </div>

        <div className="order-search">
          <Search size={16} />

          <input
            value={search}
            onChange={(event) =>
              onSearch(
                event.target
                  .value,
              )
            }
            placeholder="Search order, seller or product"
          />
        </div>
      </div>

      <OrderGroup
        title="Marketplace Orders"
        orders={orders}
        selectedOrderId={selectedOrderId}
        onSelect={setSelectedOrderId}
      />

      <aside className="orders-live-panel buyer-card">
        {selectedOrder ? (
          <>
            <div className="live-map order-live-map"><MapIcon size={28} /><strong>{selectedOrder.id}</strong><span>Live Order Map</span><small>{selectedOrder.seller} → {selectedOrder.buyer}</small></div>
            <h3>Live Order Status</h3>
            <div className="selected-order-status"><StatusBadge status={selectedOrder.status} /><strong>{selectedOrder.product}</strong><span>{selectedOrder.quantity} kg · {formatCurrency(selectedOrder.cost)}</span></div>
            {selectedOrder.paymentStatus === "PENDING" && selectedOrder.status !== "Pending" && (
              <>
                <p className="payment-deadline-warning">Attention: payment is due within one hour or the order will be automatically cancelled.</p>
                <button type="button" className="buyer-primary-button small" onClick={() => void onPayOrder(selectedOrder.id)}>Pay Now</button>
              </>
            )}
            {selectedOrder.status !== "Pending" && (
              <button type="button" className="buyer-outline-button small order-review-trigger" onClick={() => { setReviewOrderId(selectedOrder.id); setReviewRating(0); setReviewComment(""); }}>Write Review</button>
            )}
            {reviewOrderId === selectedOrder.id && (
              <div className="order-review-form">
                <strong>Review {selectedOrder.seller}</strong>
                <div className="order-rating-picker">
  <div className="order-review-stars">
    {[1, 2, 3, 4, 5].map((star) => {
      const isSelected = star <= reviewRating;

      return (
        <button
          type="button"
          key={star}
          aria-label={`${star} star`}
          className={isSelected ? "active" : ""}
          onClick={() =>
            setReviewRating(reviewRating === star ? 0 : star)
          }
        >
          <Star
            size={26}
            strokeWidth={1.8}
            fill={isSelected ? "currentColor" : "none"}
          />
        </button>
      );
    })}
  </div>

  <span className="order-rating-value">
    {reviewRating > 0 ? `${reviewRating}/5` : "0/5"}
  </span>
</div>
                <textarea value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} placeholder="Write your experience with this farmer..." rows={4} />
                <div className="modal-actions">
                  <button type="button" className="buyer-outline-button small" onClick={() => setReviewOrderId(null)}>Cancel</button>
                  <button type="button" className="buyer-primary-button small" onClick={async () => { if (await onSubmitReview(selectedOrder, reviewRating, reviewComment)) { setReviewOrderId(null); setReviewRating(0); setReviewComment(""); } }}>Submit Review</button>
                </div>
              </div>
            )}
            <TimelineItem title="Order confirmed" time="Confirmed" done />
            <TimelineItem title="Processing" time="Preparing order" done={selectedOrder.status !== "Confirmed"} />
            <TimelineItem title="In transit" time="Live logistics update" done={selectedOrder.status === "In Transit" || selectedOrder.status === "Delivered"} />
            <TimelineItem title="Delivered" time={selectedOrder.deliveryDate} done={selectedOrder.status === "Delivered"} />
          </>
        ) : <InlineEmpty icon={<Truck />} text="No confirmed orders yet." />}
      </aside>
    </div>
  );
}

function OrderGroup({
  title,
  orders,
  selectedOrderId,
  onSelect,
}: {
  title: string;
  orders: Order[];
  selectedOrderId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <section className="buyer-card order-group">
      <SectionHeader
        title={title}
      />

      {orders.length ===
      0 ? (
        <InlineEmpty
          icon={
            <ShoppingCart />
          }
          text={`No ${title.toLowerCase()} yet.`}
        />
      ) : (
        <div className="orders-table-wrap">
          <table className="orders-table">
            <thead>
              <tr>
                <th>
                  Order ID
                </th>
                <th>
                  Date
                </th>
                <th>
                  Product
                </th>
                <th>
                  Seller
                </th>
                <th>
                  Quantity
                </th>
                <th>
                  Cost
                </th>
                <th>
                  Status
                </th>
                <th>
                  Delivery
                </th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => (
                  <tr key={order.id} className={selectedOrderId === order.id ? "selected" : ""} onClick={() => onSelect(order.id)}>
                    <td>
                      <strong>
                        {
                          order.id
                        }
                      </strong>
                    </td>

                    <td>
                      {new Date(
                        order.createdAt,
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month:
                            "short",
                        },
                      )}
                    </td>

                    <td>
                      {
                        order.product
                      }
                    </td>

                    <td>
                      {
                        order.seller
                      }
                    </td>

                    <td>
                      {
                        order.quantity
                      }{" "}
                      kg
                    </td>

                    <td>
                      {formatCurrency(
                        order.cost,
                      )}
                    </td>

                    <td>
                      <StatusBadge
                        status={
                          order.status
                        }
                      />
                    </td>

                    <td>
                      {
                        order.deliveryDate
                      }
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

/* =========================================================
   SHIPMENT
========================================================= */

function Shipment({
  orders,
}: {
  orders: Order[];
}) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(sortedOrders[0]?.id ?? null);
  const active = sortedOrders.find((order) => order.id === selectedOrderId) ?? sortedOrders[0];

  return (
    <div className="buyer-main shipment-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            SHIPMENT
          </p>

          <h1>
            Shipment Tracking
          </h1>

          <p>
            Track confirmed orders
            and connect this section
            to your logistics API for
            live coordinates and
            events.
          </p>
        </div>

        <button
          type="button"
          className="buyer-outline-button"
          onClick={() =>
            window.location.reload()
          }
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {sortedOrders.length > 0 && (
        <section className="shipment-order-strip buyer-card">
          <div className="section-heading"><div><h2>Recent Orders</h2><p>Newest first · select an order to track</p></div><span>{sortedOrders.length} orders</span></div>
          <div className="shipment-order-strip-list">
            {sortedOrders.map((order) => (
              <button type="button" key={order.id} className={selectedOrderId === order.id ? "active" : ""} onClick={() => setSelectedOrderId(order.id)}><strong>{order.id}</strong><span>{order.product} · {order.quantity} kg</span><StatusBadge status={order.status} /></button>
            ))}
          </div>
        </section>
      )}

      {!active ? (
        <section className="buyer-card empty-state-large">
          <Truck size={38} />

          <h2>
            No active shipment
          </h2>

          <p>
            Once a marketplace or
            procurement order is
            dispatched, live tracking
            will appear here.
          </p>
        </section>
      ) : (
        <section className="shipment-detail-grid">
          <article className="buyer-card shipment-card">
            <div className="shipment-heading">
              <div>
                <span className="small-label">
                  ACTIVE ORDER
                </span>

                <h2>
                  {active.id} —{" "}
                  {
                    active.product
                  }
                </h2>

                <p>
                  {
                    active.seller
                  }{" "}
                  →{" "}
                  {
                    active.buyer
                  }
                </p>
              </div>

              <StatusBadge
                status={
                  active.status
                }
              />
            </div>

            <div className="shipment-map-placeholder">
              <MapIcon size={42} />

              <strong>
                Live Order Map
              </strong>

              <span>
                {active.currentLocation ? `Logistics current location: ${active.currentLocation}` : "Waiting for logistics live location."}
                {active.distanceKm != null ? ` · ${active.distanceKm} km remaining` : ""}
                {active.etaMinutes != null ? ` · ETA ${active.etaMinutes} min` : ""}
              </span>

              <div className="route-line">
                <i />
                <i />
                <i />
              </div>
            </div>

            <div className="shipment-route-summary buyer-card">
              <strong>Pickup</strong><span>{active.pickupLocation ?? "Not available"}</span>
              <strong>Delivery</strong><span>{active.deliveryLocation ?? "Not available"}</span>
              {active.logisticsName && <><strong>Logistics</strong><span>{active.logisticsName}{active.logisticsRating != null ? ` · ${active.logisticsRating}/5` : ""}</span></>}
            </div>

            <div className="shipment-steps">
              <ShipmentStep
                title="Order Confirmed"
                done
              />

              <ShipmentStep
                title="Picked Up"
                done={
                  active.status !==
                  "Confirmed"
                }
              />

              <ShipmentStep
                title="In Transit"
                done={
                  active.status ===
                    "In Transit" ||
                  active.status ===
                    "Delivered"
                }
              />

              <ShipmentStep
                title="Delivered"
                done={
                  active.status ===
                  "Delivered"
                }
              />
            </div>
          </article>

          <aside className="buyer-card shipment-side">
            <h3>
              Live Updates
            </h3>

            <TimelineItem
              title="Order confirmed"
              time="System event"
              done
            />

            <TimelineItem
              title="Dispatch pending"
              time="Waiting for logistics update"
              done={
                active.status !==
                "Confirmed"
              }
            />

            <TimelineItem
              title="In transit"
              time="Live location will appear here"
              done={
                active.status ===
                  "In Transit" ||
                active.status ===
                  "Delivered"
              }
            />

            <TimelineItem
              title="Delivery complete"
              time={
                active.deliveryDate
              }
              done={
                active.status ===
                "Delivered"
              }
            />
          </aside>
        </section>
      )}
    </div>
  );
}

/* =========================================================
   ANALYTICS
========================================================= */

function Analytics({
  orders,
  requirements,
  barData,
  pieData,
  range,
  customStart,
  customEnd,
  onRange,
  onStart,
  onEnd,
  onExport,
}: {
  orders: Order[];
  requirements: Requirement[];
  barData: {
    name: string;
    quantity: number;
  }[];
  pieData: {
    name: string;
    value: number;
  }[];
  range: AnalyticsRange;
  customStart: string;
  customEnd: string;
  onRange: (
    range: AnalyticsRange,
  ) => void;
  onStart: (
    value: string,
  ) => void;
  onEnd: (
    value: string,
  ) => void;
  onExport: () => void;
}) {
  const totalQuantity =
    orders.reduce(
      (sum, order) =>
        sum + order.quantity,
      0,
    );

  const totalSpend =
    orders.reduce(
      (sum, order) =>
        sum + order.cost,
      0,
    );

  const requirementData = [
    "Matched",
    "Pending",
    "Not Found",
    "Confirmed",
    "Closed",
  ].map((name) => ({
    name,
    value: requirements.filter((item) =>
      name === "Pending"
        ? ["Draft", "Searching", "Pending"].includes(item.status)
        : item.status === name,
    ).length,
  }));

  return (
    <div className="buyer-main analytics-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            ANALYTICS
          </p>

          <h1>
            Purchase Analytics
          </h1>

          <p>
            Understand your order
            volume, product demand
            and order status.
          </p>
        </div>

        <button
          type="button"
          className="buyer-outline-button"
          onClick={onExport}
        >
          <Download size={16} />
          Export Report
        </button>
      </div>

      <div className="analytics-range-bar buyer-card">
        <div className="analytics-range-buttons">
          <button
            type="button"
            className={
              range === "week"
                ? "active"
                : ""
            }
            onClick={() =>
              onRange("week")
            }
          >
            This Week
          </button>

          <button
            type="button"
            className={
              range === "month"
                ? "active"
                : ""
            }
            onClick={() =>
              onRange("month")
            }
          >
            This Month
          </button>

          <button
            type="button"
            className={
              range === "custom"
                ? "active"
                : ""
            }
            onClick={() =>
              onRange("custom")
            }
          >
            Custom
          </button>
        </div>

        {range ===
          "custom" && (
          <div className="analytics-custom-range">
            <input
              type="date"
              value={
                customStart
              }
              onChange={(
                event,
              ) =>
                onStart(
                  event.target
                    .value,
                )
              }
            />

            <span>
              to
            </span>

            <input
              type="date"
              value={
                customEnd
              }
              onChange={(
                event,
              ) =>
                onEnd(
                  event.target
                    .value,
                )
              }
            />
          </div>
        )}
      </div>

      <div className="analytics-kpi-grid">
        <Kpi
          title="Total Orders"
          value={String(
            orders.length,
          )}
        />

        <Kpi
          title="Total Quantity"
          value={`${totalQuantity} kg`}
        />

        <Kpi
          title="Total Spend"
          value={formatCurrency(
            totalSpend,
          )}
        />

        <Kpi
          title="Products Ordered"
          value={String(
            barData.length,
          )}
        />
      </div>

      <div className="analytics-chart-grid">
        <article className="buyer-card analytics-chart-card">
          <SectionHeader
            title="Product Quantity"
          />

          {barData.length ===
          0 ? (
            <ChartEmpty text="Your product volume chart will appear after you place an order." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <BarChart
                  data={
                    barData
                  }
                  margin={{
                    top: 10,
                    right: 20,
                    left: 0,
                    bottom: 10,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="name"
                  />

                  <YAxis label={{ value: "Quantity (kg)", angle: -90, position: "insideLeft" }} />

                  <Tooltip />

                  <Bar dataKey="quantity" radius={[6, 6, 0, 0]}>
                    {barData.map((item, index) => (
                      <Cell key={`${item.name}-${index}`} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6", "#0f766e"][index % 6]} />
                    ))}
                  </Bar>

                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="buyer-card analytics-chart-card">
          <SectionHeader
            title="Order Distribution"
          />

          {pieData.length ===
          0 ? (
            <ChartEmpty text="Your order status distribution will appear after your first purchase." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  />
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>

        <article className="buyer-card analytics-chart-card">
          <SectionHeader
            title="Requirement Status"
          />

          {requirementData.length === 0 ? (
            <ChartEmpty text="Requirement status will appear after you create a procurement requirement." />
          ) : (
            <div className="chart-container">
              <ResponsiveContainer
                width="100%"
                height="100%"
              >
                <PieChart>
                  <Pie
                    data={requirementData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {requirementData.map((item, index) => (
                      <Cell
                        key={item.name}
                        fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6"][index % 5]}
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </article>
      </div>

      <article className="buyer-card analytics-table-card">
        <SectionHeader
          title="Order Breakdown"
        />

        {orders.length ===
        0 ? (
          <InlineEmpty
            icon={
              <LineChart />
            }
            text="No analytics data yet."
          />
        ) : (
          <table className="analytics-table">
            <thead>
              <tr>
                <th>
                  Product
                </th>
                <th>
                  Quantity
                </th>
                <th>
                  Orders
                </th>
                <th>
                  Spend
                </th>
              </tr>
            </thead>

            <tbody>
              {barData.map(
                (item) => {
                  const matching =
                    orders.filter(
                      (order) =>
                        order.product ===
                        item.name,
                    );

                  return (
                    <tr
                      key={
                        item.name
                      }
                    >
                      <td>
                        <strong>
                          {
                            item.name
                          }
                        </strong>
                      </td>

                      <td>
                        {
                          item.quantity
                        }{" "}
                        kg
                      </td>

                      <td>
                        {
                          matching.length
                        }
                      </td>

                      <td>
                        {formatCurrency(
                          matching.reduce(
                            (
                              sum,
                              order,
                            ) =>
                              sum +
                              order.cost,
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  );
                },
              )}
            </tbody>
          </table>
        )}
      </article>
    </div>
  );
}

function Kpi({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <article className="kpi-card">
      <small>
        {title}
      </small>

      <strong>
        {value}
      </strong>

      <span>
        Based on selected
        timeline
      </span>
    </article>
  );
}

/* =========================================================
   HELP
========================================================= */

function Help({
  onNavigate,
  support,
  setSupport,
  sendSupport,
  tickets,
}: {
  onNavigate: (view: View) => void;
  support: { subject: string; message: string };
  setSupport: React.Dispatch<React.SetStateAction<{ subject: string; message: string }>>;
  sendSupport: (event: React.FormEvent) => Promise<void>;
  tickets: SupportTicket[];
}) {
  return (
    <div className="buyer-main help-main">
      <div className="page-heading"><div><p className="eyebrow green">HELP & SUPPORT</p><h1>How can we help?</h1><p>Follow the process and contact KhetLink support when something needs attention.</p></div></div>
      <div className="help-grid buyer-help-process-grid">
        <section className="buyer-card help-card help-process-card"><h2>How Marketplace orders work</h2>{[
          "Browse farmer listings and choose the product, quantity and unit you need.",
          "Add products to a requirement or send a request directly to the selected farmer.",
          "Review negotiation updates and confirm the offer when the farmer has responded.",
          "Once both sides confirm, the backend creates the order and tracks payment.",
          "Shipment and delivery updates stay connected to the same order record."
        ].map((text, index) => <div className="buyer-help-step" key={text}><span>{index + 1}</span><p>{text}</p></div>)}</section>
        <section className="buyer-card help-card help-process-card"><h2>How Shipment works</h2>{[
          "Open Orders to see payment and shipment status for confirmed purchases.",
          "After Logistics is assigned, pickup and delivery information appears on the order.",
          "Follow the live shipment information and current provider location when available.",
          "Delivery completion is controlled by the Logistics workflow and verification rules.",
          "If anything looks incorrect, report the issue through Contact Support."
        ].map((text, index) => <div className="buyer-help-step" key={text}><span>{index + 1}</span><p>{text}</p></div>)}</section>
      </div>
      <section className="buyer-card buyer-support-card"><div className="buyer-section-heading"><div><span>Need assistance?</span><h2>Contact Support</h2></div><Phone size={20}/></div><p>Report a discrepancy, issue or message. Your support request is stored in the backend.</p><form onSubmit={sendSupport} className="buyer-support-form"><input value={support.subject} onChange={e => setSupport(current => ({ ...current, subject: e.target.value }))} placeholder="Subject"/><textarea value={support.message} onChange={e => setSupport(current => ({ ...current, message: e.target.value }))} placeholder="Describe the issue"/><button type="submit" className="buyer-primary-button"><Send size={16}/> Contact Support</button></form></section>
      <section className="buyer-card buyer-support-tickets"><div className="buyer-section-heading"><div><span>Backend records</span><h2>My support tickets</h2></div></div>{tickets.length ? tickets.map(ticket => <div className="buyer-support-ticket" key={ticket.id}><div><strong>{ticket.subject}</strong><small>{ticket.message}</small></div><span>{ticket.status || "OPEN"}</span><time>{new Date(ticket.createdAt).toLocaleString()}</time></div>) : <div className="profile-empty"><HelpCircle size={22}/><strong>No support tickets yet</strong><span>Your submitted requests will appear here.</span></div>}</section>
    </div>
  );
}

function HelpCard({
  icon,
  title,
  text,
  button,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  text: string;
  button: string;
  onClick: () => void;
}) {
  return (
    <article className="buyer-card help-card">
      <div className="help-card-icon">
        {icon}
      </div>

      <h2>
        {title}
      </h2>

      <p>
        {text}
      </p>

      <button
        type="button"
        onClick={onClick}
      >
        {button}
        <ArrowRight
          size={15}
        />
      </button>
    </article>
  );
}

/* =========================================================
   PROFILE
========================================================= */

function Profile({
  session,
  orders,
  onSessionChange,
  onNavigate,
  showToast,
  onSaveProfile,
}: {
  session: BuyerSession;
  orders: Order[];
  onSessionChange: (session: BuyerSession) => void;
  onNavigate: (view: View) => void;
  showToast: (message: string) => void;
  onSaveProfile?: (session: BuyerSession) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [image, setImage] = useState(session.profileImage ?? "");
  const [username, setUsername] = useState(session.username);
  const [phone, setPhone] = useState(session.phoneNumber);
  const [email, setEmail] = useState(session.email ?? "");
  const [company, setCompany] = useState(session.company ?? session.username);
  const [location, setLocation] = useState(session.location ?? "");
  const [latitude, setLatitude] = useState<number | null>(session.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(session.longitude ?? null);
  const [language, setLanguage] = useState(session.language ?? "English");
  const [locationQuery, setLocationQuery] = useState(session.location ?? "");
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{display_name:string;lat:string;lon:string}>>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (editing) return;
    setImage(session.profileImage ?? "");
    setUsername(session.username);
    setPhone(session.phoneNumber);
    setEmail(session.email ?? "");
    setCompany(session.company ?? session.username);
    setLocation(session.location ?? "");
    setLatitude(session.latitude ?? null);
    setLongitude(session.longitude ?? null);
    setLocationQuery(session.location ?? "");
    setLanguage(session.language ?? "English");
  }, [session, editing]);

  useEffect(() => {
    const q = locationQuery.trim();
    if (!editing || q.length < 3) { setLocationSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLocationSearching(true);
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        const data = await response.json();
        setLocationSuggestions(Array.isArray(data) ? data : []);
      } catch {} finally { setLocationSearching(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locationQuery, editing]);

  const selectLocation = (item: {display_name:string;lat:string;lon:string}) => {
    setLocation(item.display_name);
    setLocationQuery(item.display_name);
    setLatitude(Number(item.lat));
    setLongitude(Number(item.lon));
    setLocationSuggestions([]);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) { showToast("Live location is not supported by this browser."); return; }
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async position => {
      const nextLat = position.coords.latitude;
      const nextLng = position.coords.longitude;
      let readable = "";
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${nextLat}&lon=${nextLng}&zoom=18&addressdetails=1`, { headers: { Accept: "application/json" } });
        const data = await response.json();
        readable = data?.display_name || "";
      } catch {}
      setLatitude(nextLat); setLongitude(nextLng);
      if (readable) { setLocation(readable); setLocationQuery(readable); }
      setBusy(false);
    }, error => { showToast(error.message || "Location permission was not granted."); setBusy(false); }, { enableHighAccuracy: true, timeout: 12000 });
  };

  const handleImage = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { showToast("Please select an image file."); return; }
    const reader = new FileReader();
    reader.onload = () => setImage(String(reader.result));
    reader.readAsDataURL(file);
  };

  const cancelEdit = () => {
    setImage(session.profileImage ?? ""); setUsername(session.username); setPhone(session.phoneNumber);
    setEmail(session.email ?? ""); setCompany(session.company ?? session.username); setLocation(session.location ?? "");
    setLatitude(session.latitude ?? null); setLongitude(session.longitude ?? null); setLocationQuery(session.location ?? "");
    setLanguage(session.language ?? "English"); setLocationSuggestions([]); setEditing(false);
  };

  const saveProfile = async () => {
    const nextSession: BuyerSession = {
      ...session, username: username.trim() || session.username, phoneNumber: phone.trim(), email: email.trim() || undefined,
      company: company.trim() || undefined, location: location.trim() || undefined, latitude, longitude, language, profileImage: image || undefined,
    };
    if (!nextSession.location || latitude == null || longitude == null) { showToast("Please add your buyer location using search or current location before saving."); setEditing(true); return; }
    setBusy(true);
    try {
      onSessionChange(nextSession);
      if (onSaveProfile) await onSaveProfile(nextSession);
      else showToast("Profile updated successfully.");
      setEditing(false);
    } finally { setBusy(false); }
  };

  const mapSrc = latitude != null && longitude != null
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${longitude - 0.015}%2C${latitude - 0.01}%2C${longitude + 0.015}%2C${latitude + 0.01}&layer=mapnik&marker=${latitude}%2C${longitude}`
    : "";
  const totalOrders = orders.length;

  return (
    <div className="buyer-main profile-main">
      <div className="page-heading">
        <div><p className="eyebrow green">ACCOUNT</p><h1>Profile</h1><p>Manage your centralized identity and Buyer details.</p></div>
        {!editing && <button type="button" className="buyer-primary-button" onClick={() => setEditing(true)}><Pencil size={16}/> Edit profile</button>}
      </div>

      <section className="profile-cover buyer-card">
        <div className="profile-avatar-section">
          <div className="buyer-profile-avatar-large">{image ? <img src={image} alt={username}/> : getInitials(username)}</div>
          {editing && <label className="profile-upload-button"><Pencil size={15}/> Upload Photo<input type="file" accept="image/*" onChange={handleImage}/></label>}
        </div>
        <div className="profile-identity"><span className="verified-pill"><Check size={12}/> Verified Buyer</span><h2>{username}</h2><p>Buyer ID: <strong>{session.buyerId || "—"}</strong></p><small>{company || phone}</small></div>
        <div className="profile-mini-stat"><strong>{totalOrders}</strong><span>Total Orders</span></div>
      </section>

      <section className="profile-content-grid">
        <article className="buyer-card profile-form-card">
          <div className="buyer-section-heading"><div><span>Personal & buyer information</span><h2>Profile details</h2></div></div>
          <div className="profile-form-grid">
            {[["First name", username.split(" ")[0] || "Buyer"],["Phone Number", phone],["Email", email],["Company / Organization", company]].map(([label,value], index) => <Field label={label} key={label}><input type={label === "Email" ? "email" : "text"} value={value} disabled={!editing || index < 2} readOnly={!editing || index < 2} onChange={e => { if (label === "Email") setEmail(e.target.value); else if (label === "Company / Organization") setCompany(e.target.value); }} /></Field>)}
          </div>

          <div className="profile-location-section">
            <div className="buyer-section-heading"><div><span>Buyer location</span><h2>Location</h2></div></div>
            <div className="location-editor-grid">
              <div className="location-search-box">
                <div className="location-input-wrap"><Search size={15}/><input value={locationQuery} disabled={!editing} onChange={e => { setLocationQuery(e.target.value); setLocation(e.target.value); setLatitude(null); setLongitude(null); }} placeholder="Search your business or delivery location"/><button type="button" title="Use current location" disabled={!editing || busy} onClick={captureLocation}><MapPin size={16}/></button></div>
                {editing && (locationSearching || locationSuggestions.length > 0) && <div className="location-suggestions">{locationSearching && <div className="location-suggestion muted">Searching locations…</div>}{locationSuggestions.map(item => <button type="button" className="location-suggestion" key={`${item.lat}-${item.lon}`} onClick={() => selectLocation(item)}><MapPin size={14}/><span>{item.display_name}</span></button>)}</div>}
                <p className="location-current-text">Search for a location or use the current-location button. The selected coordinates are saved with your Buyer profile.</p>
              </div>
            </div>
          </div>

          <div className="profile-form-grid">
            <Field label="Language"><select value={language} disabled={!editing} onChange={e => setLanguage(e.target.value)}><option>English</option><option>Hindi</option><option>Marathi</option><option>Bengali</option></select></Field>
            <Field label="Saved Location"><div className="profile-read-value">{session.location || "Not provided"}</div></Field>
          </div>

          {editing && <div className="profile-form-actions"><button type="button" className="buyer-outline-button" onClick={cancelEdit} disabled={busy}>Cancel</button><button type="button" className="buyer-primary-button" onClick={() => void saveProfile()} disabled={busy}><Check size={16}/> {busy ? "Saving…" : "Save changes"}</button></div>}
        </article>

        <aside className="buyer-card profile-side-card">
          <div className="buyer-section-heading"><div><span>Account overview</span><h2>Buyer details</h2></div><UserCircle size={18}/></div>
          <div className="profile-info-list">
            <ProfileInfo icon={<UserCircle/>} label="Buyer ID" value={session.buyerId || "—"}/>
            <ProfileInfo icon={<Phone/>} label="Phone" value={session.phoneNumber || "Not added"}/>
            <ProfileInfo icon={<MapPin/>} label="Location" value={session.location || "Not added"}/>
            <ProfileInfo icon={<Settings/>} label="Account Type" value="Buyer"/>
          </div>
          <div className="catalog-map-wrap"><div className="catalog-map-heading"><span>Buyer location map</span><MapPin size={15}/></div><div className="location-map-card">{mapSrc ? <iframe title="Buyer location map" src={mapSrc}/> : <div className="map-empty"><MapPin size={28}/><span>Add and save a location to see the map.</span></div>}</div></div>
          <button type="button" className="buyer-outline-button profile-orders-button" onClick={() => onNavigate("Orders")}>View My Orders <ArrowRight size={15}/></button>
        </aside>
      </section>
    </div>
  );
}

function ProfileInfo({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="profile-info-row">
      <span>
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

/* =========================================================
   MODALS
========================================================= */

function Modal({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  useEffect(() => {
    const handleEscape = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key ===
        "Escape"
      ) {
        onClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleEscape,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleEscape,
      );
    };
  }, [onClose]);

  return (
    <div
      className="buyer-modal-overlay"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div className="buyer-modal">
        <div className="buyer-modal-header">
          <h2>
            {title}
          </h2>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
          >
            <X size={19} />
          </button>
        </div>

        <div className="buyer-modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

function FarmerModal({
  farmer,
  reviews,
  onClose,
  onNavigate,
}: {
  farmer: Farmer;
  reviews: FarmerReview[];
  onClose: () => void;
  onNavigate: (
    view: View,
  ) => void;
}) {
  const totalAvailable =
    farmer.listings.reduce(
      (sum, listing) =>
        sum +
        listing.availableQuantity,
      0,
    );

  const lowestPrice =
    Math.min(
      ...farmer.listings.map(
        (listing) =>
          listing.pricePerKg,
      ),
    );

  return (
    <Modal
      title="Farmer Profile"
      onClose={onClose}
    >
      <div className="farmer-modal-grid">
        <div className="farmer-modal-avatar">{renderAvatar(farmer.avatar, farmer.name)}</div>

        <div>
          <div className="modal-title-line">
            <h3>
              {farmer.name}
            </h3>

            {farmer.verified && (
              <span className="verified-pill">
                <Check
                  size={12}
                />
                Verified
              </span>
            )}
          </div>

          <p>
            {farmer.farm}
          </p>

          <div className="modal-rating">
            <Star size={15} fill="currentColor" />
            {reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "0.0"}{" "}•{" "}{reviews.length} reviews
          </div>

          <div className="modal-location">
            <MapPin
              size={15}
            />
            {
              farmer.location
            }
          </div>

          <p className="modal-about">
            {farmer.about}
          </p>
        </div>
      </div>

      <div className="modal-stats">
        <div>
          <small>
            Available
          </small>
          <strong>
            {
              totalAvailable
            }{" "}
            kg
          </strong>
        </div>

        <div>
          <small>
            Starting Rate
          </small>
          <strong>
            {formatCurrency(
              lowestPrice,
            )}
            /kg
          </strong>
        </div>

        <div>
          <small>
            Listings
          </small>
          <strong>
            {
              farmer.listings
                .length
            }
          </strong>
        </div>
      </div>

      <div className="modal-crops">
        {farmer.listings.map(
          (listing) => (
            <span
              key={
                listing.id
              }
            >
              {
                listing.produce
              }
              :{" "}
              {
                listing.availableQuantity
              }{" "}
              kg @{" "}
              {formatCurrency(
                listing.pricePerKg,
              )}
              /kg
            </span>
          ),
        )}
      </div>

      <section className="farmer-reviews-section">
        <div className="farmer-reviews-heading">
          <div>
            <p className="eyebrow">REVIEWS</p>
            <h4>Buyer Reviews</h4>
          </div>
          <span className="farmer-review-summary">
            <Star size={13} fill="currentColor" />
            {reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "0.0"} · {reviews.length} reviews
          </span>
        </div>

        {reviews.length > 0 ? (
          <div className="farmer-review-list">
            {reviews.map((review) => (
              <article className="farmer-review-card" key={review.id}>
                <div className="farmer-review-card-top"><strong>{review.buyerName}</strong><span>{new Date(review.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</span></div>
                <div className="farmer-review-stars">
                  {Array.from({ length: 5 }).map((_, index) => <Star key={index} size={14} fill={index < review.rating ? "currentColor" : "none"} />)}
                </div>
                <p>{review.comment}</p>
              </article>
            ))}
          </div>
        ) : (
          <div className="farmer-review-empty">
            <p>No reviews yet.</p>
          </div>
        )}
      </section>

      <div className="modal-actions">
        <button
          type="button"
          className="buyer-outline-button"
          onClick={onClose}
        >
          Close
        </button>

        <button
          type="button"
          className="buyer-primary-button"
          onClick={() => {
            onClose();
            onNavigate(
              "Marketplace",
            );
          }}
        >
          Create Requirement
          <ArrowRight
            size={15}
          />
        </button>
      </div>
    </Modal>
  );
}

function CartModal({
  cart,
  total,
  onClose,
  onIncrease,
  onDecrease,
  onRemove,
  onPurchase,
}: {
  cart: CartItem[];
  total: number;
  onClose: () => void;
  onIncrease: (
    id: string,
  ) => void;
  onDecrease: (
    id: string,
  ) => void;
  onRemove: (
    id: string,
  ) => void;
  onPurchase: () => void;
}) {
  return (
    <Modal
      title="Your Cart"
      onClose={onClose}
    >
      {cart.length ===
      0 ? (
        <div className="cart-empty">
          <ShoppingCart
            size={42}
          />

          <h3>
            Your cart is empty
          </h3>

          <p>
            Add products from
            Marketplace to
            continue.
          </p>
        </div>
      ) : (
        <>
          <div className="modal-cart-items">
            {cart.map(
              (item) => (
                <div
                  className="modal-cart-item"
                  key={
                    item.id
                  }
                >
                  <div className="modal-cart-image"><img src={item.image} alt={item.product} /></div>

                  <div className="modal-cart-copy">
                    <strong>
                      {
                        item.product
                      }
                    </strong>

                    <small>
                      {
                        item.farmerName
                      }
                    </small>

                    <span>
                      {formatCurrency(
                        item.pricePerKg,
                      )}
                      /kg
                    </span>
                  </div>

                  <div className="modal-cart-quantity">
                    <button
                      type="button"
                      onClick={() =>
                        onDecrease(
                          item.id,
                        )
                      }
                    >
                      <Minus
                        size={14}
                      />
                    </button>

                    <strong>
                      {
                        item.quantity
                      }
                    </strong>

                    <button
                      type="button"
                      onClick={() =>
                        onIncrease(
                          item.id,
                        )
                      }
                    >
                      <Plus
                        size={14}
                      />
                    </button>
                  </div>

                  <strong className="modal-cart-total">
                    {formatCurrency(
                      item.quantity *
                        item.pricePerKg,
                    )}
                  </strong>

                  <button
                    type="button"
                    className="remove-cart"
                    onClick={() =>
                      onRemove(
                        item.id,
                      )
                    }
                  >
                    <Trash2
                      size={16}
                    />
                  </button>
                </div>
              ),
            )}
          </div>

          <div className="cart-summary">
            <span>
              Total
            </span>

            <strong>
              {formatCurrency(
                total,
              )}
            </strong>
          </div>

          <div className="modal-actions">
            <button
              type="button"
              className="buyer-outline-button"
              onClick={onClose}
            >
              Continue Shopping
            </button>

            <button
              type="button"
              className="buyer-primary-button"
              onClick={
                onPurchase
              }
            >
              Buy Now
              <ArrowRight
                size={15}
              />
            </button>
          </div>
        </>
      )}
    </Modal>
  );
}

/* =========================================================
   SMALL SHARED COMPONENTS
========================================================= */

function DashboardMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: ReactNode;
}) {
  return (
    <article className="dashboard-metric buyer-card">
      <span>
        {icon}
      </span>

      <div>
        <p>
          {label}
        </p>

        <strong>
          {value}
        </strong>
      </div>
    </article>
  );
}

function SectionHeader({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-header">
      <h2>
        {title}
      </h2>

      {action &&
        onClick && (
          <button
            type="button"
            onClick={onClick}
          >
            {action}
            <ArrowRight
              size={14}
            />
          </button>
        )}
    </div>
  );
}

function SummaryMetric({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="summary-metric">
      <span>
        {icon}
      </span>

      <div>
        <small>
          {label}
        </small>

        <strong>
          {value}
        </strong>
      </div>
    </div>
  );
}

function StatusBadge({
  status,
}: {
  status: OrderStatus;
}) {
  return (
    <span
      className={`status-badge ${status
        .toLowerCase()
        .replace(
          /\s+/g,
          "-",
        )}`}
    >
      {status}
    </span>
  );
}

function InlineEmpty({
  icon,
  text,
}: {
  icon?: ReactNode;
  text: string;
}) {
  return (
    <div className="inline-empty">
      {icon && (
        <span>
          {icon}
        </span>
      )}

      <p>
        {text}
      </p>
    </div>
  );
}

function ChartEmpty({
  text,
}: {
  text: string;
}) {
  return (
    <div className="chart-empty">
      <LineChart
        size={36}
      />

      <p>
        {text}
      </p>
    </div>
  );
}

function ShipmentStep({
  title,
  done,
}: {
  title: string;
  done: boolean;
}) {
  return (
    <div
      className={`shipment-step ${
        done
          ? "done"
          : ""
      }`}
    >
      <span className="shipment-step-circle">
        {done ? (
          <Check
            size={16}
          />
        ) : (
          <Clock3
            size={16}
          />
        )}
      </span>

      <p>
        {title}
      </p>
    </div>
  );
}

function TimelineItem({
  title,
  time,
  done,
}: {
  title: string;
  time: string;
  done: boolean;
}) {
  return (
    <div
      className={`timeline-item ${
        done
          ? "done"
          : ""
      }`}
    >
      <span>
        {done ? (
          <Check
            size={13}
          />
        ) : (
          <Clock3
            size={13}
          />
        )}
      </span>

      <div>
        <strong>
          {title}
        </strong>

        <small>
          {time}
        </small>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="buyer-field">
      <span>
        {label}
      </span>

      {children}
    </label>
  );
}

/* =========================================================
   PRODUCT EMOJIS
========================================================= */

function getProductEmoji(
  product: string,
) {
  const normalized =
    product.toLowerCase();

  if (
    normalized.includes(
      "tomato",
    )
  ) {
    return "🍅";
  }

  if (
    normalized.includes(
      "potato",
    )
  ) {
    return "🥔";
  }

  if (
    normalized.includes(
      "onion",
    )
  ) {
    return "🧅";
  }

  if (
    normalized.includes(
      "carrot",
    )
  ) {
    return "🥕";
  }

  if (
    normalized.includes(
      "spinach",
    )
  ) {
    return "🥬";
  }
  if (
    normalized.includes(
      "cabbage",
    )
  ) {
    return "🥬";
  }
  return "🌱";
}
