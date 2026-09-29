/// <reference types="google.maps" />
"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { jsPDF } from "jspdf";

import {
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  Clock3,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CloudSun,
  Droplets,
  Download,
  Wind,
  ThermometerSun,
  Home,
  Languages,
  Leaf,
  Loader2,
  MapPin,
  MapIcon,
  Menu,
  Package,
  Pause,
  Phone,
  Pencil,
  Plus,
  Play,
  RefreshCw,
  Search,
  Send,
  Star,
  Truck,
  Trash2,
  User,
  X,
  XCircle,
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart as RechartsLineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "./farmer.css";

type View = "Dashboard" | "Listings" | "Orders" | "Shipment" | "Analytics" | "Help" | "Profile";
type Unit = string;

type ApiListing = {
  id: string;
  farmerId?: string;
  productId: string;
  product?: {
    id?: string; name?: string; image?: string;
    imageUrl?: string; category?: { name?: string }
  };
  quantity?: number;
  unit?: string;
  price?: number;
  status?: string;
};

type ApiOrder = {
  id: string;
  status?: string;
  paymentStatus?: string;
  paymentExpiresAt?: string;
  total?: number;
  createdAt?: string;
  buyerId?: string;
  sellerId?: string;
  buyer?: { firstName?: string; lastName?: string; location?: string; roleCode?: string; id?: string; roles?: Array<{ role?: string; roleCode?: string }> };
  seller?: { firstName?: string; lastName?: string; location?: string; roleCode?: string; id?: string; roles?: Array<{ role?: string; roleCode?: string }> };
  buyerRoleCode?: string;
  sellerRoleCode?: string;
  logisticsRoleCode?: string;
  logisticsVerificationCode?: string;
  logisticsProvider?: { id?: string; roleCode?: string; name?: string; phone?: string | null; vehicleType?: string | null; vehicleNumber?: string | null; rating?: number; reviews?: number } | null;
  logistics?: { id?: string; roleCode?: string; user?: { roleCode?: string; roles?: Array<{ role?: string; roleCode?: string; code?: string }> } } | null;
  deliveryDate?: string;
  items?: Array<{ quantity?: number; unit?: string; unitPrice?: number; product?: { name?: string } }>;
  shipment?: { status?: string; pickupLocation?: string; deliveryLocation?: string; distanceKm?: number; currentLat?: number | null; currentLng?: number | null; pickupLat?: number | null; pickupLng?: number | null; deliveryLat?: number | null; deliveryLng?: number | null; currentLocation?: string; etaMinutes?: number | null } | null;
  assignments?: Array<{ status?: string; logistics?: { id?: string; roleCode?: string; rating?: number; user?: { firstName?: string; lastName?: string; roleCode?: string; roles?: Array<{ role?: string; roleCode?: string; code?: string }> } } }>;
  requirement?: { buyer?: { id?: string; roleCode?: string; roles?: Array<{ role?: string; roleCode?: string }> } };
  participantCodes?: Array<{ code?: string; role?: string }>;
  verificationCode?: string;
  payment?: { status?: string; amount?: number } | null;
  logisticsFee?: number;
  platformFee?: number;
};

type ApiRequirement = {
  id: string;
  createdAt?: string;
  status?: string;
  location?: string;
  items?: Array<{ id?: string; productId?: string; quantity?: number; unit?: string; minPrice?: number; maxPrice?: number; requiredBy?: string; product?: { name?: string } }>;
  buyer?: { id?: string; firstName?: string; lastName?: string; location?: string; latitude?: number | null; longitude?: number | null; company?: string; roleCode?: string; roles?: Array<{ role?: string; roleCode?: string }> };
  latitude?: number | null;
  longitude?: number | null;
  buyerId?: string;
  offer?: { id?: string; offeredPrice?: number; originalPrice?: number; status?: string; buyerConfirmed?: boolean; farmerConfirmed?: boolean; };
  distanceKm?: number | null;
};

type ApiNotification = { id: string; title?: string; message?: string; type?: string; read?: boolean; createdAt?: string };
type ApiTicket = { id: string; subject?: string; message?: string; status?: string; createdAt?: string };
type ApiProduct = { id: string; name: string; category?: { name?: string }; image?: string; imageUrl?: string };


type Profile = {
  id?: string;
  farmerId?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  location?: string;
  latitude?: number | null;
  longitude?: number | null;
  language?: string;
  farmName?: string;
  landAcres?: number | null;
  experience?: string;
  produce?: string[];
  farmer?: {
    id?: string;
    farmerId?: string;
    farmName?: string;
    landAcres?: number | null;
    experience?: string;
    produce?: string[];
    rating?: number;
    reviews?: number;
    location?: string;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  roles?: Array<{ role: string; roleCode?: string }>;
  reviewsReceived?: Array<{ id: string; rating: number; comment?: string | null; createdAt: string; reviewer?: { firstName?: string; lastName?: string } }>;
};

type WeatherHour = { time: string; temperature: number; weatherCode?: number };
type Weather = { temperature?: number; description?: string; wind?: number; humidity?: number; precipitation?: number; weatherCode?: number; apparentTemperature?: number; hours?: WeatherHour[] };

const LANGUAGES = [
  ["en", "English"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"],
  ["mr", "मराठी"], ["gu", "ગુજરાતી"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["pa", "ਪੰਜਾਬੀ"],
] as const;

const languageCode = (value?: string) => {
  const v = String(value || "").trim().toLowerCase();
  const found = LANGUAGES.find(([code, label]) => code.toLowerCase() === v || label.toLowerCase() === v);
  return found?.[0] || "en";
};

const navItems: Array<{ id: View; label: string; icon: React.ElementType }> = [
  { id: "Dashboard", label: "Dashboard", icon: Home },
  { id: "Listings", label: "Listings", icon: Package },
  { id: "Orders", label: "Orders", icon: ClipboardList },
  { id: "Shipment", label: "Shipment", icon: Truck },
  { id: "Analytics", label: "Analytics", icon: BarChart3 },
  { id: "Help", label: "Help", icon: CircleHelp },
  { id: "Profile", label: "Profile", icon: User }
];

const money = (n: number) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const pdfMoney = (n: number) => `Rs. ${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const formatPriceRange = (min?: number | null, max?: number | null) => {
  const low = Number(min ?? 0);
  const high = Number(max ?? low);
  return low === high ? money(low) : `${money(low)}–${money(high)}`;
};
const farmerAnalyticsPalette: Array<[number, number, number]> = [
  [22, 131, 74],
  [241, 181, 27],
  [59, 130, 246],
  [239, 139, 44],
  [139, 92, 246],
  [15, 118, 110],
  [213, 59, 57],
];

const roleCodeFrom = (roles?: Array<{ role?: string; roleCode?: string }>, role?: string) =>
  roles?.find(r => String(r.role || "").toUpperCase() === String(role || "").toUpperCase())?.roleCode ||
  roles?.find(r => r.roleCode)?.roleCode;

const getBuyerCode = (order: ApiOrder) => {
  const participantCode = order.participantCodes?.find(c => String(c.role || "").toUpperCase() === "BUYER")?.code;
  return (
    order.buyerRoleCode ||
    order.buyer?.roleCode ||
    roleCodeFrom(order.buyer?.roles, "BUYER") ||
    order.requirement?.buyer?.roleCode ||
    roleCodeFrom(order.requirement?.buyer?.roles, "BUYER") ||
    participantCode ||
    order.buyerId ||
    "—"
  );
};

const getOrderVerificationCode = (order: ApiOrder) => {
  const farmerParticipantCode = order.participantCodes?.find(
    c => ["FARMER", "SELLER"].includes(String(c?.role ?? "").toUpperCase()),
  )?.code;
  return farmerParticipantCode || order.sellerRoleCode || order.seller?.roleCode || roleCodeFrom(order.seller?.roles, "FARMER") || roleCodeFrom(order.seller?.roles, "SELLER") || "—";
};

const fourCharacterCode = (value: unknown) => {
  const code = String(value ?? "").trim();
  return /^[A-Za-z0-9]{4}$/.test(code) ? code.toUpperCase() : "";
};

const makeFourCharacterDisplayCode = (...parts: unknown[]) => {
  const source = parts.filter(Boolean).map(String).join("|");
  if (!source) return "";
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  const digits = "23456789";
  let value = hash >>> 0;
  const pick = (source: string) => {
    const index = value % source.length;
    value = Math.floor(value / source.length) || ((hash + index * 97) >>> 0);
    return source[index];
  };
  return `${pick(letters)}${pick(digits)}${pick(letters)}${pick(digits)}`;
};

const acceptedLogisticsAssignment = (order: ApiOrder) => {
  const assignments = Array.isArray(order.assignments) ? order.assignments : [];
  return assignments.find((a: any) => {
    const status = String(a?.status ?? "").toUpperCase();
    return ["ACCEPTED", "ASSIGNED", "IN_PROGRESS", "PICKUP_ASSIGNED", "ACCEPTED_BY_LOGISTICS"].includes(status);
  }) || null;
};

const getLogisticsStatus = (order: ApiOrder) => {
  const acceptedAssignment = acceptedLogisticsAssignment(order);
  const logistics = (order as any).logistics;
  const status = String((order as any).logisticsStatus ?? logistics?.status ?? "").toUpperCase();
  const accepted = Boolean((order as any).logisticsAccepted || (order as any).logisticsAcceptedAt);

  if (acceptedAssignment) return "Assigned";
  if (accepted && ["", "ACCEPTED", "ASSIGNED", "IN_PROGRESS", "PICKUP_ASSIGNED"].includes(status)) return "Assigned";
  if (["ACCEPTED", "ASSIGNED", "IN_PROGRESS", "PICKUP_ASSIGNED"].includes(status) && (logistics?.id || logistics?.user || order.logisticsRoleCode)) return "Assigned";
  return "Not assigned";
};

const getLogisticsCode = (order: ApiOrder) => {
  const roleMatches = (role: unknown) => {
    const value = String(role ?? "").toUpperCase();
    return ["LOGISTICS", "LOGISTICS_PROVIDER", "DELIVERY", "DELIVERY_PARTNER"].includes(value);
  };
  const accepted: any = acceptedLogisticsAssignment(order);
  const assignments = Array.isArray(order.assignments) ? order.assignments : [];
  const assignmentWithLogistics: any = accepted || assignments.find((a: any) => a?.logistics?.user || a?.logistics) || null;
  const logistics: any = assignmentWithLogistics?.logistics ?? (order as any).logistics ?? null;
  const user: any = logistics?.user ?? null;
  const roles = Array.isArray(user?.roles) ? user.roles : [];

  const participantLists = [
    order.participantCodes,
    assignmentWithLogistics?.participantCodes,
    assignmentWithLogistics?.logistics?.participantCodes,
    logistics?.participantCodes,
    user?.participantCodes,
  ];
  const participantCandidates = participantLists.flatMap((list: any) =>
    Array.isArray(list)
      ? list.filter((c: any) => roleMatches(c?.role)).map((c: any) => c?.code)
      : [],
  );

  const candidates = [
    order.logisticsVerificationCode,
    ...participantCandidates,
    assignmentWithLogistics?.verificationCode,
    assignmentWithLogistics?.logistics?.verificationCode,
    assignmentWithLogistics?.logistics?.user?.verificationCode,
    logistics?.verificationCode,
    user?.verificationCode,
    assignmentWithLogistics?.logistics?.logisticsCode,
    logistics?.logisticsCode,
    roles.find((r: any) => roleMatches(r?.role))?.code,
    roles.find((r: any) => roleMatches(r?.role))?.verificationCode,
  ];

  for (const candidate of candidates) {
    const code = fourCharacterCode(candidate);
    if (code) return code;
  }

  // If the order is assigned to Logistics but the API does not expose the
  // per-order verification code, keep the Farmer code separate from BUYER and
  // from the Logistics database ID. Generate one stable 4-character display
  // code for this order/assignment so a paid assigned order never shows
  // "Not assigned" in the Code column.
  if (getLogisticsStatus(order) === "Assigned") {
    const identity = assignmentWithLogistics?.id || logistics?.id || user?.id || order.logisticsRoleCode || "LOGISTICS";
    return makeFourCharacterDisplayCode("FARMER-LOGISTICS", order.id, identity);
  }
  return "Not assigned";
};

const getRequirementBuyerCode = (requirement: ApiRequirement) =>
  requirement.buyer?.roleCode ||
  roleCodeFrom(requirement.buyer?.roles, "BUYER") ||
  requirement.buyerId ||
  requirement.buyer?.id ||
  "—";
const buyerNameFromOrder = (order?: ApiOrder) =>
  [order?.buyer?.firstName, order?.buyer?.lastName].filter(Boolean).join(" ").trim() || "Buyer";
const buyerNameFromRequirement = (requirement?: ApiRequirement) =>
  [requirement?.buyer?.firstName, requirement?.buyer?.lastName].filter(Boolean).join(" ").trim() || "Buyer";

const number = (n: number) => (Number(n) || 0).toLocaleString("en-IN");
const date = (v?: string) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateTime = (v?: string) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const distanceBetweenCoordinatesKm = (
  latitude1?: number | null,
  longitude1?: number | null,
  latitude2?: number | null,
  longitude2?: number | null,
) => {
  if ([latitude1, longitude1, latitude2, longitude2].some(value => value == null || !Number.isFinite(Number(value)))) {
    return null;
  }

  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusKm = 6371;
  const dLat = toRadians(Number(latitude2) - Number(latitude1));
  const dLon = toRadians(Number(longitude2) - Number(longitude1));
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(Number(latitude1))) *
    Math.cos(toRadians(Number(latitude2))) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((earthRadiusKm * c).toFixed(1));
};
const displayName = (p?: Profile | null) => [p?.firstName, p?.lastName].filter(Boolean).join(" ");
const initials = (p?: Profile | null) => ([p?.firstName?.[0], p?.lastName?.[0]].filter(Boolean).join("") || "F").toUpperCase();
const shortDisplayId = (...parts: string[]) => {
  const source = parts.filter(Boolean).join("|");
  let hash = 2166136261;

  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }

  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "";
  let value = hash >>> 0;

  for (let i = 0; i < 6; i += 1) {
    output += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length) || ((hash + i * 97) >>> 0);
  }

  return output;
};

const orderDisplayId = (o: ApiOrder) => shortDisplayId("ORDER", o.id);

const formatNotificationMessage = (
  message: string,
  orders: ApiOrder[],
  requirements: ApiRequirement[] = [],
  createdAt?: string,
) => {
  let formatted = message || "";
  for (const order of orders) {
    if (!order.id || !formatted.includes(order.id)) continue;
    formatted = formatted.split(order.id).join(orderDisplayId(order));
    const name = buyerNameFromOrder(order);
    if (name !== "Buyer") {
      formatted = formatted.replace(/\bNew buyer\b/gi, name).replace(/\bbuyer\b/gi, name);
    }
  }
  for (const requirement of requirements) {
    if (!requirement.id || !formatted.includes(requirement.id)) continue;
    const name = buyerNameFromRequirement(requirement);
    if (name !== "Buyer") {
      formatted = formatted.replace(/\bNew buyer\b/gi, name).replace(/\bbuyer\b/gi, name);
    }
  }
  // Many farmer notifications contain no order/requirement ID. In that case
  // associate the notification with the nearest backend buyer event by time.
  if (/\bnew buyer\b|\bbuyer\b/i.test(formatted)) {
    const targetTime = createdAt ? new Date(createdAt).getTime() : Date.now();
    const candidates = [
      ...requirements.map(r => ({ name: buyerNameFromRequirement(r), time: new Date(r.createdAt || 0).getTime() })),
      ...orders.map(o => ({ name: buyerNameFromOrder(o), time: new Date(o.createdAt || 0).getTime() })),
    ].filter(x => x.name !== "Buyer" && Number.isFinite(x.time) && x.time > 0);
    candidates.sort((a, b) => Math.abs(a.time - targetTime) - Math.abs(b.time - targetTime));
    const closest = candidates[0];
    if (closest && Math.abs(closest.time - targetTime) <= 7 * 86400000) {
      formatted = formatted.replace(/\bNew buyer\b/gi, closest.name).replace(/\bbuyer\b/gi, closest.name);
    }
  }
  return formatted;
};

const PRODUCT_IMAGES: Record<string, string> = {
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
  rice: "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=85",
  wheat: "https://commons.wikimedia.org/wiki/Special:FilePath/Wheat_close-up.JPG?width=900",
  honey: "https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=85",
  cucumber: "https://commons.wikimedia.org/wiki/Special:FilePath/Cucumber.jpg?width=900",
  peas: "https://www.waangoo.com/cdn/shop/products/0013449_fresh-whole-green-peas-india.jpg?v=1755081566",
  "lady finger": "https://theempressmarket.com/cdn/shop/products/Bhindi_Okra_b8ef68f0-f1aa-41a6-a842-7240b695ac5a_grande.png?v=1535096086",
  capsicum: "https://commons.wikimedia.org/wiki/Special:FilePath/Capsicum_annuum.jpg?width=900",
  "bottle gourd": "https://commons.wikimedia.org/wiki/Special:FilePath/Bottle_gourd.jpg?width=900",
  papaya: "https://www.healthbenefitstimes.com/9/gallery/papaya-2/Ripe-papaya.jpg",
  guava: "https://commons.wikimedia.org/wiki/Special:FilePath/Guava.jpg?width=900",
  lemon: "https://commons.wikimedia.org/wiki/Special:FilePath/Lemon.jpg?width=900",
  coconut: "https://nurserylive.com/cdn/shop/products/nurserylive-plants-nariyal-coconut-tree-green-grown-through-seeds-plant-16969041739916_512x512.jpg?v=1634224657",
  chickpea: "https://i5.walmartimages.com/seo/Garbanzo-Beans-Chickpeas-Kabuli-Chana-Raw-Gluten-Free-5Lbs_19492694-94ef-4915-bb9c-9f76bfc3b4eb.4e01355a2d221f561bbc85ebd1004974.jpeg",
  "green gram": "https://commons.wikimedia.org/wiki/Special:FilePath/Vigna_radiata_%285000647141%29.jpg?width=900",
  "pigeon pea": "https://commons.wikimedia.org/wiki/Special:FilePath/Cajanus_cajan_kz02.jpg?width=900",
  maize: "https://commons.wikimedia.org/wiki/Special:FilePath/MAIZE.jpg?width=900",
  sorghum: "https://commons.wikimedia.org/wiki/Special:FilePath/Sorghum_bicolor.JPG?width=900",
  ginger: "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=900&q=85",
  "black pepper": "https://commons.wikimedia.org/wiki/Special:FilePath/Black_pepper.jpg?width=900",
  marigold: "https://commons.wikimedia.org/wiki/Special:FilePath/Marigold.jpg?width=900",
  jasmine: "https://commons.wikimedia.org/wiki/Special:FilePath/Jasminum_sambac.jpg?width=900",
  cotton: "https://commons.wikimedia.org/wiki/Special:FilePath/Cotton_plant.jpg?width=900",
  jute: "https://commons.wikimedia.org/wiki/Special:FilePath/Locally_Jute_Plant.jpg?width=900",
  sugarcane: "https://commons.wikimedia.org/wiki/Special:FilePath/Sugarcane.jpg?width=900",
  bamboo: "https://commons.wikimedia.org/wiki/Special:FilePath/Bamboo.jpg?width=900",
  basil: "https://commons.wikimedia.org/wiki/Special:FilePath/Basil.jpg?width=900",
  "curry leaves": "https://commons.wikimedia.org/wiki/Special:FilePath/Curry_leaves.jpg?width=900",
  "fenugreek leaves": "https://commons.wikimedia.org/wiki/Special:FilePath/Fenugreek_leaves.jpg?width=900",
  fish: "https://commons.wikimedia.org/wiki/Special:FilePath/The_Fish.jpg?width=900",
};

type LocationSuggestion = {
  place_id: string;
  display_name: string;
  secondary_text?: string;
  lat?: string;
  lon?: string;
};

let googleMapsLoaderPromise: Promise<void> | null = null;

const loadGoogleMaps = (): Promise<void> => {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Google Maps can only load in the browser."));
  }

  if (window.google?.maps) {
    return Promise.resolve();
  }

  if (googleMapsLoaderPromise) {
    return googleMapsLoaderPromise;
  }

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    return Promise.reject(
      new Error("NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is not configured."),
    );
  }

  googleMapsLoaderPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector(
      'script[data-khetlink-google-maps="true"],script[data-khetlink-logistics-maps="true"],script[src*="maps.googleapis.com/maps/api/js"]',
    ) as HTMLScriptElement | null;

    if (existingScript) {
      if (window.google?.maps) {
        resolve();
        return;
      }

      existingScript.addEventListener("load", () => {
        if (window.google?.maps) resolve();
        else reject(new Error("Google Maps loaded without the Maps API."));
      }, { once: true });

      existingScript.addEventListener("error", () => {
        googleMapsLoaderPromise = null;
        reject(new Error("Failed to load Google Maps."));
      }, { once: true });

      return;
    }

    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&loading=async`;

    script.async = true;
    script.defer = true;
    script.dataset.khetlinkGoogleMaps = "true";

    script.onload = () => {
      if (window.google?.maps) resolve();
      else {
        googleMapsLoaderPromise = null;
        reject(new Error("Google Maps loaded without the Maps API."));
      }
    };

    script.onerror = () => {
      googleMapsLoaderPromise = null;
      reject(new Error("Failed to load Google Maps."));
    };

    document.head.appendChild(script);
  });

  return googleMapsLoaderPromise;
};

const searchNominatimLocations = async (
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> => {
  const q = query.trim();

  if (q.length < 3) {
    return [];
  }

  const compact = q.replace(/[,]+/g, " ").replace(/\\s+/g, " ").trim();
  const tokens = compact.split(" ").filter(Boolean);
  const tokenWithoutDirection = tokens.filter(
    (token) => !/^(north|south|east|west|n|s|e|w)$/i.test(token),
  );
  const baseWithoutDirection = tokenWithoutDirection.join(" ");

  const queries = Array.from(
    new Set(
      [
        q,
        `${q}, India`,
        `${q}, Malda, West Bengal, India`,
        `${compact}, Malda, West Bengal, India`,
        baseWithoutDirection
          ? `${baseWithoutDirection}, Malda, West Bengal, India`
          : "",
        tokens.length >= 2
          ? `${tokens.slice(-1).join(" ")}, ${tokens.slice(0, -1).join(" ")}, Malda, West Bengal, India`
          : "",
        tokens.length >= 2
          ? `${tokens.slice(0, -1).join(" ")}, ${tokens.slice(-1).join(" ")}, West Bengal, India`
          : "",
      ].filter(Boolean),
    ),
  );

  const allResults: any[] = [];

  for (const searchText of queries) {
    if (signal?.aborted) return [];

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&dedupe=1&countrycodes=in&accept-language=en&q=${encodeURIComponent(searchText)}`,
        {
          signal,
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!response.ok) continue;

      const data = await response.json();
      if (Array.isArray(data)) {
        allResults.push(...data);
      }

      if (Array.isArray(data) && data.length > 0) {
        break;
      }
    } catch {
      if (signal?.aborted) return [];
    }
  }

  const seen = new Set<string>();

  return allResults
    .map((item: any) => {
      const address = item.address || {};
      const displayName = String(item.display_name || "");
      const displayNameLower = displayName.toLowerCase();
      const secondaryParts = [
        address.house_number ? `House ${address.house_number}` : "",
        address.road || "",
        address.suburb ||
        address.neighbourhood ||
        address.city_district ||
        "",
        address.city ||
        address.town ||
        address.municipality ||
        address.village ||
        "",
      ]
        .filter(Boolean)
        .filter(
          (part: string, index: number, parts: string[]) =>
            parts.indexOf(part) === index &&
            !displayNameLower.includes(String(part).toLowerCase()),
        );

      return {
        place_id: String(item.place_id),
        display_name: displayName,
        secondary_text:
          secondaryParts.length > 0
            ? secondaryParts.join(", ")
            : item.type && !displayNameLower.includes(String(item.type).replace(/_/g, " ").toLowerCase())
              ? String(item.type).replace(/_/g, " ")
              : undefined,
        lat: item.lat,
        lon: item.lon,
      };
    })
    .filter((item) => {
      const key = `${item.display_name}|${item.lat}|${item.lon}`.toLowerCase();
      if (!item.display_name || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

const searchGoogleLocations = async (
  query: string,
  signal?: AbortSignal,
): Promise<LocationSuggestion[]> => {
  const q = query.trim();

  if (q.length < 3) {
    return [];
  }

  let googleResults: LocationSuggestion[] = [];

  try {
    await loadGoogleMaps();

    if (signal?.aborted) return [];

    const {
      AutocompleteSessionToken,
      AutocompleteSuggestion,
    } = await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

    if (signal?.aborted) return [];

    const sessionToken = new AutocompleteSessionToken();
    const request: google.maps.places.AutocompleteRequest = {
      input: q,
      sessionToken,
      includedRegionCodes: ["in"],
    };

    const response =
      await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

    if (signal?.aborted) return [];

    googleResults = response.suggestions
      .map((suggestion) => suggestion.placePrediction)
      .filter(
        (
          prediction,
        ): prediction is google.maps.places.PlacePrediction =>
          Boolean(prediction),
      )
      .map((prediction) => ({
        place_id: prediction.placeId,
        display_name: prediction.text.text,
        secondary_text: prediction.secondaryText?.text,
      }));
  } catch (error) {
    console.warn("Google Places autocomplete unavailable; using fallback search.", error);
  }

  if (signal?.aborted) return [];

  let nominatimResults: LocationSuggestion[] = [];

  try {
    nominatimResults = await searchNominatimLocations(q, signal);
  } catch (error) {
    console.warn("Nominatim location search unavailable.", error);
  }

  if (signal?.aborted) return [];

  const merged = [...googleResults, ...nominatimResults];

  const uniqueLocations: LocationSuggestion[] = [];

  for (const item of merged) {
    const current = item.display_name.trim().toLowerCase();

    const duplicate = uniqueLocations.some((existing) => {
      const existingAddress = existing.display_name
        .trim()
        .toLowerCase();

      if (existingAddress === current) {
        return true;
      }

      return (
        existingAddress.includes(current) &&
        existingAddress.length > current.length
      );
    });

    if (!duplicate) {
      uniqueLocations.push(item);
    }
  }

  return uniqueLocations.slice(0, 10);
};

const getGooglePlaceDetails = async (
  placeId: string,
): Promise<{
  display_name: string;
  lat: number | null;
  lon: number | null;
}> => {
  await loadGoogleMaps();

  const { Place } =
    await google.maps.importLibrary("places") as google.maps.PlacesLibrary;

  const place = new Place({
    id: placeId,
  });

  await place.fetchFields({
    fields: ["displayName", "formattedAddress", "location"],
  });

  const displayName =
    place.formattedAddress ||
    place.displayName ||
    "";

  const location = place.location;

  return {
    display_name: displayName,
    lat: location ? location.lat() : null,
    lon: location ? location.lng() : null,
  };
};

const reverseGeocodeNominatimLocation = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(latitude)}&lon=${encodeURIComponent(longitude)}&addressdetails=1&namedetails=1&zoom=18&layer=address,poi`,
    {
      headers: { Accept: "application/json" },
    },
  );

  if (!response.ok) {
    throw new Error(`Reverse geocoding failed (${response.status}).`);
  }

  const data = await response.json();
  const address = data?.address || {};

  const building =
    address.house_name ||
    address.building ||
    address.premise ||
    data?.namedetails?.name ||
    "";
  const apartment =
    address.unit ||
    address.apartment ||
    address.subpremise ||
    "";
  const road = address.road || "";
  const area =
    address.neighbourhood ||
    address.suburb ||
    address.quarter ||
    address.city_district ||
    address.residential ||
    "";
  const city =
    address.city ||
    address.town ||
    address.municipality ||
    address.village ||
    "";
  const state = address.state || "";
  const country = address.country || "";

  const parts = [
    apartment,
    building,
    address.house_number ? `${address.house_number}${road ? `, ${road}` : ""}` : road,
    area,
    city,
    state,
    country,
  ]
    .filter(Boolean)
    .map(String);

  const uniqueParts = [...new Set(parts)];
  if (uniqueParts.length > 0) return uniqueParts.join(", ");

  const displayName = String(data?.display_name || "").trim();
  if (displayName) return displayName;

  throw new Error("No readable locality was returned.");
};

const reverseGeocodeGoogleLocation = async (
  latitude: number,
  longitude: number,
): Promise<string> => {
  try {
    await loadGoogleMaps();
    const { Geocoder } =
      await google.maps.importLibrary("geocoding") as google.maps.GeocodingLibrary;
    const geocoder = new Geocoder();
    const response = await geocoder.geocode({
      location: { lat: latitude, lng: longitude },
    });

    // Google can return several results from an exact street address down to
    // neighbourhood/city level. Inspect all of them instead of trusting [0].
    for (const result of response.results || []) {
      const getComponent = (types: string[]) =>
        result.address_components?.find((component) =>
          types.some((type) => component.types.includes(type)),
        )?.long_name || "";

      const apartment = getComponent(["subpremise"]);
      const building = getComponent(["premise"]);
      const streetNumber = getComponent(["street_number"]);
      const road = getComponent(["route"]);
      const area = getComponent([
        "sublocality_level_1",
        "sublocality_level_2",
        "sublocality",
        "neighborhood",
        "colloquial_area",
      ]);
      const city = getComponent([
        "locality",
        "postal_town",
        "administrative_area_level_2",
      ]);
      const state = getComponent(["administrative_area_level_1"]);
      const country = getComponent(["country"]);

      const street = [streetNumber, road].filter(Boolean).join(" ");
      const parts = [
        apartment,
        building,
        street,
        area,
        city,
        state,
        country,
      ].filter(Boolean);

      if (parts.length > 0) {
        return [...new Set(parts)].join(", ");
      }

      if (result.formatted_address) return result.formatted_address;
    }
  } catch {
    // Google failed or returned no usable address; use Nominatim below.
  }

  return reverseGeocodeNominatimLocation(latitude, longitude);
};


const getProductImage = (product?: string, catalogImage?: string) => {
  if (catalogImage && /^(https?:\/\/|data:image\/|\/)/.test(catalogImage)) return catalogImage;
  const normalized = String(product || "").toLowerCase();
  const key = Object.keys(PRODUCT_IMAGES).find(name => normalized.includes(name));
  return key ? PRODUCT_IMAGES[key] : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85";
};


type FarmerCatalogItem = { name: string; category: string; image: string };

const catalogImage = (name: string, image: string) => image === "PLACEHOLDER_CATALOG_IMAGE"
  ? `https://placehold.co/900x700/f3f8f4/087a43?text=${encodeURIComponent(name)}`
  : image;

// Farmer-facing catalogue is a fixed interface catalogue. Backend catalog data is used
// only to resolve the selected product to its backend productId when a listing is saved.
const FARMER_CATALOG: FarmerCatalogItem[] = [
  // Vegetables
  { name: "Tomato", category: "Vegetables", image: PRODUCT_IMAGES.tomato },
  { name: "Potato", category: "Vegetables", image: PRODUCT_IMAGES.potato },
  { name: "Onion", category: "Vegetables", image: PRODUCT_IMAGES.onion },
  { name: "Brinjal", category: "Vegetables", image: "https://2.wlimg.com/product_images/bc-500/2026/1/14429886/fresh-brinjal-1768629359-8539858.jpeg" },
  { name: "Spinach", category: "Vegetables", image: PRODUCT_IMAGES.spinach },
  { name: "Cucumber", category: "Vegetables", image: PRODUCT_IMAGES.cucumber },
  { name: "Carrot", category: "Vegetables", image: PRODUCT_IMAGES.carrot },
  { name: "Cauliflower", category: "Vegetables", image: "https://image.cdn.shpy.in/437243/SKU-0009_0-1747138363907.jpg?format=webp&width=900" },
  { name: "Cabbage", category: "Vegetables", image: PRODUCT_IMAGES.cabbage },
  { name: "Peas", category: "Vegetables", image: PRODUCT_IMAGES.peas },
  { name: "Lady Finger", category: "Vegetables", image: PRODUCT_IMAGES["lady finger"] },
  { name: "Capsicum", category: "Vegetables", image: PRODUCT_IMAGES.capsicum },
  { name: "Pumpkin", category: "Vegetables", image: "https://img.thecdn.in/278008/1670177299449_SKU-0033_1.jpg?format=webp&width=900" },
  { name: "Bitter Gourd", category: "Vegetables", image: "https://neeraseeds.com/cdn/shop/files/Bitter-Gourd_84b03abc-d5f8-469f-ae0b-c3d779ece401.webp?v=1754121074" },
  { name: "Bottle Gourd", category: "Vegetables", image: PRODUCT_IMAGES["bottle gourd"] },
  // Fruits
  { name: "Banana", category: "Fruits", image: PRODUCT_IMAGES.banana },
  { name: "Mango", category: "Fruits", image: PRODUCT_IMAGES.mango },
  { name: "Apple", category: "Fruits", image: PRODUCT_IMAGES.apple },
  { name: "Orange", category: "Fruits", image: PRODUCT_IMAGES.orange },
  { name: "Grapes", category: "Fruits", image: PRODUCT_IMAGES.grapes },
  { name: "Papaya", category: "Fruits", image: PRODUCT_IMAGES.papaya },
  { name: "Guava", category: "Fruits", image: PRODUCT_IMAGES.guava },
  { name: "Pomegranate", category: "Fruits", image: "https://openbottle.com.hk/cdn/shop/products/rimon-semi-sweet-pomegranate-rose-514536.jpg?v=1684808004" },
  { name: "Pineapple", category: "Fruits", image: "https://app.bigdatawifi.com.br/storage/285288/Abacaxi-bauru-un.jpg" },
  { name: "Watermelon", category: "Fruits", image: "https://1.bp.blogspot.com/-mTMG_cmfPps/U7F6c9JeXlI/AAAAAAAAAGo/0cPYh7kN3Xs/s1600/tembikai%2B5.jpg" },
  { name: "Lemon", category: "Fruits", image: PRODUCT_IMAGES.lemon },
  { name: "Coconut", category: "Fruits", image: PRODUCT_IMAGES.coconut },
  // Pulses
  { name: "Lentil", category: "Pulses", image: "https://www.biolaboratorium.com/cdn/shop/products/46451.jpg?v=1673560372" },
  { name: "Chickpea", category: "Pulses", image: PRODUCT_IMAGES.chickpea },
  { name: "Green Gram", category: "Pulses", image: PRODUCT_IMAGES["green gram"] },
  { name: "Black Gram", category: "Pulses", image: "https://commons.wikimedia.org/wiki/Special:FilePath/Vigna_mungo.jpg?width=900" },
  { name: "Pigeon Pea", category: "Pulses", image: PRODUCT_IMAGES["pigeon pea"] },
  // Grains
  { name: "Rice", category: "Grains", image: PRODUCT_IMAGES.rice },
  { name: "Wheat", category: "Grains", image: PRODUCT_IMAGES.wheat },
  { name: "Maize", category: "Grains", image: PRODUCT_IMAGES.maize },
  { name: "Millet", category: "Grains", image: "https://semeiniy.kz/wa-data/public/shop/products/36/73/117336/images/36752/36752.970.jpg" },
  { name: "Barley", category: "Grains", image: "https://i0.wp.com/malayalibasket.com/wp-content/uploads/2023/07/1000353356.jpg?fit=900%2C900&ssl=1" },
  { name: "Sorghum", category: "Grains", image: PRODUCT_IMAGES.sorghum },
  // Spices
  { name: "Turmeric", category: "Spices", image: "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=85" },
  { name: "Ginger", category: "Spices", image: PRODUCT_IMAGES.ginger },
  { name: "Garlic", category: "Spices", image: "https://talabat.dhmedia.io/image/talabat-nv/Regional_Images/Images/QC_Standard_Images/KW3RT1LV.png" },
  { name: "Chilli", category: "Spices", image: "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=85" },
  { name: "Coriander", category: "Spices", image: "https://tiimg.tistatic.com/fp/1/008/089/good-fragrance-healthy-natural-rich-taste-green-fresh-coriander-leaves-104.jpg" },
  { name: "Cumin", category: "Spices", image: "https://onlineorganics.ca/cdn/shop/products/organic-cumin-seed-whole-pile_600x600.jpg?v=1747756925" },
  { name: "Black Pepper", category: "Spices", image: PRODUCT_IMAGES["black pepper"] },
  { name: "Cardamom", category: "Spices", image: "https://vegetarianexpress.co.uk/cdn/shop/products/CARGRE1K_1.jpg?v=1684802061" },
  // Flowers
  { name: "Marigold", category: "Flowers", image: PRODUCT_IMAGES.marigold },
  { name: "Rose", category: "Flowers", image: "https://images.unsplash.com/photo-1496062031456-07b8f162a322?auto=format&fit=crop&w=900&q=85" },
  { name: "Jasmine", category: "Flowers", image: PRODUCT_IMAGES.jasmine },
  { name: "Chrysanthemum", category: "Flowers", image: "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=85" },
  // Non-Edible
  { name: "Cotton", category: "Non-Edible", image: PRODUCT_IMAGES.cotton },
  { name: "Jute", category: "Non-Edible", image: PRODUCT_IMAGES.jute },
  { name: "Sugarcane", category: "Non-Edible", image: PRODUCT_IMAGES.sugarcane },
  { name: "Bamboo", category: "Non-Edible", image: PRODUCT_IMAGES.bamboo },
  // Herbs
  { name: "Mint", category: "Herbs", image: "https://www.fruitlinq.com/cdn/shop/files/MintLeaves.png?v=1758697771&width=1445" },
  { name: "Basil", category: "Herbs", image: PRODUCT_IMAGES.basil },
  { name: "Curry Leaves", category: "Herbs", image: PRODUCT_IMAGES["curry leaves"] },
  { name: "Fenugreek Leaves", category: "Herbs", image: PRODUCT_IMAGES["fenugreek leaves"] },
  // Other / Livestock
  { name: "Honey", category: "Other", image: PRODUCT_IMAGES.honey },
  { name: "Milk", category: "Other", image: "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=85" },
  { name: "Eggs", category: "Livestock", image: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=85" },
  { name: "Goat", category: "Livestock", image: "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85" },
  { name: "Cattle", category: "Livestock", image: "https://commons.wikimedia.org/wiki/Special:FilePath/Cattle.jpg?width=900" },
  { name: "Poultry", category: "Livestock", image: "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=85" },
  { name: "Fish", category: "Livestock", image: PRODUCT_IMAGES.fish },
];


const weatherDescription = (code?: number) => {
  if (code === 0) return "Sunny";
  if ([1, 2].includes(code ?? -1)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45, 48].includes(code ?? -1)) return "Foggy";
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return "Drizzle";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return "Rainy";
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return "Snowy";
  if ([95, 96, 99].includes(code ?? -1)) return "Stormy";
  return "Current conditions";
};

const weatherEmoji = (code?: number) => {
  if (code === 0) return "☀️";
  if ([1, 2].includes(code ?? -1)) return "⛅";
  if (code === 3) return "☁️";
  if ([45, 48].includes(code ?? -1)) return "🌫️";
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return "🌦️";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return "🌧️";
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return "🌨️";
  if ([95, 96, 99].includes(code ?? -1)) return "⛈️";
  return "🌤️";
};

const toKg = (quantity: number, unit: string) => unit === "ton" ? quantity * 1000 : unit === "dozen" ? quantity * 12 : quantity;
const fromKg = (quantity: number, unit: string) => unit === "ton" ? quantity / 1000 : unit === "dozen" ? quantity / 12 : quantity;
const pricePerUnit = (price: number, fromUnit: string, toUnit: string) => fromKg(toKg(price, fromUnit), toUnit);
const minimumQuantityForUnit = (unit: string) => fromKg(100, unit);



async function api<T = any>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, { credentials: "include", ...options, headers: { "Content-Type": "application/json", ...(options?.headers || {}) } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "Request failed");
  return data;
}

function badgeClass(value?: string) {
  const v = String(value || "").toLowerCase();
  if (["paid", "accepted", "delivered", "active", "confirmed"].includes(v)) return "good";
  if (["pending", "processing", "countered", "negotiating", "in transit"].includes(v)) return "warn";
  if (["rejected", "cancelled", "expired", "declined", "sold"].includes(v)) return "bad";
  return "neutral";
}

export default function Farmer() {
  const [view, setView] = useState<View>("Dashboard");
  const [profileGateChecked, setProfileGateChecked] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [listings, setListings] = useState<ApiListing[]>([]);
  const [allListings, setAllListings] = useState<any[]>([]);
  const [backendCatalogProducts, setBackendCatalogProducts] = useState<ApiProduct[]>([]);
  const [requirements, setRequirements] = useState<ApiRequirement[]>([]);
  const [orders, setOrders] = useState<ApiOrder[]>([]);
  const [notifications, setNotifications] = useState<ApiNotification[]>([]);
  const [tickets, setTickets] = useState<ApiTicket[]>([]);
  const [weather, setWeather] = useState<Weather | null>(null);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileDraft, setProfileDraft] = useState<Profile>({});
  const [locationQuery, setLocationQuery] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const locationSelectionRef = useRef(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [newListing, setNewListing] = useState({ productName: "", quantity: "100", unit: "kg", price: "" });
  const [listingEditing, setListingEditing] = useState<string | null>(null);
  const [requestPrices, setRequestPrices] = useState<Record<string, string>>({});
  const [requestFlash, setRequestFlash] = useState<Record<string, string>>({});
  const requestPriceDirtyRef = useRef<Set<string>>(new Set());
  const [support, setSupport] = useState({ subject: "", message: "" });
  const [savedMessage, setSavedMessage] = useState("");
  const [listingMessage, setListingMessage] = useState("");
  const profileEditingRef = useRef(false);
  useEffect(() => { profileEditingRef.current = profileEditing; }, [profileEditing]);
  const unread = notifications.filter(n => !n.read).length;
  const hasFarmerLocation = Boolean(profile?.location?.trim() && profile?.latitude != null && profile?.longitude != null);
  const locationRequired = Boolean(profile) && !hasFarmerLocation;
  const activeView: View = locationRequired ? "Profile" : view;

  const refresh = async () => {
    setError("");
    const [p, l, allListingsResult, cat, r, o, n, s] = await Promise.allSettled([
      api<{ user: Profile }>("/api/profile/me"),
      api<{ listings: ApiListing[] }>("/api/listings/mine"),
      api<{ listings: any[] }>("/api/listings"),
      api<ApiProduct[] | { products: ApiProduct[] }>("/api/catalog"),
      api<{ requirements: ApiRequirement[] }>("/api/requirements/incoming"),
      api<{ orders: ApiOrder[] }>("/api/orders"),
      api<{ notifications: ApiNotification[] }>("/api/notifications?role=FARMER"),
      api<{ tickets: ApiTicket[] }>("/api/support"),
    ]);
    if (p.status === "fulfilled") {
      const user = p.value.user;
      const farmer = user.farmer || {};
      const farmerRole = (user.roles || []).find((r: any) => r.role === "FARMER");
      const merged = { ...user, ...farmer, farmerId: farmerRole?.roleCode || farmer.farmerId || farmer.id || user.id };
      setProfile(merged);
      if (!profileEditingRef.current) {
        setProfileDraft(merged);
        setLocationQuery(merged.location || "");
      }
      setSelectedLanguage(languageCode(user.language));
      const savedLocation = Boolean(merged.location?.trim() && merged.latitude != null && merged.longitude != null);
      setProfileEditing(current => savedLocation ? current : true);
      if (!savedLocation) setView("Profile");
    }
    if (l.status === "fulfilled") setListings(l.value.listings || []);
    if (cat.status === "fulfilled") setBackendCatalogProducts(Array.isArray(cat.value) ? cat.value : (cat.value.products || []));
    if (r.status === "fulfilled") {
      const farmerForDistance =
        p.status === "fulfilled"
          ? (p.value.user?.farmer || p.value.user)
          : null;
      const nextRequirements = (r.value.requirements || []).map(requirement => ({
        ...requirement,
        status: requirement.status === "BROWSE_PRODUCTS" ? "PENDING" : requirement.status,
        distanceKm:
          requirement.distanceKm != null
            ? Number(requirement.distanceKm)
            : distanceBetweenCoordinatesKm(
              farmerForDistance?.latitude,
              farmerForDistance?.longitude,
              requirement.latitude ?? requirement.buyer?.latitude,
              requirement.longitude ?? requirement.buyer?.longitude,
            ),
      }));
      setRequirements(nextRequirements);
      setRequestPrices(current => {
        const next = { ...current };
        for (const requirement of nextRequirements) {
          const backendPrice = requirement.offer?.offeredPrice;
          if (backendPrice != null && !requestPriceDirtyRef.current.has(requirement.id)) {
            next[requirement.id] = String(backendPrice);
          }
        }
        return next;
      });
    }
    if (o.status === "fulfilled") {
      const normalizedOrders = (o.value.orders || []).map((order: ApiOrder) => ({
        ...order,
        logisticsVerificationCode: getLogisticsCode(order),
      }));
      setOrders(normalizedOrders);
    }
    if (n.status === "fulfilled") setNotifications((n.value.notifications || []).map(notification => ({
      ...notification,
      title: formatNotificationMessage(
        notification.title || "Notification",
        o.status === "fulfilled" ? o.value.orders || [] : orders,
        r.status === "fulfilled" ? r.value.requirements || [] : requirements,
        notification.createdAt,
      ),
      message: formatNotificationMessage(
        notification.message || "",
        o.status === "fulfilled" ? o.value.orders || [] : orders,
        r.status === "fulfilled" ? r.value.requirements || [] : requirements,
        notification.createdAt,
      ),
    })));
    if (s.status === "fulfilled") setTickets(s.value.tickets || []);
    if (allListingsResult.status === "fulfilled") {
      const rows = allListingsResult.value.listings || [];
      setAllListings(rows);
    }
    const failed = [p, l, allListingsResult, cat, r, o, n, s].filter(x => x.status === "rejected");
    if (failed.length === 7) setError("Unable to load Farmer data. Check that the backend is running and you are logged in.");
    setLoading(false);
    setProfileGateChecked(true);
  };

  useEffect(() => { refresh(); }, []);

  useEffect(() => {
    let liveRequestInFlight = false;

    const liveRefresh = async () => {
      if (document.visibilityState !== "visible" || busy || profileEditingRef.current || liveRequestInFlight) return;
      liveRequestInFlight = true;

      try {
        const [requirementsResult, ordersResult, notificationsResult] = await Promise.allSettled([
          api<{ requirements: ApiRequirement[] }>("/api/requirements/incoming"),
          api<{ orders: ApiOrder[] }>("/api/orders"),
          api<{ notifications: ApiNotification[] }>("/api/notifications?role=FARMER"),
        ]);

        let liveOrders: ApiOrder[] = orders;
        let liveRequirements: ApiRequirement[] = requirements;

        if (requirementsResult.status === "fulfilled") {
          const nextRequirements = (requirementsResult.value.requirements || []).map(requirement => ({
            ...requirement,
            status: requirement.status === "BROWSE_PRODUCTS" ? "PENDING" : requirement.status,
            distanceKm:
              requirement.distanceKm != null
                ? Number(requirement.distanceKm)
                : distanceBetweenCoordinatesKm(
                  profile?.latitude,
                  profile?.longitude,
                  requirement.latitude ?? requirement.buyer?.latitude,
                  requirement.longitude ?? requirement.buyer?.longitude,
                ),
          }));
          liveRequirements = nextRequirements;
          setRequirements(nextRequirements);
          setRequestPrices(current => {
            const next = { ...current };
            for (const requirement of nextRequirements) {
              const backendPrice = requirement.offer?.offeredPrice;
              if (backendPrice != null && !requestPriceDirtyRef.current.has(requirement.id)) {
                next[requirement.id] = String(backendPrice);
              }
            }
            return next;
          });
        }

        if (ordersResult.status === "fulfilled") {
          liveOrders = (ordersResult.value.orders || []).map((order: ApiOrder) => ({
            ...order,
            logisticsVerificationCode: getLogisticsCode(order),
          }));
          setOrders(liveOrders);
        }

        if (notificationsResult.status === "fulfilled") {
          setNotifications(
            (notificationsResult.value.notifications || [])
              .filter(item => !item.read)
              .map(item => ({
                ...item,
                title: formatNotificationMessage(item.title || "Notification", liveOrders, liveRequirements, item.createdAt),
                message: formatNotificationMessage(item.message || "", liveOrders, liveRequirements, item.createdAt),
              })),
          );
        }
      } finally {
        liveRequestInFlight = false;
      }
    };

    const liveTimer = window.setInterval(() => { void liveRefresh(); }, 1200);
    return () => window.clearInterval(liveTimer);
  }, [busy, profile?.latitude, profile?.longitude]);

  useEffect(() => {
    if (profile?.latitude == null || profile?.longitude == null) return;
    fetch(`https://api.open-meteo.com/v1/forecast?latitude=${profile.latitude}&longitude=${profile.longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,weather_code&forecast_days=2&timezone=auto`)
      .then(r => r.json())
      .then(d => {
        const times: string[] = d?.hourly?.time || [];
        const temps: number[] = d?.hourly?.temperature_2m || [];
        const codes: number[] = d?.hourly?.weather_code || [];
        const now = Date.now();
        const hours: WeatherHour[] = times.map((time, i) => ({
          time,
          temperature: Number(temps[i]),
          weatherCode: Number(codes[i])
        }))
          .filter((h: WeatherHour) => Number.isFinite(h.temperature) && Number.isFinite(new Date(h.time).getTime()) && new Date(h.time).getTime() > now)
          .slice(0, 6);
        setWeather({ temperature: d?.current?.temperature_2m, apparentTemperature: d?.current?.apparent_temperature, humidity: d?.current?.relative_humidity_2m, precipitation: d?.current?.precipitation, weatherCode: d?.current?.weather_code, wind: d?.current?.wind_speed_10m, description: weatherDescription(d?.current?.weather_code), hours });
      })
      .catch(() => setWeather(null));
  }, [profile?.latitude, profile?.longitude]);

  const stats = useMemo(() => {
    const totalOrders = orders.filter(o => o.status !== "CANCELLED").length;
    const earnings = orders.filter(o => o.status !== "CANCELLED").reduce((sum, o) => sum + (o.items || []).reduce((itemSum, i) => itemSum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0), 0);
    const quantityKg = listings.reduce((sum, l) => sum + toKg(Number(l.quantity || 0), l.unit || "kg"), 0);
    const quantity = quantityKg;
    const productCounts = new Map<string, number>();
    orders.filter(o => o.status !== "CANCELLED").forEach(o => (o.items || []).forEach(i => productCounts.set(i.product?.name || "Product", (productCounts.get(i.product?.name || "Product") || 0) + Number(i.quantity || 0))));
    const topProducts = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const inventory = listings.map((l: ApiListing) => ({ id: l.id, name: l.product?.name || "Product", quantity: Number(l.quantity || 0), unit: l.unit || "kg" })).slice(0, 8);
    return { totalOrders, earnings, totalListings: listings.length, quantity, quantityUnit: quantity >= 1000 ? "ton" : "kg", quantityDisplay: quantity >= 1000 ? quantity / 1000 : quantity, topProducts, inventory };
  }, [orders, listings, profile?.id]);

  const otherFarmers = useMemo(() => {
    const grouped = new Map<string, { name: string; quantity: number; unit: string; price: number; count: number; topProduct: string }>();
    for (const listing of allListings) {
      if (profile?.id && (listing.farmerId === profile.id || listing.farmer?.id === profile.id || listing.farmer?.farmer?.id === profile.id || listing.farmer?.farmer?.userId === profile.id)) continue;
      const name = listing.farmer ? [listing.farmer.firstName, listing.farmer.lastName].filter(Boolean).join(" ") : "Farmer";
      const key = listing.farmerId || name;
      const existing = grouped.get(key) || { name, quantity: 0, unit: listing.unit || "kg", price: Number(listing.price || 0), count: 0, topProduct: listing.product?.name || "Product" };
      existing.quantity += Number(listing.quantity || 0);
      existing.price = Number(listing.price || existing.price);
      existing.count += 1; existing.topProduct = existing.topProduct || listing.product?.name || "Product";
      grouped.set(key, existing);
    }
    return grouped;
  }, [allListings, profile?.id]);

  const go = (next: View) => {
    const target = locationRequired && next !== "Profile" ? "Profile" : next;
    setView(target);
    setMobileOpen(false);
    setLanguageOpen(false);
  };

  const chooseLanguage = async (lang: string) => {
    const code = languageCode(lang);
    setSelectedLanguage(code);
    setLanguageOpen(false);
    try { await api("/api/profile/me", { method: "PATCH", body: JSON.stringify({ language: code }) }); setProfile(p => p ? { ...p, language: code } : p); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to save language"); }
  };

  const showListingMessage = (message: string) => {
    setListingMessage(message);
    window.setTimeout(() => setListingMessage(current => current === message ? "" : current), 4000);
  };

  const createListing = async (e: FormEvent) => {
    e.preventDefault();
    if (!newListing.productName || !newListing.quantity || !newListing.price) return setError("Select a product and enter quantity and price.");
    setBusy(true); setError("");
    try {
      let backendProduct = backendCatalogProducts.find(p => p.name.trim().toLowerCase() === newListing.productName.trim().toLowerCase());
      if (!backendProduct?.id) {
        const selected = FARMER_CATALOG.find(p => p.name.toLowerCase() === newListing.productName.trim().toLowerCase());
        const created = await api<{ product: ApiProduct }>("/api/catalog", { method: "POST", body: JSON.stringify({ name: newListing.productName, category: selected?.category || "Other", imageUrl: selected?.image || null }) });
        backendProduct = created.product;
        setBackendCatalogProducts(prev => [...prev.filter(p => p.id !== backendProduct!.id), backendProduct!]);
      }
      await api("/api/listings", { method: "POST", body: JSON.stringify({ productId: backendProduct.id, quantity: Number(newListing.quantity), unit: newListing.unit, price: Number(newListing.price), status: "Active" }) });
      setNewListing({ productName: "", quantity: "100", unit: "kg", price: "" });
      showListingMessage("Item added successfully.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to create listing"); }
    finally { setBusy(false); }
  };

  const updateListing = async (id: string, data: Partial<ApiListing>) => {
    setBusy(true); setError("");
    try { await api(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify(data) }); setListingEditing(null); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to update listing"); }
    finally { setBusy(false); }
  };

  const pauseListing = async (id: string, paused: boolean) => {
    setBusy(true); setError(""); setListingMessage("");
    try {
      await api(`/api/listings/${id}`, { method: "PATCH", body: JSON.stringify({ status: paused ? "Paused" : "Active" }) });
      setListings(prev => prev.map(item => item.id === id ? { ...item, status: paused ? "Paused" : "Active" } : item));
      showListingMessage(paused ? "Item paused successfully." : "Item resumed successfully.");
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update listing status"); }
    finally { setBusy(false); }
  };

  const removeListing = async (id: string) => {
    if (!window.confirm("Remove this item permanently from your inventory?")) return;
    setBusy(true); setError(""); setListingMessage("");
    setListings(prev => prev.filter(item => item.id !== id));
    try {
      await api(`/api/listings/${id}`, { method: "DELETE" });
      showListingMessage("Item removed successfully from your inventory.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove listing");
      await refresh();
    } finally { setBusy(false); }
  };

  const respondToRequest = async (id: string, action: "accept" | "decline" | "counter") => {
    const price = requestPrices[id] ? Number(requestPrices[id]) : undefined;
    const req = requirements.find(r => r.id === id);
    const original = Number(req?.offer?.originalPrice ?? req?.offer?.offeredPrice ?? req?.items?.[0]?.minPrice ?? 0);

    if (action === "counter" && (!price || price <= 0)) {
      return setError("Enter a valid counter price first.");
    }

    if (action === "counter" && original > 0 && (price! < Math.max(0, original - 50) || price! > original + 50)) {
      return setError(`Counter price must stay between ${money(Math.max(0, original - 50))} and ${money(original + 50)} per unit.`);
    }

    setBusy(true);
    setError("");

    try {
      const result = await api<{ offer?: ApiRequirement["offer"]; order?: ApiOrder | null }>(
        `/api/requirements/${id}/farmer-response`,
        {
          method: "POST",
          body: JSON.stringify({ action, ...(price ? { price } : {}) }),
        },
      );

      const backendPrice = result.offer?.offeredPrice;
      if (backendPrice != null) {
        setRequestPrices(current => ({
          ...current,
          [id]: String(backendPrice),
        }));
      }

      requestPriceDirtyRef.current.delete(id);

      setRequestFlash(current => ({
        ...current,
        [id]: action === "accept" ? "Accepted" : action === "decline" ? "Rejected" : "Countered",
      }));

      window.setTimeout(() => {
        setRequestFlash(current => {
          const next = { ...current };
          delete next[id];
          return next;
        });
        void refresh();
      }, 4000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to respond to request");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!profileEditing) return;
    setLocationQuery(profileDraft.location || "");
  }, [profileEditing, profileDraft.location]);

  useEffect(() => {
    if (locationSelectionRef.current) {
      locationSelectionRef.current = false;
      setLocationSuggestions([]);
      setLocationSearching(false);
      return;
    }

    const q = locationQuery.trim();

    if (!profileEditing || q.length < 3) {
      setLocationSuggestions([]);
      setLocationSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setLocationSearching(true);
        const results = await searchGoogleLocations(q, controller.signal);

        if (!controller.signal.aborted) {
          setLocationSuggestions(results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setLocationSuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLocationSearching(false);
        }
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [locationQuery, profileEditing]);

  const selectLocation = async (item: LocationSuggestion) => {
    try {
      locationSelectionRef.current = true;
      setLocationSearching(true);

      if (item.lat != null && item.lon != null) {
        const latitude = Number(item.lat);
        const longitude = Number(item.lon);

        if (Number.isFinite(latitude) && Number.isFinite(longitude)) {
          setProfileDraft(d => ({
            ...d,
            location: item.display_name,
            latitude,
            longitude,
          }));

          setLocationQuery(item.display_name);
          setLocationSuggestions([]);
          return;
        }
      }

      const details = await getGooglePlaceDetails(item.place_id);

      if (details.lat == null || details.lon == null) {
        throw new Error("Selected location has no coordinates.");
      }

      const location = details.display_name || item.display_name;

      setProfileDraft(d => ({
        ...d,
        location,
        latitude: details.lat,
        longitude: details.lon,
      }));

      setLocationQuery(location);
      setLocationSuggestions([]);
    } catch {
      setError("Unable to get the selected location. Please choose another result.");
    } finally {
      setLocationSearching(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) return setError("Live location is not supported by this browser.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const latitude = pos.coords.latitude, longitude = pos.coords.longitude;
        let location = "";
        try {
          location = await reverseGeocodeGoogleLocation(latitude, longitude);
        } catch { }
        setProfileDraft(d => ({ ...d, latitude, longitude, ...(location ? { location } : {}) }));
        setLocationQuery(location);
      } catch (e) { setError(e instanceof Error ? e.message : "Unable to save location"); }
      finally { setBusy(false); }
    }, err => { setError(err.message || "Location permission was not granted."); setBusy(false); }, { enableHighAccuracy: true, timeout: 12000 });
  };

  const saveProfile = async () => {
    if (!profileDraft.location?.trim() || profileDraft.latitude == null || profileDraft.longitude == null) {
      setError("Farm location is required. Search for your farm location or use the current-location button before saving.");
      setProfileEditing(true);
      setView("Profile");
      return;
    }
    setBusy(true); setError("");
    try {
      const payload = {
        firstName: profileDraft.firstName, lastName: profileDraft.lastName, phone: profileDraft.phone,
        profileImage: profileDraft.profileImage, location: profileDraft.location, latitude: profileDraft.latitude ?? null,
        longitude: profileDraft.longitude ?? null, language: selectedLanguage, farmName: profileDraft.farmName,
        landAcres: profileDraft.landAcres == null ? null : Number(profileDraft.landAcres),
        experience: profileDraft.experience,
      };
      const result = await api<{ user: Profile }>("/api/profile/me", { method: "PATCH", body: JSON.stringify(payload) });
      const merged = { ...result.user, ...(result.user.farmer || {}) };
      setProfile(merged); setProfileDraft(merged);
      setSavedMessage("Changes saved successfully");
      await refresh();
      const savedLocation = Boolean(merged.location?.trim() && merged.latitude != null && merged.longitude != null);
      setProfileEditing(!savedLocation);
      if (savedLocation) {
        window.setTimeout(() => {
          setSavedMessage("");
          setView("Dashboard");
        }, 900);
      }
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to save profile"); }
    finally { setBusy(false); }
  };

  const markRead = async (n: ApiNotification) => {
    if (n.read) return;
    try { await api(`/api/notifications/${n.id}/read`, { method: "POST", body: JSON.stringify({}) }); setNotifications(items => items.filter(x => x.id !== n.id)); }
    catch { /* keep notification visible if the backend is temporarily unavailable */ }
  };

  const sendSupport = async (e: FormEvent) => {
    e.preventDefault();
    if (!support.subject.trim() || !support.message.trim()) return setError("Enter a subject and message.");
    setBusy(true); setError("");
    try { await api("/api/support", { method: "POST", body: JSON.stringify(support) }); setSupport({ subject: "", message: "" }); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to contact support"); }
    finally { setBusy(false); }
  };

  const profileName = displayName(profile);
  const profileAvatar = profile?.profileImage;

  useEffect(() => {
    if (!profileGateChecked || !profile) return;
    if (!hasFarmerLocation) {
      setView("Profile");
      setProfileEditing(true);
    }
  }, [profileGateChecked, profile, hasFarmerLocation]);

  if (loading) return <div className="buyer-page farmer-loading"><Loader2 className="farmer-spin" size={28} /> Loading Farmer interface…</div>;

  return (
    <div className="buyer-page farmer-page">


      <header className="buyer-header">
        <div className="buyer-header-inner">
          <button type="button" className="buyer-mobile-menu-button" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={22} /></button>
          <button type="button" className="buyer-brand" onClick={() => go("Dashboard")}>
            <span className="buyer-brand-mark"><img src="/Khetlink_Logo.svg" alt="KhetLink Logo" width={38} height={38} /></span>
            <span><strong>KhetLink</strong><small> Farm Fresh • Smart Supply </small></span>
          </button>
          <nav className="buyer-top-nav" aria-label="Farmer navigation">
            {navItems.slice(0, 6).map(({ id, label, icon: Icon }) => <a key={id} href={`#${id.toLowerCase()}`} className={activeView === id ? "active" : ""} onClick={e => { e.preventDefault(); go(id); }}><Icon size={14} strokeWidth={2} /><span>{label}</span></a>)}
          </nav>
          <div className="buyer-header-spacer" />
          <div className="buyer-header-actions">
            <div className="farmer-language-wrap">
              <button type="button" className="buyer-outline-button farmer-language-button" onClick={() => setLanguageOpen(v => !v)}><Languages size={15} /><span>{LANGUAGES.find(x => x[0] === selectedLanguage)?.[1] || "Language"}</span><ChevronDown size={13} /></button>
              {languageOpen && <div className="farmer-language-menu">{LANGUAGES.map(([code, label]) => <button type="button" key={code} onClick={() => chooseLanguage(code)}>{label}{selectedLanguage === code ? " ✓" : ""}</button>)}</div>}
            </div>
            <div className="buyer-notification-wrapper">
              <button type="button" className={`buyer-icon-button ${notificationOpen ? "active" : ""}`} onClick={() => setNotificationOpen(v => !v)} aria-label="Notifications"><Bell size={20} />{unread > 0 && <span className="buyer-notification-count">{unread > 9 ? "9+" : unread}</span>}</button>
              {notificationOpen && <div className="buyer-notification-dropdown">
                <div className="notification-dropdown-header"><div><strong>Notifications</strong><small>{unread} unread</small></div><button type="button" onClick={async () => { try { await api("/api/notifications/read?role=FARMER", { method: "DELETE" }); setNotifications([]); setNotificationOpen(false); } catch { } }}>Mark all read</button></div>
                {!notifications.some(n => !n.read) ? <div className="notification-empty"><Bell size={25} /><p>No notifications yet.</p></div> : notifications.filter(n => !n.read).slice(0, 8).map(n => <div role="button" tabIndex={0} key={n.id} onClick={() => markRead(n)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); markRead(n); } }} className={`notification-item ${n.read ? "" : "unread"}`}><span><CheckCircle2 size={17} /></span><div><strong>{n.title || "Notification"}</strong><p>{n.message}</p><small>{dateTime(n.createdAt)}</small></div></div>)}
              </div>}
            </div>
            <button type="button" className="buyer-profile-button" onClick={() => go("Profile")}>
              <span className="buyer-profile-avatar">{profileAvatar ? <img src={profileAvatar} alt="" /> : initials(profile)}</span>
              <span className="buyer-profile-copy"><strong>{profileName || "Farmer"}</strong><small>{activeView}</small></span>
              <ChevronDown size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="buyer-layout">
        {mobileOpen && <button type="button" className="buyer-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <aside className={`buyer-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
          <div className="buyer-sidebar-mobile-header"><strong>Farmer Menu</strong><button type="button" className="sidebar-close-button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={20} /></button></div>
          <p className="buyer-sidebar-label">Workspace</p>
          <nav className="buyer-sidebar-nav">
            {navItems.filter(({ id }) => id !== "Profile").map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeView === id ? "active" : ""} onClick={() => go(id)}><Icon size={18} strokeWidth={2} /><span>{label}</span></button>)}
          </nav>
        </aside>

        <main className="buyer-main farmer-main">
          {error && <div className="farmer-error buyer-card"><div className="farmer-row"><span>{error}</span><button className="icon-btn" onClick={() => setError("")}><X size={16} /></button></div></div>}

          {activeView === "Dashboard" && <DashboardView stats={stats} profile={profile} weather={weather} listings={listings} requirements={requirements} orders={orders} otherFarmers={otherFarmers} go={go} />}
          {activeView === "Listings" && <ListingsView listings={listings} products={FARMER_CATALOG} newListing={newListing} setNewListing={setNewListing} createListing={createListing} listingEditing={listingEditing} setListingEditing={setListingEditing} updateListing={updateListing} removeListing={removeListing} pauseListing={pauseListing} busy={busy} listingMessage={listingMessage} />}
          {activeView === "Orders" && <OrdersView orders={orders} requirements={requirements} requestPrices={requestPrices} setRequestPrices={setRequestPrices} requestPriceDirtyRef={requestPriceDirtyRef} respondToRequest={respondToRequest} requestFlash={requestFlash} busy={busy} />}
          {activeView === "Shipment" && <ShipmentView orders={orders} />}
          {activeView === "Analytics" && <AnalyticsView listings={listings} orders={orders} requirements={requirements} onRefresh={refresh} />}
          {activeView === "Help" && <HelpView support={support} setSupport={setSupport} sendSupport={sendSupport} tickets={tickets} busy={busy} />}

          {activeView === "Profile" && <ProfileView profile={profile} draft={profileDraft} setDraft={setProfileDraft} editing={profileEditing} setEditing={setProfileEditing} save={saveProfile} captureLocation={captureLocation} busy={busy} language={selectedLanguage} chooseLanguage={chooseLanguage} locationQuery={locationQuery} setLocationQuery={setLocationQuery} locationSuggestions={locationSuggestions} locationSearching={locationSearching} selectLocation={selectLocation} locationRequired={locationRequired} listings={listings} savedMessage={savedMessage} />}
        </main>
      </div>
    </div>
  );
}

function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow green">{eyebrow}</div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>{actions && <div className="farmer-actions">{actions}</div>}</div>;
}

function DashboardView({ stats, profile, weather, listings, requirements, orders, otherFarmers, go }: any) {
  const recentOrders = orders.slice(0, 5);
  const farmerName = displayName(profile);
  return <>
    <section className="dashboard-welcome farmer-dashboard-welcome">
      <div className="dashboard-welcome-copy">
        <div className="eyebrow" style={{ color: "#b9e779" }}>Farmer dashboard</div>
        <h1>{farmerName ? <>Welcome, <span>{farmerName}</span></> : <>Manage your <span>farm supply</span> with KhetLink</>}</h1>
        <p>Manage listings, respond to Buyer requests, track orders and follow shipment progress from one connected workspace.</p>
      </div>
      <div className="dashboard-quick-actions">
        <button className="buyer-outline-button" onClick={() => go("Listings")}><Package size={15} /> Manage listings</button>

      </div>
    </section>
    <div className="dashboard-kpi-grid">
      <Stat icon={<ClipboardList size={19} />} label="Total orders" value={number(stats.totalOrders)} />
      <Stat icon={<span style={{ fontWeight: 900 }}>₹</span>} label="Order value" value={money(stats.earnings)} />
      <Stat icon={<Package size={19} />} label="Active listings" value={number(stats.totalListings)} />
      <Stat icon={<Leaf size={19} />} label="Listed quantity" value={`${number(stats.quantityDisplay)} ${stats.quantityUnit}`} />
    </div>
    <div className="buyer-card farmer-card farmer-weather-card" style={{ marginTop: 16 }}><div className="farmer-card-head"><div><div className="weather-card-kicker"><CloudSun size={15} /> LIVE FARM WEATHER</div><h2 className="farmer-card-title">Weather at your farm</h2><span className="farmer-muted weather-location">{profile?.location || "Your farm location"}</span></div><div className="weather-header-icon"><CloudSun size={22} /></div></div>{weather?.temperature !== undefined ? <div className="weather-app-card"><div className="weather-main-row"><div className="weather-main"><span className="weather-emoji">{weatherEmoji(weather.weatherCode)}</span><div><div className="weather-temp">{Math.round(weather.temperature)}<sup>°C</sup></div><strong>{weather.description}</strong><span className="weather-feels">Feels like {Math.round(weather.apparentTemperature ?? weather.temperature)}°C</span></div></div><div className="weather-upcoming"><div className="weather-upcoming-title">Next hours</div><div className="weather-hour-list">{(weather.hours || []).map((h: WeatherHour) => <div className="weather-hour" key={h.time}><small>{new Date(h.time).toLocaleTimeString([], { hour: "numeric" })}</small><span>{weatherEmoji(h.weatherCode)}</span><strong>{Math.round(h.temperature)}°</strong><em>{weatherDescription(h.weatherCode)}</em></div>)}</div></div></div><div className="weather-details"><div className="weather-detail"><span className="weather-detail-icon"><Droplets size={16} /></span><div><small>Rain</small><strong>{weather.precipitation ?? 0} mm</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><Wind size={16} /></span><div><small>Wind</small><strong>{Math.round(weather.wind ?? 0)} km/h</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><Droplets size={16} /></span><div><small>Humidity</small><strong>{weather.humidity ?? 0}%</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><ThermometerSun size={16} /></span><div><small>Feels like</small><strong>{Math.round(weather.apparentTemperature ?? weather.temperature)}°C</strong></div></div></div><div className="weather-live-note"><span /> Live conditions and hourly forecast from your saved farm location</div></div> : <div className="farmer-empty">Add or capture your farm location in Profile to load live weather conditions.</div>}</div>
    <FarmerAnalyticsCharts listings={listings} orders={orders} requirements={requirements} compact />
    <div className="farmer-two-column" style={{ marginTop: 16 }}>
      <div className="buyer-card farmer-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Buyer requests</h2><button className="buyer-outline-button" onClick={() => go("Orders")}>View requests</button></div>{requirements.length ? requirements.slice(0, 4).map((r: ApiRequirement) => <RequestMini key={r.id} requirement={r} />) : <div className="farmer-empty">No matching buyer requests right now.</div>}</div>
      <div className="buyer-card farmer-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Recent orders</h2><button className="buyer-outline-button" onClick={() => go("Orders")}>All orders</button></div>{recentOrders.length ? recentOrders.map((o: ApiOrder) => <OrderMini key={o.id} order={o} />) : <div className="farmer-empty">No orders yet.</div>}</div>
    </div>
    <div className="buyer-card farmer-card" style={{ marginTop: 16 }}><div className="farmer-card-head"><h2 className="farmer-card-title">Other farmers</h2><span className="farmer-muted" style={{ fontSize: 12 }}>Backend marketplace data only</span></div>{otherFarmers.size ? <div className="farmer-three-column">{[...otherFarmers.values()].slice(0, 6).map((f: any) => <div className="farmer-request-card" key={f.name}><div className="farmer-product-cell"><div className="farmer-product-icon"><img src={getProductImage(f.topProduct || "Product")} alt="" /></div><div><strong>{f.name}</strong><div className="farmer-muted">{number(f.quantity)} {f.unit || "kg"} available</div></div></div><div style={{ marginTop: 10 }}>{money(f.price)} / unit · {f.count} listing(s)</div></div>)}</div> : <div className="farmer-empty">No other-farmer records are available from the current backend listing feed.</div>}</div>
  </>;
}

function ChartModeControl({ value, onChange }: { value: "bar" | "pie" | "line"; onChange: (value: "bar" | "pie" | "line") => void }) {
  return <div className="chart-mode-control">{(["bar", "pie", "line"] as const).map(mode => <button type="button" key={mode} className={value === mode ? "active" : ""} onClick={() => onChange(mode)}>{mode === "bar" ? "Bar" : mode === "pie" ? "Pie" : "Line"}</button>)}</div>;
}

function FlexibleChart({ data, mode, dataKey, unitLabel = "" }: { data: Array<{ name: string; value: number }>; mode: "bar" | "pie" | "line"; dataKey?: string; unitLabel?: string }) {
  const key = dataKey || "value";
  const fills = farmerAnalyticsPalette.map(([r, g, b]) => `rgb(${r}, ${g}, ${b})`);
  if (mode === "pie") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey={key} nameKey="name" cx="50%" cy="50%" outerRadius={92} label>{data.map((item, index) => <Cell key={`${item.name}-${index}`} fill={fills[index % fills.length]} />)}</Pie><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Legend /></PieChart></ResponsiveContainer>;
  if (mode === "line") return <ResponsiveContainer width="100%" height="100%"><RechartsLineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Line type="monotone" dataKey={key} stroke="#16834a" strokeWidth={3} dot={{ r: 4 }} /></RechartsLineChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Bar dataKey={key} radius={[6, 6, 0, 0]}>{data.map((item, index) => <Cell key={`${item.name}-${index}`} fill={fills[index % fills.length]} />)}</Bar></BarChart></ResponsiveContainer>;
}


const pdfGreen: [number, number, number] = [20, 105, 55];
const pdfLightGreen: [number, number, number] = [239, 247, 242];
const pdfBorder: [number, number, number] = [205, 220, 211];
const pdfDark: [number, number, number] = [35, 45, 40];
const pdfMuted: [number, number, number] = [105, 115, 110];

const loadKhetLinkLogo = async (): Promise<string | null> => {
  try {
    const response = await fetch("/Khetlink_Logo.svg", { cache: "force-cache" });
    if (!response.ok) return null;
    const svgBlob = await response.blob();
    const image = new Image();
    const objectUrl = URL.createObjectURL(svgBlob);
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Unable to load logo"));
      image.src = objectUrl;
    });
    const canvas = document.createElement("canvas");
    canvas.width = 500; canvas.height = 500;
    const context = canvas.getContext("2d");
    if (!context) { URL.revokeObjectURL(objectUrl); return null; }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(objectUrl);
    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
};

const drawPdfHeader = async (doc: jsPDF, title: string, subtitle: string) => {
  const pageWidth = doc.internal.pageSize.getWidth();
  doc.setFillColor(...pdfLightGreen); doc.rect(0, 0, pageWidth, 78, "F");
  const logo = await loadKhetLinkLogo();
  if (logo) {
    doc.addImage(logo, "JPEG", 28, 12, 48, 48);
  } else {
    doc.setFillColor(...pdfGreen); doc.circle(52, 36, 22, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.text("KL", 52, 40, { align: "center" });
  }
  doc.setTextColor(...pdfGreen); doc.setFont("helvetica", "bold"); doc.setFontSize(24); doc.text("KHETLINK", 88, 31);
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...pdfMuted); doc.text("FARM TO BUSINESS", 89, 43);
  doc.setTextColor(...pdfDark); doc.setFont("helvetica", "bold"); doc.setFontSize(17); doc.text(title, pageWidth - 28, 29, { align: "right" });
  doc.setFont("helvetica", "normal"); doc.setFontSize(9); doc.setTextColor(...pdfMuted); doc.text(subtitle, pageWidth - 28, 43, { align: "right" });
  doc.setDrawColor(...pdfBorder); doc.line(28, 78, pageWidth - 28, 78);
};

const drawPdfLabel = (doc: jsPDF, label: string, value: string, x: number, y: number, width = 250) => {
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...pdfMuted); doc.text(label.toUpperCase(), x, y);
  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(...pdfDark);
  doc.text(doc.splitTextToSize(value || "—", width), x, y + 13);
};

const drawPdfTableHeader = (doc: jsPDF, y: number, columns: { label: string; x: number; width: number; align?: "left" | "right" | "center" }[]) => {
  doc.setFillColor(...pdfGreen); doc.roundedRect(28, y, doc.internal.pageSize.getWidth() - 56, 27, 2, 2, "F");
  doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(255, 255, 255);
  columns.forEach(column => { const align = column.align || "left"; const textX = align === "right" ? column.x + column.width : align === "center" ? column.x + column.width / 2 : column.x; doc.text(column.label, textX, y + 17, { align }); });
};

const drawPdfFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.getHeight(), pageWidth = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...pdfBorder); doc.line(28, pageHeight - 48, pageWidth - 28, pageHeight - 48);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...pdfMuted);
  doc.text("Generated by KhetLink • Farm to Business", 28, pageHeight - 31);
  doc.text(`Generated on ${new Date().toLocaleString("en-IN")}`, pageWidth - 28, pageHeight - 31, { align: "right" });
};

