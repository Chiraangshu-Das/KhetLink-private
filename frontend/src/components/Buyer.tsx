"use client";

import {
  useEffect,
  useMemo,
  useState,
  useRef,
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
import LanguageSelector from "./LanguageSelector";
import LocationButton from "./LocationButton";
import { apiGet, apiPost } from "../lib/api";
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
  produce: string;
  availableQuantity: number;
  productId?: string;
  pricePerKg: number;
  unit: "kg";
  category?: string;
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
  landAcres?: number;
  listings: FarmerListing[];
}

interface Product {
  id: string;
  listingId: string;
  productId?: string;
  farmerId: string;
  farmerName: string;
  name: string;
  category: string;
  quantityAvailable: number;
  pricePerKg: number;
  rating: number;
  reviews: number;
  distanceKm?: number;
  deliveryTime: string;
  image: string;
}

interface CartItem {
  id: string;
  productId: string;
  listingId: string;
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
  backendId?: string;
  code?: string;
  buyerId: string;
  createdAt: string;
  status: RequirementStatus;
  items: RequirementItem[];
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
  backendId?: string;
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
  paymentStatus?: "PENDING" | "PAID" | "FAILED";
  paymentDeadline?: string;
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

interface BuyerSession {
  username: string;
  phoneNumber: string;
  buyerId: string;
  profileImage?: string;
  email?: string;
  company?: string;
  location?: string;
  language?: string;
  latitude?: number;
  longitude?: number;
}

/* =========================================================
   BACKEND DATA
   ---------------------------------------------------------
   These module-level containers are populated from the authenticated
   API session. They are not demo records or client-side authority.
========================================================= */

let buyerSessionSeed: BuyerSession = { username: "Buyer", phoneNumber: "", buyerId: "", language: "English", latitude: 0, longitude: 0 };
let farmerCatalog: Farmer[] = [];

const PRODUCT_IMAGE_MAP: Record<string,string> = {
  honey:'/buyer_card.png', tomato:'/Carousel1.jpeg', potato:'/Carousel2.jpeg', onion:'/Carousel3.jpeg', rice:'/Carousel4.jpeg', wheat:'/Carousel5.jpeg', mango:'/Carousel6.jpeg', banana:'/Carousel7.jpeg', milk:'/Carousel8.jpeg', fish:'/Carousel9.jpeg'
};
const productImage=(name:string)=>PRODUCT_IMAGE_MAP[name.trim().toLowerCase()]||'/buyer_card.png';
const formatCurrency=(value:number)=>new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0}).format(Number.isFinite(value)?value:0);
const unitFactor=(unit:RequirementUnit|string)=>unit==="ton"?1000:1;
const toKg=(quantity:number,unit:RequirementUnit|string)=>Number(quantity||0)*unitFactor(unit);
const fromKg=(kg:number,unit:RequirementUnit|string)=>Number(kg||0)/unitFactor(unit);
const minimumQuantityForUnit=(unit:RequirementUnit|string)=>unit==="ton"?1:unit==="dozen"?1:1;
const pricePerSelectedUnit=(pricePerKg:number,unit:RequirementUnit|string)=>unit==="ton"?pricePerKg*1000:pricePerKg;
const formatQuantity=(quantity:number,unit:RequirementUnit|string)=>`${Math.round(quantity*100)/100} ${unit}`;
const renderAvatar=(src:string|undefined,name:string)=>src?<img src={src} alt={name}/>:getInitials(name);

const createId = (prefix: string) => `${prefix}-${globalThis.crypto?.randomUUID?.() ?? Date.now()}`;

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
const downloadOrderPdf = async (order: Order) => { try { const r=await fetch(`/api/orders/${encodeURIComponent(order.backendId||order.id)}/pdf`,{credentials:'include'}); if(!r.ok)throw new Error(); const blob=await r.blob(); const url=URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download=`khetlink-${order.id}.pdf`; a.click(); URL.revokeObjectURL(url); } catch { alert('Unable to export the order receipt.'); } };

