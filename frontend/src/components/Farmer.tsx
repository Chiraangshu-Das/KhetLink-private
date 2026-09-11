"use client";

import React, { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  BarChart3,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleHelp,
  ClipboardList,
  CloudSun,
  Droplets,
  Wind,
  ThermometerSun,
  Home,
  Languages,
  Leaf,
  Loader2,
  MapPin,
  Menu,
  Package,
  Pause,
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
import "./Buyer.css";
import "./farmer.css";
import "./farmer-profile.css";

type View = "Dashboard" | "Listings" | "Orders" | "Shipment" | "Analytics" | "Help" | "Profile";
type Unit = string;

type ApiListing = {
  id: string;
  farmerId?: string;
  productId: string;
  product?: { id?: string; name?: string; image?: string;
  imageUrl?: string; category?: { name?: string } };
  quantity?: number;
  unit?: string;
  price?: number;
  status?: string;
};

type ApiOrder = {
  id: string;
  status?: string;
  paymentStatus?: string;
  total?: number;
  createdAt?: string;
  buyerId?: string;
  sellerId?: string;
  buyer?: { firstName?: string; lastName?: string };
  seller?: { firstName?: string; lastName?: string };
  items?: Array<{ quantity?: number; unit?: string; unitPrice?: number; product?: { name?: string } }>;
  shipment?: { status?: string; pickupLocation?: string; deliveryLocation?: string; distanceKm?: number } | null;
  assignments?: Array<{ logistics?: { user?: { firstName?: string; lastName?: string } } }>;
  participantCodes?: Array<{ code?: string; role?: string }>;
  payment?: { status?: string; amount?: number } | null;
};

type ApiRequirement = {
  id: string;
  createdAt?: string;
  status?: string;
  location?: string;
  items?: Array<{ id?: string; productId?: string; quantity?: number; unit?: string; minPrice?: number; maxPrice?: number; product?: { name?: string } }>;
  buyer?: { id?: string; location?: string };
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
  farmer?: { id?: string; farmerId?: string; farmName?: string; landAcres?: number | null; experience?: string; produce?: string[]; rating?: number; reviews?: number } | null;
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
const number = (n: number) => (Number(n) || 0).toLocaleString("en-IN");
const date = (v?: string) => v ? new Date(v).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const dateTime = (v?: string) => v ? new Date(v).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "—";
const displayName = (p?: Profile | null) => [p?.firstName, p?.lastName].filter(Boolean).join(" ");
const initials = (p?: Profile | null) => ([p?.firstName?.[0], p?.lastName?.[0]].filter(Boolean).join("") || "F").toUpperCase();

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
  if ([1,2].includes(code ?? -1)) return "Partly cloudy";
  if (code === 3) return "Cloudy";
  if ([45,48].includes(code ?? -1)) return "Foggy";
  if ([51,53,55,56,57].includes(code ?? -1)) return "Drizzle";
  if ([61,63,65,66,67,80,81,82].includes(code ?? -1)) return "Rainy";
  if ([71,73,75,77,85,86].includes(code ?? -1)) return "Snowy";
  if ([95,96,99].includes(code ?? -1)) return "Stormy";
  return "Current conditions";
};

const weatherEmoji = (code?: number) => {
  if (code === 0) return "☀️";
  if ([1,2].includes(code ?? -1)) return "⛅";
  if (code === 3) return "☁️";
  if ([45,48].includes(code ?? -1)) return "🌫️";
  if ([51,53,55,56,57].includes(code ?? -1)) return "🌦️";
  if ([61,63,65,66,67,80,81,82].includes(code ?? -1)) return "🌧️";
  if ([71,73,75,77,85,86].includes(code ?? -1)) return "🌨️";
  if ([95,96,99].includes(code ?? -1)) return "⛈️";
  return "🌤️";
};

const toKg = (quantity:number, unit:string) => unit === "ton" ? quantity*1000 : unit === "dozen" ? quantity*12 : quantity;
const fromKg = (quantity:number, unit:string) => unit === "ton" ? quantity/1000 : unit === "dozen" ? quantity/12 : quantity;
const minimumQuantityForUnit = (unit:string) => fromKg(100, unit);



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
  const [locationSuggestions, setLocationSuggestions] = useState<Array<{display_name:string;lat:string;lon:string}>>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [newListing, setNewListing] = useState({ productName: "", quantity: "100", unit: "kg", price: "" });
  const [listingEditing, setListingEditing] = useState<string | null>(null);
  const [requestPrices, setRequestPrices] = useState<Record<string, string>>({});
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
      const merged = { ...user, ...farmer };
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
    if (r.status === "fulfilled") setRequirements(r.value.requirements || []);
    if (o.status === "fulfilled") setOrders(o.value.orders || []);
    if (n.status === "fulfilled") setNotifications(n.value.notifications || []);
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

  useEffect(() => {
    refresh();
    const onFocus = () => refresh();
    const onVisibility = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible" && !busy && !profileEditingRef.current) refresh();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [busy]);

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
    const totalOrders = orders.length;
    const earnings = orders.filter(o => o.sellerId === profile?.id || !o.buyerId).reduce((sum, o) => sum + Number(o.total || 0), 0);
    const quantity = listings.reduce((sum, l) => sum + Number(l.quantity || 0), 0);
    const productCounts = new Map<string, number>();
    orders.forEach(o => (o.items || []).forEach(i => productCounts.set(i.product?.name || "Product", (productCounts.get(i.product?.name || "Product") || 0) + Number(i.quantity || 0))));
    const topProducts = [...productCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const inventory = listings.map((l: ApiListing) => ({ id: l.id, name: l.product?.name || "Product", quantity: Number(l.quantity || 0), unit: l.unit || "kg" })).slice(0, 8);
    return { totalOrders, earnings, totalListings: listings.length, quantity, topProducts, inventory };
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
      setListingMessage(paused ? "Item paused successfully." : "Item resumed successfully.");
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
      setListingMessage("Item removed successfully from your inventory.");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to remove listing");
      await refresh();
    } finally { setBusy(false); }
  };

  const respondToRequest = async (id: string, action: "accept" | "decline" | "counter") => {
    const price = requestPrices[id] ? Number(requestPrices[id]) : undefined;
    if (action === "counter" && (!price || price <= 0)) return setError("Enter a valid counter price first.");
    setBusy(true); setError("");
    try {
      await api(`/api/requirements/${id}/farmer-response`, { method: "POST", body: JSON.stringify({ action, ...(price ? { price } : {}) }) });
      await refresh();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to respond to request"); }
    finally { setBusy(false); }
  };

  useEffect(() => {
    if (!profileEditing) return;
    setLocationQuery(profileDraft.location || "");
  }, [profileEditing, profileDraft.location]);

  useEffect(() => {
    const q = locationQuery.trim();
    if (!profileEditing || q.length < 3) { setLocationSuggestions([]); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        setLocationSearching(true);
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=5&addressdetails=1&q=${encodeURIComponent(q)}`, { signal: controller.signal, headers: { Accept: "application/json" } });
        const data = await res.json();
        setLocationSuggestions(Array.isArray(data) ? data : []);
      } catch {} finally { setLocationSearching(false); }
    }, 350);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [locationQuery, profileEditing]);

  const selectLocation = async (item: {display_name:string;lat:string;lon:string}) => {
    const latitude = Number(item.lat), longitude = Number(item.lon);
    setProfileDraft(d => ({ ...d, location: item.display_name, latitude, longitude }));
    setLocationQuery(item.display_name); setLocationSuggestions([]);
  };

  const captureLocation = () => {
    if (!navigator.geolocation) return setError("Live location is not supported by this browser.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(async pos => {
      try {
        const latitude = pos.coords.latitude, longitude = pos.coords.longitude;
        let location = "";
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, { headers: { Accept: "application/json" } });
          const data = await res.json(); location = data?.display_name || "";
        } catch {}
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
                <div className="notification-dropdown-header"><div><strong>Notifications</strong><small>{unread} unread</small></div>{unread > 0 && <button type="button" onClick={async () => { try { await Promise.all(notifications.filter(n => !n.read).map(n => markRead(n))); setNotifications([]); setNotificationOpen(false); } catch {} }}>Mark all read</button>}</div>
                {!notifications.some(n => !n.read) ? <div className="notification-empty"><Bell size={25}/><p>No notifications yet.</p></div> : notifications.filter(n => !n.read).slice(0, 8).map(n => <button type="button" key={n.id} onClick={() => markRead(n)} className={`notification-item ${n.read ? "" : "unread"}`}><span><CheckCircle2 size={17}/></span><div><strong>{n.title || "Notification"}</strong><p>{n.message}</p><small>{dateTime(n.createdAt)}</small></div></button>)}
              </div>}
            </div>
            <button type="button" className="buyer-profile-button" onClick={() => go("Profile")}>
              <span className="buyer-profile-avatar">{profileAvatar ? <img src={profileAvatar} alt="" /> : initials(profile)}</span>
              <span className="buyer-profile-copy"><strong>{profileName || "Farmer"}</strong><small>{activeView.toLowerCase()}</small></span>
            </button>
          </div>
        </div>
      </header>

      <div className="buyer-layout">
        {mobileOpen && <button type="button" className="buyer-sidebar-backdrop" aria-label="Close navigation" onClick={() => setMobileOpen(false)} />}
        <aside className={`buyer-sidebar ${mobileOpen ? "mobile-open" : ""}`}>
          <div className="buyer-sidebar-mobile-header"><strong>KhetLink</strong><button type="button" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button></div>
          <div className="buyer-sidebar-label">Farmer workspace</div>
          <div className="buyer-sidebar-nav">
            {navItems.map(({ id, label, icon: Icon }) => <button type="button" key={id} className={activeView === id ? "active" : ""} onClick={() => go(id)}><Icon size={16} /><span>{label}</span></button>)}
          </div>
          <div className="buyer-sidebar-bottom">
            <button type="button" className="farmer-sidebar-refresh" onClick={refresh}><RefreshCw size={15} /><span>Refresh data</span></button>
            <div className="buyer-sidebar-help"><Leaf size={18} /><div><strong>Farmer workspace</strong><span>Live backend data</span></div></div>
          </div>
        </aside>

        <main className="buyer-main farmer-main">
          {error && <div className="farmer-error buyer-card"><div className="farmer-row"><span>{error}</span><button className="icon-btn" onClick={() => setError("")}><X size={16} /></button></div></div>}

          {activeView === "Dashboard" && <DashboardView stats={stats} profile={profile} weather={weather} listings={listings} requirements={requirements} orders={orders} otherFarmers={otherFarmers} go={go} />}
          {activeView === "Listings" && <ListingsView listings={listings} products={FARMER_CATALOG} newListing={newListing} setNewListing={setNewListing} createListing={createListing} listingEditing={listingEditing} setListingEditing={setListingEditing} updateListing={updateListing} removeListing={removeListing} pauseListing={pauseListing} busy={busy} listingMessage={listingMessage} />}
          {activeView === "Orders" && <OrdersView orders={orders} requirements={requirements} requestPrices={requestPrices} setRequestPrices={setRequestPrices} respondToRequest={respondToRequest} busy={busy} />}
          {activeView === "Shipment" && <ShipmentView orders={orders} />}
          {activeView === "Analytics" && <AnalyticsView stats={stats} listings={listings} orders={orders} />}
          {activeView === "Help" && <HelpView support={support} setSupport={setSupport} sendSupport={sendSupport} tickets={tickets} busy={busy} />}
          
          {activeView === "Profile" && <ProfileView profile={profile} draft={profileDraft} setDraft={setProfileDraft} editing={profileEditing} setEditing={setProfileEditing} save={saveProfile} captureLocation={captureLocation} busy={busy} language={selectedLanguage} chooseLanguage={chooseLanguage} locationQuery={locationQuery} setLocationQuery={setLocationQuery} locationSuggestions={locationSuggestions} locationSearching={locationSearching} selectLocation={selectLocation} locationRequired={locationRequired} listings={listings} savedMessage={savedMessage} />}
        </main>
      </div>
    </div>
  );
}

function PageHead({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle?: string; actions?: React.ReactNode }) {
  return <div className="page-heading"><div><div className="eyebrow green">{eyebrow}</div><h1 className="farmer-page-title">{title}</h1>{subtitle && <p className="farmer-page-subtitle">{subtitle}</p>}</div>{actions && <div className="farmer-actions">{actions}</div>}</div>;
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
      <Stat icon={<Leaf size={19} />} label="Listed quantity" value={number(stats.quantity)} />
    </div>
    <div className="buyer-card farmer-card farmer-weather-card" style={{ marginTop: 16 }}><div className="farmer-card-head"><div><div className="weather-card-kicker"><CloudSun size={15}/> LIVE FARM WEATHER</div><h2 className="farmer-card-title">Weather at your farm</h2><span className="farmer-muted weather-location">{profile?.location || "Your farm location"}</span></div><div className="weather-header-icon"><CloudSun size={22}/></div></div>{weather?.temperature !== undefined ? <div className="weather-app-card"><div className="weather-main-row"><div className="weather-main"><span className="weather-emoji">{weatherEmoji(weather.weatherCode)}</span><div><div className="weather-temp">{Math.round(weather.temperature)}<sup>°C</sup></div><strong>{weather.description}</strong><span className="weather-feels">Feels like {Math.round(weather.apparentTemperature ?? weather.temperature)}°C</span></div></div><div className="weather-upcoming"><div className="weather-upcoming-title">Next hours</div><div className="weather-hour-list">{(weather.hours || []).map((h: WeatherHour) => <div className="weather-hour" key={h.time}><small>{new Date(h.time).toLocaleTimeString([], { hour: "numeric" })}</small><span>{weatherEmoji(h.weatherCode)}</span><strong>{Math.round(h.temperature)}°</strong><em>{weatherDescription(h.weatherCode)}</em></div>)}</div></div></div><div className="weather-details"><div className="weather-detail"><span className="weather-detail-icon"><Droplets size={16}/></span><div><small>Rain</small><strong>{weather.precipitation ?? 0} mm</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><Wind size={16}/></span><div><small>Wind</small><strong>{Math.round(weather.wind ?? 0)} km/h</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><Droplets size={16}/></span><div><small>Humidity</small><strong>{weather.humidity ?? 0}%</strong></div></div><div className="weather-detail"><span className="weather-detail-icon"><ThermometerSun size={16}/></span><div><small>Feels like</small><strong>{Math.round(weather.apparentTemperature ?? weather.temperature)}°C</strong></div></div></div><div className="weather-live-note"><span/> Live conditions and hourly forecast from your saved farm location</div></div> : <div className="farmer-empty">Add or capture your farm location in Profile to load live weather conditions.</div>}</div>
    <DashboardAnalytics stats={stats} orders={orders} />
    <div className="farmer-two-column" style={{ marginTop: 16 }}>
      <div className="buyer-card farmer-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Buyer requests</h2><button className="buyer-outline-button" onClick={() => go("Orders")}>View requests</button></div>{requirements.length ? requirements.slice(0, 4).map((r: ApiRequirement) => <RequestMini key={r.id} requirement={r} />) : <div className="farmer-empty">No matching buyer requests right now.</div>}</div>
      <div className="buyer-card farmer-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Recent orders</h2><button className="buyer-outline-button" onClick={() => go("Orders")}>All orders</button></div>{recentOrders.length ? recentOrders.map((o: ApiOrder) => <OrderMini key={o.id} order={o} />) : <div className="farmer-empty">No orders yet.</div>}</div>
    </div>
    <div className="buyer-card farmer-card" style={{ marginTop: 16 }}><div className="farmer-card-head"><h2 className="farmer-card-title">Other farmers</h2><span className="farmer-muted" style={{ fontSize: 12 }}>Backend marketplace data only</span></div>{otherFarmers.size ? <div className="farmer-three-column">{[...otherFarmers.values()].slice(0, 6).map((f: any) => <div className="farmer-request-card" key={f.name}><div className="farmer-product-cell"><div className="farmer-product-icon"><img src={getProductImage(f.topProduct || "Product")} alt="" /></div><div><strong>{f.name}</strong><div className="farmer-muted">{number(f.quantity)} {f.unit || "kg"} available</div></div></div><div style={{ marginTop: 10 }}>{money(f.price)} / unit · {f.count} listing(s)</div></div>)}</div> : <div className="farmer-empty">No other-farmer records are available from the current backend listing feed.</div>}</div>
  </>;
}

function DashboardAnalytics({ stats, orders }: any) {
  const statusCounts = orders.reduce((acc: Record<string, number>, order: ApiOrder) => {
    const status = String(order.status || "Unknown");
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  const maxInventory = Math.max(1, ...stats.inventory.map((item: any) => Number(item.quantity || 0)));
  const maxStatus = Math.max(1, ...Object.values(statusCounts).map(Number));
  const maxFrequent = Math.max(1, ...stats.topProducts.map((item: any) => Number(item[1] || 0)));
  return <section className="dashboard-analytics-section">
    <div className="dashboard-analytics-heading"><div><span className="eyebrow green">Analytics snapshot</span><h2>Farm performance</h2><p>Live charts derived from your current listings and orders.</p></div><BarChart3 size={20}/></div>
    <div className="dashboard-analytics-grid dashboard-analytics-grid-three">
      <div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h3 className="farmer-card-title">Inventory by listing</h3><span className="chart-caption">Current stock</span></div>{stats.inventory.length ? stats.inventory.map((item: any) => <div className="dashboard-chart-row" key={item.id}><div className="dashboard-chart-label"><span>{item.name}</span><strong>{number(item.quantity)} {item.unit}</strong></div><div className="dashboard-chart-track"><span style={{ width: `${Math.max(8, Math.min(100, item.quantity / maxInventory * 100))}%` }}/></div></div>) : <div className="farmer-empty">Your inventory chart will appear after you add a listing.</div>}</div>
      <div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h3 className="farmer-card-title">Order status</h3><span className="chart-caption">Orders</span></div>{Object.keys(statusCounts).length ? Object.entries(statusCounts).map(([status, count]) => <div className="dashboard-chart-row" key={status}><div className="dashboard-chart-label"><span>{status}</span><strong>{String(count)}</strong></div><div className="dashboard-chart-track"><span style={{ width: `${Math.max(8, Number(count) / maxStatus * 100)}%` }}/></div></div>) : <div className="farmer-empty">Order status analytics will appear when orders are created.</div>}</div>
      <div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h3 className="farmer-card-title">Frequently sold products</h3><span className="chart-caption">Order quantity</span></div>{stats.topProducts.length ? stats.topProducts.map((item: any) => <div className="dashboard-chart-row" key={item[0]}><div className="dashboard-chart-label"><span>{item[0]}</span><strong>{number(item[1])}</strong></div><div className="dashboard-chart-track"><span style={{ width: `${Math.max(8, Math.min(100, Number(item[1]) / maxFrequent * 100))}%` }}/></div></div>) : <div className="farmer-empty">Frequently sold products will appear after orders are recorded.</div>}</div>
    </div>
  </section>;
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) { return <div className="buyer-card dashboard-metric farmer-stat"><div className="farmer-stat-icon">{icon}</div><div className="farmer-stat-label">{label}</div><div className="farmer-stat-value">{value}</div></div>; }

function RequestMini({ requirement }: { requirement: ApiRequirement }) { return <div className="farmer-list-row"><div className="farmer-row"><div><strong>Request #{requirement.id.slice(0, 8)}</strong><div className="farmer-muted" style={{ fontSize: 12 }}>{requirement.location || "Location not shared"}</div></div><span className={`farmer-pill ${badgeClass(requirement.status)}`}>{requirement.status || "Pending"}</span></div><div className="farmer-request-items">{(requirement.items || []).map((i, idx) => <span className="farmer-item-chip" key={i.id || idx}><img src={getProductImage(i.product?.name || i.productId)} alt="" />{i.product?.name || i.productId} · {i.quantity} {i.unit || "unit"}</span>)}</div></div>; }

function OrderMini({ order }: { order: ApiOrder }) { const product = order.items?.[0]?.product?.name || "Order"; return <div className="farmer-list-row"><div className="farmer-row"><div><strong>{product}</strong><div className="farmer-muted" style={{ fontSize: 12 }}>#{order.id.slice(0, 8)} · {date(order.createdAt)}</div></div><span className={`farmer-pill ${badgeClass(order.status)}`}>{order.status || "—"}</span></div><div className="farmer-row" style={{ marginTop: 7 }}><span className="farmer-muted">{order.items?.reduce((s, i) => s + Number(i.quantity || 0), 0)} units</span><strong>{money(order.total || 0)}</strong></div></div>; }

function ListingsView({ listings, products, newListing, setNewListing, createListing, listingEditing, setListingEditing, updateListing, removeListing, pauseListing, busy, listingMessage }: any) {
  const [catalogCategory, setCatalogCategory] = useState("All");
  const catalogCategories = ["All", "Vegetables", "Fruits", "Pulses", "Grains", "Spices", "Flowers", "Non-Edible", "Herbs", "Other", "Livestock"];
  const visibleProducts = catalogCategory === "All" ? products : products.filter((p: FarmerCatalogItem) => p.category === catalogCategory);
  return <>
    <PageHead eyebrow="Inventory" title="Listings" subtitle="Create and manage the produce you actually have available." />
    <div className="buyer-card farmer-card listing-create-card" style={{ marginBottom: 16 }}><div className="farmer-card-head"><div><h2 className="farmer-card-title">Add listing</h2><span className="farmer-muted">Choose a produce item from the Farmer catalogue. Your selection is linked to the backend when you save the listing.</span></div><Plus size={19} color="#0d6832"/></div>
      <form onSubmit={createListing}>
        <div className="catalog-category-strip">{catalogCategories.map(category => <button type="button" key={category} className={catalogCategory === category ? "active" : ""} onClick={() => setCatalogCategory(category)}>{category}</button>)}</div>
        <div className="catalog-picker">{visibleProducts.length ? visibleProducts.map((p:FarmerCatalogItem) => <button type="button" key={p.name} className={`catalog-option ${newListing.productName === p.name ? "selected" : ""}`} onClick={() => setNewListing({ ...newListing, productName:p.name })}><img src={catalogImage(p.name, p.image)} alt={`${p.name} produce`} onError={e => { e.currentTarget.src = `https://placehold.co/900x700/f3f8f4/087a43?text=${encodeURIComponent(p.name)}`; }} /><span>{p.name}</span><small>{p.category}</small></button>) : <div className="farmer-empty">No produce in this category.</div>}</div>
        <div className="farmer-form-grid listing-form-grid">
          <div className="farmer-field"><label>Quantity & unit</label><div className="quantity-unit-control"><input className="farmer-input quantity-unit-input" type="number" min={minimumQuantityForUnit(newListing.unit)} step="0.01" inputMode="decimal" placeholder={newListing.unit === "kg" ? "100" : newListing.unit === "dozen" ? "1" : newListing.unit === "L" ? "1" : "0.1"} value={newListing.quantity} onChange={e => setNewListing({ ...newListing, quantity:e.target.value })}/><select className="farmer-select quantity-unit-select" value={newListing.unit} onChange={e => { const next=e.target.value; const current=Number(newListing.quantity || 0); const kg=toKg(current,newListing.unit); let converted=fromKg(kg,next); if (next === "dozen") converted=Math.round(converted); const minimum=minimumQuantityForUnit(next); if (converted < minimum) converted=minimum; setNewListing({ ...newListing, unit:next, quantity:String(Number(converted.toFixed(2))) }); }}><option value="kg">kg</option><option value="dozen">dozen</option><option value="L">litre</option><option value="ton">ton</option><option value="unit">unit</option></select></div></div>
          <div className="farmer-field"><label>Price / unit</label><input className="farmer-input" type="number" min="0.01" step="0.01" inputMode="decimal" placeholder="Enter price" value={newListing.price} onChange={e => setNewListing({ ...newListing, price:e.target.value })}/></div>
          <button className="buyer-primary-button" disabled={busy || !newListing.productName} style={{ alignSelf:"end" }}>{busy ? <Loader2 className="farmer-spin" size={16}/> : <Plus size={16}/>} Add listing</button>
        </div>
      </form>
    </div>
    <div className="buyer-card farmer-card"><div className="farmer-card-head"><div><h2 className="farmer-card-title">My listings</h2><span className="farmer-muted">Your inventory — paused items stay here until you remove them</span></div><span className="farmer-muted">{listings.length} record(s)</span></div>{listingMessage && <div className="listing-flash-message"><CheckCircle2 size={15}/><span>{listingMessage}</span></div>}{!listings.length ? <div className="farmer-empty">You have no listings yet. Add your first backend-persisted listing above.</div> : <div className="farmer-table-wrap"><table className="farmer-table"><thead><tr><th>Product</th><th>Quantity</th><th>Price</th><th>Status</th><th>Manage</th></tr></thead><tbody>{listings.map((l: ApiListing) => <ListingRow key={l.id} listing={l} editing={listingEditing === l.id} setEditing={setListingEditing} update={updateListing} remove={removeListing} pause={pauseListing} busy={busy}/>)}</tbody></table></div>}</div>
  </>;
}

function ListingRow({ listing, editing, setEditing, update, remove, pause, busy }: any) {
  const [qty, setQty] = useState(String(listing.quantity ?? ""));
  const [price, setPrice] = useState(String(listing.price ?? ""));
  const [unit, setUnit] = useState(String(listing.unit || "kg"));
  const name = listing.product?.name || "Product";
  return <tr><td><div className="farmer-product-cell"><div className="farmer-product-icon"><img src={getProductImage(name, listing.product?.imageUrl || listing.product?.image)} alt="" /></div><div><strong>{name}</strong><div className="farmer-muted">{listing.product?.category?.name || "Catalog product"}</div></div></div></td><td>{editing ? <div className="quantity-unit-control compact"><input className="farmer-input quantity-unit-input" type="number" min={minimumQuantityForUnit(unit)} step="0.01" inputMode="decimal" value={qty} onChange={e => setQty(e.target.value)} /><select className="farmer-select quantity-unit-select" value={unit} onChange={e => { const next=e.target.value; const kg=toKg(Number(qty || 0), unit); let converted=fromKg(kg,next); if(next === "dozen") converted=Math.round(converted); converted=Math.max(minimumQuantityForUnit(next), converted); setUnit(next); setQty(String(Number(converted.toFixed(2)))); }}><option value="kg">kg</option><option value="dozen">dozen</option><option value="L">litre</option><option value="ton">ton</option><option value="unit">unit</option></select></div> : `${number(listing.quantity || 0)} ${listing.unit || ""}`}</td><td>{editing ? <input className="farmer-input" type="number" min="0.01" step="0.01" inputMode="decimal" value={price} onChange={e => setPrice(e.target.value)} style={{ width: 110 }} /> : money(listing.price || 0)}</td><td><span className={`farmer-pill ${badgeClass(listing.status)}`}>{listing.status || "Active"}</span></td><td>{editing ? <div className="farmer-actions"><button className="buyer-primary-button" disabled={busy} onClick={() => update(listing.id, { quantity: Number(qty), price: Number(price), unit })}><Check size={15} /> Save</button><button className="buyer-outline-button" onClick={() => setEditing(null)}>Cancel</button></div> : <div className="farmer-actions listing-manage-actions"><button className="buyer-outline-button" onClick={() => setEditing(listing.id)}><Pencil size={15} /> Edit</button><button type="button" className="farmer-pause-button" disabled={busy} onClick={() => pause(listing.id, listing.status !== "Paused")}>{listing.status === "Paused" ? <><Play size={15} /> Resume</> : <><Pause size={15} /> Pause</>}</button><button type="button" className="farmer-remove-button" disabled={busy} onClick={() => remove(listing.id)}><Trash2 size={15} /> Remove item</button></div>}</td></tr>;
}

function OrdersView({ orders, requirements, requestPrices, setRequestPrices, respondToRequest, busy }: { orders: ApiOrder[]; requirements: ApiRequirement[]; requestPrices: Record<string,string>; setRequestPrices: React.Dispatch<React.SetStateAction<Record<string,string>>>; respondToRequest: (id:string, action:"accept"|"decline"|"counter") => void; busy:boolean }) {
  return <><PageHead eyebrow="Orders & requests" title="Orders" subtitle="Review Buyer requests and the same backend order records used across KhetLink." />
    <div className="buyer-card farmer-card" style={{ marginBottom: 16 }}><div className="farmer-card-head"><h2 className="farmer-card-title">Buyer requests</h2><span className="farmer-muted">{requirements.length} matching request(s)</span></div>{!requirements.length ? <div className="farmer-empty">No matching buyer requests right now.</div> : requirements.map(r => <div className="farmer-request-card" key={r.id}><div className="farmer-row"><div><strong>Request #{r.id.slice(0,8)}</strong><div className="farmer-muted" style={{fontSize:12}}>{r.location || r.buyer?.location || "Broad location not shared"} · {date(r.createdAt)}</div></div><span className={`farmer-pill ${badgeClass(r.status)}`}>{r.status || "PENDING"}</span></div><div className="farmer-request-items">{(r.items || []).map((i,idx)=><span className="farmer-item-chip" key={i.id || idx}><img src={getProductImage(i.product?.name || i.productId)} alt="" />{i.product?.name || i.productId} · {i.quantity} {i.unit || "unit"} · ₹{i.minPrice ?? 0}–₹{i.maxPrice ?? 0}</span>)}</div><div className="farmer-actions"><button className="buyer-primary-button" disabled={busy} onClick={() => respondToRequest(r.id,"accept")}><Check size={15}/> Accept</button><button className="farmer-danger-button" disabled={busy} onClick={() => respondToRequest(r.id,"decline")}><X size={15}/> Decline</button><input className="farmer-input" placeholder="Counter price" type="number" min="0.01" step="0.01" inputMode="decimal" value={requestPrices[r.id] || ""} onChange={e => setRequestPrices((p:Record<string,string>) => ({...p,[r.id]:e.target.value}))} style={{width:130}}/><button className="buyer-outline-button" disabled={busy} onClick={() => respondToRequest(r.id,"counter")}><Send size={15}/> Counter</button></div></div>)}</div>
    {!orders.length ? <div className="buyer-card farmer-card"><div className="farmer-empty">No order records yet.</div></div> : <div className="buyer-card farmer-card"><div className="farmer-table-wrap"><table className="farmer-table"><thead><tr><th>Order</th><th>Items</th><th>Value</th><th>Payment</th><th>Shipment</th><th>Logistics</th><th>Code</th></tr></thead><tbody>{orders.map(o => <tr key={o.id}><td><strong>#{o.id.slice(0, 8)}</strong><div className="farmer-muted">{date(o.createdAt)}</div><span className={`farmer-pill ${badgeClass(o.status)}`} style={{ marginTop: 5 }}>{o.status || "—"}</span></td><td>{(o.items || []).map((i, idx) => <div className="farmer-product-cell farmer-order-product" key={idx}><div className="farmer-product-icon"><img src={getProductImage(i.product?.name)} alt="" /></div><div>{i.product?.name || "Product"}<div className="farmer-muted">{i.quantity} {i.unit || ""} × {money(i.unitPrice || 0)}</div></div></div>)}</td><td><strong>{money(o.total || 0)}</strong></td><td><span className={`farmer-pill ${badgeClass(o.paymentStatus || o.payment?.status)}`}>{o.paymentStatus || o.payment?.status || "—"}</span></td><td><span className={`farmer-pill ${badgeClass(o.shipment?.status)}`}>{o.shipment?.status || "—"}</span></td><td>{o.assignments?.[0]?.logistics?.user ? [o.assignments[0].logistics.user.firstName, o.assignments[0].logistics.user.lastName].filter(Boolean).join(" ") : "Not assigned"}</td><td>{o.participantCodes?.length ? o.participantCodes.map(c => <div key={c.code}>{c.code}</div>) : "—"}</td></tr>)}</tbody></table></div></div>}
  </>;
}

function ShipmentView({ orders }: { orders: ApiOrder[] }) {
  const shipments = orders.filter(o => o.shipment);
  return <><PageHead eyebrow="Fulfilment" title="Shipment" subtitle="Shipment status is read from the backend state machine; Farmer cannot arbitrarily change it." />{!shipments.length ? <div className="buyer-card farmer-card"><div className="farmer-empty">No shipments are attached to your orders yet.</div></div> : <div className="farmer-two-column">{shipments.map(o => <div className="buyer-card farmer-card" key={o.id}><div className="farmer-card-head"><h2 className="farmer-card-title">Order #{o.id.slice(0, 8)}</h2><span className={`farmer-pill ${badgeClass(o.shipment?.status)}`}>{o.shipment?.status || "—"}</span></div><div className="farmer-list-row"><div className="farmer-muted">Pickup</div><strong>{o.shipment?.pickupLocation || "Not provided"}</strong></div><div className="farmer-list-row"><div className="farmer-muted">Delivery</div><strong>{o.shipment?.deliveryLocation || "Not provided"}</strong></div><div className="farmer-list-row"><div className="farmer-muted">Distance</div><strong>{o.shipment?.distanceKm != null ? `${o.shipment.distanceKm} km` : "—"}</strong></div><div style={{ marginTop: 14 }}><div className="farmer-muted" style={{ fontSize: 12, marginBottom: 6 }}>Live logistics provider</div><div className="farmer-row"><span>{o.assignments?.[0]?.logistics?.user ? [o.assignments[0].logistics.user.firstName, o.assignments[0].logistics.user.lastName].filter(Boolean).join(" ") : "Not assigned"}</span><Truck size={18} color="#0d6832" /></div></div></div>)}</div>}</>;
}

function AnalyticsView({ stats, listings, orders }: any) {
  const statusCounts = useMemo(() => orders.reduce((m: Record<string, number>, o: ApiOrder) => { const s = o.status || "Unknown"; m[s] = (m[s] || 0) + 1; return m; }, {}), [orders]);
  const max = Math.max(1, ...listings.map((l: ApiListing) => Number(l.quantity || 0)));
  const maxFrequent = Math.max(1, ...stats.topProducts.map((item: any) => Number(item[1] || 0)));
  return <><PageHead eyebrow="Insights" title="Analytics" subtitle="Derived from current backend orders and listings; no mock analytics are inserted." /><div className="dashboard-kpi-grid"><Stat icon={<Package size={19} />} label="Listed quantity" value={number(stats.quantity)} /><Stat icon={<ClipboardList size={19} />} label="Orders" value={number(stats.totalOrders)} /><Stat icon={<span style={{ fontWeight: 900 }}>₹</span>} label="Order value" value={money(stats.earnings)} /><Stat icon={<Star size={19} />} label="Top products" value={number(stats.topProducts.length)} /></div><div className="dashboard-analytics-grid dashboard-analytics-grid-three" style={{ marginTop: 16 }}><div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Inventory by listing</h2></div>{listings.length ? listings.slice(0, 10).map((l: ApiListing) => <div className="farmer-list-row" key={l.id}><div className="farmer-row"><span>{l.product?.name || "Product"}</span><strong>{number(l.quantity || 0)} {l.unit || ""}</strong></div><div className="farmer-bar" style={{ marginTop: 7 }}><span style={{ width: `${Math.max(4, Number(l.quantity || 0) / max * 100)}%` }} /></div></div>) : <div className="farmer-empty">No listing data yet.</div>}</div><div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Order status</h2></div>{Object.keys(statusCounts).length ? Object.entries(statusCounts).map(([s, n]) => <div className="farmer-list-row" key={s}><div className="farmer-row"><span>{s}</span><strong>{String(n)}</strong></div></div>) : <div className="farmer-empty">No order status data yet.</div>}</div><div className="buyer-card farmer-card dashboard-chart-card"><div className="farmer-card-head"><h2 className="farmer-card-title">Frequently sold products</h2></div>{stats.topProducts.length ? stats.topProducts.map((item: any) => <div className="dashboard-chart-row" key={item[0]}><div className="dashboard-chart-label"><span>{item[0]}</span><strong>{number(item[1])}</strong></div><div className="dashboard-chart-track"><span style={{ width: `${Math.max(8, Math.min(100, Number(item[1]) / maxFrequent * 100))}%` }}/></div></div>) : <div className="farmer-empty">No sold-product data yet.</div>}</div></div></>;
}

function HelpView({ support, setSupport, sendSupport, tickets, busy }: any) {
  return <><PageHead eyebrow="Help & support" title="Help" subtitle="Follow the process and contact KhetLink support when something needs attention." /><div className="farmer-two-column"><div className="buyer-card farmer-card"><h2 className="farmer-card-title">How Farmer orders work</h2>{["Keep accurate listings and inventory in the marketplace.", "Review Buyer requests and accept, decline or send a counter offer.", "Once both sides confirm, the backend creates the order.", "Payment and Logistics assignment are tracked through the same order record.", "Shipment status changes are controlled by the Logistics workflow and verification rules."].map((x, i) => <div className="farmer-help-step" key={x}><span className="farmer-step-num">{i + 1}</span><span>{x}</span></div>)}</div><div className="buyer-card farmer-card"><h2 className="farmer-card-title">Contact Support</h2><p className="farmer-muted" style={{ fontSize: 13 }}>Report a discrepancy, issue or other message. Your support ticket is stored in the backend.</p><form onSubmit={sendSupport} style={{ display: "grid", gap: 10 }}><input className="farmer-input" placeholder="Subject" value={support.subject} onChange={e => setSupport({ ...support, subject: e.target.value })} /><textarea className="farmer-textarea" placeholder="Describe the issue" value={support.message} onChange={e => setSupport({ ...support, message: e.target.value })} /><button className="buyer-primary-button" disabled={busy}>{busy ? <Loader2 className="farmer-spin" size={16} /> : <Send size={16} />} Contact Support</button></form></div></div><div className="buyer-card farmer-card" style={{ marginTop: 16 }}><div className="farmer-card-head"><h2 className="farmer-card-title">My support tickets</h2></div>{tickets.length ? tickets.map((t: ApiTicket) => <div className="farmer-list-row" key={t.id}><div className="farmer-row"><strong>{t.subject}</strong><span className={`farmer-pill ${badgeClass(t.status)}`}>{t.status || "OPEN"}</span></div><div className="farmer-muted" style={{ marginTop: 5 }}>{t.message}</div><div className="farmer-muted" style={{ fontSize: 11, marginTop: 5 }}>{dateTime(t.createdAt)}</div></div>) : <div className="farmer-empty">No support tickets.</div>}</div></>;
}

function ProfileView({ profile, draft, setDraft, editing, setEditing, save, captureLocation, busy, language, chooseLanguage, locationQuery, setLocationQuery, locationSuggestions, locationSearching, selectLocation, locationRequired, listings, savedMessage }: any) {
  const [languageOpenLocal, setLanguageOpenLocal] = useState(false);
  const set = (key: string, value: any) => setDraft((d: Profile) => ({ ...d, [key]: value }));
  const produce = Array.from(new Map((listings || []).filter((l: ApiListing) => l.product?.name).map((l: ApiListing) => [l.product!.name!, l.product?.imageUrl || l.product?.image || ""])).entries()).map(([name, image]) => ({ name, image }));
  const mapSrc = draft.latitude != null && draft.longitude != null ? `https://www.openstreetmap.org/export/embed.html?bbox=${draft.longitude - 0.015}%2C${draft.latitude - 0.01}%2C${draft.longitude + 0.015}%2C${draft.latitude + 0.01}&layer=mapnik&marker=${draft.latitude}%2C${draft.longitude}` : "";
  const backendFarmerId = profile?.farmerId || profile?.farmer?.farmerId || profile?.farmer?.id || profile?.id || "";
  const previewImage = draft?.profileImage || profile?.profileImage;
  return <><PageHead eyebrow="Account" title="Profile" subtitle={locationRequired ? "Add your farm location first to unlock the Farmer workspace." : "Manage your centralized identity and Farmer details."} actions={!editing ? <button className="buyer-primary-button" onClick={() => setEditing(true)}><Pencil size={16}/> Edit profile</button> : undefined} />
    {locationRequired && <div className="farmer-location-required"><MapPin size={18}/><div><strong>Farm location required</strong><span>Search for your farm location or use the current-location button, then save your profile. Dashboard, Listings, Orders and other workspace pages will unlock after a valid location is saved.</span></div></div>}
    <div className="profile-cover buyer-card">
      <div className="profile-avatar-section">
        <div className="buyer-profile-avatar-large">{previewImage ? <img src={previewImage} alt={displayName(profile) || "Farmer"}/> : initials(profile)}</div>
        {editing && <label className="profile-upload-button"><Pencil size={15}/> Upload Photo<input type="file" accept="image/*" onChange={e => { const file=e.target.files?.[0]; if(!file || !file.type.startsWith("image/")) return; const reader=new FileReader(); reader.onload=()=>set("profileImage", String(reader.result)); reader.readAsDataURL(file); }}/></label>}
      </div>
      <div className="profile-identity"><span className="verified-pill"><Check size={12}/> Verified Farmer</span><h2>{displayName(profile) || "Farmer"}</h2><p>Farmer ID: <strong>{backendFarmerId || "—"}</strong></p>{profile?.farmName?.trim() && <small>{profile.farmName}</small>}</div>
      <div className="profile-mini-stat"><strong>{profile?.farmer?.rating ?? profile?.rating ?? "—"}</strong><span>Rating</span></div>
    </div>
    <div className="profile-content-grid">
      <div className="profile-form-card buyer-card">
        <div className="buyer-section-heading"><div><span>Personal & farm information</span><h2>Profile details</h2></div></div>
        <div className="profile-form-grid">
          {[['First name','firstName'],['Last name','lastName'],['Phone','phone'],['Farm name','farmName'],['Experience','experience']].map(([label,key]) => <label className="buyer-field" key={key}><span>{label}</span>{editing ? <input value={(draft as any)[key] || ""} readOnly={key === "firstName" || key === "lastName" || key === "phone"} disabled={key === "firstName" || key === "lastName" || key === "phone"} onChange={e => set(key,e.target.value)}/> : <div className="profile-read-value">{(profile as any)?.[key] || "Not provided"}</div>}</label>)}
          <label className="buyer-field"><span>Land acres</span>{editing ? <input type="number" min="0" value={draft.landAcres ?? ""} onChange={e => set("landAcres", e.target.value === "" ? null : Number(e.target.value))}/> : <div className="profile-read-value">{profile?.landAcres ?? "Not provided"}</div>}</label>
          <label className="buyer-field profile-language-field"><span>Language</span><div className="profile-language-control"><button type="button" className="buyer-outline-button" onClick={() => setLanguageOpenLocal(v => !v)}>{LANGUAGES.find(x => x[0] === language)?.[1] || "English"}<ChevronDown size={13}/></button>{languageOpenLocal && <div className="farmer-language-menu profile-language-menu">{LANGUAGES.map(([code,label]) => <button type="button" key={code} onClick={() => { chooseLanguage(code); setLanguageOpenLocal(false); }}>{label}{language === code ? " ✓" : ""}</button>)}</div>}</div></label>
        </div>
        <div className="profile-location-section"><div className="buyer-section-heading"><div><span>Farm location</span><h2>Location</h2></div></div>
          <div className="location-editor-grid">
            <div className="location-search-box">
              <div className="location-input-wrap"><Search size={15}/><input value={locationQuery} disabled={!editing} onChange={e => { setLocationQuery(e.target.value); setDraft((d: Profile) => ({ ...d, location: e.target.value, latitude: null, longitude: null })); }} placeholder="Search your farm location"/><button type="button" title="Use current location" disabled={!editing || busy} onClick={captureLocation}><MapPin size={16}/></button></div>
              {editing && (locationSearching || locationSuggestions.length > 0) && <div className="location-suggestions">{locationSearching && <div className="location-suggestion muted">Searching locations…</div>}{locationSuggestions.map(item => <button type="button" className="location-suggestion" key={`${item.lat}-${item.lon}`} onClick={() => selectLocation(item)}><MapPin size={14}/><span>{item.display_name}</span></button>)}</div>}
            </div>

          </div>
        </div>
        {savedMessage && <div className="profile-saved-message"><Check size={15}/><span>{savedMessage}</span></div>}
        {editing && <div className="profile-form-actions"><button type="button" className="buyer-outline-button" onClick={() => { setDraft(profile || {}); setLocationQuery(profile?.location || ""); setEditing(false); }} disabled={busy && !locationRequired}>Cancel</button><button type="button" className="buyer-primary-button" disabled={busy} onClick={save}><Check size={16}/> Save changes</button></div>}
      </div>
      <aside className="profile-side-card buyer-card">
        <div className="buyer-section-heading"><div><span>Catalog activity</span><h2>Your produce</h2></div><Leaf size={18}/></div>
        {produce.length ? <div className="profile-produce-grid">{produce.map((p:any) => <div className="profile-produce-item" key={p.name}>{p.image ? <img src={p.image} alt=""/> : <div className="profile-produce-image-empty"><Leaf size={22}/></div>}<div><strong>{p.name}</strong><small>Active catalogue item</small></div></div>)}</div> : <div className="profile-empty"><Leaf size={22}/><strong>No produce in your catalogue yet</strong><span>Add a listing to see your actual catalogue activity here.</span></div>}
        <div className="catalog-map-wrap"><div className="catalog-map-heading"><span>Farm location map</span><MapPin size={15}/></div><div className="location-map-card">{mapSrc ? <iframe title="Farmer location map" src={mapSrc}/> : <div className="map-empty"><MapPin size={28}/><span>Save a farm location to see the map.</span></div>}</div></div>
        <div className="profile-info-list"><div className="profile-info-row"><span><MapPin size={14}/></span><div><small>Location</small><strong>{profile?.location || "Not provided"}</strong></div></div><div className="profile-info-row"><span><Languages size={14}/></span><div><small>Language</small><strong>{LANGUAGES.find(x => x[0] === language)?.[1] || language}</strong></div></div><div className="profile-info-row"><span><Star size={14}/></span><div><small>Reviews</small><strong>{profile?.farmer?.reviews ?? profile?.reviews ?? 0}</strong></div></div></div>
      </aside>
    </div>
  </>;
}