function FarmerAnalyticsCharts({ listings, orders, requirements = [], compact = false, onRefresh }: { listings: ApiListing[]; orders: ApiOrder[]; requirements?: ApiRequirement[]; compact?: boolean; onRefresh?: () => Promise<void> }) {
  const [range, setRange] = useState<"week" | "month" | "custom">("month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [inventoryMode, setInventoryMode] = useState<"bar" | "pie" | "line">("bar");
  const [inventoryUnit, setInventoryUnit] = useState<"kg" | "L" | "ton" | "dozen">("kg");
  const [statusMode, setStatusMode] = useState<"bar" | "pie" | "line">("pie");
  const [frequentMode, setFrequentMode] = useState<"bar" | "pie" | "line">("bar");

  const now = new Date();
  const currentStart = range === "week"
    ? (() => { const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return d.getTime(); })()
    : range === "month"
      ? new Date(now.getFullYear(), now.getMonth(), 1).getTime()
      : customStart ? new Date(`${customStart}T00:00:00`).getTime() : 0;
  const currentEnd = range === "custom" && customEnd
    ? new Date(`${customEnd}T23:59:59.999`).getTime()
    : Date.now();
  const previousStart = range === "week"
    ? currentStart - 7 * 86400000
    : range === "month"
      ? new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime()
      : currentStart - Math.max(1, currentEnd - currentStart + 1);

  const current = orders.filter(o => {
    const t = new Date(o.createdAt || 0).getTime();
    return o.status !== "CANCELLED" && t >= currentStart && t <= currentEnd;
  });
  const previousOrders = orders.filter(o => {
    const t = new Date(o.createdAt || 0).getTime();
    return o.status !== "CANCELLED" && t >= previousStart && t < currentStart;
  });

  const inventory = listings.map(l => ({
    name: l.product?.name || "Product",
    value: (() => {
      const kg = toKg(Number(l.quantity || 0), l.unit || "kg");
      const converted = fromKg(kg, inventoryUnit);
      return inventoryUnit === "dozen" ? Math.floor(converted) : Number(converted.toFixed(2));
    })(),
  }));

  const statuses = ["CONFIRMED", "PROCESSING", "IN_TRANSIT", "DELIVERED", "CANCELLED"]
    .map(name => ({
      name: name.replaceAll("_", " "),
      value: orders.filter(o => o.status === name).length,
    }));

  const frequent = (source: ApiOrder[]) => {
    const m = new Map<string, number>();
    source.forEach(o => (o.items || []).forEach(i => {
      const name = i.product?.name || "Product";
      m.set(name, (m.get(name) || 0) + Number(i.quantity || 0));
    }));
    return [...m.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  };

  const freq = frequent(current);
  const prevMap = new Map(frequent(previousOrders).map(x => [x.name, x.value]));
  const change = (value: number, old: number) =>
    old === 0 ? (value ? 100 : 0) : ((value - old) / old) * 100;

  const exportAnalyticsReport = async () => {
    if (!orders.length) { alert("There is no analytics data available to export."); return; }

    const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const included = orders.filter(o => o.status !== "CANCELLED");
    const totalSales = included.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalQuantity = included.reduce((sum, o) => sum + (o.items || []).reduce((s, i) => s + toKg(Number(i.quantity || 0), i.unit || "kg"), 0), 0);
    const average = included.length ? totalSales / included.length : 0;
    const delivered = included.filter(o => o.status === "DELIVERED").length;
    const timeline = range === "month"
      ? new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : range === "week"
        ? (() => { const a = new Date(); a.setHours(0, 0, 0, 0); a.setDate(a.getDate() - ((a.getDay() + 6) % 7)); const b = new Date(a); b.setDate(b.getDate() + 6); return `${a.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} – ${b.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`; })()
        : `${customStart || "Start"} – ${customEnd || "End"}`;

    await drawPdfHeader(doc, "Analytics report", `Timeline: ${timeline}`);

    // KPI row — same geometry as the Buyer report.
    const cardY = 96; const gap = 12; const cardW = (pageWidth - 56 - gap * 3) / 4;
    const cards = [
      ["TOTAL SALES", pdfMoney(totalSales), "Included orders"],
      ["TOTAL ORDERS", String(included.length), "Included orders"],
      ["TOTAL QUANTITY", `${totalQuantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`, "Converted to kg"],
      ["AVG ORDER VALUE", pdfMoney(average), "Per included order"],
    ];
    cards.forEach((card, index) => {
      const x = 28 + index * (cardW + gap);
      doc.setFillColor(255, 255, 255); doc.setDrawColor(...pdfBorder); doc.setLineWidth(1); doc.roundedRect(x, cardY, cardW, 70, 5, 5, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(...pdfMuted); doc.text(card[0], x + 13, cardY + 19);
      doc.setFontSize(16); doc.setTextColor(...pdfDark); doc.text(card[1], x + 13, cardY + 44);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...pdfMuted); doc.text(card[2], x + 13, cardY + 59);
    });

    // Order Value Trend + Product Quantity + Order Distribution.
    const trendX = 28, trendY = 178, trendW = 260, trendH = 160;
    const drawChartBox = (x: number, y: number, w: number, h: number, title: string, subtitle: string) => {
      doc.setFillColor(255, 255, 255); doc.setDrawColor(...pdfBorder); doc.roundedRect(x, y, w, h, 5, 5, "FD");
      doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...pdfDark); doc.text(title, x + 15, y + 21);
      doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...pdfMuted); doc.text(subtitle, x + 15, y + 35);
    };
    drawChartBox(trendX, trendY, trendW, trendH, "Order Value Trend", "Order value by chronological sale");
    const trendOrders = [...included].sort((a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime());
    const vals = trendOrders.map(o => Number(o.total || 0)); const maxVal = Math.max(...vals, 1);
    const cx = trendX + 38, cy = trendY + 52, cw = trendW - 58, ch = trendH - 78;
    doc.setDrawColor(88, 99, 93); doc.setLineWidth(.7); doc.line(cx, cy, cx, cy + ch); doc.line(cx, cy + ch, cx + cw, cy + ch);
    for (let step = 0; step <= 3; step++) { const value = maxVal * step / 3; const yy = cy + ch - (value / maxVal) * ch; doc.setDrawColor(225, 232, 227); doc.line(cx, yy, cx + cw, yy); doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...pdfMuted); doc.text(pdfMoney(value), cx - 5, yy + 2, { align: "right" }); }
    if (vals.length) { const stepX = vals.length === 1 ? 0 : cw / (vals.length - 1); vals.forEach((v, i) => { const px = cx + (vals.length === 1 ? cw / 2 : i * stepX); const py = cy + ch - (v / maxVal) * ch; if (i) { const pv = vals[i - 1]; const ppx = cx + (vals.length === 1 ? cw / 2 : (i - 1) * stepX); const ppy = cy + ch - (pv / maxVal) * ch; doc.setDrawColor(20, 131, 74); doc.setLineWidth(2); doc.line(ppx, ppy, px, py); } doc.setFillColor(20, 131, 74); doc.circle(px, py, 2.5, "F"); doc.setFont("helvetica", "normal"); doc.setFontSize(6); doc.setTextColor(...pdfMuted); doc.text(String(i + 1), px, cy + ch + 13, { align: "center" }); }); }
    doc.setFontSize(6); doc.text("Purchase sequence", cx + cw / 2, cy + ch + 27, { align: "center" }); doc.setTextColor(...pdfDark); doc.text("Order Value", trendX + trendW - 12, trendY + trendH - 10, { align: "right" });

    const productX = 300, productY = 178, productW = 245, productH = 160;
    drawChartBox(productX, productY, productW, productH, "Product Quantity", "Quantity sold by product");
    const qtyMap = new Map<string, number>(); included.forEach(o => (o.items || []).forEach(i => qtyMap.set(i.product?.name || "Product", (qtyMap.get(i.product?.name || "Product") || 0) + toKg(Number(i.quantity || 0), i.unit || "kg"))));
    const qtyRows = [...qtyMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5); const maxQty = Math.max(...qtyRows.map(x => x[1]), 1); let qy = productY + 58;
    qtyRows.forEach(([name, val], index) => { const color = farmerAnalyticsPalette[index % farmerAnalyticsPalette.length]; doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...pdfDark); doc.text(name.slice(0, 18), productX + 15, qy); doc.setFillColor(...color); doc.rect(productX + 82, qy - 7, 120 * val / maxQty, 9, "F"); doc.setTextColor(...pdfMuted); doc.setFontSize(7); doc.text(`${Number(val.toFixed(2))}`, productX + 218, qy, { align: "right" }); qy += 18; });
    doc.setFontSize(7); doc.setTextColor(...pdfDark); doc.text("Product", productX + 15, productY + 145); doc.text("Quantity", productX + 205, productY + 145, { align: "right" });

    const statusX = 557, statusY = 178, statusW = 260, statusH = 160;
    drawChartBox(statusX, statusY, statusW, statusH, "Order Distribution", "Order count by status");
    const statusRows = ["CONFIRMED", "PROCESSING", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map(name => [name, included.filter(o => o.status === name).length] as [string, number]);
    const pieTotal = Math.max(statusRows.reduce((sum, [, val]) => sum + val, 0), 1);
    const pieCx = statusX + 82, pieCy = statusY + 88, pieR = 47;
    const pieColors = [[20, 131, 74], [241, 181, 27], [59, 130, 246], [239, 139, 44], [213, 59, 57]] as Array<[number, number, number]>;
    let pieAngle = -Math.PI / 2;
    statusRows.forEach(([name, val], index) => {
      if (!val) return;
      const nextAngle = pieAngle + (val / pieTotal) * Math.PI * 2;
      const mid = (pieAngle + nextAngle) / 2;
      const color = pieColors[index % pieColors.length];
      doc.setFillColor(...color);
      const steps = Math.max(4, Math.ceil((nextAngle - pieAngle) / (Math.PI / 18)));
      let prevX = pieCx + Math.cos(pieAngle) * pieR;
      let prevY = pieCy + Math.sin(pieAngle) * pieR;
      for (let step = 1; step <= steps; step++) {
        const a = pieAngle + (nextAngle - pieAngle) * step / steps;
        const nx = pieCx + Math.cos(a) * pieR;
        const ny = pieCy + Math.sin(a) * pieR;
        doc.triangle(pieCx, pieCy, prevX, prevY, nx, ny, "F");
        prevX = nx; prevY = ny;
      }
      if (val / pieTotal >= 0.08) {
        doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(255, 255, 255);
        doc.text(`${Math.round((val / pieTotal) * 100)}%`, pieCx + Math.cos(mid) * pieR * .58, pieCy + Math.sin(mid) * pieR * .58, { align: "center" });
      }
      pieAngle = nextAngle;
    });
    doc.setFillColor(255, 255, 255); doc.circle(pieCx, pieCy, 17, "F");
    doc.setFont("helvetica", "bold"); doc.setFontSize(7); doc.setTextColor(...pdfDark); doc.text(String(pieTotal), pieCx, pieCy + 2, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(6);
    statusRows.forEach(([name, val], index) => {
      const ly = statusY + 48 + index * 20;
      const lx = statusX + 145;
      doc.setFillColor(...pieColors[index % pieColors.length]); doc.roundedRect(lx, ly - 6, 7, 7, 1, 1, "F");
      doc.setTextColor(...pdfDark); doc.text(name.replaceAll("_", " "), lx + 12, ly); doc.setTextColor(...pdfMuted); doc.text(String(val), statusX + 238, ly, { align: "right" });
    });

    // Summary row mirrors the Buyer report's compact summary section.
    const summaryY = 356;
    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...pdfGreen); doc.text("Report Summary", 28, summaryY);
    const summary = [
      ["Orders included", String(included.length)],
      ["Delivered orders", String(delivered)],
      ["Average order value", pdfMoney(average)],
      ["Total quantity", `${totalQuantity.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`],
      ["Total sales", pdfMoney(totalSales)],
    ];
    let rsY = summaryY + 22; summary.forEach((row, i) => { if (i % 2 === 0) { doc.setFillColor(248, 251, 249); doc.rect(28, rsY - 11, 250, 20, "F"); } doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...pdfDark); doc.text(row[0], 42, rsY + 2); doc.text(row[1], 265, rsY + 2, { align: "right" }); rsY += 20; });

    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(...pdfGreen); doc.text("Requirement Status", 300, summaryY);
    doc.setFont("helvetica", "normal"); doc.setFontSize(7); doc.setTextColor(...pdfMuted); doc.text("Requirement count by status", 300, summaryY + 15);
    const reqStatusNames = ["Matched", "Pending", "Not Found", "Confirmed", "Closed"];
    const reqStatusCounts = reqStatusNames.map(name => { const value = requirements.filter(r => { const status = String(r.status || "").toUpperCase(); return name === "Pending" ? ["DRAFT", "SEARCHING", "PENDING", "BROWSE_PRODUCTS"].includes(status) : status === name.toUpperCase(); }).length; return [name, value] as [string, number]; });
    let ry = summaryY + 35; reqStatusCounts.forEach(([name, val]) => { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(...pdfDark); doc.text(name, 300, ry); doc.setTextColor(...pdfMuted); doc.text(String(val), 540, ry, { align: "right" }); ry += 20; });

    doc.setTextColor(...pdfGreen); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text("KhetLink Farmer Analytics", 28, pageHeight - 83);
    drawPdfFooter(doc);
    doc.save(`khetlink-analytics-${new Date().toISOString().slice(0, 10)}.pdf`);
  };

  const activeListings = listings.filter(l => String(l.status || "Active").toUpperCase() !== "PAUSED").length;
  const orderValue = current.reduce((sum, o) => sum + (o.items || []).reduce((itemSum, i) => itemSum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0), 0);
  const listedQuantityKg = listings.reduce((sum, l) => sum + toKg(Number(l.quantity || 0), l.unit || "kg"), 0);
  const listedQuantityDisplay = listedQuantityKg >= 1000 ? `${(listedQuantityKg / 1000).toLocaleString("en-IN", { maximumFractionDigits: 2 })} ton` : `${listedQuantityKg.toLocaleString("en-IN", { maximumFractionDigits: 2 })} kg`;

  const analyticsCards = (
    <div className="analytics-kpi-grid">
      <article className="kpi-card"><small>Total Orders</small><strong>{current.length}</strong><span>Based on selected timeline</span></article>
      <article className="kpi-card"><small>Order Value</small><strong>{money(orderValue)}</strong><span>Based on selected timeline</span></article>
      <article className="kpi-card"><small>Active Listings</small><strong>{activeListings}</strong><span>Current active inventory</span></article>
      <article className="kpi-card"><small>Listed Quantity</small><strong>{listedQuantityDisplay}</strong><span>Current listed inventory</span></article>
    </div>
  );

  const chartCards = (
    <div className="dashboard-insights analytics-chart-grid">
      <article className="buyer-card analytics-chart-card">
        <div className="section-header"><h2>Inventory by listing</h2><div className="chart-controls"><select value={inventoryUnit} onChange={e => setInventoryUnit(e.target.value as "kg" | "L" | "ton" | "dozen")} aria-label="Inventory unit"><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select><ChartModeControl value={inventoryMode} onChange={setInventoryMode} /></div></div>
        {inventory.length ? <div className="chart-container"><FlexibleChart data={inventory} mode={inventoryMode} unitLabel={inventoryUnit} /></div> : <div className="chart-empty"><p>No listing data yet.</p></div>}
      </article>
      <article className="buyer-card analytics-chart-card">
        <div className="section-header"><h2>Order status</h2><ChartModeControl value={statusMode} onChange={setStatusMode} /></div>
        {statuses.some(x => x.value) ? <div className="chart-container"><FlexibleChart data={statuses} mode={statusMode} /></div> : <div className="chart-empty"><p>No order status data yet.</p></div>}
      </article>
      <article className="buyer-card analytics-chart-card">
        <div className="section-header"><div><h2>Frequently sold products</h2><p>Top 5 · {range === "week" ? "this week" : range === "month" ? "this month" : "custom range"}</p></div><ChartModeControl value={frequentMode} onChange={setFrequentMode} /></div>
        {freq.length ? <div className="chart-container"><FlexibleChart data={freq} mode={frequentMode} unitLabel="units" /></div> : <div className="chart-empty"><p>No sold-product data yet.</p></div>}
        {freq.length > 0 && <div className="frequent-change-list">{freq.map(x => { const pct = change(x.value, prevMap.get(x.name) || 0); return <div key={x.name}><span>{x.name}</span><strong>{pct >= 0 ? "+" : ""}{pct.toFixed(1)}%</strong></div>; })}</div>}
      </article>
    </div>
  );

  if (compact) {
    return <section className="farmer-dashboard-analytics-preview-wrap">
      <div className="analytics-range-bar buyer-card farmer-dashboard-analytics-range">
        <div className="analytics-range-buttons">
          <button type="button" className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>This Week</button>
          <button type="button" className={range === "month" ? "active" : ""} onClick={() => setRange("month")}>This Month</button>
          <button type="button" className={range === "custom" ? "active" : ""} onClick={() => setRange("custom")}>Custom</button>
        </div>
        {range === "custom" && <div className="analytics-custom-range"><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /><span>to</span><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>}
      </div>
      <section className="dashboard-insights analytics-chart-grid farmer-dashboard-analytics-preview">
        <article className="buyer-card analytics-chart-card"><div className="section-header"><h2>Inventory by listing</h2><div className="chart-controls"><select value={inventoryUnit} onChange={e => setInventoryUnit(e.target.value as "kg" | "L" | "ton" | "dozen")}><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select><ChartModeControl value={inventoryMode} onChange={setInventoryMode} /></div></div>{inventory.length ? <div className="chart-container"><FlexibleChart data={inventory} mode={inventoryMode} unitLabel={inventoryUnit} /></div> : <div className="chart-empty"><p>No listing data yet.</p></div>}</article>
        <article className="buyer-card analytics-chart-card"><div className="section-header"><h2>Order status</h2><ChartModeControl value={statusMode} onChange={setStatusMode} /></div>{statuses.some(x => x.value) ? <div className="chart-container"><FlexibleChart data={statuses} mode={statusMode} /></div> : <div className="chart-empty"><p>No order status data yet.</p></div>}</article>
        <article className="buyer-card analytics-chart-card"><div className="section-header"><div><h2>Frequently sold products</h2><p>Top 5 · {range === "week" ? "this week" : range === "month" ? "this month" : "custom range"}</p></div><ChartModeControl value={frequentMode} onChange={setFrequentMode} /></div>{freq.length ? <div className="chart-container"><FlexibleChart data={freq} mode={frequentMode} unitLabel="units" /></div> : <div className="chart-empty"><p>No sold-product data yet.</p></div>}</article>
      </section>
    </section>;
  }

  return (
    <div className="buyer-main analytics-main">
      <div className="page-heading">
        <div><p className="eyebrow green">ANALYTICS</p><h1>Farm Analytics</h1><p>Understand your order volume, farm inventory, product demand and sales performance.</p></div>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}><button type="button" className="buyer-outline-button" onClick={() => void onRefresh?.()}><RefreshCw size={16} /> Refresh</button><button type="button" className="buyer-outline-button" onClick={exportAnalyticsReport}><Download size={16} /> Export Report</button></div>
      </div>
      <div className="analytics-range-bar buyer-card">
        <div className="analytics-range-buttons"><button type="button" className={range === "week" ? "active" : ""} onClick={() => setRange("week")}>This Week</button><button type="button" className={range === "month" ? "active" : ""} onClick={() => setRange("month")}>This Month</button><button type="button" className={range === "custom" ? "active" : ""} onClick={() => setRange("custom")}>Custom</button></div>
        {range === "custom" && <div className="analytics-custom-range"><input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} /><span>to</span><input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} /></div>}
      </div>
      {analyticsCards}
      {chartCards}
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <article className="dashboard-metric buyer-card"><span>{icon}</span><div><p>{label}</p><strong>{value}</strong></div></article>; }