const downloadPdf = (filename: string, title: string, lines: string[]) => {
  const esc = (value: string) => value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
  const content = ["BT", "/F1 16 Tf", "60 760 Td", `(${esc(title)}) Tj`, "/F1 10 Tf", "0 -28 Td", ...lines.flatMap((line) => [`(${esc(line.slice(0, 110))}) Tj`, "0 -16 Td"]), "ET"].join("\n");
  const objects = [
    `1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj`,
    `2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj`,
    `3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >> endobj`,
    `4 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj`,
    `5 0 obj << /Length ${new TextEncoder().encode(content).length} >> stream\n${content}\nendstream endobj`,
  ];
  let pdf = "%PDF-1.4\n"; const offsets=[0];
  for(const obj of objects){offsets.push(new TextEncoder().encode(pdf).length); pdf += obj + "\n";}
  const xref=new TextEncoder().encode(pdf).length; pdf += `xref\n0 ${objects.length+1}\n0000000000 65535 f \n`;
  for(let i=1;i<offsets.length;i++) pdf += `${String(offsets[i]).padStart(10,"0")} 00000 n \n`;
  pdf += `trailer << /Size ${objects.length+1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  const blob=new Blob([pdf],{type:"application/pdf"}); const url=URL.createObjectURL(blob); const a=document.createElement("a"); a.href=url; a.download=filename; a.click(); URL.revokeObjectURL(url);
};

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
  useEffect(() => { document.title = "KhetLink | Buyer Interface"; }, []);
  const [activeTab, setActiveTab] =
  useState<View>("Dashboard");

  const [session, setSession] =
    useState<BuyerSession>(buyerSessionSeed);

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
     INITIAL MOCK STATE
  ------------------------------------------------------- */

  useEffect(() => {
    (async()=>{
      try {
        const me = await (await fetch('/api/auth/me',{credentials:'include'})).json();
        const name = `${me.firstName ?? ''} ${me.lastName ?? ''}`.trim() || 'Buyer';
        buyerSessionSeed = { username:name, phoneNumber:me.phone||'', buyerId:me.buyer?.buyerId||me.roles?.find((r:any)=>r.role==='BUYER')?.roleId||'', profileImage:me.profileImage, email:me.email, company:me.buyer?.company, location:me.buyer?.locationText||me.locationText, language:me.language||'en', latitude:me.buyer?.latitude??me.latitude??0, longitude:me.buyer?.longitude??me.longitude??0 };
        setSession(buyerSessionSeed);
        setRequirementForm(prev=>({...prev,location:buyerSessionSeed.location||prev.location}));
        const [listingRows, reqRows, orderRows, noteRows] = await Promise.all([
          (await fetch('/api/listings',{credentials:'include'})).json(),
          (await fetch('/api/requirements',{credentials:'include'})).json(),
          (await fetch('/api/orders',{credentials:'include'})).json(),
          (await fetch('/api/notifications',{credentials:'include'})).json(),
        ]);
        const farmerMap = new Map<string,Farmer>();
        for(const x of (Array.isArray(listingRows)?listingRows:[])){ const fid=x.farmerId; const f=x.farmer||{}; const farmer=farmerMap.get(fid)||{id:fid,name:x.farmerName||`${f.firstName||''} ${f.lastName||''}`.trim(),phoneNumber:f.phone||'',location:f.farmer?.locationText||'Location unavailable',distanceKm:Number(x.distanceKm??0),rating:0,reviews:0,verified:true,avatar:'',farm:f.farmer?.farmName||'Farm',about:'',landAcres:f.farmer?.landAcres,listings:[]}; farmer.distanceKm=Number(x.distanceKm??farmer.distanceKm??0); farmer.listings.push({id:x.id,productId:x.productId,produce:x.product?.name||'Produce',availableQuantity:x.quantityAvailable,pricePerKg:x.price,unit:x.unit==='kg'?'kg':'kg',category:x.product?.category?.name||'Other'}); farmerMap.set(fid,farmer); }
        farmerCatalog = Array.from(farmerMap.values());
        setSession({...buyerSessionSeed});
        setRequirements((Array.isArray(reqRows)?reqRows:[]).map((r:any)=>({id:r.code||r.id,backendId:r.id,code:r.code,buyerId:r.buyerId,createdAt:r.createdAt,status:r.status==='NOT_FOUND'?'Not Found':r.status==='CONFIRMED'?'Confirmed':r.status==='CLOSED'?'Closed':'Pending',items:(r.items||[]).map((i:any)=>({id:i.id,produce:i.product?.name||'',quantity:i.quantity,unit:i.unit,minPrice:i.minPrice,maxPrice:i.maxPrice,requiredBy:i.requiredBy||'',location:r.locationText}))})));
        setOffers((Array.isArray(reqRows)?reqRows:[]).flatMap((r:any)=>(r.offers||[]).map((o:any)=>({id:o.id,requirementId:r.code||r.id,farmerId:o.farmerId,selectedListingIds:(o.lines||[]).map((l:any)=>l.listingId),selectedQuantities:Object.fromEntries((o.lines||[]).map((l:any)=>[l.listingId,l.quantity])),offeredPrice:Number(o.offeredPrice||0),originalPrice:Number(o.offeredPrice||0),buyerConfirmed:false,farmerConfirmed:o.status==='ACCEPTED',status:o.status==='COUNTERED'?'Negotiating':o.status==='ACCEPTED'?'Accepted':o.status==='REJECTED'?'Rejected':'Requested'}))));
        setOrders((Array.isArray(orderRows)?orderRows:[]).map((o:any)=>{const i=o.items?.[0];return {id:o.code||o.id,backendId:o.id,type:'Marketplace',product:i?.product?.name||'Order',quantity:i?.quantity||0,unit:i?.unit==='kg'?'kg':'kg',cost:o.totalAmount||0,seller:`${o.farmer?.firstName||''} ${o.farmer?.lastName||''}`.trim(),sellerId:o.farmerId,buyer:name,buyerId:o.buyerId,deliveryDate:o.paymentDeadline||o.createdAt,status:o.status==='PROCESSING'?'Processing':o.status==='IN_TRANSIT'?'In Transit':o.status==='DELIVERED'?'Delivered':o.status==='CANCELLED'?'Closed':'Confirmed',createdAt:o.createdAt,paymentStatus:o.paymentStatus,paymentDeadline:o.paymentDeadline};}));
        setNotifications((Array.isArray(noteRows)?noteRows:[]).map((n:any)=>({...n,type:'order'})));
      } catch {}
      const storedCart=window.localStorage.getItem('khetlink-buyer-cart'); if(storedCart) try{setCart(JSON.parse(storedCart));}catch{}
    })();
  }, []);

  useEffect(() => {
    const refresh=async()=>{try{const [reqRows,orderRows,noteRows]=await Promise.all([apiGet<any[]>('/requirements'),apiGet<any[]>('/orders'),apiGet<any[]>('/notifications')]);setRequirements((Array.isArray(reqRows)?reqRows:[]).map((r:any)=>({id:r.code||r.id,backendId:r.id,code:r.code,buyerId:r.buyerId,createdAt:r.createdAt,status:r.status==='NOT_FOUND'?'Not Found':r.status==='CONFIRMED'?'Confirmed':r.status==='CLOSED'?'Closed':r.status==='BROWSE_PRODUCTS'?'Searching':'Pending',items:(r.items||[]).map((i:any)=>({id:i.id,produce:i.product?.name||'',quantity:i.quantity,unit:i.unit,minPrice:i.minPrice,maxPrice:i.maxPrice,requiredBy:i.requiredBy||'',location:r.locationText}))})));setOffers((Array.isArray(reqRows)?reqRows:[]).flatMap((r:any)=>(r.offers||[]).map((o:any)=>({id:o.id,requirementId:r.code||r.id,farmerId:o.farmerId,selectedListingIds:[],selectedQuantities:{},offeredPrice:Number(o.offeredPrice||0),originalPrice:Number(o.offeredPrice||0),buyerConfirmed:false,farmerConfirmed:o.status==='ACCEPTED',status:o.status==='COUNTERED'?'Negotiating':o.status==='ACCEPTED'?'Accepted':o.status==='REJECTED'?'Rejected':'Requested'}))));setOrders((Array.isArray(orderRows)?orderRows:[]).map((o:any)=>{const i=o.items?.[0];return {id:o.code||o.id,backendId:o.id,type:'Marketplace',product:i?.product?.name||'Order',quantity:i?.quantity||0,unit:'kg',cost:o.totalAmount||0,seller:`${o.farmer?.firstName||''} ${o.farmer?.lastName||''}`.trim(),sellerId:o.farmerId,buyer:session.username,buyerId:o.buyerId,deliveryDate:o.paymentDeadline||o.createdAt,status:o.status==='PROCESSING'?'Processing':o.status==='IN_TRANSIT'?'In Transit':o.status==='DELIVERED'?'Delivered':o.status==='CANCELLED'?'Closed':'Confirmed',createdAt:o.createdAt,paymentStatus:o.paymentStatus,paymentDeadline:o.paymentDeadline};}));setNotifications((Array.isArray(noteRows)?noteRows:[]).map((n:any)=>({...n,type:'order'})));}catch{}};
    const timer=window.setInterval(refresh,10000); return ()=>window.clearInterval(timer);
  }, [session.username]);

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

  const products = useMemo<Product[]>(() => farmerCatalog.flatMap((farmer) => farmer.listings.map((listing) => ({ id:`P-${listing.id}`,listingId:listing.id,productId:(listing as any).productId,farmerId:farmer.id,farmerName:farmer.name,name:listing.produce,category:listing.category||"Other",quantityAvailable:listing.availableQuantity,pricePerKg:listing.pricePerKg,rating:farmer.rating,reviews:farmer.reviews,distanceKm:farmer.distanceKm,deliveryTime:"1–2 days",image:productImage(listing.produce) }))), [session]);

  const categories = useMemo(() => ["All","Vegetables","Fruits","Pulses","Grains","Spices","Flowers","Non-Edible","Herbs","Other","Livestock"], []);

  /* -------------------------------------------------------
     NOTIFICATIONS
  ------------------------------------------------------- */

  const unreadCount = notifications.filter(
    (notification) => !notification.read,
  ).length;

  const pushNotification = (
    input: Omit<
      Notification,
      "id" | "createdAt" | "read"
    >,
  ) => {
    setNotifications((current) => [
      {
        ...input,
        id: createId("NOT"),
        createdAt: new Date().toISOString(),
        read: false,
      },
      ...current,
    ]);
  };

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
          item.productId === product.productId && item.listingId === product.listingId,
      );

      if (existing) {
        return current.map((item) =>
          item.productId === product.productId && item.listingId === product.listingId
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
          productId: product.productId || product.id,
          listingId: product.listingId,
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
              productItem.productId === item.productId && productItem.listingId === item.listingId,
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
    if (cart.length === 0) { showToast("Your cart is empty."); return; }
    try {
      const fuel=Number((await apiGet<any>('/fuel-price')).price)||0;
      for(const item of cart){
        const product=products.find(p=>p.productId===item.productId&&p.listingId===item.listingId);
        if(!product) throw new Error(`Listing for ${item.product} is no longer available.`);
        await apiPost('/orders',{farmerId:item.farmerId,listingId:item.listingId,productId:item.productId,quantity:item.quantity,unit:'kg',price:item.pricePerKg,logisticsFee:Math.max(0,fuel*(product ? (farmerCatalog.find(f=>f.id===item.farmerId)?.distanceKm||0) : 0))});
      }
      const rows=await apiGet<any[]>('/orders');
      setOrders((Array.isArray(rows)?rows:[]).map((o:any)=>{const i=o.items?.[0];return {id:o.code||o.id,backendId:o.id,type:'Marketplace',product:i?.product?.name||'Order',quantity:i?.quantity||0,unit:'kg',cost:o.totalAmount||0,seller:`${o.farmer?.firstName||''} ${o.farmer?.lastName||''}`.trim(),sellerId:o.farmerId,buyer:session.username,buyerId:o.buyerId,deliveryDate:o.paymentDeadline||o.createdAt,status:o.status==='PROCESSING'?'Processing':o.status==='IN_TRANSIT'?'In Transit':o.status==='DELIVERED'?'Delivered':o.status==='CANCELLED'?'Closed':'Confirmed',createdAt:o.createdAt,paymentStatus:o.paymentStatus,paymentDeadline:o.paymentDeadline};}));
      setCart([]); showToast("Order created. Payment is pending until you complete checkout.");
    } catch(e) { showToast(e instanceof Error?e.message:"Unable to create order"); }
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

  const submitRequirement = async (requirementId: string) => {
    const requirement = requirements.find(item => item.id === requirementId);
    if (!requirement || requirement.items.length === 0) { showToast("Add at least one requirement."); return; }
    const item = requirement.items[0];
    const product = products.find(p => p.name.toLowerCase() === item.produce.toLowerCase());
    if (!product) { showToast("That product is not currently available in the marketplace."); return; }
    try {
      const r = await (await fetch('/api/requirements',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({productId:product.productId||product.listingId,quantity:item.quantity,unit:item.unit||'kg',minPrice:item.minPrice,maxPrice:item.maxPrice,requiredBy:item.requiredBy,locationText:item.location,latitude:session.latitude??0,longitude:session.longitude??0})})).json();
      if (!r.id && !r.code) throw new Error(r.error||'Unable to create requirement');
      const backendId=String(r.id); const shortCode=String(r.code||r.id);
      setRequirements(current=>current.map(x=>x.id===requirementId?{...x,id:shortCode,backendId,code:shortCode,status:'Pending'}:x));
      try { const m=await (await fetch(`/api/requirements/${encodeURIComponent(backendId)}/matches`,{credentials:'include'})).json(); setRequirements(current=>current.map(x=>x.id===shortCode?{...x,status:m?.found?'Matched':'Not Found'}:x)); } catch {}
      showToast("Requirement submitted. KhetLink is checking matching farmers.");
    } catch(e) { showToast(e instanceof Error?e.message:"Unable to submit requirement"); }
  };

  const getEligibleListings = (
    farmer: Farmer,
    requirement: Requirement,
  ) => {
    return farmer.listings.filter(
      (listing) =>
        requirement.items.some(
          (item) =>
            listing.produce.toLowerCase() ===
              item.produce.toLowerCase() &&
            listing.availableQuantity >=
              toKg(item.quantity, item.unit),
        ),
    );
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

  const sendProcurementRequest = (
    requirement: Requirement,
    farmer: Farmer,
  ) => {
    const eligible =
      getEligibleListings(
        farmer,
        requirement,
      );

    const selected =
      selectedListingIds[farmer.id] ??
      [];

    const finalListingIds =
      selected.length > 0
        ? selected.filter((id) =>
            eligible.some(
              (listing) =>
                listing.id === id,
            ),
          )
        : eligible.map(
            (listing) => listing.id,
          );

    if (finalListingIds.length === 0) {
      showToast(
        "Select at least one matching produce.",
      );
      return;
    }

    const selectedListings =
      farmer.listings.filter((listing) =>
        finalListingIds.includes(
          listing.id,
        ),
      );

    const averagePrice =
      selectedListings.reduce(
        (sum, listing) =>
          sum + listing.pricePerKg,
        0,
      ) /
      Math.max(
        selectedListings.length,
        1,
      );

    const existingOffer =
      offers.find(
        (offer) =>
          offer.requirementId ===
            requirement.id &&
          offer.farmerId === farmer.id,
      );

    const chosen = finalListingIds[0];
    const chosenListing = selectedListings[0];
    const chosenQuantity = Math.min(Number(selectedListingQuantities[farmer.id]?.[chosen] ?? chosenListing.availableQuantity), chosenListing.availableQuantity);
    (async()=>{
      try {
        const r=await (await fetch('/api/offers',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({requirementId:requirement.backendId,farmerId:farmer.id,listingId:chosen,quantity:chosenQuantity,offeredPrice:averagePrice})})).json();
        if(!r.id) throw new Error(r.error||'Unable to send request');
        const newOffer: FarmerOffer={id:r.id,requirementId:requirement.id,farmerId:farmer.id,selectedListingIds:finalListingIds,selectedQuantities:{[chosen]:chosenQuantity},offeredPrice:Number(r.offeredPrice||averagePrice),originalPrice:Math.round(averagePrice),buyerConfirmed:false,farmerConfirmed:false,status:'Requested'};
        setOffers(current=>existingOffer?current.map(o=>o.id===existingOffer.id?newOffer:o):[newOffer,...current]);
        pushNotification({title:'Procurement request sent',message:`Your request was sent to ${farmer.name}.`,type:'order'});
        showToast(`Request sent to ${farmer.name}. Waiting for farmer response…`);
      } catch(e) { showToast(e instanceof Error?e.message:'Unable to send request'); }
    })();
  };

  const clearMarketplaceOfferAfterDelay = (requirementId: string, farmerId: string) => {
    window.setTimeout(() => {
      setOffers((current) =>
        current.filter(
          (item) => !(
            item.productId &&
            item.requirementId === requirementId &&
            item.farmerId === farmerId
          ),
        ),
      );
    }, 4500);
  };

  const negotiateOffer = (requirementId: string, farmerId: string, price: number) => {
    const offer=offers.find(o=>o.requirementId===requirementId&&o.farmerId===farmerId); if(!offer){showToast('Send a request first.');return;}
    (async()=>{try{const r=await (await fetch(`/api/offers/${encodeURIComponent(offer.id)}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'COUNTERED',offeredPrice:price})})).json();if(!r.id)throw new Error(r.error||'Unable to negotiate');setOffers(c=>c.map(o=>o.id===offer.id?{...o,offeredPrice:price,status:'Negotiating'}:o));showToast('Counter price sent to the farmer.');}catch(e){showToast(e instanceof Error?e.message:'Unable to negotiate');}})();
  };

  const farmerAcceptOffer = (_requirementId: string, _farmerId: string) => { showToast('Farmer acceptance is recorded by the backend.'); };

  const finalizeProcurementOrder = (requirementId: string, farmerId: string) => {
    const offer=offers.find(o=>o.requirementId===requirementId&&o.farmerId===farmerId); if(!offer){showToast('Offer not found.');return;}
    (async()=>{try{const r=await (await fetch(`/api/offers/${encodeURIComponent(offer.id)}`,{method:'PATCH',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'ACCEPTED'})})).json();if(!r.id)throw new Error(r.error||'Unable to confirm offer');setOffers(c=>c.map(o=>o.id===offer.id?{...o,status:'Accepted',farmerConfirmed:true,buyerConfirmed:true}:o));showToast('Offer confirmed. Order created and payment is pending.');}catch(e){showToast(e instanceof Error?e.message:'Unable to confirm offer');}})();
  };

  const declineOffer = (requirementId: string, farmerId: string) => {
    const farmer = farmerCatalog.find((item) => item.id === farmerId);
    const offer=offers.find(item=>item.requirementId===requirementId&&item.farmerId===farmerId); if(offer) fetch(`/api/offers/${encodeURIComponent(offer.id)}`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"REJECTED"})}).catch(()=>{}); setOffers((current) => current.map((item) => item.requirementId === requirementId && item.farmerId === farmerId ? { ...item, status: "Rejected", buyerConfirmed: false, farmerConfirmed: false } : item));
    clearMarketplaceOfferAfterDelay(requirementId, farmerId);
    pushNotification({ title: "Negotiation declined", message: `You declined the offer from ${farmer?.name ?? "farmer"}.`, type: "order" });
    showToast("Offer declined.");
  };

  const closeRequirement = (requirementId: string) => {
  const requirement=requirements.find(r=>r.id===requirementId); if(requirement?.backendId) fetch(`/api/requirements/${encodeURIComponent(requirement.backendId)}`,{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({status:"CLOSED"})}).catch(()=>{});
  setRequirements((current) =>
    current.map((requirement) =>
      requirement.id === requirementId
        ? { ...requirement, status: "Closed" }
        : requirement,
    ),
  );

  window.setTimeout(() => {
    dismissRequirement(requirementId);
  }, 3000);

  showToast("Requirement closed.");
};

const dismissRequirement = (requirementId: string) => {
  setRequirements((current) =>
    current.filter(
      (requirement) => requirement.id !== requirementId,
    ),
  );
};

  const submitFarmerReview = (order: Order, rating: number, comment: string) => {
    const trimmed=comment.trim(); if(!rating||!trimmed){showToast("Please select a rating and write a review.");return false;}
    if(farmerReviews.some(r=>r.orderId===order.id)){showToast("You have already reviewed this order.");return false;}
    (async()=>{try{await (await fetch('/api/reviews',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({orderId:order.id,reviewedId:order.sellerId,rating,text:trimmed})})).json();}catch{}})();
    setFarmerReviews(current=>[{id:createId("REVIEW"),farmerId:order.sellerId,orderId:order.id,buyerName:session.username,rating,comment:trimmed,createdAt:new Date().toISOString()},...current]); showToast("Review submitted successfully."); return true;
  };

  const payOrder = async (order: Order, provider: string) => { try { const r=await fetch(`/api/orders/${encodeURIComponent(order.backendId||order.id)}/pay`,{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({provider})}); const d=await r.json(); if(!r.ok) throw new Error(d.error||'Payment failed'); setOrders(cur=>cur.map(o=>o.id===order.id?{...o,paymentStatus:'PAID'}:o)); showToast('Payment successful. Logistics providers are being notified.'); } catch(e){showToast(e instanceof Error?e.message:'Payment failed');} };

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

  const addMarketplaceProductToRequirement = (product: Product, quantity: number, unit: RequirementUnit) => {
    const safeQuantity=Math.max(minimumQuantityForUnit(unit),Math.min(fromKg(product.quantityAvailable,unit),Math.round(quantity)));
    setRequirementForm({id:'',produce:product.name,quantity:safeQuantity,unit,minPrice:Math.max(0,Math.round(product.pricePerKg*0.9)),maxPrice:Math.round(product.pricePerKg*1.1),requiredBy:futureDate(7),location:session.location||''});
    setActiveTab('Marketplace');
    showToast(`${product.name} added to your procurement requirement.`);
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
        onMarkNotifications={() => {
          setNotifications((current) =>
            current.map((notification) => ({
              ...notification,
              read: true,
            })),
          );
          setNotificationOpen(false);
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
                farmerCatalog
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
                const farmer = farmerCatalog.find((item) => item.id === product.farmerId);
                if (farmer) setSelectedFarmer(farmer);
              }}
              procurement={{
                form: requirementForm,
                draft: draftRequirement,
                requirements,
                farmers: farmerCatalog,
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
              onPay={payOrder}
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
            <Help onNavigate={navigate} onSupport={async(subject,message)=>{try{await fetch('/api/support',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({subject,message})});showToast('Support ticket submitted.');}catch{showToast('Unable to submit support ticket.');}}} />
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
  onMarkNotifications: () => void;
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
            <img src="./KhetLink_Logo.svg" alt="KhetLink Logo" width={38} height={38}/>
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

          <div style={{marginRight:12,display:'flex',alignItems:'center'}}><LanguageSelector compact /></div>

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
}) {
  const [sortBy, setSortBy] = useState<string[]>([]);
  const displayProducts = useMemo(() => {
    const list=[...products]; const deliveryDays=(v:string)=>Number(v.match(/\d+/)?.[0]??99);
    const defaults=['price','rating','quantity','delivery','location','land'];
    const priority=[...sortBy,...defaults.filter(x=>!sortBy.includes(x))];
    list.sort((a,b)=>{for(const key of priority){let d=0;if(key==='price')d=a.pricePerKg-b.pricePerKg;else if(key==='rating')d=(b.rating-a.rating)||(b.reviews-a.reviews);else if(key==='quantity')d=b.quantityAvailable-a.quantityAvailable;else if(key==='delivery')d=deliveryDays(a.deliveryTime)-deliveryDays(b.deliveryTime);else if(key==='location')d=(a.distanceKm??999999)-(b.distanceKm??999999);if(d!==0)return d;}return a.name.localeCompare(b.name);}); return list;
  }, [products, sortBy]);
  const toggleSort=(key:string)=>setSortBy(cur=>cur.includes(key)?cur.filter(x=>x!==key):[...cur,key]);

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

      <section className="marketplace-procurement-section">
        <div className="marketplace-section-divider">
          <p className="eyebrow green">1. STATE YOUR REQUIREMENTS</p>
          <h2>Need produce at scale?</h2>
          <p>Create a requirement, choose quantity and unit, match farmers, then request, negotiate, confirm or decline from the same Marketplace.</p>
        </div>
        <Procurement {...procurement} />
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
        <button type="button" className={sortBy.includes("delivery") ? "active" : ""} onClick={() => toggleSort("delivery")}>Delivery Time</button>
        <button type="button" className={sortBy.includes("produce") ? "active" : ""} onClick={() => toggleSort("produce")}>Produce</button>
        <button type="button" className={sortBy.includes("rating") ? "active" : ""} onClick={() => toggleSort("rating")}>Ratings</button>
        <button type="button" className={sortBy.includes("price") ? "active" : ""} onClick={() => toggleSort("price")}>Price</button>
        <button type="button" className={sortBy.includes("quantity") ? "active" : ""} onClick={() => toggleSort("quantity")}>Quantity Available</button>
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
                onView={() =>
                  onProduct(
                    product,
                  )
                }
                offer={procurement.offers.find((item) => item.productId === product.id && item.farmerId === product.farmerId)}
                onAddToRequest={(quantity, unit) => onAddToRequest(product, quantity, unit)}
                onNegotiate={(price) => procurement.onNegotiate(`MARKETPLACE-${product.id}`, product.farmerId, price)}
                onConfirm={() => procurement.onConfirm(`MARKETPLACE-${product.id}`, product.farmerId)}
                onDecline={() => procurement.onDeclineOffer(`MARKETPLACE-${product.id}`, product.farmerId)}
              />
            ),
          )}
        </div>
      )}
      </section>
    </div>
  );
}