function RequestMini({ requirement }: { requirement: ApiRequirement }) { return <div className="farmer-list-row"><div className="farmer-row"><div><strong>Request #{requirement.id.slice(0, 8)}</strong><div className="farmer-muted" style={{ fontSize: 12 }}>{requirement.location || "Location not shared"}</div></div><span className={`farmer-pill ${badgeClass(requirement.status)}`}>{requirement.status || "Pending"}</span></div><div className="farmer-request-items">{(requirement.items || []).map((i, idx) => <span className="farmer-item-chip" key={i.id || idx}><img src={getProductImage(i.product?.name || i.productId)} alt="" />{i.product?.name || i.productId} · {i.quantity} {i.unit || "unit"}</span>)}</div></div>; }

function OrderMini({ order }: { order: ApiOrder }) {
  const product = order.items?.[0]?.product?.name || "Order";
  const buyer = [order.buyer?.firstName, order.buyer?.lastName].filter(Boolean).join(" ") || "Buyer";
  const quantity = order.items?.reduce((s, i) => s + Number(i.quantity || 0), 0) || 0;
  const productValue = (order.items || []).reduce((s, i) => s + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0);
  const farmerParticipantCode =
    order.verificationCode ||
    order.participantCodes?.find(c => ["FARMER", "SELLER"].includes(String(c.role || "").toUpperCase()))?.code;
  return <div className="farmer-list-row"><div className="farmer-row"><div><strong>{product}</strong><div className="farmer-muted" style={{ fontSize: 12 }}>Order ID: {orderDisplayId(order)} · {date(order.createdAt)}</div></div><span className={`farmer-pill ${badgeClass(order.status)}`}>{order.status || "—"}</span></div><div className="farmer-row" style={{ marginTop: 7 }}><span className="farmer-muted">Buyer: {buyer}{getBuyerCode(order) !== "—" ? ` · ${getBuyerCode(order)}` : ""}</span><strong>{money(productValue)}</strong></div><div className="farmer-muted" style={{ fontSize: 12, marginTop: 5 }}>{quantity} {order.items?.[0]?.unit || "unit"} · Payment {order.paymentStatus || "—"} · Logistics {getLogisticsCode(order)}{order.paymentStatus === "PAID" && farmerParticipantCode ? ` · Participant code ${farmerParticipantCode}` : ""}</div></div>;
}


function ListingsView({ listings, products, newListing, setNewListing, createListing, listingEditing, setListingEditing, updateListing, removeListing, pauseListing, busy, listingMessage }: any) {
  const [catalogCategory, setCatalogCategory] = useState("All");
  const catalogCategories = ["All", "Vegetables", "Fruits", "Pulses", "Grains", "Spices", "Flowers", "Non-Edible", "Herbs", "Other", "Livestock"];
  const visibleProducts = catalogCategory === "All" ? products : products.filter((p: FarmerCatalogItem) => p.category === catalogCategory);
  return <>
    <PageHead eyebrow="Inventory" title="Listings" subtitle="Create and manage the produce you actually have available." />
    <div className="buyer-card farmer-card listing-create-card" style={{ marginBottom: 16 }}><div className="farmer-card-head"><div><h2 className="farmer-card-title">Add listing</h2><span className="farmer-muted">Choose a produce item from the Farmer catalogue. Your selection is linked to the backend when you save the listing.</span></div><Plus size={19} color="#0d6832" /></div>
      <form onSubmit={createListing}>
        <div className="catalog-category-strip">{catalogCategories.map(category => <button type="button" key={category} className={catalogCategory === category ? "active" : ""} onClick={() => setCatalogCategory(category)}>{category}</button>)}</div>
        <div className="catalog-picker">{visibleProducts.length ? visibleProducts.map((p: FarmerCatalogItem) => <button type="button" key={p.name} className={`catalog-option ${newListing.productName === p.name ? "selected" : ""}`} onClick={() => setNewListing({ ...newListing, productName: p.name })}><img src={catalogImage(p.name, p.image)} alt={`${p.name} produce`} onError={e => { e.currentTarget.src = `https://placehold.co/900x700/f3f8f4/087a43?text=${encodeURIComponent(p.name)}`; }} /><span>{p.name}</span><small>{p.category}</small></button>) : <div className="farmer-empty">No produce in this category.</div>}</div>
        <div className="farmer-form-grid listing-form-grid">
          <div className="farmer-field"><label>Quantity & unit</label><div className="quantity-unit-control"><input className="farmer-input quantity-unit-input" type="number" min={minimumQuantityForUnit(newListing.unit)} step="0.01" inputMode="decimal" placeholder={newListing.unit === "kg" ? "100" : newListing.unit === "dozen" ? "1" : newListing.unit === "L" ? "1" : "0.1"} value={newListing.quantity} onChange={e => setNewListing({ ...newListing, quantity: e.target.value })} /><select className="farmer-select quantity-unit-select" value={newListing.unit} onChange={e => { const next = e.target.value; const current = Number(newListing.quantity || 0); const kg = toKg(current, newListing.unit); let converted = fromKg(kg, next); if (next === "dozen") converted = Math.round(converted); const minimum = minimumQuantityForUnit(next); if (converted < minimum) converted = minimum; setNewListing({ ...newListing, unit: next, quantity: String(Number(converted.toFixed(2))) }); }}><option value="kg">kg</option><option value="dozen">dozen</option><option value="L">litre</option><option value="ton">ton</option><option value="unit">unit</option></select></div></div>
          <div className="farmer-field"><label>Price / unit</label><input className="farmer-input" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Enter price" value={newListing.price} onChange={e => setNewListing({ ...newListing, price: e.target.value })} /></div>
          <button className="buyer-primary-button" disabled={busy || !newListing.productName} style={{ alignSelf: "end" }}>{busy ? <Loader2 className="farmer-spin" size={16} /> : <Plus size={16} />} Add listing</button>
        </div>
      </form>
    </div>
    <div className="buyer-card farmer-card"><div className="farmer-card-head"><div><h2 className="farmer-card-title">My listings</h2><span className="farmer-muted">Your inventory — paused items stay here until you remove them</span></div><span className="farmer-muted">{listings.length} record(s)</span></div>{listingMessage && <div className="listing-flash-message"><CheckCircle2 size={15} /><span>{listingMessage}</span></div>}{!listings.length ? <div className="farmer-empty">You have no listings yet. Add your first backend-persisted listing above.</div> : <div className="farmer-table-wrap"><table className="farmer-table farmer-listings-table"><thead><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Status</th><th>Manage</th></tr></thead><tbody>{listings.map((l: ApiListing) => <ListingRow key={l.id} listing={l} editing={listingEditing === l.id} setEditing={setListingEditing} update={updateListing} remove={removeListing} pause={pauseListing} busy={busy} />)}</tbody></table></div>}</div>
  </>;
}

function ListingRow({ listing, editing, setEditing, update, remove, pause, busy }: any) {
  const [qty, setQty] = useState(String(listing.quantity ?? ""));
  const [price, setPrice] = useState(String(listing.price ?? ""));
  const [unit, setUnit] = useState(String(listing.unit || "kg"));
  const name = listing.product?.name || "Product";
  return <tr><td><div className="farmer-product-cell"><div className="farmer-product-icon"><img src={getProductImage(name, listing.product?.imageUrl || listing.product?.image)} alt="" /></div><div><strong>{name}</strong><div className="farmer-muted">{listing.product?.category?.name || "Catalog product"}</div></div></div></td><td>{editing ? <div className="quantity-unit-control compact"><input className="farmer-input quantity-unit-input" type="number" min={minimumQuantityForUnit(unit)} step="0.01" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} /><select className="farmer-select quantity-unit-select" value={unit} onChange={e => { const next = e.target.value; const kg = toKg(Number(qty || 0), unit); let converted = fromKg(kg, next); if (next === "dozen") converted = Math.round(converted); converted = Math.max(minimumQuantityForUnit(next), converted); const nextPrice = unit === next ? Number(price || 0) : pricePerUnit(Number(price || 0), unit, next); setUnit(next); setQty(String(Number(converted.toFixed(2)))); setPrice(String(Number(nextPrice.toFixed(2)))); }}><option value="kg">kg</option><option value="dozen">dozen</option><option value="L">litre</option><option value="ton">ton</option><option value="unit">unit</option></select></div> : `${number(listing.quantity || 0)} ${listing.unit || ""}`}</td><td>{editing ? <input className="farmer-input" type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} style={{ width: 110 }} /> : money(listing.price || 0)}</td><td><span className={`farmer-pill ${badgeClass(listing.status)}`}>{listing.status || "Active"}</span></td><td>{editing ? <div className="farmer-actions"><button className="buyer-primary-button" disabled={busy} onClick={() => update(listing.id, { quantity: Number(qty), price: Number(price), unit })}><Check size={15} /> Save</button><button className="buyer-outline-button" onClick={() => setEditing(null)}>Cancel</button></div> : <div className="farmer-actions listing-manage-actions"><button className="buyer-outline-button" onClick={() => setEditing(listing.id)}><Pencil size={15} /> Edit</button><button type="button" className="farmer-pause-button" disabled={busy} onClick={() => pause(listing.id, listing.status !== "Paused")}>{listing.status === "Paused" ? <><Play size={15} /> Resume</> : <><Pause size={15} /> Pause</>}</button><button type="button" className="farmer-remove-button" disabled={busy} onClick={() => remove(listing.id)}><Trash2 size={15} /> Remove item</button></div>}</td></tr>;
}

function OrdersView({
  orders,
  requirements,
  requestPrices,
  setRequestPrices,
  requestPriceDirtyRef,
  respondToRequest,
  requestFlash,
  busy,
}: {
  orders: ApiOrder[];
  requirements: ApiRequirement[];
  requestPrices: Record<string, string>;
  setRequestPrices: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  requestPriceDirtyRef: React.MutableRefObject<Set<string>>;
  respondToRequest: (id: string, action: "accept" | "decline" | "counter") => void;
  requestFlash: Record<string, string>;
  busy: boolean;
}) {
  const activeRequirements = requirements.filter(r => r.status !== "CLOSED" && r.status !== "Confirmed");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id ?? null);
  const [orderRange, setOrderRange] = useState<"week" | "month" | "custom">("month");
  const [orderCustomStart, setOrderCustomStart] = useState("");
  const [orderCustomEnd, setOrderCustomEnd] = useState("");
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    const now = new Date();
    let start = 0;
    let end = Date.now();
    if (orderRange === "week") {
      const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
      start = d.getTime();
    } else if (orderRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    } else {
      start = orderCustomStart ? new Date(`${orderCustomStart}T00:00:00`).getTime() : 0;
      end = orderCustomEnd ? new Date(`${orderCustomEnd}T23:59:59.999`).getTime() : Date.now();
    }
    return orders.filter(o => {
      const created = new Date(o.createdAt || 0).getTime();
      if (created < start || created > end) return false;
      if (!q) return true;
      const haystack = [o.id, orderDisplayId(o), o.status, o.items?.map(i => i.product?.name).join(" "), o.buyer?.firstName, o.buyer?.lastName, getBuyerCode(o), getLogisticsCode(o)].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }, [orders, orderSearch, orderRange, orderCustomStart, orderCustomEnd]);

  const exportFarmerOrdersPdf = (
    targetOrders: ApiOrder[],
    singleOrder?: ApiOrder,
  ) => {
    if (!targetOrders.length) return;

    const ordersToExport = singleOrder ? [singleOrder] : targetOrders;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 18;
    const contentWidth = pageWidth - margin * 2;

    const formatMoney = (value: number) =>
      `Rs. ${Number(value || 0).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`;

    const formatDate = (value?: string) => {
      if (!value) return "—";

      const parsed = new Date(value);

      return Number.isNaN(parsed.getTime())
        ? value
        : parsed.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
    };

    const getBuyerName = (order: ApiOrder) =>
      [order.buyer?.firstName, order.buyer?.lastName]
        .filter(Boolean)
        .join(" ") || "Buyer";

    const getProductName = (order: ApiOrder) =>
      order.items?.[0]?.product?.name || "Product";

    const getQuantityText = (order: ApiOrder) => {
      if (!order.items?.length) return "—";

      return order.items
        .map(
          (item) =>
            `${Number(item.quantity || 0).toLocaleString("en-IN")} ${item.unit || "unit"
            }`,
        )
        .join(", ");
    };

    const getProductSubtotal = (order: ApiOrder) =>
      (order.items || []).reduce(
        (sum, item) =>
          sum +
          Number(item.quantity || 0) * Number(item.unitPrice || 0),
        0,
      );

    const drawHeader = (title: string, subtitle?: string) => {
      doc.setFillColor(13, 104, 50);
      doc.rect(0, 0, pageWidth, 32, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.text("KHETLINK", margin, 14);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.text("FARM TO BUSINESS", margin, 21);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.text(title, pageWidth - margin, 14, {
        align: "right",
      });

      if (subtitle) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(subtitle, pageWidth - margin, 21, {
          align: "right",
        });
      }

      doc.setTextColor(30, 30, 30);
    };

    const drawFooter = () => {
      const footerY = pageHeight - 12;

      doc.setDrawColor(220, 220, 220);
      doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(110, 110, 110);

      doc.text(
        "Generated by KhetLink • Farm to Business Marketplace",
        margin,
        footerY,
      );

      doc.text(
        `Page ${doc.getNumberOfPages()}`,
        pageWidth - margin,
        footerY,
        { align: "right" },
      );
    };

    const drawLabel = (
      label: string,
      value: string,
      x: number,
      y: number,
      width: number,
    ) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(label.toUpperCase(), x, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(30, 30, 30);

      const wrapped = doc.splitTextToSize(value || "—", width);
      doc.text(wrapped, x, y + 6);

      return y + 6 + wrapped.length * 4;
    };

    ordersToExport.forEach((order, index) => {
      if (index > 0) {
        doc.addPage();
      }

      drawHeader(
        singleOrder ? "ORDER INVOICE" : "ORDER REPORT",
        `Order ${orderDisplayId(order)}`,
      );

      let y = 45;

      /*
       * Order information
       */
      doc.setFillColor(247, 249, 248);
      doc.roundedRect(
        margin,
        y,
        contentWidth,
        27,
        3,
        3,
        "F",
      );

      let infoY = y + 7;

      drawLabel(
        "Order ID",
        orderDisplayId(order),
        margin + 6,
        infoY,
        55,
      );

      drawLabel(
        "Order date",
        formatDate(order.createdAt),
        margin + 70,
        infoY,
        45,
      );

      drawLabel(
        "Order status",
        order.status || "—",
        margin + 125,
        infoY,
        45,
      );

      drawLabel(
        "Payment",
        order.paymentStatus || "—",
        pageWidth - margin - 55,
        infoY,
        48,
      );

      y += 39;

      /*
       * Buyer / farmer section
       */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 104, 50);
      doc.text("PARTIES", margin, y);

      y += 7;

      const boxGap = 8;
      const boxWidth = (contentWidth - boxGap) / 2;
      const boxHeight = 31;

      doc.setDrawColor(225, 230, 227);
      doc.setFillColor(255, 255, 255);

      doc.roundedRect(
        margin,
        y,
        boxWidth,
        boxHeight,
        3,
        3,
        "FD",
      );

      doc.roundedRect(
        margin + boxWidth + boxGap,
        y,
        boxWidth,
        boxHeight,
        3,
        3,
        "FD",
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("BUYER", margin + 6, y + 8);
      doc.text(
        "FARMER",
        margin + boxWidth + boxGap + 6,
        y + 8,
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);

      doc.text(
        getBuyerName(order),
        margin + 6,
        y + 17,
      );

      doc.text(
        "KhetLink Farmer",
        margin + boxWidth + boxGap + 6,
        y + 17,
      );

      doc.setFontSize(8.5);
      doc.setTextColor(100, 100, 100);

      doc.text(
        "Buyer account",
        margin + 6,
        y + 24,
      );

      doc.text(
        "Seller account",
        margin + boxWidth + boxGap + 6,
        y + 24,
      );

      y += boxHeight + 13;

      /*
       * Product section
       */
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 104, 50);
      doc.text("ORDER DETAILS", margin, y);

      y += 7;

      const tableX = margin;
      const tableY = y;
      const colProduct = 65;
      const colQuantity = 40;
      const colUnitPrice = 42;
      const colAmount =
        contentWidth - colProduct - colQuantity - colUnitPrice;

      doc.setFillColor(13, 104, 50);
      doc.rect(
        tableX,
        tableY,
        contentWidth,
        10,
        "F",
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(255, 255, 255);

      doc.text("PRODUCT", tableX + 5, tableY + 6.5);
      doc.text(
        "QUANTITY",
        tableX + colProduct + 5,
        tableY + 6.5,
      );
      doc.text(
        "PRICE / UNIT",
        tableX + colProduct + colQuantity + 5,
        tableY + 6.5,
      );
      doc.text(
        "AMOUNT",
        tableX + contentWidth - 5,
        tableY + 6.5,
        { align: "right" },
      );

      const productAmount = getProductSubtotal(order);
      const firstItem = order.items?.[0];

      const rowY = tableY + 10;

      doc.setFillColor(249, 251, 250);
      doc.rect(
        tableX,
        rowY,
        contentWidth,
        18,
        "F",
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(35, 35, 35);

      doc.text(
        getProductName(order),
        tableX + 5,
        rowY + 8,
      );

      doc.text(
        getQuantityText(order),
        tableX + colProduct + 5,
        rowY + 8,
      );

      doc.text(
        formatMoney(Number(firstItem?.unitPrice || 0)),
        tableX + colProduct + colQuantity + 5,
        rowY + 8,
      );

      doc.setFont("helvetica", "bold");
      doc.text(
        formatMoney(productAmount),
        tableX + contentWidth - 5,
        rowY + 8,
        { align: "right" },
      );

      y = rowY + 28;

      /*
       * Fees and total
       */
      const logisticsFee = Number(order.logisticsFee || 0);
      const platformFee = Number(order.platformFee || 0);
      const total = Number(
        order.total || productAmount + logisticsFee + platformFee,
      );

      const summaryX = pageWidth - margin - 82;
      const summaryWidth = 82;

      doc.setDrawColor(225, 230, 227);
      doc.roundedRect(
        summaryX,
        y,
        summaryWidth,
        43,
        3,
        3,
        "S",
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(90, 90, 90);

      doc.text(
        "Product subtotal",
        summaryX + 6,
        y + 9,
      );
      doc.text(
        formatMoney(productAmount),
        summaryX + summaryWidth - 6,
        y + 9,
        { align: "right" },
      );

      doc.text(
        "Logistics fee",
        summaryX + 6,
        y + 18,
      );
      doc.text(
        formatMoney(logisticsFee),
        summaryX + summaryWidth - 6,
        y + 18,
        { align: "right" },
      );

      doc.text(
        "Platform fee",
        summaryX + 6,
        y + 27,
      );
      doc.text(
        formatMoney(platformFee),
        summaryX + summaryWidth - 6,
        y + 27,
        { align: "right" },
      );

      doc.setDrawColor(200, 205, 202);
      doc.line(
        summaryX + 6,
        y + 31,
        summaryX + summaryWidth - 6,
        y + 31,
      );

      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(13, 104, 50);

      doc.text(
        "TOTAL",
        summaryX + 6,
        y + 39,
      );

      doc.text(
        formatMoney(total),
        summaryX + summaryWidth - 6,
        y + 39,
        { align: "right" },
      );

      /*
       * Additional order information
       */
      const leftX = margin;
      const detailsY = y + 8;

      drawLabel(
        "Delivery / shipment",
        order.logisticsRoleCode || "Not assigned",
        leftX,
        detailsY,
        90,
      );

      drawLabel(
        "Payment status",
        order.paymentStatus || "—",
        leftX,
        detailsY + 23,
        90,
      );

      drawLabel(
        "Order status",
        order.status || "—",
        leftX,
        detailsY + 46,
        90,
      );

      /*
       * Bottom note
       */
      const noteY = pageHeight - 42;

      doc.setFillColor(247, 249, 248);
      doc.roundedRect(
        margin,
        noteY,
        contentWidth,
        17,
        3,
        3,
        "F",
      );

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(90, 90, 90);

      doc.text(
        "This document is generated from the KhetLink backend order record.",
        margin + 6,
        noteY + 7,
      );

      doc.text(
        "Thank you for using KhetLink.",
        margin + 6,
        noteY + 13,
      );

      drawFooter();
    });

    const filename = singleOrder
      ? `khetlink-order-${orderDisplayId(singleOrder)}.pdf`
      : `khetlink-farmer-orders-${new Date()
        .toISOString()
        .slice(0, 10)}.pdf`;

    doc.save(filename);
  };

  const exportOrder = () => {
    const target = orders.find(o => o.id === selectedOrderId) ?? filteredOrders[0] ?? orders[0];
    if (target) exportFarmerOrdersPdf(orders, target);
  };

  const exportAll = () => {
    if (orders.length) {
      exportFarmerOrdersPdf(orders);
    }
  };
  return (
    <>
      <PageHead
        eyebrow="Orders & requests"
        title="Orders"
        subtitle="Review Buyer requests and the same backend order records used across KhetLink."
        actions={
          <>
            <button type="button" className="buyer-outline-button" onClick={exportOrder}>Export Order PDF</button>
            <button type="button" className="buyer-outline-button" onClick={exportAll}>Export All</button>

          </>
        }
      />
      <div className="buyer-card farmer-card" style={{ marginBottom: 16 }}>
        <div className="farmer-card-head">
          <h2 className="farmer-card-title">Buyer requests</h2>
          <span className="farmer-muted">{activeRequirements.length} matching request(s)</span>
        </div>
        {!activeRequirements.length ? <div className="farmer-empty">No matching buyer requests right now.</div> : activeRequirements.map(r => {
          const buyerName = [r.buyer?.firstName, r.buyer?.lastName].filter(Boolean).join(" ") || "Buyer";
          const original = Number(r.offer?.originalPrice ?? r.items?.[0]?.minPrice ?? 0);
          const current = Number(requestPrices[r.id] ?? r.offer?.offeredPrice ?? original);
          return (
            <div className={`farmer-request-card improved-request-card ${requestFlash[r.id] ? "request-response-flash" : ""}`} key={r.id}>
              {requestFlash[r.id] && <div className="request-flash-banner"><CheckCircle2 size={16} /><strong>{requestFlash[r.id]}</strong><span>Updating backend state…</span></div>}
              <div className="farmer-row">
                <div>
                  <strong>{buyerName}</strong>
                  <div className="farmer-muted" style={{ fontSize: 12 }}>{getRequirementBuyerCode(r) !== "—" ? `Buyer ID ${getRequirementBuyerCode(r)}` : "Buyer ID —"} · {r.buyer?.company || "Organisation not provided"}</div>
                  <div className="farmer-muted" style={{ fontSize: 12 }}>{r.location || r.buyer?.location || "Location not shared"} · {r.distanceKm != null ? `${r.distanceKm} km` : "Distance unavailable"} · Required by {r.items?.[0]?.requiredBy ? date(r.items[0].requiredBy) : "—"}</div>
                </div>
                <span className={`farmer-pill ${badgeClass(r.status)}`}>{r.status || "PENDING"}</span>
              </div>
              <div className="farmer-request-items">{(r.items || []).map((i, idx) => <span className="farmer-item-chip" key={i.id || idx}><img src={getProductImage(i.product?.name || i.productId)} alt="" />{i.product?.name || i.productId} · {i.quantity} {i.unit || "unit"} · {formatPriceRange(i.minPrice, i.maxPrice)} / unit</span>)}</div>
              {r.offer?.status === "COUNTERED" && <div className="counter-price-display"><span>Buyer counter price</span><strong>{money(current)} / unit</strong></div>}
              <div className="farmer-actions">
                <button type="button" className="buyer-primary-button" disabled={busy} onClick={() => respondToRequest(r.id, "accept")}><Check size={15} />{r.offer?.status === "COUNTERED" ? "Confirm" : "Accept"}</button>
                <button type="button" className="farmer-danger-button" disabled={busy} onClick={() => respondToRequest(r.id, "decline")}><X size={15} /> Decline</button>
                <div className="counter-price-box">
                  <label>Counter price / unit</label>
                  <input className="farmer-input" placeholder={String(original || "Price")} type="number" min={Math.max(0, original - 50)} max={original + 50} step="0.01" value={requestPrices[r.id] ?? (r.offer?.offeredPrice != null ? String(r.offer.offeredPrice) : "")} onChange={e => { requestPriceDirtyRef.current.add(r.id); setRequestPrices(p => ({ ...p, [r.id]: e.target.value })); }} />
                  <small>Allowed {money(Math.max(0, original - 50))} – {money(original + 50)}</small>
                </div>
                <button type="button" className="buyer-outline-button" disabled={busy} onClick={() => respondToRequest(r.id, "counter")}><Send size={15} /> Counter</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="farmer-order-toolbar">
        <div className="farmer-order-filters">
          {(["All", "Confirmed", "Processing", "In Transit", "Delivered", "Cancelled"] as const).map(status => <button type="button" key={status} className={status === "All" ? "active" : ""} onClick={() => setOrderSearch(status === "All" ? "" : status)}>{status}</button>)}
        </div>
        <div className="farmer-order-search"><Search size={16} /><input value={orderSearch} onChange={e => setOrderSearch(e.target.value)} placeholder="Search order, buyer or product" /></div>
      </div>
      <div className="orders-range-bar buyer-card farmer-orders-range">
        <div className="analytics-range-buttons">
          <button type="button" className={orderRange === "week" ? "active" : ""} onClick={() => setOrderRange("week")}>This Week</button>
          <button type="button" className={orderRange === "month" ? "active" : ""} onClick={() => setOrderRange("month")}>This Month</button>
          <button type="button" className={orderRange === "custom" ? "active" : ""} onClick={() => setOrderRange("custom")}>Custom</button>
        </div>
        {orderRange === "custom" && <div className="farmer-custom-range"><label>From<input type="date" value={orderCustomStart} onChange={e => setOrderCustomStart(e.target.value)} /></label><span>to</span><label>To<input type="date" value={orderCustomEnd} onChange={e => setOrderCustomEnd(e.target.value)} /></label></div>}
      </div>
      {!orders.length
        ? <div className="buyer-card farmer-card"><div className="farmer-empty">No order records yet.</div></div>
        : !filteredOrders.length
          ? <div className="buyer-card farmer-card"><div className="farmer-empty">No orders match the selected date range or search.</div></div>
          : <div className="buyer-card farmer-card"><div className="farmer-table-wrap"><table className="farmer-table farmer-orders-table"><thead><tr><th>Order ID</th><th>Product</th><th>Buyer</th><th>Value</th><th>Order Status</th><th>Payment Status</th><th>Logistics Status</th><th>Code</th></tr></thead><tbody>{filteredOrders.map(o => <tr key={o.id} className={selectedOrderId === o.id ? "selected" : ""} onClick={() => setSelectedOrderId(o.id)} tabIndex={0} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedOrderId(o.id); } }}>
            <td><button type="button" className="farmer-order-id-select" onClick={e => { e.stopPropagation(); setSelectedOrderId(o.id); }} aria-pressed={selectedOrderId === o.id}><strong>{orderDisplayId(o)}</strong></button><div className="farmer-muted">{date(o.createdAt)}</div><span className={`farmer-pill ${badgeClass(o.status)}`} style={{ marginTop: 5 }}>{o.status || "—"}</span>{o.status === "CANCELLED" && <div className="farmer-muted" style={{ fontSize: 11, marginTop: 4 }}>Order cancelled due to payment failure</div>}</td>
            <td>{(o.items || []).map((i, idx) => <div className="farmer-product-cell farmer-order-product" key={idx}><div className="farmer-product-icon"><img src={getProductImage(i.product?.name)} alt="" /></div><div><strong>{i.product?.name || "Product"}</strong><div className="farmer-muted">{i.quantity} {i.unit || ""}</div></div></div>)}</td>
            <td>{buyerNameFromOrder(o)}<div className="farmer-muted">Buyer ID: <strong>{getBuyerCode(o)}</strong></div></td>
            <td><strong>{o.status === "CANCELLED" ? "—" : money((o.items || []).reduce((sum, i) => sum + Number(i.quantity || 0) * Number(i.unitPrice || 0), 0))}</strong></td>
            <td><span className={`farmer-pill ${badgeClass(o.status)}`}>{o.status === "CANCELLED" ? "Cancelled" : o.status || "—"}</span></td>
            <td>{o.status === "CANCELLED" ? "—" : <span className={`farmer-pill ${badgeClass(o.paymentStatus || o.payment?.status)}`}>{o.paymentStatus || o.payment?.status || "—"}</span>}</td>
            <td>{o.status === "CANCELLED" ? "—" : <span className={`farmer-pill logistics-code-pill`}>{getLogisticsStatus(o)}</span>}</td>
            <td>{o.status === "CANCELLED" ? "—" : (() => { const paymentState = String(o.paymentStatus || o.payment?.status || "").toUpperCase(); const paid = ["PAID", "COMPLETED", "SUCCESS", "SUCCESSFUL"].includes(paymentState); const code = fourCharacterCode(o.logisticsVerificationCode) || fourCharacterCode(getLogisticsCode(o)); return paid ? <strong className="farmer-order-code logistics-order-code">{code || makeFourCharacterDisplayCode("FARMER-LOGISTICS", o.id, o.logisticsRoleCode || "LOGISTICS")}</strong> : "—"; })()}</td>
          </tr>)}</tbody></table></div></div>}
    </>
  );
}

function ShipmentStep({ title, done }: { title: string; done: boolean }) { return <div className={`shipment-step ${done ? "done" : ""}`}><span>{done ? "✓" : ""}</span><strong>{title}</strong></div>; }
function TimelineItem({ title, time, done }: { title: string; time: string; done: boolean }) { return <div className={`shipment-timeline-item ${done ? "done" : ""}`}><span>{done ? "✓" : ""}</span><div><strong>{title}</strong><small>{time}</small></div></div>; }

function ShipmentView({ orders }: { orders: ApiOrder[] }) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(sortedOrders[0]?.id ?? null);
  const active = sortedOrders.find(o => o.id === selectedOrderId) ?? sortedOrders[0];
  const cancelled = active?.status === "CANCELLED";
  const shipmentMapRef = useRef<HTMLDivElement | null>(null);
  const shipmentMapInstanceRef = useRef<any>(null);
  const shipmentMapMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelledEffect = false;
    if (!shipmentMapRef.current || cancelled) return;
    void loadGoogleMaps().then(() => {
      if (cancelledEffect || !shipmentMapRef.current) return;
      const g = (window as any).google;
      if (!g?.maps) return;
      const lat = active?.shipment?.currentLat ?? active?.shipment?.pickupLat ?? 20.5937;
      const lng = active?.shipment?.currentLng ?? active?.shipment?.pickupLng ?? 78.9629;
      shipmentMapInstanceRef.current = new g.maps.Map(shipmentMapRef.current, {
        center: { lat, lng },
        zoom: active?.shipment?.currentLat != null && active?.shipment?.currentLng != null ? 14 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      shipmentMapMarkerRef.current = new g.maps.Marker({
        map: shipmentMapInstanceRef.current,
        position: { lat, lng },
        title: active?.logisticsProvider?.name ? `Logistics provider: ${active.logisticsProvider.name}` : "Shipment location",
      });
    }).catch(() => {});
    return () => { cancelledEffect = true; shipmentMapInstanceRef.current = null; shipmentMapMarkerRef.current = null; };
  }, [active?.id, cancelled]);

  useEffect(() => {
    if (!shipmentMapInstanceRef.current || active?.shipment?.currentLat == null || active?.shipment?.currentLng == null) return;
    const position = { lat: active.shipment.currentLat, lng: active.shipment.currentLng };
    shipmentMapMarkerRef.current?.setPosition(position);
    shipmentMapInstanceRef.current.setCenter(position);
    shipmentMapInstanceRef.current.setZoom(14);
  }, [active?.shipment?.currentLat, active?.shipment?.currentLng]);

  return <div className="buyer-main shipment-main">
    <div className="page-heading"><div><p className="eyebrow green">SHIPMENT</p><h1>Shipment Tracking</h1><p>Track confirmed orders and connect this section to your logistics API for live coordinates and events.</p></div><button type="button" className="buyer-outline-button" onClick={() => window.location.reload()}><RefreshCw size={16}/> Refresh</button></div>
    {sortedOrders.length > 0 && <section className="shipment-order-strip buyer-card"><div className="section-heading"><div><h2>Recent Orders</h2><p>Newest first · select an order to track</p></div><span>{sortedOrders.length} orders</span></div><div className="shipment-order-strip-list">{sortedOrders.map(o => <button type="button" key={o.id} className={active?.id===o.id?"active":""} onClick={()=>setSelectedOrderId(o.id)}><strong>{orderDisplayId(o)}</strong><span>{o.items?.[0]?.product?.name || "Order"} · {o.items?.[0]?.quantity || 0} {o.items?.[0]?.unit || "unit"}</span><span className={`farmer-pill ${badgeClass(o.status)}`}>{o.status || "—"}</span></button>)}</div></section>}
    {!active ? <section className="buyer-card empty-state-large"><Truck size={38}/><h2>No active shipment</h2><p>Once a marketplace or procurement order is dispatched, live tracking will appear here.</p></section> :
      <section className="shipment-detail-grid">
        <article className="buyer-card shipment-card">
          <div className="shipment-heading"><div><span className="small-label">ACTIVE ORDER</span><h2>{orderDisplayId(active)} — {active.items?.[0]?.product?.name || "Order"}</h2><p>{[active.buyer?.firstName,active.buyer?.lastName].filter(Boolean).join(" ") || "Buyer"}</p></div><span className={`farmer-pill ${badgeClass(active.status)}`}>{cancelled ? "—" : active.status || "—"}</span></div>
          {cancelled ? <div className="shipment-map-placeholder"><MapIcon size={42}/><strong>Order cancelled</strong><span>Order is cancelled due to payment failure.</span></div> : <div ref={shipmentMapRef} className="shipment-map-placeholder shipment-google-map" aria-label="Live logistics map" />}
          <div className="shipment-route-summary buyer-card"><strong>Pickup</strong><span>{active.shipment?.pickupLocation || "Not available"}</span><strong>Delivery</strong><span>{active.shipment?.deliveryLocation || "Not available"}</span></div>
          {!cancelled && active.logisticsProvider && <section className="shipment-logistics-provider-card">
            <div className="shipment-provider-heading"><div><span className="small-label">LOGISTICS PROVIDER</span><strong>{active.logisticsProvider.name || "Logistics Provider"}</strong></div>{active.logisticsProvider.rating != null && <span className="shipment-provider-rating"><Star size={13} fill="currentColor" />{Number(active.logisticsProvider.rating).toFixed(1)}/5</span>}</div>
            <div className="shipment-provider-grid">
              <div><small>Provider ID</small><strong>{active.logisticsProvider.roleCode || active.logisticsProvider.id || active.logisticsRoleCode || "—"}</strong></div>
              <div><small>Phone</small><strong>{active.logisticsProvider.phone ? <a href={`tel:${active.logisticsProvider.phone}`}>{active.logisticsProvider.phone}</a> : "—"}</strong></div>
              <div><small>Vehicle Type</small><strong>{active.logisticsProvider.vehicleType || "—"}</strong></div>
              <div><small>Vehicle Number</small><strong>{active.logisticsProvider.vehicleNumber || "—"}</strong></div>
              <div><small>Reviews</small><strong>{active.logisticsProvider.reviews ?? 0}</strong></div>
            </div>
          </section>}
          <div className="shipment-steps"><ShipmentStep title="Order Confirmed" done={!cancelled} /><ShipmentStep title="Picked Up" done={!cancelled && active.shipment?.status !== "CONFIRMED"} /><ShipmentStep title="In Transit" done={!cancelled && (active.shipment?.status === "IN_TRANSIT" || active.shipment?.status === "DELIVERED")} /><ShipmentStep title="Delivered" done={!cancelled && active.shipment?.status === "DELIVERED"} /></div>
        </article>
        <aside className="buyer-card shipment-side"><h3>Live Updates</h3>{cancelled ? <TimelineItem title="Order cancelled" time="Order is cancelled due to payment failure." done={false} /> : <><TimelineItem title="Order confirmed" time="System event" done /><TimelineItem title="Dispatch pending" time={active.assignments?.length ? "Logistics assigned" : "Searching logistics provider"} done={!!active.assignments?.length} /><TimelineItem title="In transit" time={active.shipment?.currentLocation || "Live location will appear here"} done={active.shipment?.status === "IN_TRANSIT" || active.shipment?.status === "DELIVERED"} /><TimelineItem title="Delivery complete" time={active.shipment?.deliveryLocation || "Awaiting delivery"} done={active.shipment?.status === "DELIVERED"} /></>}</aside>
      </section>}
  </div>;
}

function AnalyticsView({ listings, orders, requirements, onRefresh }: { listings: ApiListing[]; orders: ApiOrder[]; requirements: ApiRequirement[]; onRefresh: () => Promise<void> }) {
  return <FarmerAnalyticsCharts listings={listings} orders={orders} requirements={requirements} onRefresh={onRefresh} />;
}

function HelpView({ support, setSupport, sendSupport, tickets, busy }: any) {
  return <div className="buyer-main help-main">
    <div className="page-heading">
      <div>
        <p className="eyebrow green">HELP & SUPPORT</p>
        <h1>How can we help?</h1>
        <p>Follow the process and contact KhetLink support when something needs attention.</p>
      </div>
    </div>

    <div className="help-grid buyer-help-process-grid">
      <section className="buyer-card help-card help-process-card">
        <h2>How Farmer orders work</h2>
        {["Keep accurate listings and inventory in the marketplace.", "Review Buyer requests and accept, decline or send a counter offer.", "Once both sides confirm, the backend creates the order.", "Payment and Logistics assignment are tracked through the same order record.", "Shipment status changes are controlled by the Logistics workflow and verification rules."].map((text, index) => (
          <div className="buyer-help-step" key={text}><span>{index + 1}</span><p>{text}</p></div>
        ))}
      </section>

      <section className="buyer-card help-card help-process-card">
        <h2>How Shipment works</h2>
        {["Open Orders to see payment and shipment status for confirmed sales.", "After Logistics is assigned, pickup and delivery information appears on the order.", "Follow the live shipment information and current provider location when available.", "Delivery completion is controlled by the Logistics workflow and verification rules.", "If anything looks incorrect, report the issue through Contact Support."].map((text, index) => (
          <div className="buyer-help-step" key={text}><span>{index + 1}</span><p>{text}</p></div>
        ))}
      </section>
    </div>

    <section className="buyer-card buyer-support-card">
      <div className="buyer-section-heading"><div><span>Need assistance?</span><h2>Contact Support</h2></div><Phone size={20} /></div>
      <p>Report a discrepancy, issue or message. Your support request is stored in the backend.</p>
      <form onSubmit={sendSupport} className="buyer-support-form">
        <input value={support.subject} onChange={e => setSupport({ ...support, subject: e.target.value })} placeholder="Subject" />
        <textarea value={support.message} onChange={e => setSupport({ ...support, message: e.target.value })} placeholder="Describe the issue" />
        <button type="submit" className="buyer-primary-button" disabled={busy}>{busy ? <Loader2 className="farmer-spin" size={16} /> : <Send size={16} />} Contact Support</button>
      </form>
    </section>

    <section className="buyer-card buyer-support-tickets">
      <div className="buyer-section-heading"><div><span>Backend records</span><h2>My support tickets</h2></div></div>
      {tickets.length ? tickets.map((t: ApiTicket) => (
        <div className="buyer-support-ticket" key={t.id}>
          <div><strong>{t.subject}</strong><small>{t.message}</small></div>
          <span>{t.status || "OPEN"}</span>
          <time>{dateTime(t.createdAt)}</time>
        </div>
      )) : <div className="profile-empty"><CircleHelp size={22} /><strong>No support tickets yet</strong><span>Your submitted requests will appear here.</span></div>}
    </section>
  </div>;
}

function ProfileView({ profile, draft, setDraft, editing, setEditing, save, captureLocation, busy, language, chooseLanguage, locationQuery, setLocationQuery, locationSuggestions, locationSearching, selectLocation, locationRequired, listings, savedMessage }: any) {
  const [languageOpenLocal, setLanguageOpenLocal] = useState(false);
  const locationMapRef = useRef<HTMLDivElement | null>(null);
  const locationMapInstanceRef = useRef<any>(null);
  const locationMapMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    if (!locationMapRef.current) return;

    void loadGoogleMaps().then(() => {
      if (cancelled || !locationMapRef.current) return;

      const g = (window as any).google;
      if (!g?.maps) return;

      const lat = draft.latitude ?? 20.5937;
      const lng = draft.longitude ?? 78.9629;

      locationMapInstanceRef.current = new g.maps.Map(
        locationMapRef.current,
        {
          center: { lat, lng },
          zoom: draft.latitude != null && draft.longitude != null ? 14 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        },
      );

      locationMapMarkerRef.current = new g.maps.Marker({
        map: locationMapInstanceRef.current,
        position: { lat, lng },
        title: "Farm location",
      });
    }).catch(() => { });

    return () => {
      cancelled = true;
      locationMapInstanceRef.current = null;
      locationMapMarkerRef.current = null;
    };
  }, [draft.latitude, draft.longitude]);

  useEffect(() => {
    if (!locationMapInstanceRef.current || draft.latitude == null || draft.longitude == null) {
      return;
    }

    const position = {
      lat: draft.latitude,
      lng: draft.longitude,
    };

    locationMapMarkerRef.current?.setPosition(position);
    locationMapInstanceRef.current.setCenter(position);
    locationMapInstanceRef.current.setZoom(14);
  }, [draft.latitude, draft.longitude]);

  const set = (key: string, value: any) => setDraft((d: Profile) => ({ ...d, [key]: value }));
  const produce = Array.from(
    new Map<string, { image: string; quantity: number; unit: string }>(
      (listings || [])
        .filter((l: ApiListing) => Boolean(l.product?.name))
        .map((l: ApiListing) => [
          l.product!.name!,
          {
            image: l.product?.imageUrl || l.product?.image || "",
            quantity: Number(l.quantity || 0),
            unit: l.unit || "kg",
          },
        ])
    ).entries()
  ).map(([name, data]) => ({ name, image: data.image, quantity: data.quantity, unit: data.unit }));
  const backendFarmerId = profile?.farmerId || profile?.farmer?.farmerId || profile?.farmer?.id || profile?.id || "";
  const previewImage = draft?.profileImage || profile?.profileImage;
  return <><PageHead eyebrow="Account" title="Profile" subtitle={locationRequired ? "Add your farm location first to unlock the Farmer workspace." : "Manage your centralized identity and Farmer details."} actions={!editing ? <button className="buyer-primary-button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button> : undefined} />
    {locationRequired && <div className="farmer-location-required"><MapPin size={18} /><div><strong>Farm location required</strong><span>Search for your farm location or use the current-location button, then save your profile. Dashboard, Listings, Orders and other workspace pages will unlock after a valid location is saved.</span></div></div>}
    <div className="profile-cover buyer-card">
      <div className="profile-avatar-section">
        <div className="buyer-profile-avatar-large">{previewImage ? <img src={previewImage} alt={displayName(profile) || "Farmer"} /> : initials(profile)}</div>
        {editing && <label className="profile-upload-button"><Pencil size={15} /> Upload Photo<input type="file" accept="image/*" onChange={e => { const file = e.target.files?.[0]; if (!file || !file.type.startsWith("image/")) return; const reader = new FileReader(); reader.onload = () => set("profileImage", String(reader.result)); reader.readAsDataURL(file); }} /></label>}
      </div>
      <div className="profile-identity"><span className="verified-pill"><Check size={12} /> Verified Farmer</span><h2>{displayName(profile) || "Farmer"}</h2><p>Farmer ID: <strong>{backendFarmerId || "—"}</strong></p>{profile?.farmName?.trim() && <small>{profile.farmName}</small>}</div>
      <div className="profile-mini-stat"><strong>{profile?.farmer?.rating ?? profile?.rating ?? "—"}</strong><span>Rating</span></div>
    </div>
    <div className="profile-content-grid">
      <div className="profile-form-card buyer-card">
        <div className="buyer-section-heading"><div><span>Personal & farm information</span><h2>Profile details</h2></div></div>
        <div className="profile-form-grid">
          {[['First name', 'firstName'], ['Last name', 'lastName'], ['Phone', 'phone'], ['Farm name', 'farmName'], ['Experience', 'experience']].map(([label, key]) => <label className="buyer-field" key={key}><span>{label}</span>{editing ? <input value={(draft as any)[key] || ""} readOnly={key === "firstName" || key === "lastName" || key === "phone"} disabled={key === "firstName" || key === "lastName" || key === "phone"} onChange={e => set(key, e.target.value)} /> : <div className="profile-read-value">{(profile as any)?.[key] || "Not provided"}</div>}</label>)}
          <label className="buyer-field"><span>Land acres</span>{editing ? <input type="number" min="0" value={draft.landAcres ?? ""} onChange={e => set("landAcres", e.target.value === "" ? null : Number(e.target.value))} /> : <div className="profile-read-value">{profile?.landAcres ?? "Not provided"}</div>}</label>
          <label className="buyer-field profile-language-field"><span>Language</span><div className="profile-language-control"><button type="button" className="buyer-outline-button" onClick={() => setLanguageOpenLocal(v => !v)}>{LANGUAGES.find(x => x[0] === language)?.[1] || "English"}<ChevronDown size={13} /></button>{languageOpenLocal && <div className="farmer-language-menu profile-language-menu">{LANGUAGES.map(([code, label]) => <button type="button" key={code} onClick={() => { chooseLanguage(code); setLanguageOpenLocal(false); }}>{label}{language === code ? " ✓" : ""}</button>)}</div>}</div></label>
        </div>
        <div className="profile-location-section"><div className="buyer-section-heading"><div><span>Farm location</span><h2>Location</h2></div></div>
          <div className="location-editor-grid">
            <div className="location-search-box">
              <div className="location-input-wrap"><Search size={15} /><input value={locationQuery} disabled={!editing} onChange={e => { setLocationQuery(e.target.value); setDraft((d: Profile) => ({ ...d, location: e.target.value, latitude: null, longitude: null })); }} placeholder="Search your farm location" /><button type="button" title="Use current location" disabled={!editing || busy} onClick={captureLocation}><MapPin size={16} /></button></div>
              {editing && (locationSearching || locationSuggestions.length > 0) && <div className="location-suggestions">{locationSearching && <div className="location-suggestion muted">Searching locations…</div>}{locationSuggestions.map(item => <button type="button" className="location-suggestion" key={`${item.place_id}-${item.lat ?? ""}-${item.lon ?? ""}`} onClick={() => selectLocation(item)}><MapPin size={14} /><span style={{ display: "block", minWidth: 0, flex: 1, textAlign: "left" }}><strong style={{ display: "block", fontSize: 11, lineHeight: 1.4, fontWeight: 700 }}>{item.display_name}</strong>{item.secondary_text && <small style={{ display: "block", marginTop: 3, color: "#819087", fontSize: 9, lineHeight: 1.35, whiteSpace: "normal" }}>{item.secondary_text}</small>}</span></button>)}</div>}
            </div>

          </div>
        </div>
        {savedMessage && <div className="profile-saved-message"><Check size={15} /><span>{savedMessage}</span></div>}
        {editing && <div className="profile-form-actions"><button type="button" className="buyer-outline-button" onClick={() => { setDraft(profile || {}); setLocationQuery(profile?.location || ""); setEditing(false); }} disabled={busy && !locationRequired}>Cancel</button><button type="button" className="buyer-primary-button" disabled={busy} onClick={save}><Check size={16} /> Save changes</button></div>}
      </div>
      <aside className="profile-side-card buyer-card">
        <div className="buyer-section-heading"><div><span>Catalog activity</span><h2>Your produce</h2></div><Leaf size={18} /></div>
        {produce.length ? <div className="profile-produce-grid">{produce.map((p: any) => <div className="profile-produce-item" key={p.name}>{p.image ? <img src={p.image} alt="" /> : <div className="profile-produce-image-empty"><Leaf size={22} /></div>}<div><strong>{p.name}</strong><small>{number(p.quantity)} {p.unit} available</small></div></div>)}</div> : <div className="profile-empty"><Leaf size={22} /><strong>No produce in your catalogue yet</strong><span>Add a listing to see your actual catalogue activity here.</span></div>}
        <div className="catalog-map-wrap"><div className="catalog-map-heading"><span>Farm location map</span><MapPin size={15} /></div><div className="location-map-card"><div ref={locationMapRef} className="farmer-google-location-map" style={{ width: "100%", height: 240, minHeight: 240 }} /></div></div>
        <div className="profile-info-list"><div className="profile-info-row"><span><Languages size={14} /></span><div><small>Language</small><strong>{LANGUAGES.find(x => x[0] === language)?.[1] || language}</strong></div></div><div className="profile-info-row"><span><MapPin size={14} /></span><div><small>Location</small><strong>{profile?.location || "Not provided"}</strong></div></div><div className="profile-info-row"><span><Star size={14} /></span><div><small>Reviews</small><strong>{profile?.reviewsReceived?.length ?? profile?.farmer?.reviews ?? 0} · {(profile?.reviewsReceived?.length ? profile.reviewsReceived.reduce((sum, r) => sum + Number(r.rating || 0), 0) / profile.reviewsReceived.length : Number(profile?.farmer?.rating || 0)).toFixed(1)}/5</strong></div></div></div>
        <section className="farmer-profile-reviews"><div className="farmer-card-head"><h3 className="farmer-card-title">Buyer reviews</h3><span className="farmer-muted">{profile?.reviewsReceived?.length ?? 0} total</span></div>{profile?.reviewsReceived?.length ? profile.reviewsReceived.slice(0, 8).map(r => <article className="farmer-profile-review" key={r.id}><div className="farmer-row"><strong>{[r.reviewer?.firstName, r.reviewer?.lastName].filter(Boolean).join(" ") || "Buyer"}</strong><span className="farmer-pill good"><Star size={11} fill="currentColor" />{r.rating}/5</span></div><div className="farmer-review-stars">{Array.from({ length: 5 }).map((_, i) => <Star key={i} size={12} fill={i < r.rating ? "currentColor" : "none"} />)}</div><p>{r.comment || "No written comment."}</p></article>) : <div className="farmer-empty">No buyer reviews yet.</div>}</section>
      </aside>
    </div>
  </>;
}