function ProductCard({
  product,
  onView,
  onAddToRequest,
  offer,
  onNegotiate,
  onConfirm,
  onDecline,
}: {
  product: Product;
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
              {visibleOffer.status !== "Rejected" && (
                <button type="button" onClick={() => onNegotiate(price)}>
                  {visibleOffer.farmerConfirmed ? "Send New Price" : "Negotiate"}
                </button>
              )}
              {visibleOffer.status === "Negotiating" && visibleOffer.farmerConfirmed && !visibleOffer.buyerConfirmed && (
                <button type="button" className="buyer-primary-button small" onClick={onConfirm}>Accept Price</button>
              )}
              {visibleOffer.status === "Negotiating" && !visibleOffer.buyerConfirmed && (
                <button type="button" className="product-decline-btn" onClick={onDecline}>Decline</button>
              )}
              {visibleOffer.status === "Requested" && (
                <span className="farmer-response-waiting">Waiting for farmer response…</span>
              )}
            </div>
            <AcceptanceStatus farmer={farmerCatalog.find((item) => item.id === product.farmerId)!} offer={visibleOffer} />
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
  const [produceOpen,setProduceOpen]=useState(false);
  const produceOptions=[...new Set(farmers.flatMap(f=>f.listings.map(l=>l.produce)))].sort();

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
            <div style={{position:'relative'}}><input value={form.produce} onFocus={()=>setProduceOpen(true)} onChange={(event)=>{onFormChange({...form,produce:event.target.value});setProduceOpen(true)}} onBlur={()=>setTimeout(()=>setProduceOpen(false),150)} placeholder="Type or select produce"/>
            {produceOpen&&<div style={{position:'absolute',zIndex:50,left:0,right:0,top:'calc(100% + 4px)',background:'#fff',border:'1px solid #d7e0d4',borderRadius:10,boxShadow:'0 12px 24px rgba(0,0,0,.12)',maxHeight:220,overflow:'auto'}}>{produceOptions.filter(p=>p.toLowerCase().includes(form.produce.toLowerCase())).map(p=><button type="button" key={p} onMouseDown={()=>{onFormChange({...form,produce:p});setProduceOpen(false)}} style={{display:'flex',alignItems:'center',gap:8,width:'100%',border:0,background:'#fff',padding:'9px 11px',textAlign:'left',cursor:'pointer'}}><img src={productImage(p)} alt="" style={{width:28,height:28,objectFit:'cover',borderRadius:6}}/><span>{p}</span></button>)}</div>}</div>
          </Field>

          <Field label="Quantity">
            <div className="buyer-quantity-control">
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), form.quantity - 1) })}><Minus size={14} /></button>
              <input type="number" min={minimumQuantityForUnit(form.unit ?? "kg")} value={form.quantity === 0 ? "" : form.quantity} onChange={(event) => { const raw = event.target.value; onFormChange({ ...form, quantity: raw === "" ? 0 : Number(raw) }); }} onBlur={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), Number(form.quantity) || minimumQuantityForUnit(form.unit ?? "kg")) })} />
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.min(fromKg(999999, form.unit ?? "kg"), form.quantity + 1) })}><Plus size={14} /></button>
              <select value={form.unit ?? "kg"} onChange={(event) => { const nextUnit = event.target.value as RequirementUnit; const kg = toKg(form.quantity, form.unit ?? "kg"); onFormChange({ ...form, unit: nextUnit, quantity: Math.max(minimumQuantityForUnit(nextUnit), Math.round(fromKg(kg, nextUnit))) }); }}><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select>
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
                 <div className="requirement-product-icon"><img src={productImage(item.produce)} alt={item.produce}/></div>
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
    .filter((farmer) =>
      farmer.listings.some((listing) =>
        requirement.items.some(
          (item) =>
            listing.produce.toLowerCase() ===
              item.produce.toLowerCase() &&
            listing.availableQuantity >=
              toKg(item.quantity, item.unit),
        ),
      ),
    )
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
  const [fuelPrice,setFuelPrice]=useState(0);
  useEffect(()=>{apiGet<any>('/fuel-price').then(d=>setFuelPrice(Number(d.price)||0)).catch(()=>{});},[]);
  const eligible =
    farmer.listings.filter(
      (listing) =>
        requirement.items.some(
          (item) =>
            item.produce.toLowerCase() ===
              listing.produce.toLowerCase() &&
            listing.availableQuantity >=
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
        <small><MapPin size={12}/> Base logistics fee: {fuelPrice>0?formatCurrency(fuelPrice*farmer.distanceKm):'—'} · {farmer.landAcres?`${farmer.landAcres} acres`:''}</small>

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
                  <input type="number" min="100" max={listing.availableQuantity} value={selectedQuantities[listing.id] ?? ""} onChange={(event) => { const raw = event.target.value; const next = raw === "" ? 0 : Number(raw); if (next > 0 && !selected.includes(listing.id)) onToggle(listing.id); if (next === 0 && selected.includes(listing.id)) onToggle(listing.id); onSetQuantity(listing.id, Number.isFinite(next) ? next : 0); }} onBlur={() => { const current = selectedQuantities[listing.id] ?? 0; if (current > 0) onSetQuantity(listing.id, Math.max(100, Math.min(listing.availableQuantity, current))); }} />
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
              {offer.status !==
                "Accepted" && (
                <button
                  type="button"
                  onClick={() =>
                    onNegotiate(
                      price,
                    )
                  }
                >
                  Negotiate
                </button>
              )}

              {!offer.buyerConfirmed && offer.status === "Negotiating" && (
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
  onPay,
}: {
  orders: Order[];
  allOrders: Order[];
  filter: string;
  search: string;
  onSubmitReview: (order: Order, rating: number, comment: string) => boolean;
  onPay: (order: Order, provider: string) => void;
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
  const [paymentOrderId, setPaymentOrderId] = useState<string | null>(null);

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
          <button type="button" className="buyer-outline-button" onClick={() => selectedOrder && downloadOrderPdf(selectedOrder)}><Download size={16} /> Export Order PDF</button>
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
            <div style={{marginTop:10,padding:10,borderRadius:10,background:'#f7faf5',display:'flex',alignItems:'center',justifyContent:'space-between',gap:10}}><span><strong>Payment:</strong> {selectedOrder.paymentStatus==='PAID'?'Paid':'Pending'}</span>{selectedOrder.paymentStatus!=='PAID'&&<button type="button" className="buyer-primary-button small" onClick={()=>setPaymentOrderId(selectedOrder.id)}>Pay</button>}</div>
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
                  <button type="button" className="buyer-primary-button small" onClick={() => { if (onSubmitReview(selectedOrder, reviewRating, reviewComment)) { setReviewOrderId(null); setReviewRating(0); setReviewComment(""); } }}>Submit Review</button>
                </div>
              </div>
            )}
            {paymentOrderId === selectedOrder.id && (
              <div className="buyer-modal-backdrop" role="dialog" aria-modal="true">
                <div className="buyer-modal-card">
                  <button type="button" className="buyer-modal-close" onClick={()=>setPaymentOrderId(null)} aria-label="Close"><X size={18}/></button>
                  <p className="eyebrow green">DEMO PAYMENT</p>
                  <h3>Choose payment method</h3>
                  <p>This is a demonstration checkout. No real payment is processed.</p>
                  <div className="payment-choice-grid">
                    {[['Razorpay','Card / Netbanking / UPI'],['UPI','UPI app'],['QR','Scan QR code']].map(([provider,desc])=><button key={provider} type="button" className="payment-choice" onClick={()=>{setPaymentOrderId(null);onPay(selectedOrder,provider);}}><strong>{provider}</strong><span>{desc}</span></button>)}
                  </div>
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
                Connect Google Maps
                or Mapbox coordinates
                from the logistics
                backend here.
              </span>

              <div className="route-line">
                <i />
                <i />
                <i />
              </div>
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

function Help({onNavigate,onSupport}:{onNavigate:(view:View)=>void;onSupport:(subject:string,message:string)=>void}) {
  return (
    <div className="buyer-main help-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            KHETLINK SUPPORT
          </p>

          <h1>
            How can we help?
          </h1>

          <p>
            Use Marketplace to browse produce, state requirements, negotiate with farmers and manage purchases in one place.
          </p>
        </div>
      </div>

      <div className="help-grid">
        <HelpCard
          icon={<Store />}
          title="Marketplace"
          text="Choose a farmer listing, set quantity, add it to your cart and purchase."
          button="Open Marketplace"
          onClick={() =>
            onNavigate(
              "Marketplace",
            )
          }
        />

        <HelpCard
          icon={<Truck />}
          title="Orders & Shipment"
          text="Confirmed Marketplace orders are connected to delivery tracking."
          button="View Orders"
          onClick={() =>
            onNavigate(
              "Orders",
            )
          }
        />
      </div>

      <section className="buyer-card support-contact-card">
        <div>
          <div className="support-contact-icon">
            <Phone
              size={22}
            />
          </div>

          <div>
            <h2>
              KhetLink Support
            </h2>

            <p>
              Need help with an
              order, farmer or
              procurement request?
            </p>
          </div>
        </div>

        <button type="button" className="buyer-outline-button" onClick={()=>{const subject=window.prompt('Support subject','Order discrepancy')||'';const message=window.prompt('Describe the discrepancy')||'';if(subject&&message)onSupport(subject,message);}}>Contact Support</button>
      </section>
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
}: {
  session: BuyerSession;
  orders: Order[];
  onSessionChange: (
    session: BuyerSession,
  ) => void;
  onNavigate: (
    view: View,
  ) => void;
  showToast: (
    message: string,
  ) => void;
}) {
  const [image, setImage] =
    useState(
      session.profileImage ??
        "",
    );

  const [username, setUsername] =
    useState(
      session.username,
    );

  const [phone, setPhone] =
    useState(
      session.phoneNumber,
    );

  const [email, setEmail] =
    useState(
      session.email ?? "",
    );

  const [company, setCompany] =
    useState(
      session.company ??
        session.username,
    );

  const [location, setLocation] =
    useState(
      session.location ??
        "",
    );

  const [language, setLanguage] =
    useState(
      session.language ??
        "English",
    );

  useEffect(() => {
    setImage(
      session.profileImage ??
        "",
    );

    setUsername(
      session.username,
    );

    setPhone(
      session.phoneNumber,
    );

    setEmail(
      session.email ??
        "",
    );

    setCompany(
      session.company ??
        session.username,
    );

    setLocation(
      session.location ??
        "",
    );

    setLanguage(
      session.language ??
        "English",
    );
  }, [session]);

  const handleImage = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    if (
      !file.type.startsWith(
        "image/",
      )
    ) {
      showToast(
        "Please select an image file.",
      );
      return;
    }

    const reader =
      new FileReader();

    reader.onload = () => {
      setImage(
        String(
          reader.result,
        ),
      );
    };

    reader.readAsDataURL(
      file,
    );
  };

  const saveProfile = async () => {
    const nextSession: BuyerSession = {...session,username:username.trim()||session.username,phoneNumber:phone.trim(),email:email.trim()||undefined,company:company.trim()||undefined,location:location.trim()||undefined,language,profileImage:image||undefined};
    try {
      const res = await fetch('/api/profile',{method:'POST',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({role:'BUYER',company:nextSession.company,buyerType:'Buyer',locationText:nextSession.location||'',latitude:session.latitude??0,longitude:session.longitude??0,profileImage:nextSession.profileImage,language})});
      const data=await res.json(); if(!res.ok) throw new Error(data.error||'Unable to save profile');
      onSessionChange(nextSession); showToast('Profile updated successfully.');
      window.dispatchEvent(new CustomEvent('khetlink-profile-change'));
    } catch(e) { showToast(e instanceof Error?e.message:'Unable to save profile.'); }
  };

  const totalOrders =
    orders.length;

  return (
    <div className="buyer-main profile-main">
      <div className="page-heading">
        <div>
          <p className="eyebrow green">
            ACCOUNT
          </p>

          <h1>
            Profile
          </h1>

          <p>
            Manage your buyer
            identity and account
            information.
          </p>
        </div>
      </div>

      <section className="profile-cover buyer-card">
        <div className="profile-avatar-section">
          <div className="buyer-profile-avatar-large">
            {image ? (
              <img
                src={image}
                alt={
                  username
                }
              />
            ) : (
              getInitials(
                username,
              )
            )}
          </div>

          <label className="profile-upload-button">
            <Upload
              size={15}
            />
            Upload Photo

            <input
              type="file"
              accept="image/*"
              onChange={
                handleImage
              }
            />
          </label>
        </div>

        <div className="profile-identity">
          <span className="verified-pill">
            <Check
              size={12}
            />
            Verified Buyer
          </span>

          <h2>
            {username}
          </h2>

          <p>
            Buyer ID:{" "}
            <strong>
              {
                session.buyerId
              }
            </strong>
          </p>

          <small>
            {phone}
          </small>
        </div>

        <div className="profile-mini-stat">
          <strong>
            {totalOrders}
          </strong>
          <span>
            Total Orders
          </span>
        </div>
      </section>

      <section className="profile-content-grid">
        <article className="buyer-card profile-form-card">
          <div className="section-heading">
            <div>
              <h2>
                Personal Information
              </h2>
              <p>
                Update the information
                associated with your
                buyer account.
              </p>
            </div>
          </div>

          <div className="profile-form-grid">
            <Field
              label="Username"
            >
              <input value={username} readOnly disabled onChange={(
                  event,
                ) =>
                  setUsername(
                    event
                      .target
                      .value,
                  )
                }
              />
            </Field>

            <Field
              label="Phone Number"
            >
              <input value={phone} readOnly disabled onChange={(
                  event,
                ) =>
                  setPhone(
                    event
                      .target
                      .value,
                  )
                }
              />
            </Field>

            <Field
              label="Email"
            >
              <input type="email" value={email} readOnly disabled onChange={(
                  event,
                ) =>
                  setEmail(
                    event
                      .target
                      .value,
                  )
                }
                placeholder="buyer@example.com"
              />
            </Field>

            <Field
              label="Company / Organization"
            >
              <input
                value={
                  company
                }
                onChange={(
                  event,
                ) =>
                  setCompany(
                    event
                      .target
                      .value,
                  )
                }
              />
            </Field>

            <Field
              label="Location"
            >
              <div style={{display:'flex',gap:8,alignItems:'center'}}><input value={location} onChange={(event)=>setLocation(event.target.value)} placeholder="City, State, location details"/><LocationButton onLocation={(x)=>{setLocation(x.text);onSessionChange({...session,location:x.text,latitude:x.latitude,longitude:x.longitude});}}/></div>
            </Field>

            <Field label="Language"><LanguageSelector compact /></Field>
          </div>

          <button
            type="button"
            className="buyer-primary-button"
            onClick={
              saveProfile
            }
          >
            <Check size={16} />
            Save Changes
          </button>
        </article>

        <aside className="buyer-card profile-side-card">
          <h3>
            Account Details
          </h3>

          <ProfileInfo
            icon={
              <UserCircle />
            }
            label="Buyer ID"
            value={
              session.buyerId
            }
          />

          <ProfileInfo
            icon={
              <Phone />
            }
            label="Phone"
            value={
              session.phoneNumber
            }
          />

          <ProfileInfo
            icon={
              <MapPin />
            }
            label="Location"
            value={
              session.location ||
              "Not added"
            }
          />

          <ProfileInfo
            icon={
              <Settings />
            }
            label="Account Type"
            value="Buyer"
          />

          <button
            type="button"
            className="buyer-outline-button profile-orders-button"
            onClick={() =>
              onNavigate(
                "Orders",
              )
            }
          >
            View My Orders
            <ArrowRight
              size={15}
            />
          </button>
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
