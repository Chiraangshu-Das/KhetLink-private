/// <reference types="google.maps" />
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
  Languages,
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
  Line,
  LineChart as RechartsLineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import "./Buyer.css";
import Link from "next/link";
import { jsPDF } from "jspdf";
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
  | "Pending"
  | "Cancelled";

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
  | "Countered"
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
  image?: string;
}

interface Farmer {
  id: string;
  roleCode?: string;
  name: string;
  phoneNumber: string;
  location: string;
  distanceKm: number;
  rating: number;
  reviews: number;
  logisticsFee?: number | null;
  verified: boolean;
  avatar: string;
  farm: string;
  about: string;
  landAcres?: number | null;
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
  unit: RequirementUnit;
  pricePerKg: number;
  rating: number;
  reviews: number;
  deliveryTime: string;
  image: string;
  logisticsFee?: number | null;
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
  latitude?: number | null;
  longitude?: number | null;
}

interface Requirement {
  id: string;
  buyerId: string;
  createdAt: string;
  isBrowseProduct?: boolean;
  status: RequirementStatus;
  items: RequirementItem[];
  matchedFarmerIds?: string[];
}

interface FarmerOffer {
  id: string;
  requirementId: string;
  farmerId: string;
  isBrowseProduct?: boolean;
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
  unit: RequirementUnit;
  unitPrice?: number;
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
  currentLat?: number | null;
  currentLng?: number | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  logisticsName?: string;
  logisticsId?: string;
  logisticsRoleCode?: string;
  sellerRoleCode?: string;
  logisticsRating?: number;
  logisticsPhone?: string | null;
  logisticsVehicleType?: string | null;
  logisticsVehicleNumber?: string | null;
  logisticsReviews?: number;
  logisticsReviewSubmitted?: boolean;
  logisticsReview?: { id?: string; rating?: number; comment?: string | null; createdAt?: string } | null;
  logisticsProvider?: { id?: string; roleCode?: string; name?: string; phone?: string | null; vehicleType?: string | null; vehicleNumber?: string | null; rating?: number; reviews?: number;} | null;
  logisticsRequestSentAt?: string | null;
  logisticsRequestExpiresAt?: string | null;
  logisticsAcceptedAt?: string | null;
  logisticsAccepted?: boolean;
  confirmedAt?: string;
  deliveredAt?: string;
  productSubtotal?: number;
  platformFee?: number;
  logisticsFee?: number;
  verificationCode?: string;
}

const isCountedOrder = (order: Order) => order.status !== "Cancelled";

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

const BUYER_LANGUAGES = [
  ["en", "English"], ["hi", "हिन्दी"], ["bn", "বাংলা"], ["ta", "தமிழ்"], ["te", "తెలుగు"],
  ["mr", "मराठी"], ["gu", "ગુજરાતી"], ["kn", "ಕನ್ನಡ"], ["ml", "മലയാളം"], ["pa", "ਪੰਜਾਬੀ"],
] as const;
const buyerLanguageLabel = (value?: string) => {
  const v = String(value || "").trim().toLowerCase();
  return BUYER_LANGUAGES.find(([code, label]) => code === v || label.toLowerCase() === v)?.[1] || "English";
};
const buyerLanguageCode = (value?: string) => {
  const v = String(value || "").trim().toLowerCase();
  return BUYER_LANGUAGES.find(([code, label]) => code === v || label.toLowerCase() === v)?.[0] || "en";
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
      'script[data-khetlink-google-maps="true"],script[data-khetlink-logistics-maps="true"],script[src*="maps.googleapis.com/maps/api/js"]'
    ) as HTMLScriptElement | null;

    if (existingScript) {
      existingScript.addEventListener("load", () => resolve(), {
        once: true,
      });

      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Google Maps."));
      }, {
        once: true,
      });

      return;
    }

    const script = document.createElement("script");

    script.src =
      `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}` +
      `&loading=async`;

    script.async = true;
    script.defer = true;
    script.dataset.khetlinkGoogleMaps = "true";

    script.onload = () => resolve();

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

const minimumQuantityForUnit = (unit: RequirementUnit) => unit === "dozen" ? Math.floor(fromKg(100, unit)) : fromKg(100, unit);

const pricePerSelectedUnit = (pricePerKg: number, unit: RequirementUnit) =>
  unit === "ton" ? pricePerKg * 1000 :
    unit === "dozen" ? pricePerKg * 12 :
      pricePerKg;

const convertPriceUnit = (price: number, from: RequirementUnit, to: RequirementUnit) => pricePerSelectedUnit(fromKg(price, from), to);

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
    papaya: "https://www.healthbenefitstimes.com/9/gallery/papaya-2/Ripe-papaya.jpg",
    guava: "https://commons.wikimedia.org/wiki/Special:FilePath/Guava.jpg?width=900",
    pomegranate: "https://openbottle.com.hk/cdn/shop/products/rimon-semi-sweet-pomegranate-rose-514536.jpg?v=1684808004",
    pineapple: "https://app.bigdatawifi.com.br/storage/285288/Abacaxi-bauru-un.jpg",
    watermelon: "https://1.bp.blogspot.com/-mTMG_cmfPps/U7F6c9JeXlI/AAAAAAAAAGo/0cPYh7kN3Xs/s1600/tembikai%2B5.jpg",
    lemon: "https://commons.wikimedia.org/wiki/Special:FilePath/Lemon.jpg?width=900",
    coconut: "https://nurserylive.com/cdn/shop/products/nurserylive-plants-nariyal-coconut-tree-green-grown-through-seeds-plant-16969041739916_512x512.jpg?v=1634224657",
    grapes: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=900&q=85",

    "rice": "https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?auto=format&fit=crop&w=900&q=85",
    "wheat": "https://commons.wikimedia.org/wiki/Special:FilePath/Wheat_close-up.JPG?width=900",
    "honey": "https://images.unsplash.com/photo-1471943311424-646960669fbc?auto=format&fit=crop&w=900&q=85",
    "cucumber": "https://commons.wikimedia.org/wiki/Special:FilePath/Cucumber.jpg?width=900",
    "peas": "https://www.waangoo.com/cdn/shop/products/0013449_fresh-whole-green-peas-india.jpg?v=1755081566",
    "lady finger": "https://theempressmarket.com/cdn/shop/products/Bhindi_Okra_b8ef68f0-f1aa-41a6-a842-7240b695ac5a_grande.png?v=1535096086",
    "capsicum": "https://commons.wikimedia.org/wiki/Special:FilePath/Capsicum_annuum.jpg?width=900",
    "bottle gourd": "https://commons.wikimedia.org/wiki/Special:FilePath/Bottle_gourd.jpg?width=900",
    "chickpea": "https://i5.walmartimages.com/seo/Garbanzo-Beans-Chickpeas-Kabuli-Chana-Raw-Gluten-Free-5Lbs_19492694-94ef-4915-bb9c-9f76bfc3b4eb.4e01355a2d221f561bbc85ebd1004974.jpeg",
    "green gram": "https://commons.wikimedia.org/wiki/Special:FilePath/Vigna_radiata_%285000647141%29.jpg?width=900",
    "pigeon pea": "https://commons.wikimedia.org/wiki/Special:FilePath/Cajanus_cajan_kz02.jpg?width=900",
    "maize": "https://commons.wikimedia.org/wiki/Special:FilePath/MAIZE.jpg?width=900",
    "sorghum": "https://commons.wikimedia.org/wiki/Special:FilePath/Sorghum_bicolor.JPG?width=900",
    "ginger": "https://images.unsplash.com/photo-1599940824399-b87987ceb72a?auto=format&fit=crop&w=900&q=85",
    "black pepper": "https://commons.wikimedia.org/wiki/Special:FilePath/Black_pepper.jpg?width=900",
    "marigold": "https://commons.wikimedia.org/wiki/Special:FilePath/Marigold.jpg?width=900",
    "jasmine": "https://commons.wikimedia.org/wiki/Special:FilePath/Jasminum_sambac.jpg?width=900",
    "cotton": "https://commons.wikimedia.org/wiki/Special:FilePath/Cotton_plant.jpg?width=900",
    "jute": "https://commons.wikimedia.org/wiki/Special:FilePath/Locally_Jute_Plant.jpg?width=900",
    "sugarcane": "https://commons.wikimedia.org/wiki/Special:FilePath/Sugarcane.jpg?width=900",
    "bamboo": "https://commons.wikimedia.org/wiki/Special:FilePath/Bamboo.jpg?width=900",
    "basil": "https://commons.wikimedia.org/wiki/Special:FilePath/Basil.jpg?width=900",
    "curry leaves": "https://commons.wikimedia.org/wiki/Special:FilePath/Curry_leaves.jpg?width=900",
    "fenugreek leaves": "https://commons.wikimedia.org/wiki/Special:FilePath/Fenugreek_leaves.jpg?width=900",
    "fish": "https://commons.wikimedia.org/wiki/Special:FilePath/The_Fish.jpg?width=900",
    "brinjal": "https://2.wlimg.com/product_images/bc-500/2026/1/14429886/fresh-brinjal-1768629359-8539858.jpeg",
    "cauliflower": "https://image.cdn.shpy.in/437243/SKU-0009_0-1747138363907.jpg?format=webp&width=900",
    "pumpkin": "https://img.thecdn.in/278008/1670177299449_SKU-0033_1.jpg?format=webp&width=900",
    "bitter gourd": "https://neeraseeds.com/cdn/shop/files/Bitter-Gourd_84b03abc-d5f8-469f-ae0b-c3d779ece401.webp?v=1754121074",
    "lentil": "https://www.biolaboratorium.com/cdn/shop/products/46451.jpg?v=1673560372",
    "black gram": "https://commons.wikimedia.org/wiki/Special:FilePath/Vigna_mungo.jpg?width=900",
    "millet": "https://semeiniy.kz/wa-data/public/shop/products/36/73/117336/images/36752/36752.970.jpg",
    "barley": "https://i0.wp.com/malayalibasket.com/wp-content/uploads/2023/07/1000353356.jpg?fit=900%2C900&ssl=1",
    "turmeric": "https://images.unsplash.com/photo-1615485500704-8e990f9900f7?auto=format&fit=crop&w=900&q=85",
    "garlic": "https://talabat.dhmedia.io/image/talabat-nv/Regional_Images/Images/QC_Standard_Images/KW3RT1LV.png",
    "chilli": "https://images.unsplash.com/photo-1588252303782-cb80119abd6d?auto=format&fit=crop&w=900&q=85",
    "coriander": "https://tiimg.tistatic.com/fp/1/008/089/good-fragrance-healthy-natural-rich-taste-green-fresh-coriander-leaves-104.jpg",
    "cumin": "https://onlineorganics.ca/cdn/shop/products/organic-cumin-seed-whole-pile_600x600.jpg?v=1747756925",
    "cardamom": "https://vegetarianexpress.co.uk/cdn/shop/products/CARGRE1K_1.jpg?v=1684802061",
    "rose": "https://images.unsplash.com/photo-1496062031456-07b8f162a322?auto=format&fit=crop&w=900&q=85",
    "chrysanthemum": "https://images.unsplash.com/photo-1509423350716-97f9360b4e09?auto=format&fit=crop&w=900&q=85",
    "mint": "https://www.fruitlinq.com/cdn/shop/files/MintLeaves.png?v=1758697771&width=1445",
    "milk": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=900&q=85",
    "eggs": "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=900&q=85",
    "goat": "https://images.unsplash.com/photo-1524024973431-2ad916746881?auto=format&fit=crop&w=900&q=85",
    "cattle": "https://commons.wikimedia.org/wiki/Special:FilePath/Cattle.jpg?width=900",
    "poultry": "https://images.unsplash.com/photo-1548550023-2bdb3c5beed7?auto=format&fit=crop&w=900&q=85",
  };
  const key = Object.keys(images).find((name) => normalized.includes(name));
  return key ? images[key] : "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85";
};

const FARMER_CATALOG_NAMES = [
  ["Tomato", "Vegetables"], ["Potato", "Vegetables"], ["Onion", "Vegetables"], ["Brinjal", "Vegetables"], ["Spinach", "Vegetables"], ["Cucumber", "Vegetables"], ["Carrot", "Vegetables"], ["Cauliflower", "Vegetables"], ["Cabbage", "Vegetables"], ["Peas", "Vegetables"], ["Lady Finger", "Vegetables"], ["Capsicum", "Vegetables"], ["Pumpkin", "Vegetables"], ["Bitter Gourd", "Vegetables"], ["Bottle Gourd", "Vegetables"],
  ["Banana", "Fruits"], ["Mango", "Fruits"], ["Apple", "Fruits"], ["Orange", "Fruits"], ["Grapes", "Fruits"], ["Papaya", "Fruits"], ["Guava", "Fruits"], ["Pomegranate", "Fruits"], ["Pineapple", "Fruits"], ["Watermelon", "Fruits"], ["Lemon", "Fruits"], ["Coconut", "Fruits"],
  ["Lentil", "Pulses"], ["Chickpea", "Pulses"], ["Green Gram", "Pulses"], ["Black Gram", "Pulses"], ["Pigeon Pea", "Pulses"],
  ["Rice", "Grains"], ["Wheat", "Grains"], ["Maize", "Grains"], ["Millet", "Grains"], ["Barley", "Grains"], ["Sorghum", "Grains"],
  ["Turmeric", "Spices"], ["Ginger", "Spices"], ["Garlic", "Spices"], ["Chilli", "Spices"], ["Coriander", "Spices"], ["Cumin", "Spices"], ["Black Pepper", "Spices"], ["Cardamom", "Spices"],
  ["Marigold", "Flowers"], ["Rose", "Flowers"], ["Jasmine", "Flowers"], ["Chrysanthemum", "Flowers"],
  ["Cotton", "Non-Edible"], ["Jute", "Non-Edible"], ["Sugarcane", "Non-Edible"], ["Bamboo", "Non-Edible"],
  ["Mint", "Herbs"], ["Basil", "Herbs"], ["Curry Leaves", "Herbs"], ["Fenugreek Leaves", "Herbs"], ["Honey", "Other"], ["Milk", "Other"],
  ["Eggs", "Livestock"], ["Goat", "Livestock"], ["Cattle", "Livestock"], ["Poultry", "Livestock"], ["Fish", "Livestock"],
] as const;

const renderAvatar = (value: string, name: string) =>
  isImageSource(value) ? <img src={value} alt={name} /> : (value || getInitials(name));

/* =========================================================
   PROFESSIONAL PDF EXPORTS
   ========================================================= */

const loadKhetLinkLogo = async (): Promise<string | null> => {
  try {
    const response = await fetch("/Khetlink_Logo.svg", {
      cache: "force-cache",
    });

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
    canvas.width = 500;
    canvas.height = 500;

    const context = canvas.getContext("2d");

    if (!context) {
      URL.revokeObjectURL(objectUrl);
      return null;
    }

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);

    URL.revokeObjectURL(objectUrl);

    return canvas.toDataURL("image/jpeg", 0.92);
  } catch {
    return null;
  }
};


/* ---------------------------------------------------------
   Shared PDF helpers
--------------------------------------------------------- */

const pdfGreen = [20, 105, 55] as const;
const pdfLightGreen = [239, 247, 242] as const;
const pdfBorder = [205, 220, 211] as const;
const pdfDark = [35, 45, 40] as const;
const pdfMuted = [105, 115, 110] as const;


const pdfCurrency = (value: number) =>
  `Rs. ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;


const pdfDate = (value?: string) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};


const drawPdfHeader = async (
  doc: jsPDF,
  title: string,
  subtitle: string,
) => {
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(...pdfLightGreen);
  doc.rect(0, 0, pageWidth, 78, "F");

  const logo = await loadKhetLinkLogo();

  if (logo) {
    doc.addImage(logo, "JPEG", 28, 12, 48, 48);
  } else {
    doc.setFillColor(...pdfGreen);
    doc.circle(52, 36, 22, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("KL", 52, 40, { align: "center" });
  }

  doc.setTextColor(...pdfGreen);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(24);
  doc.text("KHETLINK", 88, 31);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...pdfMuted);
  doc.text("FARM TO BUSINESS", 89, 43);

  doc.setTextColor(...pdfDark);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(17);
  doc.text(title, pageWidth - 28, 29, {
    align: "right",
  });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...pdfMuted);
  doc.text(subtitle, pageWidth - 28, 43, {
    align: "right",
  });

  doc.setDrawColor(...pdfBorder);
  doc.line(28, 78, pageWidth - 28, 78);
};


const drawPdfLabel = (
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
  width = 250,
) => {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...pdfMuted);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...pdfDark);

  const lines = doc.splitTextToSize(value || "—", width);
  doc.text(lines, x, y + 13);
};


const drawPdfTableHeader = (
  doc: jsPDF,
  y: number,
  columns: {
    label: string;
    x: number;
    width: number;
    align?: "left" | "right" | "center";
  }[],
) => {
  doc.setFillColor(...pdfGreen);
  doc.roundedRect(
    28,
    y,
    doc.internal.pageSize.getWidth() - 56,
    27,
    2,
    2,
    "F",
  );

  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);

  columns.forEach((column) => {
    const align = column.align ?? "left";

    let textX = column.x;

    if (align === "right") {
      textX = column.x + column.width;
    } else if (align === "center") {
      textX = column.x + column.width / 2;
    }

    doc.text(column.label, textX, y + 17, {
      align,
    });
  });
};


const drawPdfFooter = (doc: jsPDF) => {
  const pageHeight = doc.internal.pageSize.getHeight();
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setDrawColor(...pdfBorder);
  doc.line(28, pageHeight - 48, pageWidth - 28, pageHeight - 48);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...pdfMuted);

  doc.text(
    "Generated by KhetLink • Farm to Business",
    28,
    pageHeight - 31,
  );

  doc.text(
    `Generated on ${new Date().toLocaleString("en-IN")}`,
    pageWidth - 28,
    pageHeight - 31,
    {
      align: "right",
    },
  );
};


/* =========================================================
   EXPORT ORDER / INVOICE PDF
========================================================= */

const exportOrdersPdf = async (
  orders: Order[],
  selectedOrder?: Order,
) => {
  const target = selectedOrder ? [selectedOrder] : orders;

  if (!target.length) {
    alert("There are no orders available to export.");
    return;
  }

  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let orderIndex = 0; orderIndex < target.length; orderIndex++) {
    if (orderIndex > 0) {
      doc.addPage();
    }

    const order = target[orderIndex];

    const subtotal =
      order.productSubtotal ??
      Math.max(
        0,
        order.cost -
        (order.platformFee ?? 0) -
        (order.logisticsFee ?? 0),
      );

    const platform =
      order.platformFee ??
      subtotal * 0.05;

    const logistics =
      order.logisticsFee ??
      Math.max(
        0,
        order.cost -
        subtotal -
        platform,
      );

    await drawPdfHeader(
      doc,
      "ORDER RECEIPT",
      `Order ID: ${orderDisplayId(order)}`,
    );

    let y = 108;

    /* -----------------------------------------------
       Order information
    ----------------------------------------------- */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...pdfGreen);
    doc.text("ORDER INFORMATION", 28, y);

    y += 24;

    drawPdfLabel(
      doc,
      "Order ID",
      orderDisplayId(order),
      28,
      y,
      180,
    );

    drawPdfLabel(
      doc,
      "Order Date",
      new Date(order.createdAt).toLocaleString("en-IN"),
      220,
      y,
      180,
    );

    drawPdfLabel(
      doc,
      "Status",
      order.status,
      420,
      y,
      120,
    );

    y += 58;

    drawPdfLabel(
      doc,
      "Buyer",
      order.buyer,
      28,
      y,
      210,
    );

    drawPdfLabel(
      doc,
      "Farmer / Supplier",
      order.seller,
      300,
      y,
      210,
    );

    y += 58;

    drawPdfLabel(
      doc,
      "Delivery Date",
      order.deliveryDate,
      28,
      y,
      210,
    );

    drawPdfLabel(
      doc,
      "Delivery Location",
      order.deliveryLocation || "Not provided",
      300,
      y,
      230,
    );

    y += 68;

    /* -----------------------------------------------
       Product table
    ----------------------------------------------- */

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...pdfGreen);
    doc.text("PURCHASE DETAILS", 28, y);

    y += 15;

    drawPdfTableHeader(doc, y, [
      {
        label: "DESCRIPTION",
        x: 42,
        width: 210,
      },
      {
        label: "QUANTITY",
        x: 275,
        width: 70,
        align: "center",
      },
      {
        label: "UNIT PRICE",
        x: 365,
        width: 75,
        align: "right",
      },
      {
        label: "TOTAL",
        x: 510,
        width: 45,
        align: "right",
      },
    ]);

    y += 27;

    doc.setDrawColor(...pdfBorder);
    doc.setFillColor(250, 252, 250);
    doc.rect(28, y, pageWidth - 56, 45, "FD");

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...pdfDark);

    doc.text(order.product, 42, y + 27);

    doc.text(
      formatQuantity(order.quantity, order.unit),
      310,
      y + 27,
      { align: "center" },
    );

    const unitPrice =
      order.unitPrice ??
      subtotal / Math.max(order.quantity, 1);

    doc.text(
      pdfCurrency(unitPrice),
      440,
      y + 27,
      { align: "right" },
    );

    doc.setFont("helvetica", "bold");

    doc.text(
      pdfCurrency(subtotal),
      540,
      y + 27,
      { align: "right" },
    );

    y += 78;

    /* -----------------------------------------------
       Amount summary
    ----------------------------------------------- */

    const summaryX = 350;
    const summaryWidth = pageWidth - summaryX - 28;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...pdfDark);

    doc.text("Product Amount", summaryX, y);
    doc.text(
      pdfCurrency(subtotal),
      pageWidth - 28,
      y,
      { align: "right" },
    );

    y += 22;

    doc.text("Logistics Fee", summaryX, y);
    doc.text(
      pdfCurrency(logistics),
      pageWidth - 28,
      y,
      { align: "right" },
    );

    y += 22;

    doc.text("Platform Fee (5%)", summaryX, y);
    doc.text(
      pdfCurrency(platform),
      pageWidth - 28,
      y,
      { align: "right" },
    );

    y += 18;

    doc.setDrawColor(...pdfBorder);
    doc.line(summaryX, y, pageWidth - 28, y);

    y += 25;

    doc.setFillColor(...pdfGreen);
    doc.roundedRect(
      summaryX,
      y - 17,
      summaryWidth,
      38,
      3,
      3,
      "F",
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(255, 255, 255);

    doc.text("ORDER TOTAL", summaryX + 12, y + 7);

    doc.text(
      pdfCurrency(order.cost),
      pageWidth - 40,
      y + 7,
      { align: "right" },
    );

    y += 70;

    /* -----------------------------------------------
       Payment information
    ----------------------------------------------- */

    doc.setFillColor(...pdfLightGreen);
    doc.roundedRect(
      28,
      y,
      pageWidth - 56,
      92,
      4,
      4,
      "F",
    );

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(...pdfGreen);
    doc.text("PAYMENT INFORMATION", 42, y + 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...pdfDark);

    doc.text(
      `Payment Status: ${order.paymentStatus || "PENDING"}`,
      42,
      y + 47,
    );

    doc.text(
      `Verification Code: ${order.paymentStatus === "PAID"
        ? order.verificationCode || "—"
        : "Appears after payment"
      }`,
      42,
      y + 66,
    );

    doc.setFont("helvetica", "italic");
    doc.setTextColor(...pdfMuted);
    doc.text(
      "Please retain this receipt for your records.",
      pageWidth - 42,
      y + 66,
      { align: "right" },
    );

    /* -----------------------------------------------
       Thank you
    ----------------------------------------------- */

    doc.setTextColor(...pdfGreen);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(17);

    doc.text(
      "Thank you for using KhetLink!",
      28,
      pageHeight - 83,
    );

    drawPdfFooter(doc);
  }

  const filename = selectedOrder
    ? `khetlink-order-${orderDisplayId(selectedOrder)}.pdf`
    : `khetlink-all-orders-${todayString()}.pdf`;

  doc.save(filename);
};

/* =========================================================
   ANALYTICS REPORT PDF
========================================================= */

const exportAnalytics = async (
  orders: Order[],
  barData: { name: string; quantity: number }[],
  pieData: { name: string; value: number }[],
  requirementData: { name: string; value: number }[],
  range: AnalyticsRange,
  customStart: string,
  customEnd: string,
) => {
  if (!orders.length) {
    alert("There is no analytics data available to export.");
    return;
  }

  const doc = new jsPDF({
    orientation: "landscape",
    unit: "pt",
    format: "a4",
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  /* =======================================================
     ANALYTICS COLORS
     
     These match the Analytics page chart colors.
  ======================================================= */

  const analyticsGreen = [22, 131, 74] as const;
  const analyticsYellow = [241, 181, 27] as const;
  const analyticsBlue = [59, 130, 246] as const;
  const analyticsOrange = [239, 139, 44] as const;
  const analyticsPurple = [139, 92, 246] as const;

  /* Clearly visible box borders */
  const analyticsBorder = [190, 205, 197] as const;

  /* Light chart grid */
  const analyticsGrid = [220, 227, 223] as const;

  /* Clearly visible chart axes */
  const analyticsAxis = [88, 99, 93] as const;

  const analyticsMuted = [105, 115, 110] as const;

  /* =======================================================
     TIMELINE
  ======================================================= */

  const formatTimelineDate = (value: Date) =>
    value.toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });

  let timeline = "";

  const today = new Date();

  if (range === "month") {
    timeline = today.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  } else if (range === "week") {
    const start = new Date(today);

    start.setHours(0, 0, 0, 0);

    start.setDate(
      start.getDate() -
      ((start.getDay() + 6) % 7),
    );

    const end = new Date(start);

    end.setDate(start.getDate() + 6);

    timeline =
      `${formatTimelineDate(start)} – ${formatTimelineDate(end)}`;
  } else {
    const start = customStart
      ? new Date(`${customStart}T00:00:00`)
      : today;

    const end = customEnd
      ? new Date(`${customEnd}T00:00:00`)
      : start;

    timeline =
      `${formatTimelineDate(start)} – ${formatTimelineDate(end)}`;
  }

  await drawPdfHeader(
    doc,
    "Analytics report",
    `Timeline: ${timeline}`,
  );

  /* =======================================================
     KPI CALCULATIONS
  ======================================================= */

  const totalSpend = orders.reduce(
    (sum, order) => sum + order.cost,
    0,
  );

  const totalQuantity = orders.reduce(
    (sum, order) =>
      sum +
      quantityInUnit(
        order.quantity,
        order.unit,
        "kg",
      ),
    0,
  );

  const deliveredOrders = orders.filter(
    order => order.status === "Delivered",
  ).length;

  const averageOrderValue =
    orders.length
      ? totalSpend / orders.length
      : 0;

  /* =======================================================
     KPI CARDS
  ======================================================= */

  const cardY = 96;
  const cardGap = 12;

  const cardWidth =
    (
      pageWidth -
      56 -
      cardGap * 3
    ) / 4;

  const cards = [
    {
      label: "TOTAL SPEND",
      value: pdfCurrency(totalSpend),
      subtext: "Purchase period",
    },
    {
      label: "TOTAL ORDERS",
      value: String(orders.length),
      subtext: "Included orders",
    },
    {
      label: "TOTAL QUANTITY",
      value:
        `${totalQuantity.toLocaleString(
          "en-IN",
          {
            maximumFractionDigits: 2,
          },
        )} kg`,
      subtext: "Converted to kg",
    },
    {
      label: "AVG ORDER VALUE",
      value: pdfCurrency(
        averageOrderValue,
      ),
      subtext: "Per included order",
    },
  ];

  cards.forEach(
    (card, index) => {
      const x =
        28 +
        index *
        (
          cardWidth +
          cardGap
        );

      /* KPI box */
      doc.setFillColor(
        255,
        255,
        255,
      );

      doc.setDrawColor(
        analyticsBorder[0],
        analyticsBorder[1],
        analyticsBorder[2],
      );

      doc.setLineWidth(1);

      doc.roundedRect(
        x,
        cardY,
        cardWidth,
        70,
        5,
        5,
        "FD",
      );

      /* Label */
      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(8);

      doc.setTextColor(
        analyticsMuted[0],
        analyticsMuted[1],
        analyticsMuted[2],
      );

      doc.text(
        card.label,
        x + 13,
        cardY + 19,
      );

      /* Value */
      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(16);

      doc.setTextColor(
        pdfDark[0],
        pdfDark[1],
        pdfDark[2],
      );

      doc.text(
        card.value,
        x + 13,
        cardY + 44,
      );

      /* Subtext */
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(7);

      doc.setTextColor(
        analyticsMuted[0],
        analyticsMuted[1],
        analyticsMuted[2],
      );

      doc.text(
        card.subtext,
        x + 13,
        cardY + 59,
      );
    },
  );

  /* =======================================================
     CHART ROW GEOMETRY

     Left chart:
       Total Spend + Total Orders

     Right chart:
       Total Quantity + Avg Order Value
  ======================================================= */

  const trendX = 28;
  const trendY = 178;

  const trendW =
    cardWidth * 2 +
    cardGap;

  const trendH = 132;

  const barX =
    28 +
    2 *
    (
      cardWidth +
      cardGap
    );

  const barY = trendY;
  const barW = trendW;
  const barH = trendH;

  /* =======================================================
     ORDER VALUE TREND
  ======================================================= */

  doc.setFillColor(
    255,
    255,
    255,
  );

  doc.setDrawColor(
    analyticsBorder[0],
    analyticsBorder[1],
    analyticsBorder[2],
  );

  doc.setLineWidth(1);

  doc.roundedRect(
    trendX,
    trendY,
    trendW,
    trendH,
    5,
    5,
    "FD",
  );

  /* Title */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(11);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Order Value Trend",
    trendX + 15,
    trendY + 21,
  );

  /* Subtitle */
  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(7);

  doc.setTextColor(
    analyticsMuted[0],
    analyticsMuted[1],
    analyticsMuted[2],
  );

  doc.text(
    "Order value by chronological purchase",
    trendX + 15,
    trendY + 35,
  );

  const sortedOrders =
    [...orders]
      .sort(
        (a, b) =>
          new Date(
            a.createdAt,
          ).getTime() -
          new Date(
            b.createdAt,
          ).getTime(),
      )
      .slice(-10);

  const trendChartLeft =
    trendX + 48;

  const trendChartRight =
    trendX +
    trendW -
    20;

  const trendChartTop =
    trendY + 47;

  const trendChartBottom =
    trendY +
    trendH -
    28;

  const trendChartHeight =
    trendChartBottom -
    trendChartTop;

  /* Strong axes */
  doc.setDrawColor(
    analyticsAxis[0],
    analyticsAxis[1],
    analyticsAxis[2],
  );

  doc.setLineWidth(0.9);

  /* Y-axis */
  doc.line(
    trendChartLeft,
    trendChartTop,
    trendChartLeft,
    trendChartBottom,
  );

  /* X-axis */
  doc.line(
    trendChartLeft,
    trendChartBottom,
    trendChartRight,
    trendChartBottom,
  );

  if (
    sortedOrders.length
  ) {
    const maxValue =
      Math.max(
        ...sortedOrders.map(
          order =>
            order.cost,
        ),
        1,
      );

    /* -----------------------------------------------------
       Grid lines + Y-axis values
    ----------------------------------------------------- */

    const trendSteps = 3;

    for (
      let step = 0;
      step <= trendSteps;
      step++
    ) {
      const value =
        (
          maxValue /
          trendSteps
        ) *
        step;

      const y =
        trendChartBottom -
        (
          value /
          maxValue
        ) *
        trendChartHeight;

      doc.setDrawColor(
        analyticsGrid[0],
        analyticsGrid[1],
        analyticsGrid[2],
      );

      doc.setLineWidth(0.5);

      doc.line(
        trendChartLeft,
        y,
        trendChartRight,
        y,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(5.5);

      doc.setTextColor(
        analyticsMuted[0],
        analyticsMuted[1],
        analyticsMuted[2],
      );

      doc.text(
        pdfCurrency(value),
        trendChartLeft - 7,
        y + 2,
        {
          align: "right",
        },
      );
    }

    /* -----------------------------------------------------
       Chronological points
    ----------------------------------------------------- */

    const points =
      sortedOrders.map(
        (
          order,
          index,
        ) => {
          const x =
            sortedOrders.length ===
              1
              ? (
                trendChartLeft +
                trendChartRight
              ) / 2
              : trendChartLeft +
              (
                index /
                (
                  sortedOrders.length -
                  1
                )
              ) *
              (
                trendChartRight -
                trendChartLeft
              );

          const y =
            trendChartBottom -
            (
              order.cost /
              maxValue
            ) *
            trendChartHeight;

          return {
            x,
            y,
            order,
          };
        },
      );

    /* Line */
    doc.setDrawColor(
      analyticsGreen[0],
      analyticsGreen[1],
      analyticsGreen[2],
    );

    doc.setLineWidth(2.2);

    for (
      let i = 1;
      i < points.length;
      i++
    ) {
      doc.line(
        points[i - 1].x,
        points[i - 1].y,
        points[i].x,
        points[i].y,
      );
    }

    /* Points */
    points.forEach(
      (
        point,
        index,
      ) => {
        doc.setFillColor(
          analyticsGreen[0],
          analyticsGreen[1],
          analyticsGreen[2],
        );

        doc.circle(
          point.x,
          point.y,
          3,
          "F",
        );

        /* Chronological number */
        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(6);

        doc.setTextColor(
          analyticsMuted[0],
          analyticsMuted[1],
          analyticsMuted[2],
        );

        doc.text(
          String(index + 1),
          point.x,
          trendChartBottom + 12,
          {
            align: "center",
          },
        );
      },
    );
  }

  /* Axis titles */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(5.5);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Purchase sequence",
    (
      trendChartLeft +
      trendChartRight
    ) / 2,
    trendY +
    trendH -
    7,
    {
      align: "center",
    },
  );

  doc.text(
    "Order Value",
    trendChartLeft - 35,
    (
      trendChartTop +
      trendChartBottom
    ) / 2,
    {
      angle: 90,
      align: "center",
    },
  );

  /* =======================================================
     PRODUCT QUANTITY
  ======================================================= */

  doc.setFillColor(
    255,
    255,
    255,
  );

  doc.setDrawColor(
    analyticsBorder[0],
    analyticsBorder[1],
    analyticsBorder[2],
  );

  doc.setLineWidth(1);

  doc.roundedRect(
    barX,
    barY,
    barW,
    barH,
    5,
    5,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(11);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Product Quantity",
    barX + 15,
    barY + 21,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(7);

  doc.setTextColor(
    analyticsMuted[0],
    analyticsMuted[1],
    analyticsMuted[2],
  );

  doc.text(
    "Quantity purchased by product",
    barX + 15,
    barY + 35,
  );

  const productData =
    barData
      .filter(
        item =>
          Number(
            item.quantity,
          ) > 0,
      )
      .slice(0, 8);

  if (
    productData.length
  ) {
    const maxQuantity =
      Math.max(
        ...productData.map(
          item =>
            Number(
              item.quantity,
            ),
        ),
        1,
      );

    const quantityChartLeft =
      barX + 48;

    const quantityChartRight =
      barX +
      barW -
      20;

    const quantityChartTop =
      barY + 47;

    const quantityChartBottom =
      barY +
      barH -
      28;

    const quantityChartWidth =
      quantityChartRight -
      quantityChartLeft;

    const quantityChartHeight =
      quantityChartBottom -
      quantityChartTop;

    /* Strong axes */
    doc.setDrawColor(
      analyticsAxis[0],
      analyticsAxis[1],
      analyticsAxis[2],
    );

    doc.setLineWidth(0.9);

    doc.line(
      quantityChartLeft,
      quantityChartTop,
      quantityChartLeft,
      quantityChartBottom,
    );

    doc.line(
      quantityChartLeft,
      quantityChartBottom,
      quantityChartRight,
      quantityChartBottom,
    );

    /* Grid lines */
    const quantitySteps = 2;

    for (
      let step = 0;
      step <= quantitySteps;
      step++
    ) {
      const value =
        (
          maxQuantity /
          quantitySteps
        ) *
        step;

      const y =
        quantityChartBottom -
        (
          value /
          maxQuantity
        ) *
        quantityChartHeight;

      doc.setDrawColor(
        analyticsGrid[0],
        analyticsGrid[1],
        analyticsGrid[2],
      );

      doc.setLineWidth(0.5);

      doc.line(
        quantityChartLeft,
        y,
        quantityChartRight,
        y,
      );

      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(5.5);

      doc.setTextColor(
        analyticsMuted[0],
        analyticsMuted[1],
        analyticsMuted[2],
      );

      doc.text(
        Number(value).toFixed(
          value % 1 === 0
            ? 0
            : 1,
        ),
        quantityChartLeft - 7,
        y + 2,
        {
          align: "right",
        },
      );
    }

    const quantitySlot =
      quantityChartWidth /
      productData.length;

    const quantityBarWidth =
      Math.min(
        42,
        quantitySlot *
        0.55,
      );

    productData.forEach(
      (
        item,
        index,
      ) => {
        const quantity =
          Number(
            item.quantity,
          );

        const height =
          (
            quantity /
            maxQuantity
          ) *
          quantityChartHeight;

        const centerX =
          quantityChartLeft +
          quantitySlot *
          index +
          quantitySlot /
          2;

        const x =
          centerX -
          quantityBarWidth /
          2;

        const y =
          quantityChartBottom -
          height;

        /* Bar */
        doc.setFillColor(
          analyticsGreen[0],
          analyticsGreen[1],
          analyticsGreen[2],
        );

        doc.roundedRect(
          x,
          y,
          quantityBarWidth,
          height,
          2,
          2,
          "F",
        );

        /* Value */
        doc.setFont(
          "helvetica",
          "bold",
        );

        doc.setFontSize(6);

        doc.setTextColor(
          pdfDark[0],
          pdfDark[1],
          pdfDark[2],
        );

        doc.text(
          quantity.toLocaleString(
            "en-IN",
            {
              maximumFractionDigits: 2,
            },
          ),
          centerX,
          y - 4,
          {
            align: "center",
          },
        );

        /* Product name */
        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(5.8);

        doc.setTextColor(
          analyticsMuted[0],
          analyticsMuted[1],
          analyticsMuted[2],
        );

        const label =
          item.name.length > 11
            ? `${item.name.slice(
              0,
              10,
            )}…`
            : item.name;

        doc.text(
          label,
          centerX,
          quantityChartBottom + 12,
          {
            align: "center",
          },
        );
      },
    );

    /* Axis titles */
    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(5.5);

    doc.setTextColor(
      pdfDark[0],
      pdfDark[1],
      pdfDark[2],
    );

    doc.text(
      "Product",
      (
        quantityChartLeft +
        quantityChartRight
      ) / 2,
      barY +
      barH -
      7,
      {
        align: "center",
      },
    );

    doc.text(
      "Quantity",
      quantityChartLeft - 25,
      (
        quantityChartTop +
        quantityChartBottom
      ) / 2,
      {
        angle: 90,
        align: "center",
      },
    );
  }

  /* =======================================================
     LOWER ROW
  ======================================================= */

  const lowerY = 322;
  const lowerH = 96;

  const pieX = trendX;
  const pieY = lowerY;
  const pieW = trendW;
  const pieH = lowerH;

  const summaryX = barX;
  const summaryY = lowerY;
  const summaryW = barW;
  const summaryH = lowerH;

  /* =======================================================
     ORDER DISTRIBUTION
  ======================================================= */

  doc.setFillColor(
    255,
    255,
    255,
  );

  doc.setDrawColor(
    analyticsBorder[0],
    analyticsBorder[1],
    analyticsBorder[2],
  );

  doc.setLineWidth(1);

  doc.roundedRect(
    pieX,
    pieY,
    pieW,
    pieH,
    5,
    5,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(11);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Order Distribution",
    pieX + 15,
    pieY + 21,
  );

  const pieItems =
    pieData.filter(
      item =>
        Number(
          item.value,
        ) > 0,
    );

  const pieTotal =
    pieItems.reduce(
      (
        sum,
        item,
      ) =>
        sum +
        Number(
          item.value,
        ),
      0,
    );

  if (
    pieTotal > 0
  ) {
    const centerX =
      pieX + 105;

    const centerY =
      pieY + 58;

    const radius = 29;

    let currentAngle =
      -Math.PI / 2;

    /* Same structure as Analytics page */
    const pieColors = [
      analyticsGreen,
      analyticsYellow,
      analyticsBlue,
      analyticsOrange,
      analyticsPurple,
    ];

    pieItems.forEach(
      (
        item,
        index,
      ) => {
        const slice =
          (
            Number(
              item.value,
            ) /
            pieTotal
          ) *
          Math.PI *
          2;

        const steps =
          Math.max(
            8,
            Math.ceil(
              slice * 20,
            ),
          );

        const points: [
          number,
          number,
        ][] = [
            [
              centerX,
              centerY,
            ],
          ];

        for (
          let i = 0;
          i <= steps;
          i++
        ) {
          const angle =
            currentAngle +
            (
              slice * i
            ) /
            steps;

          points.push([
            centerX +
            Math.cos(
              angle,
            ) *
            radius,
            centerY +
            Math.sin(
              angle,
            ) *
            radius,
          ]);
        }

        const color =
          pieColors[
          index %
          pieColors.length
          ];

        doc.setFillColor(
          color[0],
          color[1],
          color[2],
        );

        const trianglePoints =
          points.slice(1);

        for (
          let i = 0;
          i <
          trianglePoints.length -
          1;
          i++
        ) {
          const a =
            trianglePoints[i];

          const b =
            trianglePoints[
            i + 1
            ];

          doc.triangle(
            centerX,
            centerY,
            a[0],
            a[1],
            b[0],
            b[1],
            "F",
          );
        }

        currentAngle +=
          slice;
      },
    );

    /* Donut center */
    doc.setFillColor(
      255,
      255,
      255,
    );

    doc.circle(
      centerX,
      centerY,
      13,
      "F",
    );

    doc.setFont(
      "helvetica",
      "bold",
    );

    doc.setFontSize(8);

    doc.setTextColor(
      pdfDark[0],
      pdfDark[1],
      pdfDark[2],
    );

    doc.text(
      String(
        pieTotal,
      ),
      centerX,
      centerY + 3,
      {
        align: "center",
      },
    );

    /* Legend */
    pieItems.forEach(
      (
        item,
        index,
      ) => {
        const color =
          pieColors[
          index %
          pieColors.length
          ];

        const legendX =
          pieX + 185;

        const legendY =
          pieY +
          38 +
          index * 13;

        doc.setFillColor(
          color[0],
          color[1],
          color[2],
        );

        doc.rect(
          legendX,
          legendY - 6,
          7,
          7,
          "F",
        );

        doc.setFont(
          "helvetica",
          "normal",
        );

        doc.setFontSize(7);

        doc.setTextColor(
          pdfDark[0],
          pdfDark[1],
          pdfDark[2],
        );

        doc.text(
          `${item.name} (${item.value})`,
          legendX + 12,
          legendY,
        );
      },
    );
  }

  /* =======================================================
     REPORT SUMMARY
  ======================================================= */

  doc.setFillColor(
    239,
    247,
    242,
  );

  doc.setDrawColor(
    analyticsBorder[0],
    analyticsBorder[1],
    analyticsBorder[2],
  );

  doc.setLineWidth(1);

  doc.roundedRect(
    summaryX,
    summaryY,
    summaryW,
    summaryH,
    5,
    5,
    "FD",
  );

  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(11);

  doc.setTextColor(
    analyticsGreen[0],
    analyticsGreen[1],
    analyticsGreen[2],
  );

  doc.text(
    "Report Summary",
    summaryX + 15,
    summaryY + 21,
  );

  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(8);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  /* -------------------------------------------------------
     Left column

     Orders included
     Delivered orders
     Average order value
  ------------------------------------------------------- */

  doc.text(
    `Orders included: ${orders.length}`,
    summaryX + 18,
    summaryY + 43,
  );

  doc.text(
    `Delivered orders: ${deliveredOrders}`,
    summaryX + 18,
    summaryY + 61,
  );

  doc.text(
    `Average order value: ${pdfCurrency(
      averageOrderValue,
    )}`,
    summaryX + 18,
    summaryY + 79,
  );

  /* -------------------------------------------------------
     Right column

     Total quantity
     Total spend
  ------------------------------------------------------- */

  doc.text(
    `Total quantity: ${totalQuantity.toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      },
    )} kg`,
    summaryX + 200,
    summaryY + 43,
  );

  doc.text(
    `Total spend: ${pdfCurrency(
      totalSpend,
    )}`,
    summaryX + 200,
    summaryY + 61,
  );

  /* =======================================================
     REQUIREMENT STATUS
     
     Full-width panel.
     Kept on the same page.
  ======================================================= */

  const requirementX = 28;
  const requirementY = 428;
  const requirementW =
    pageWidth - 56;
  const requirementH = 112;

  doc.setFillColor(
    255,
    255,
    255,
  );

  doc.setDrawColor(
    analyticsBorder[0],
    analyticsBorder[1],
    analyticsBorder[2],
  );

  doc.setLineWidth(1);

  doc.roundedRect(
    requirementX,
    requirementY,
    requirementW,
    requirementH,
    5,
    5,
    "FD",
  );

  /* Title */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(10);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Requirement Status",
    requirementX + 15,
    requirementY + 18,
  );

  /* Subtitle */
  doc.setFont(
    "helvetica",
    "normal",
  );

  doc.setFontSize(6.5);

  doc.setTextColor(
    analyticsMuted[0],
    analyticsMuted[1],
    analyticsMuted[2],
  );

  doc.text(
    "Requirement count by status",
    requirementX + 15,
    requirementY + 30,
  );

  /* -------------------------------------------------------
     Always show all five statuses.
  ------------------------------------------------------- */

  const requirementItems = [
    "Matched",
    "Pending",
    "Not Found",
    "Confirmed",
    "Closed",
  ].map(
    name => ({
      name,
      value: Number(
        requirementData.find(
          item =>
            item.name ===
            name,
        )?.value ?? 0,
      ),
    }),
  );

  const reqChartLeft =
    requirementX + 52;

  const reqChartRight =
    requirementX +
    requirementW -
    28;

  const reqChartTop =
    requirementY + 39;

  const reqChartBottom =
    requirementY +
    requirementH -
    28;

  const reqChartWidth =
    reqChartRight -
    reqChartLeft;

  const reqChartHeight =
    reqChartBottom -
    reqChartTop;

  const maxRequirementValue =
    Math.max(
      ...requirementItems.map(
        item =>
          item.value,
      ),
      1,
    );

  /* =======================================================
     REQUIREMENT AXES
  ======================================================= */

  doc.setDrawColor(
    analyticsAxis[0],
    analyticsAxis[1],
    analyticsAxis[2],
  );

  doc.setLineWidth(0.9);

  /* Y-axis */
  doc.line(
    reqChartLeft,
    reqChartTop,
    reqChartLeft,
    reqChartBottom,
  );

  /* X-axis */
  doc.line(
    reqChartLeft,
    reqChartBottom,
    reqChartRight,
    reqChartBottom,
  );

  /* =======================================================
     REQUIREMENT GRID
  ======================================================= */

  const requirementSteps =
    Math.max(
      2,
      Math.min(
        4,
        maxRequirementValue,
      ),
    );

  for (
    let step = 0;
    step <=
    requirementSteps;
    step++
  ) {
    const value =
      Math.round(
        (
          maxRequirementValue /
          requirementSteps
        ) *
        step,
      );

    const y =
      reqChartBottom -
      (
        value /
        maxRequirementValue
      ) *
      reqChartHeight;

    doc.setDrawColor(
      analyticsGrid[0],
      analyticsGrid[1],
      analyticsGrid[2],
    );

    doc.setLineWidth(0.5);

    doc.line(
      reqChartLeft,
      y,
      reqChartRight,
      y,
    );

    doc.setFont(
      "helvetica",
      "normal",
    );

    doc.setFontSize(5.5);

    doc.setTextColor(
      analyticsMuted[0],
      analyticsMuted[1],
      analyticsMuted[2],
    );

    doc.text(
      String(value),
      reqChartLeft - 7,
      y + 2,
      {
        align: "right",
      },
    );
  }

  /* =======================================================
     REQUIREMENT BARS
     
     Same five-color structure as Analytics.
  ======================================================= */

  const requirementColors = [
    analyticsGreen,
    analyticsYellow,
    analyticsBlue,
    analyticsOrange,
    analyticsPurple,
  ];

  const requirementSlot =
    reqChartWidth /
    requirementItems.length;

  const requirementBarWidth =
    Math.min(
      48,
      requirementSlot *
      0.48,
    );

  requirementItems.forEach(
    (
      item,
      index,
    ) => {
      const value =
        item.value;

      const barHeight =
        value > 0
          ? (
            value /
            maxRequirementValue
          ) *
          reqChartHeight
          : 0;

      const centerX =
        reqChartLeft +
        requirementSlot *
        index +
        requirementSlot /
        2;

      const x =
        centerX -
        requirementBarWidth /
        2;

      const y =
        reqChartBottom -
        barHeight;

      const color =
        requirementColors[
        index %
        requirementColors.length
        ];

      /* Bar */
      if (
        value > 0
      ) {
        doc.setFillColor(
          color[0],
          color[1],
          color[2],
        );

        doc.roundedRect(
          x,
          y,
          requirementBarWidth,
          barHeight,
          2,
          2,
          "F",
        );
      } else {
        /* Make zero values visibly represented */
        doc.setFillColor(
          analyticsGrid[0],
          analyticsGrid[1],
          analyticsGrid[2],
        );

        doc.roundedRect(
          x,
          reqChartBottom - 1,
          requirementBarWidth,
          1,
          0.5,
          0.5,
          "F",
        );
      }

      /* Value above bar */
      doc.setFont(
        "helvetica",
        "bold",
      );

      doc.setFontSize(6.5);

      doc.setTextColor(
        pdfDark[0],
        pdfDark[1],
        pdfDark[2],
      );

      doc.text(
        String(value),
        centerX,
        value > 0
          ? y - 4
          : reqChartBottom - 4,
        {
          align: "center",
        },
      );

      /* Status label */
      doc.setFont(
        "helvetica",
        "normal",
      );

      doc.setFontSize(6.5);

      doc.setTextColor(
        analyticsMuted[0],
        analyticsMuted[1],
        analyticsMuted[2],
      );

      doc.text(
        item.name,
        centerX,
        reqChartBottom + 11,
        {
          align: "center",
        },
      );
    },
  );

  /* X-axis title */
  doc.setFont(
    "helvetica",
    "bold",
  );

  doc.setFontSize(6);

  doc.setTextColor(
    pdfDark[0],
    pdfDark[1],
    pdfDark[2],
  );

  doc.text(
    "Requirement Status",
    (
      reqChartLeft +
      reqChartRight
    ) / 2,
    requirementY +
    requirementH -
    7,
    {
      align: "center",
    },
  );

  /* Y-axis title */
  doc.text(
    "Count",
    reqChartLeft - 31,
    (
      reqChartTop +
      reqChartBottom
    ) / 2,
    {
      angle: 90,
      align: "center",
    },
  );

  /* =======================================================
     FOOTER
  ======================================================= */

  drawPdfFooter(doc);

  doc.save(
    `khetlink-analytics-${todayString()}.pdf`,
  );
};
const createId = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) { return parts[0].slice(0, 2).toUpperCase(); } return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};
const shortDisplayId = (...parts: string[]) => {
  const source = parts.filter(Boolean).join("|");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) {
    hash ^= source.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  let value = hash >>> 0;
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[value % alphabet.length];
    value = Math.floor(value / alphabet.length) || ((hash + i * 97) >>> 0);
  } return out;
};
const quantityInUnit = (quantity: number, from: RequirementUnit, to: RequirementUnit,) => {
  const converted = fromKg(toKg(quantity, from), to); return to === "dozen" ? Math.floor(converted) : converted;
};
const orderDisplayId = (order: Order) => shortDisplayId("ORDER", order.id);

const formatNotificationMessage = (message: string, orders: Order[]) => {
  let formatted = message || "";
  for (const order of orders) {
    if (!order.id || !formatted.includes(order.id)) continue;
    formatted = formatted.split(order.id).join(orderDisplayId(order));
  }
  return formatted;
};
const todayString = () => { const date = new Date(); return date.toISOString().slice(0, 10); };
const futureDate = (days: number) => {
  const date = new Date(); date.setDate(date.getDate() + days); return date.toISOString().slice(0, 10);
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
      username: "", phoneNumber: "", buyerId: "", language: "en",
    });

  const [mobileMenuOpen, setMobileMenuOpen] =
    useState(false);

  const [notificationOpen, setNotificationOpen] =
    useState(false);

  const [selectedFarmer, setSelectedFarmer] =
    useState<Farmer | null>(null);

  const [logisticsReviewOrderId, setLogisticsReviewOrderId] = useState<string | null>(null);
  const [logisticsReviewRating, setLogisticsReviewRating] = useState(0);
  const [logisticsReviewComment, setLogisticsReviewComment] = useState("");

  const [cart, setCart] =
    useState<CartItem[]>([]);

  const [requirements, setRequirements] =
    useState<Requirement[]>([]);

  // Keeps terminal requirement statuses for Dashboard/Analytics even after
  // their Marketplace cards disappear after the 3-second terminal message.
  const [requirementStatusHistory, setRequirementStatusHistory] =
    useState<Record<string, RequirementStatus>>({});

  // Durable creation timestamps used to filter requirement history in Analytics.
  const [requirementStatusDateHistory, setRequirementStatusDateHistory] =
    useState<Record<string, string>>({});

  const [offers, setOffers] =
    useState<FarmerOffer[]>([]);

  // Terminal Marketplace states are kept only in memory for 3 seconds.
  // The backend remains the source of truth and permanently stores the records.
  const terminalRequirementRef = useRef(new Map<string, { item: Requirement; expiresAt: number }>());
  const terminalOfferRef = useRef(new Map<string, { item: FarmerOffer; expiresAt: number }>());
  // Browse-product requests use a backend Requirement as their negotiation container,
  // but they must never appear in the buyer's bulk-requirement UI.
  const browseRequirementIdsRef = useRef(new Set<string>());
  // Draft submissions stay local until the buyer chooses a specific farmer.
  // This prevents the requirement from becoming a farmer-visible request before
  // the buyer clicks Send Request on a matched farmer card.
  const matchOnlyRequirementIdsRef = useRef(new Set<string>());
  // Local draft deletions are treated as tombstones so an in-flight refresh can
  // never resurrect an item/requirement the buyer has already removed.
  const removedDraftItemIdsRef = useRef(new Set<string>());
  const removedDraftRequirementIdsRef = useRef(new Set<string>());
  const buyerDataRequestRef = useRef(false);

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
    OFFERED: "Requested", COUNTERED: "Countered", NEGOTIATING: "Negotiating",
    ACCEPTED: "Accepted", REJECTED: "Rejected",
  }[status] as OfferStatus ?? "Requested");

  const mapOrderStatus = (status: string): OrderStatus => ({
    PROCESSING: "Processing", IN_TRANSIT: "In Transit", DELIVERED: "Delivered",
    CANCELLED: "Cancelled", CONFIRMED: "Confirmed",
  }[status] as OrderStatus ?? "Confirmed");

  const loadBuyerData = async (silent = false) => {
    if (buyerDataRequestRef.current) return;
    buyerDataRequestRef.current = true;
    if (!silent) setDataLoading(true);
    try {
      const [profileData, listingData, requirementData, requirementHistoryData, orderData, notificationData, supportData] =
        await Promise.all([API("/api/profile/me"), API("/api/listings"), API("/api/requirements"), API("/api/requirements/history"), API("/api/orders"), API("/api/notifications?role=BUYER"), API("/api/support")]);

      const user = profileData.user;
      const buyerRole = (user.roles ?? []).find((r: any) => r.role === "BUYER");
      setSession({
        username: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Buyer",
        phoneNumber: user.phone ?? "", buyerId: buyerRole?.roleCode ?? user.id,
        profileImage: user.profileImage ?? undefined, email: user.email ?? undefined,
        company: user.buyer?.company ?? undefined, location: user.location ?? undefined,
        latitude: user.latitude ?? null, longitude: user.longitude ?? null,
        language: buyerLanguageCode(user.language),
      });

      const farmerMap = new Map<string, Farmer>();
      for (const row of listingData.listings ?? []) {
        const f = row.farmer; if (!f) continue;
        let farmer = farmerMap.get(f.id);
        if (!farmer) {
          farmer = {
            id: f.id, roleCode: f.roleCode ?? undefined, name: `${f.firstName ?? ""} ${f.lastName ?? ""}`.trim() || "Farmer",
            phoneNumber: "", location: f.location ?? "Location not shared", distanceKm: Number(row.distanceKm ?? 0),
            rating: Number(f.rating ?? 0), reviews: Number(f.reviews ?? 0), logisticsFee: row.logisticsFee ?? null, verified: !!f.farmer?.verified,
            avatar: f.profileImage ?? `${f.firstName?.[0] ?? ""}${f.lastName?.[0] ?? ""}`,
            farm: f.farmer?.farmName ?? "Farm", about: "", landAcres: f.farmer?.landAcres ?? null, listings: []
          };
          farmerMap.set(f.id, farmer);
        }
        farmer.roleCode = f.roleCode ?? farmer.roleCode;
        farmer.distanceKm = row.distanceKm ?? farmer.distanceKm;
        farmer.listings.push({
          id: row.id, productId: row.product?.id ?? row.productId, category: row.product?.category?.name, produce: row.product?.name ?? "Product",
          availableQuantity: Number(row.quantity ?? 0), pricePerKg: Number(row.price ?? 0), unit: (row.unit === "ton" || row.unit === "dozen" || row.unit === "L" ? row.unit : "kg") as RequirementUnit, image: row.product?.imageUrl ?? undefined
        });
      }
      const nextFarmers = [...farmerMap.values()];
      setFarmers(nextFarmers);

      const listingById = new Map<string, any>((listingData.listings ?? []).map((l: any) => [l.id, l]));
      const reviewRows: FarmerReview[] = [];
      for (const row of listingData.listings ?? []) for (const review of row.reviewDetails ?? []) {
        if (!reviewRows.some(x => x.id === review.id)) reviewRows.push({
          id: review.id, farmerId: row.farmerId,
          orderId: review.orderId, buyerName: review.reviewerName ?? "Buyer", rating: Number(review.rating),
          comment: review.comment ?? "", createdAt: review.createdAt
        });
      }
      setFarmerReviews(reviewRows);

      const backendRequirements: Requirement[] = (requirementData.requirements ?? []).map((r: any) => ({
        id: r.id, buyerId: r.buyerId, createdAt: r.createdAt,
        isBrowseProduct: r.status === "BROWSE_PRODUCTS" || r.browse === true || r.type === "BROWSE",
        status: r.status === "BROWSE_PRODUCTS" ? "Draft" :
          r.status === "NOT_FOUND" ? "Not Found" :
            r.status === "CONFIRMED" ? "Confirmed" :
              r.status === "CLOSED" ? "Closed" :
                (r.offers?.length ?? 0) > 0 ? "Pending" :
                  (r.matchedFarmerIds?.length ?? 0) > 0 ? "Matched" :
                    "Pending",
        matchedFarmerIds: r.matchedFarmerIds ?? [],
        items: (r.items ?? []).map((i: any) => ({
          id: i.id, productId: i.productId, produce: i.product?.name ?? "Product", quantity: Number(i.quantity),
          unit: i.unit as RequirementUnit, minPrice: Number(i.minPrice), maxPrice: Number(i.maxPrice), requiredBy: i.requiredBy ?? futureDate(7), location: i.location ?? r.location ?? "", latitude: r.latitude ?? null, longitude: r.longitude ?? null
        }))
      }));

      // The marketplace request uses a backend Requirement only as the private
      // negotiation container required by the offer API. Mark every such record
      // immediately, including after a refresh, so it can never become a bulk
      // Create Requirement draft.
      backendRequirements.forEach(requirement => {
        if (requirement.isBrowseProduct) browseRequirementIdsRef.current.add(requirement.id);
      });
      setRequirementStatusHistory(current => {
        const next = { ...current };
        // The history endpoint is durable and survives a hard refresh.
        for (const row of requirementHistoryData.requirements ?? []) {
          // Browse-product requests are private negotiation containers, not
          // buyer bulk requirements, so they must never enter requirement
          // history/analytics.
          if (row.status === "BROWSE_PRODUCTS") continue;
          // Never let a stale history snapshot replace a newer live status.
          // In particular, a requirement that currently has matched farmers
          // must remain Matched instead of being downgraded to Pending.
          const liveRequirement = backendRequirements.find(requirement => requirement.id === row.id);
          if (liveRequirement) {
            const terminalHistoryStatus = ({
              CLOSED: "Closed",
              CONFIRMED: "Confirmed",
              NOT_FOUND: "Not Found",
            } as Record<string, RequirementStatus>)[row.status];

            next[row.id] =
              terminalHistoryStatus ??
              liveRequirement.status;

            continue;
          }
          const status = ({
            BROWSE_PRODUCTS: "Draft",
            PENDING: "Pending",
            NOT_FOUND: "Not Found",
            CONFIRMED: "Confirmed",
            CLOSED: "Closed",
          } as Record<string, RequirementStatus>)[row.status] ?? "Pending";
          next[row.id] = status;
        }
        // Keep any just-created/just-updated status that may not yet be present
        // in a concurrently returned history response.
        backendRequirements.forEach(requirement => {
          if (!next[requirement.id]) next[requirement.id] = requirement.status;
        });
        return next;
      });

      setRequirementStatusDateHistory(current => {
        const next = { ...current };
        for (const row of requirementHistoryData.requirements ?? []) {
          if (row.status === "BROWSE_PRODUCTS" || browseRequirementIdsRef.current.has(row.id)) continue;
          if (row.createdAt) next[row.id] = row.createdAt;
        }
        backendRequirements.forEach(requirement => {
          if (!next[requirement.id]) next[requirement.id] = requirement.createdAt;
        });
        return next;
      });

      const now = Date.now();
      for (const [id, entry] of terminalRequirementRef.current) {
        if (entry.expiresAt <= now) terminalRequirementRef.current.delete(id);
      }
      const transientRequirements = [...terminalRequirementRef.current.values()].map(entry => entry.item);
      setRequirements(current => {
        const localDrafts = current
          .filter(r => r.status === "Draft" && !r.isBrowseProduct && !browseRequirementIdsRef.current.has(r.id) && !removedDraftRequirementIdsRef.current.has(r.id))
          .map(r => ({
            ...r,
            items: r.items.filter(item => !removedDraftItemIdsRef.current.has(item.id)),
          }))
          .filter(r => r.items.length > 0);
        const localMatchOnly = current
          .filter(r => matchOnlyRequirementIdsRef.current.has(r.id) && !removedDraftRequirementIdsRef.current.has(r.id))
          .map(r => ({
            ...r,
            items: r.items.filter(item => !removedDraftItemIdsRef.current.has(item.id)),
          }))
          .filter(r => r.items.length > 0);
        const backendVisible = backendRequirements.filter(r => !r.isBrowseProduct && !browseRequirementIdsRef.current.has(r.id) && !removedDraftRequirementIdsRef.current.has(r.id));
        const merged = [...localDrafts, ...localMatchOnly, ...backendVisible, ...transientRequirements];
        return merged.filter((r, index, all) => all.findIndex(x => x.id === r.id) === index);
      });

      const mappedOffers: FarmerOffer[] = [];
      for (const r of requirementData.requirements ?? []) for (const o of r.offers ?? []) {
        const firstItem = (o.items ?? [])[0]; const listing = firstItem ? listingById.get(firstItem.listingId) : undefined;
        mappedOffers.push({
          id: o.id, requirementId: o.requirementId, farmerId: o.farmerId, isBrowseProduct: r.status === "BROWSE_PRODUCTS", selectedListingIds: (o.items ?? []).map((x: any) => x.listingId),
          selectedQuantities: Object.fromEntries((o.items ?? []).map((x: any) => [x.listingId, Number(x.quantity)])), productId: listing?.productId,
          requestedQuantity: firstItem?.quantity, requestedUnit: ((r.items ?? []).find((i: any) => i.productId === listing?.productId)?.unit ?? firstItem?.unit) as RequirementUnit | undefined, originalPrice: o.originalPrice == null ? undefined : Number(o.originalPrice),
          offeredPrice: Number(o.offeredPrice), buyerConfirmed: !!o.buyerConfirmed, farmerConfirmed: !!o.farmerConfirmed, status: mapStatus(o.status)
        });
      }
      for (const [id, entry] of terminalOfferRef.current) {
        if (entry.expiresAt <= now) terminalOfferRef.current.delete(id);
      }
      const transientOffers = [...terminalOfferRef.current.values()].map(entry => entry.item);
      const mergedOffers = [...mappedOffers, ...transientOffers].filter((item, index, all) => all.findIndex(x => x.id === item.id) === index);
      setOffers(mergedOffers);

      setOrders((orderData.orders ?? []).map((o: any) => {
        const first = o.items?.[0]; return {
          id: o.id, type: "Marketplace", product: first?.product?.name ?? "Order", quantity: Number(first?.quantity ?? 0), unit: (first?.unit === "ton" || first?.unit === "dozen" || first?.unit === "L" ? first.unit : "kg") as RequirementUnit, unitPrice: Number(first?.unitPrice ?? 0), cost: Number(o.total ?? 0),
          seller: `${o.seller?.firstName ?? ""} ${o.seller?.lastName ?? ""}`.trim() || "Farmer", sellerId: o.sellerId,
          buyer: `${o.buyer?.firstName ?? ""} ${o.buyer?.lastName ?? ""}`.trim() || "Buyer", buyerId: o.buyerId, deliveryDate: o.requirement?.items?.[0]?.requiredBy ? new Date(o.requirement.items[0].requiredBy).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : new Date(o.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }),
          status: mapOrderStatus(o.status), createdAt: o.createdAt, paymentStatus: o.paymentStatus, paymentExpiresAt: o.paymentExpiresAt,
          shipmentStatus: o.shipment?.status, pickupLocation: o.shipment?.pickupLocation, deliveryLocation: o.shipment?.deliveryLocation, distanceKm: o.shipment?.distanceKm, etaMinutes: o.shipment?.etaMinutes, currentLocation: o.shipment?.currentLocation, currentLat: o.shipment?.currentLat, currentLng: o.shipment?.currentLng, pickupLat: o.shipment?.pickupLat, pickupLng: o.shipment?.pickupLng, deliveryLat: o.shipment?.deliveryLat, deliveryLng: o.shipment?.deliveryLng,
          logisticsName: o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.user ? `${o.assignments.find((a: any) => a.status === "ACCEPTED").logistics.user.firstName} ${o.assignments.find((a: any) => a.status === "ACCEPTED").logistics.user.lastName}`.trim() : undefined, logisticsId: o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.id, logisticsRoleCode: o.logisticsProvider?.roleCode ?? o.logisticsRoleCode ?? o.assignments?.find((a: any) => a.status === "ACCEPTED" || a.status === "COMPLETED")?.logistics?.roleCode ?? o.assignments?.find((a: any) => a.status === "ACCEPTED" || a.status === "COMPLETED")?.logistics?.user?.roles?.find((r: any) => r.role === "LOGISTICS")?.roleCode, sellerRoleCode: o.sellerRoleCode,
          logisticsRating: o.logisticsProvider?.rating ?? o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.rating, logisticsPhone: o.logisticsProvider?.phone ?? o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.user?.phone ?? null, logisticsVehicleType: o.logisticsProvider?.vehicleType ?? o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.vehicleType ?? null, logisticsVehicleNumber: o.logisticsProvider?.vehicleNumber ?? o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.vehicleNumber ?? null, logisticsReviews: o.logisticsProvider?.reviews ?? o.assignments?.find((a: any) => a.status === "ACCEPTED")?.logistics?.reviews ?? 0, logisticsReviewSubmitted: Boolean(o.logisticsReviewSubmitted), logisticsReview: o.logisticsReview ?? null, logisticsRequestSentAt: o.logisticsRequestSentAt ?? null, logisticsRequestExpiresAt: o.logisticsRequestExpiresAt ?? null, logisticsAcceptedAt: o.logisticsAcceptedAt ?? null, logisticsAccepted: Boolean(o.logisticsAccepted), confirmedAt: o.statusHistory?.find((h: any) => h.toStatus === "CONFIRMED")?.createdAt, deliveredAt: o.statusHistory?.find((h: any) => h.toStatus === "DELIVERED")?.createdAt, productSubtotal: (Number(o.total || 0) - Number(o.platformFee || 0) - Number(o.logisticsFee || 0)), platformFee: Number(o.platformFee || 0), logisticsFee: Number(o.logisticsFee || 0), verificationCode: o.participantCodes?.find((c: any) => c.role === "BUYER")?.code
        };
      }));

      const loadedOrders = orderData.orders ?? [];
      setNotifications((notificationData.notifications ?? []).filter((n: any) => !n.read).map((n: any) => ({
        id: n.id,
        title: n.title,
        message: formatNotificationMessage(n.message, loadedOrders.map((o: any) => ({ id: o.id } as Order))),
        type: n.type === "SHIPMENT" ? "shipment" : n.type === "SYSTEM" ? "system" : "order",
        read: false,
        createdAt: n.createdAt,
      })));
      setTickets((supportData.tickets ?? []).map((t: any) => ({ id: t.id, subject: t.subject, message: t.message, status: t.status, createdAt: t.createdAt })));
    } catch (error) {
      console.error("Buyer data load failed:", error);
      showToast(error instanceof Error ? error.message : "Unable to load Buyer data.");
    } finally {
      buyerDataRequestRef.current = false;
      setDataLoading(false);
    }
  };

  useEffect(() => {
    void loadBuyerData();
    // Poll the actual Buyer data instead of relying on /api/sync/version.
    // Some backend mutations do not advance the sync version, which made the
    // interface stale until a hard refresh. The request guard prevents overlap.
    const dataTimer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      void loadBuyerData(true);
    }, 1200);
    return () => window.clearInterval(dataTimer);
  }, []);

  useEffect(() => {
    const notificationTimer = window.setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const data = await API("/api/notifications?role=BUYER");
        setNotifications((data.notifications ?? []).filter((n: any) => !n.read).map((n: any) => ({
          id: n.id,
          title: n.title,
          message: formatNotificationMessage(n.message, orders),
          type: n.type === "SHIPMENT" ? "shipment" : n.type === "SYSTEM" ? "system" : "order",
          read: false,
          createdAt: n.createdAt,
        })));
      } catch { }
    }, 1500);
    return () => window.clearInterval(notificationTimer);
  }, [orders]);

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
    farmer.listings.map((listing) => ({
      id: listing.id, listingId: listing.id, productId: listing.productId, farmerId: farmer.id, farmerName: farmer.name,
      name: listing.produce, category: listing.category ?? "Other", quantityAvailable: listing.availableQuantity, unit: listing.unit, pricePerKg: listing.pricePerKg,
      rating: farmer.rating, reviews: farmer.reviews, deliveryTime: "Based on backend logistics", image: listing.image || getProductImage(listing.produce), logisticsFee: farmer.logisticsFee
    }))
  ), [farmers]);

  const categories = useMemo(() => ["All", "Vegetables", "Fruits", "Pulses", "Grains", "Spices", "Flowers", "Non-Edible", "Herbs", "Others", "Livestock"], []);

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
        const payload = await API("/api/orders", { method: "POST", body: JSON.stringify({ sellerId: item.farmerId, items: [{ productId: product.productId, listingId: product.listingId, quantity: item.quantity, unit: "kg", unitPrice: item.pricePerKg }] }) });
        const o = payload.order; if (o) created.push({ id: o.id, type: "Marketplace", product: product.name, quantity: item.quantity, unit: "kg", cost: Number(o.total ?? item.quantity * item.pricePerKg), seller: item.farmerName, sellerId: item.farmerId, buyer: session.username, buyerId: session.buyerId, deliveryDate: o.createdAt, status: "Confirmed", createdAt: o.createdAt });
      }
      setOrders(current => [...created, ...current]); setCart([]); showToast(created.length ? "Purchase successful. Your orders are confirmed." : "No order could be created."); if (created.length) void loadBuyerData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to create order."); }
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
      location: session.location ?? "",
      latitude: session.latitude ?? null,
      longitude: session.longitude ?? null,
    });

  const [editingRequirementItemId, setEditingRequirementItemId] =
    useState<string | null>(null);

  useEffect(() => {
    if (editingRequirementItemId || requirementForm.location.trim() || !session.location?.trim()) return;
    setRequirementForm((current) => ({
      ...current,
      location: session.location?.trim() ?? "",
      latitude: session.latitude ?? null,
      longitude: session.longitude ?? null,
    }));
  }, [editingRequirementItemId, requirementForm.location, session.location, session.latitude, session.longitude]);

  const resetRequirementForm = () => {
    setRequirementForm({
      id: "",
      produce: "",
      quantity: 100,
      unit: "kg",
      minPrice: 1,
      maxPrice: 100,
      requiredBy: futureDate(7),
      location: session.location ?? "",
      latitude: session.latitude ?? null,
      longitude: session.longitude ?? null,
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
        requirement.status === "Draft" &&
        !requirement.isBrowseProduct &&
        !browseRequirementIdsRef.current.has(requirement.id) &&
        !removedDraftRequirementIdsRef.current.has(requirement.id),
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
    removedDraftItemIdsRef.current.add(itemId);
    setRequirements((current) =>
      current
        .map((requirement) => {
          if (
            requirement.status !== "Draft" ||
            requirement.isBrowseProduct ||
            browseRequirementIdsRef.current.has(requirement.id)
          ) {
            return requirement;
          }

          const items = requirement.items.filter(
            (item) => item.id !== itemId,
          );
          if (items.length === 0) {
            removedDraftRequirementIdsRef.current.add(requirement.id);
          }
          return { ...requirement, items };
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
    const requirement = requirements.find(x => x.id === requirementId);
    if (!requirement?.items.length) {
      showToast("Add at least one requirement.");
      return;
    }

    // Submit here means "find matching farmers" only. Do not create a
    // backend PENDING requirement yet: PENDING requirements are visible to
    // farmers. The backend record is created only when the buyer clicks
    // Send Request on a particular matched farmer card.
    const matchedFarmerIds = farmers
      .filter((farmer) => getEligibleListings(farmer, requirement).length > 0)
      .map((farmer) => farmer.id);

    const submittedRequirement: Requirement = {
      ...requirement,
      status: matchedFarmerIds.length ? "Matched" : "Not Found",
      matchedFarmerIds,
    };

    matchOnlyRequirementIdsRef.current.add(requirement.id);
    setRequirements(current =>
      current.map(item => item.id === requirement.id ? submittedRequirement : item),
    );
    setRequirementStatusHistory(current => ({
      ...current,
      [requirement.id]: submittedRequirement.status,
    }));
    setRequirementStatusDateHistory(current => ({
      ...current,
      [requirement.id]: requirement.createdAt,
    }));

    if (matchedFarmerIds.length) {
      showToast(`${requirement.id} submitted. Matching farmers are now available below.`);
    } else {
      showToast(`${requirement.id} submitted. No current matching farmer was found.`);
    }
  };

  const getEligibleListings = (
    farmer: Farmer,
    requirement: Requirement,
  ) => {
    return farmer.listings.filter((listing) => requirement.items.some((item) => {
      const listingPriceInRequirementUnit = listing.unit === (item.unit ?? "kg") ? listing.pricePerKg : pricePerSelectedUnit(fromKg(listing.pricePerKg, listing.unit), (item.unit ?? "kg"));
      return listing.produce.toLowerCase() === item.produce.toLowerCase() && listingPriceInRequirementUnit >= item.minPrice && listingPriceInRequirementUnit <= item.maxPrice && listing.availableQuantity > 0;
    }));
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

  const sendProcurementRequest = async (requirement: Requirement, farmer: Farmer) => {
    const eligible = getEligibleListings(farmer, requirement);
    const selected = selectedListingIds[farmer.id] ?? [];
    const ids = (selected.length ? selected : eligible.map(l => l.id))
      .filter(id => eligible.some(l => l.id === id));

    if (!ids.length) {
      showToast("Select at least one matching produce.");
      return;
    }

    const items = ids
      .map(listingId => {
        const l = farmer.listings.find(x => x.id === listingId)!;
        const r = requirement.items.find(x => x.produce.toLowerCase() === l.produce.toLowerCase());
        return {
          listingId,
          quantity: Math.min(
            selectedListingQuantities[farmer.id]?.[listingId] ??
            fromKg(toKg(r?.quantity ?? 0, r?.unit ?? "kg"), l.unit),
            l.availableQuantity,
          ),
        };
      })
      .filter(x => x.quantity > 0);

    const price = Math.round(
      items.reduce((sum, x) => {
        const l = farmer.listings.find(l => l.id === x.listingId);
        const r = requirement.items.find(i => i.produce.toLowerCase() === (l?.produce || "").toLowerCase());
        return sum + (l && r ? pricePerSelectedUnit(fromKg(l.pricePerKg, l.unit), r.unit) : 0);
      }, 0) / Math.max(items.length, 1),
    );

    try {
      let backendRequirementId = requirement.id;

      // A draft submission is only a local match preview. Persist it now, at
      // the exact moment the buyer chooses this farmer, so only the selected
      // farmer receives the actual offer notification.
      if (matchOnlyRequirementIdsRef.current.has(requirement.id)) {
        const catalog = await API("/api/catalog");
        const byName = new Map<string, any>((catalog ?? []).map((x: any) => [x.name.toLowerCase(), x]));
        const requirementItems = requirement.items.map(item => ({
          productId: item.productId ?? byName.get(item.produce.toLowerCase())?.id,
          quantity: item.quantity,
          unit: item.unit ?? "kg",
          minPrice: item.minPrice,
          maxPrice: item.maxPrice,
          requiredBy: item.requiredBy ? new Date(item.requiredBy).toISOString() : undefined,
          location: item.location,
        }));

        if (requirementItems.some(item => !item.productId)) {
          showToast("One or more requested products could not be matched to the catalogue.");
          return;
        }

        const created = await API("/api/requirements", {
          method: "POST",
          body: JSON.stringify({
            location: requirement.items[0]?.location || session.location,
            latitude: requirement.items[0]?.latitude ?? session.latitude,
            longitude: requirement.items[0]?.longitude ?? session.longitude,
            items: requirementItems,
          }),
        });

        backendRequirementId = created.requirementId;
        matchOnlyRequirementIdsRef.current.delete(requirement.id);
        removedDraftRequirementIdsRef.current.delete(requirement.id);
      }

      const result = await API(`/api/requirements/${backendRequirementId}/offer`, {
        method: "POST",
        body: JSON.stringify({ farmerId: farmer.id, offeredPrice: price, items }),
      });
      const o = result.offer;

      setRequirements(current => current
        .map(item => item.id === requirement.id
          ? { ...item, id: backendRequirementId, status: "Pending" as RequirementStatus }
          : item)
        .filter((item, index, all) => all.findIndex(x => x.id === item.id) === index));
      setRequirementStatusHistory(current => ({ ...current, [backendRequirementId]: "Pending" }));
      setRequirementStatusDateHistory(current => ({ ...current, [backendRequirementId]: requirement.createdAt }));
      setOffers(current => [
        ...current.filter(x => !(x.requirementId === backendRequirementId && x.farmerId === farmer.id)),
        {
          id: o.id,
          requirementId: backendRequirementId,
          farmerId: o.farmerId,
          selectedListingIds: items.map(x => x.listingId),
          selectedQuantities: Object.fromEntries(items.map(x => [x.listingId, x.quantity])),
          productId: farmer.listings.find(l => l.id === items[0]?.listingId)?.productId,
          offeredPrice: Number(o.offeredPrice),
          originalPrice: Number(o.originalPrice ?? o.offeredPrice),
          buyerConfirmed: false,
          farmerConfirmed: false,
          status: "Requested",
        },
      ]);
      showToast(`Request sent to ${farmer.name}. Waiting for farmer response…`);
      void loadBuyerData();
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to send request.");
    }
  };


  const negotiateOffer = async (requirementId: string, farmerId: string, price: number) => {
    const offer = offers.find(x => x.requirementId === requirementId && x.farmerId === farmerId); if (!offer) return;
    if (!offer.farmerConfirmed) { showToast("Wait for the farmer to accept the request first."); return; }
    try {
      const result = await API(`/api/requirements/${requirementId}/counter`, { method: "POST", body: JSON.stringify({ farmerId, price: Math.max(0, Number(price) || offer.offeredPrice) }) }); const o = result.offer;
      setOffers(current => current.map(x => x.id === offer.id ? { ...x, offeredPrice: Number(o.offeredPrice), buyerConfirmed: false, farmerConfirmed: false, status: "Negotiating" } : x));
      showToast("Negotiated price sent. Waiting for the farmer…"); void loadBuyerData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to negotiate."); }
  };

  const farmerAcceptOffer = (_requirementId: string, _farmerId: string) => { };

  const finalizeProcurementOrder = async (requirementId: string, farmerId: string) => {
    const offer = offers.find(x => x.requirementId === requirementId && x.farmerId === farmerId); if (!offer) return;
    if (!offer.farmerConfirmed && offer.status !== "Countered") { showToast("The farmer must accept the offer first."); return; }
    try {
      const result = await API(`/api/requirements/${requirementId}/accept`, { method: "POST", body: JSON.stringify({ farmerId }) });
      const nextOffer = { ...offer, buyerConfirmed: true, farmerConfirmed: !!result.offer?.farmerConfirmed, status: (result.orderCreated ? "Accepted" : "Negotiating") as OfferStatus };
      setOffers(current => current.map(x => x.id === offer.id ? nextOffer : x));
      if (result.orderCreated) {
        const requirement = requirements.find(x => x.id === requirementId);
        if (requirement) {
          const terminalRequirement = { ...requirement, status: "Confirmed" as RequirementStatus };
          setRequirementStatusHistory(current => ({ ...current, [requirementId]: "Confirmed" }));
          terminalRequirementRef.current.set(requirementId, { item: terminalRequirement, expiresAt: Date.now() + 3000 });
          setRequirements(current => current.map(x => x.id === requirementId ? terminalRequirement : x));
          window.setTimeout(() => {
            terminalRequirementRef.current.delete(requirementId);
            setRequirements(current => current.filter(x => x.id !== requirementId));
          }, 3000);
        }
        terminalOfferRef.current.set(offer.id, { item: nextOffer, expiresAt: Date.now() + 3000 });
        window.setTimeout(() => {
          terminalOfferRef.current.delete(offer.id);
          setOffers(current => current.filter(x => x.id !== offer.id));
        }, 3000);
      }
      showToast(result.orderCreated ? "Both parties accepted. Order confirmed." : "Your acceptance is recorded. Waiting for the farmer to confirm.");
      void loadBuyerData(true);
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to accept offer."); }
  };

  const declineOffer = async (requirementId: string, farmerId: string) => {
    try {
      await API(`/api/requirements/${requirementId}/decline`, { method: "POST", body: JSON.stringify({ farmerId }) });
      const rejectedOffer = offers.find(x => x.requirementId === requirementId && x.farmerId === farmerId);
      if (rejectedOffer) {
        const terminalOffer = { ...rejectedOffer, status: "Rejected" as OfferStatus, buyerConfirmed: false, farmerConfirmed: false };
        terminalOfferRef.current.set(terminalOffer.id, { item: terminalOffer, expiresAt: Date.now() + 3000 });
        setOffers(current => current.map(x => x.id === terminalOffer.id ? terminalOffer : x));
        window.setTimeout(() => {
          terminalOfferRef.current.delete(terminalOffer.id);
          setOffers(current => current.filter(x => x.id !== terminalOffer.id));
        }, 3000);
      }
      showToast("Offer declined.");
      void loadBuyerData(true);
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to decline offer."); }
  };

  const closeRequirement = async (requirementId: string) => {
    if (matchOnlyRequirementIdsRef.current.has(requirementId)) {
      try {
        await API(`/api/requirements/${requirementId}/close`, {
          method: "POST",
        });

        matchOnlyRequirementIdsRef.current.delete(requirementId);

        setRequirementStatusHistory(current => ({
          ...current,
          [requirementId]: "Closed",
        }));

        setRequirements(current =>
          current.filter(item => item.id !== requirementId),
        );

        setOffers(current =>
          current.filter(item => item.requirementId !== requirementId),
        );

        showToast("Requirement closed.");
      } catch (error) {
        showToast(
          error instanceof Error
            ? error.message
            : "Unable to close requirement.",
        );
      }

      return;
    }

    try {
      await API(`/api/requirements/${requirementId}/close`, {
        method: "POST",
      });

      const requirement = requirements.find(
        x => x.id === requirementId,
      );

      if (requirement) {
        const terminalRequirement = {
          ...requirement,
          status: "Closed" as RequirementStatus,
        };

        setRequirementStatusHistory(current => ({
          ...current,
          [requirementId]: "Closed",
        }));

        terminalRequirementRef.current.set(requirementId, {
          item: terminalRequirement,
          expiresAt: Date.now() + 3000,
        });

        setRequirements(current =>
          current.map(x =>
            x.id === requirementId ? terminalRequirement : x,
          ),
        );

        window.setTimeout(() => {
          terminalRequirementRef.current.delete(requirementId);

          setRequirements(current =>
            current.filter(x => x.id !== requirementId),
          );
        }, 3000);
      }

      setOffers(current =>
        current.filter(x => x.requirementId !== requirementId),
      );

      showToast("Requirement closed.");

      void loadBuyerData(true);
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "Unable to close requirement.",
      );
    }
  };

  const dismissRequirement = (requirementId: string) => {
    setRequirements((current) =>
      current.filter(
        (requirement) => requirement.id !== requirementId,
      ),
    );
  };

  const payOrder = async (orderId: string) => {
    try { await API(`/api/orders/${orderId}/pay`, { method: "POST" }); showToast("Demo payment successful. Logistics search started."); void loadBuyerData(); }
    catch (error) { showToast(error instanceof Error ? error.message : "Unable to complete payment."); }
  };

  const retryLogistics = async (orderId: string) => {
    try {
      const result = await API(`/api/orders/${orderId}/retry-logistics`, { method: "POST" });

      setOrders(current =>
        current.map(order =>
          order.id === orderId
            ? {
              ...order,
              logisticsRequestSentAt: result.logisticsRequestSentAt ?? null,
              logisticsRequestExpiresAt: result.logisticsRequestExpiresAt ?? null,
              logisticsAccepted: false,
              logisticsAcceptedAt: null,
              logisticsName: undefined,
              logisticsId: undefined,
              logisticsRoleCode: undefined,
              logisticsRating: undefined,
            }
            : order,
        ),
      );

      showToast("Logistics request sent again. A new one-hour response window has started.");
      void loadBuyerData(true);
      return true;
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to retry logistics request.");
      return false;
    }
  };

  const submitFarmerReview = async (order: Order, rating: number, comment: string) => {
    const trimmed = comment.trim(); if (!rating || !trimmed) { showToast("Please select a rating and write a review."); return false; }
    if (farmerReviews.some(r => r.orderId === order.id)) { showToast("You have already reviewed this order."); return false; }
    try {
      const result = await API(`/api/orders/${order.id}/review`, { method: "POST", body: JSON.stringify({ rating, comment: trimmed }) });
      setFarmerReviews(current => [{ id: result.review.id, farmerId: order.sellerId, orderId: order.id, buyerName: session.username, rating, comment: trimmed, createdAt: result.review.createdAt }, ...current]); showToast("Review submitted successfully."); return true;
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to submit review."); return false; }
  };

  const submitLogisticsReview = async (order: Order, rating: number, comment: string) => {
    const trimmed = comment.trim();
    if (!rating || !trimmed) { showToast("Please select a rating and write a review."); return false; }
    if (order.logisticsReviewSubmitted) { showToast("You have already reviewed this logistics provider."); return false; }
    try {
      const result = await API(`/api/orders/${order.id}/review`, { method: "POST", body: JSON.stringify({ rating, comment: trimmed, target: "LOGISTICS" }) });
      setOrders(current => current.map(item => item.id === order.id ? { ...item, logisticsReviewSubmitted: true, logisticsReview: result.review } : item));
      showToast("Logistics provider review submitted successfully.");
      return true;
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to submit logistics review."); return false; }
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
            order.status === orderFilter;
          const normalizeOrderSearch = (value: unknown) =>
            String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

          const normalizedQuery = normalizeOrderSearch(query);
          const displayId = orderDisplayId(order);
          const searchMatch =
            !query ||
            String(order.id ?? "").toLowerCase().includes(query) ||
            String(displayId ?? "").toLowerCase().includes(query) ||
            normalizeOrderSearch(displayId).includes(normalizedQuery) ||
            String(order.product ?? "").toLowerCase().includes(query) ||
            String(order.seller ?? "").toLowerCase().includes(query) ||
            String(order.type ?? "").toLowerCase().includes(query) ||
            String(order.buyer ?? "").toLowerCase().includes(query);
          return statusMatch && searchMatch;
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

      if (analyticsRange === "week") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const day = today.getDay();
        const daysFromMonday = (day + 6) % 7;
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - daysFromMonday);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23, 59, 59, 999);
        start = weekStart.getTime();
        end = weekEnd.getTime();
      }

      if (analyticsRange === "month") {
        const monthStart = new Date();
        monthStart.setDate(1);
        monthStart.setHours(0, 0, 0, 0);
        const monthEnd = new Date(monthStart);
        monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
        monthEnd.setHours(23, 59, 59, 999);
        start = monthStart.getTime();
        end = monthEnd.getTime();
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
          if (!isCountedOrder(order)) return false;
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

  const distributionOrders = useMemo(() => {
    const now = Date.now();
    let start = 0;
    let end = now;

    if (analyticsRange === "week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysFromMonday = (today.getDay() + 6) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysFromMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      start = weekStart.getTime();
      end = weekEnd.getTime();
    } else if (analyticsRange === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      start = monthStart.getTime();
      end = monthEnd.getTime();
    } else if (analyticsRange === "custom") {
      if (customStart) start = new Date(`${customStart}T00:00:00`).getTime();
      if (customEnd) end = new Date(`${customEnd}T23:59:59`).getTime();
    }

    return orders.filter(order => {
      const time = new Date(order.createdAt).getTime();
      return time >= start && time <= end;
    });
  }, [orders, analyticsRange, customStart, customEnd]);

  const analyticsRequirements = useMemo(() => {
    const now = Date.now();
    let start = 0;
    let end = now;

    if (analyticsRange === "week") {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const daysFromMonday = (today.getDay() + 6) % 7;
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - daysFromMonday);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);
      start = weekStart.getTime();
      end = weekEnd.getTime();
    } else if (analyticsRange === "month") {
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1, 0);
      monthEnd.setHours(23, 59, 59, 999);
      start = monthStart.getTime();
      end = monthEnd.getTime();
    }

    const visible = new Map<string, Requirement>();

    requirements.forEach(requirement => {
      const createdAt =
        requirementStatusDateHistory[requirement.id] ?? requirement.createdAt;

      // For a custom range, compare calendar dates rather than timestamps.
      // This prevents a requirement created on Sep 13 from appearing when
      // the selected range ends on Sep 12.
      if (analyticsRange === "custom") {
        const createdDate = new Date(createdAt).toLocaleDateString("en-CA");
        const withinStart = !customStart || createdDate >= customStart;
        const withinEnd = !customEnd || createdDate <= customEnd;

        if (withinStart && withinEnd) {
          visible.set(requirement.id, requirement);
        }
        return;
      }

      const time = new Date(createdAt).getTime();
      if (time >= start && time <= end) {
        visible.set(requirement.id, requirement);
      }
    });

    // Terminal requirements can disappear from Marketplace, but their durable
    // status history still lets Analytics count them after a hard refresh.
    Object.entries(requirementStatusHistory).forEach(([id, status]) => {
      if (visible.has(id)) return;
      const createdAt = requirementStatusDateHistory[id];
      if (!createdAt) return;

      if (analyticsRange === "custom") {
        const createdDate = new Date(createdAt).toLocaleDateString("en-CA");
        const withinStart = !customStart || createdDate >= customStart;
        const withinEnd = !customEnd || createdDate <= customEnd;

        if (!withinStart || !withinEnd) return;
      } else {
        const time = new Date(createdAt).getTime();
        if (time < start || time > end) return;
      }

      visible.set(id, {
        id,
        buyerId: session.buyerId,
        createdAt,
        status,
        items: [],
      });
    });

    return [...visible.values()];
  }, [
    requirements,
    requirementStatusHistory,
    requirementStatusDateHistory,
    analyticsRange,
    customStart,
    customEnd,
    session.buyerId,
  ]);

  // Keep the status history in the same selected date range as the
  // requirements. DashboardInsights uses this history as authoritative, so
  // passing the full history here would re-introduce requirements from outside
  // the selected custom range.
  const analyticsRequirementStatusHistory = useMemo(() => {
    const visibleIds = new Set(analyticsRequirements.map(requirement => requirement.id));
    const filtered: Record<string, RequirementStatus> = {};

    for (const requirement of analyticsRequirements) {
      filtered[requirement.id] = requirement.status;
    }

    Object.entries(requirementStatusHistory).forEach(([id, status]) => {
      if (visibleIds.has(id)) filtered[id] = status;
    });

    return filtered;
  }, [analyticsRequirements, requirementStatusHistory]);
  const requirementData = [
    "Matched",
    "Pending",
    "Not Found",
    "Confirmed",
    "Closed",
  ].map((name) => ({
    name,
    value: analyticsRequirements.filter((item) => {
      const status =
        analyticsRequirementStatusHistory[item.id] ??
        item.status;

      return name === "Pending"
        ? ["Draft", "Searching", "Pending"].includes(status)
        : status === name;
    }).length,
  }));
  const pieData = useMemo(() => {

    // IMPORTANT:
    // Do NOT use analyticsOrders here.
    // analyticsOrders intentionally removes Cancelled orders.
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
      "Cancelled",
    ];

    return statuses.map((name, index) => ({
      name,
      value: distributionOrders.filter(
        (order) => order.status === name
      ).length,
      fill: colors[index],
    }));
  }, [distributionOrders]);

  /* -------------------------------------------------------
     DASHBOARD METRICS
  ------------------------------------------------------- */

  const countedOrders = orders.filter(isCountedOrder);
  const totalSpend =
    countedOrders.reduce(
      (sum, order) =>
        sum + order.cost,
      0,
    );

  const totalQuantity =
    countedOrders.reduce(
      (sum, order) =>
        sum + order.quantity,
      0,
    );

  const activeShipments =
    countedOrders.filter(
      (order) =>
        order.status ===
        "In Transit",
    ).length;

  const confirmedOrders =
    countedOrders.filter(
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
        const normalizedProductCategory =
          String(product.category || "").trim().toLowerCase();

        const normalizedSelectedCategory =
          String(category || "").trim().toLowerCase();

        const categoryMatch =
          normalizedSelectedCategory === "all" ||
          normalizedProductCategory === normalizedSelectedCategory ||
          (normalizedSelectedCategory === "others" &&
            normalizedProductCategory === "other") ||
          (normalizedSelectedCategory === "organic" &&
            product.farmerName.toLowerCase().includes("sharma"));

        const searchMatch =
          !query ||
          `${product.name} ${product.farmerName} ${product.category}`
            .toLowerCase()
            .includes(query);

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

  const addMarketplaceProductToRequirement = async (product: Product, quantity: number, unit: RequirementUnit) => {
    const farmer = farmers.find(x => x.id === product.farmerId); if (!farmer) return;
    const availableSelected = quantityInUnit(product.quantityAvailable, product.unit, unit);
    const priceForSelectedUnit = product.unit === unit ? product.pricePerKg : pricePerSelectedUnit(fromKg(product.pricePerKg, product.unit), unit);
    const safeQuantity = Math.min(availableSelected, Math.max(minimumQuantityForUnit(unit), quantity));
    const listingQuantity = quantityInUnit(safeQuantity, unit, product.unit);
    try {
      const requirementPayload = await API("/api/requirements", { method: "POST", body: JSON.stringify({ browse: true, location: session.location, items: [{ productId: product.productId, quantity: safeQuantity, unit, minPrice: priceForSelectedUnit, maxPrice: priceForSelectedUnit, requiredBy: futureDate(7) }] }) });
      const requirementId = requirementPayload.requirementId;
      browseRequirementIdsRef.current.add(requirementId);
      const offerPayload = await API(`/api/requirements/${requirementId}/offer`, { method: "POST", body: JSON.stringify({ farmerId: farmer.id, offeredPrice: priceForSelectedUnit, items: [{ listingId: product.listingId, quantity: listingQuantity }] }) });
      const o = offerPayload.offer;
      setOffers(current => [...current.filter(x => x.id !== o.id), { id: o.id, requirementId, farmerId: farmer.id, productId: product.productId, selectedListingIds: [product.listingId], selectedQuantities: { [product.listingId]: listingQuantity }, requestedQuantity: safeQuantity, requestedUnit: unit, offeredPrice: Number(o.offeredPrice), originalPrice: Number(o.originalPrice ?? o.offeredPrice), buyerConfirmed: false, farmerConfirmed: false, status: "Requested" }]);
      showToast(`Request sent to ${farmer.name}. Waiting for farmer response…`); void loadBuyerData();
    } catch (error) { showToast(error instanceof Error ? error.message : "Unable to send request."); }
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

  const resetBuyerOrderHistory = async () => {
    const confirmed = window.confirm(
      "This will permanently erase the buyer's requirement history used by Analytics. Existing orders will NOT be deleted and will remain visible to both Buyer and Farmer. Do you want to continue?"
    );
    if (!confirmed) return;

    try {
      const result = await API("/api/requirements/history/orders", { method: "DELETE" });

      // Never clear or delete actual Order records here. Orders are shared
      // transactional data and the Farmer interface depends on them.
      setRequirements([]);
      setRequirementStatusHistory({});
      setOffers([]);
      terminalRequirementRef.current.clear();
      terminalOfferRef.current.clear();

      showToast(
        Number(result?.deletedRequirements ?? 0) > 0
          ? "Buyer requirement history has been erased. Existing orders were preserved."
          : "There was no stored requirement history to erase. Existing orders were preserved."
      );
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to erase buyer requirement history.");
    }
  };

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
        onNotifications={() => { setNotificationOpen((value) => !value); }}
        onLanguage={async (language) => { try { await API("/api/profile/me", { method: "PATCH", body: JSON.stringify({ language: buyerLanguageCode(language) }) }); setSession(current => ({ ...current, language: buyerLanguageCode(language) })); showToast("Language updated successfully."); } catch (error) { showToast(error instanceof Error ? error.message : "Unable to update language."); } }}
        onMarkNotifications={async () => {
          try { await API("/api/notifications/read?role=BUYER", { method: "DELETE" }); setNotifications([]); setNotificationOpen(false); }
          catch (error) { showToast(error instanceof Error ? error.message : "Unable to clear notifications."); }
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
                requirementStatusHistory={requirementStatusHistory}
                farmers={
                  farmers
                }
                farmerReviews={farmerReviews}
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
                  browseRequirementIds: browseRequirementIdsRef.current,
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
                  buyerLocation: session.location,
                  buyerLatitude: session.latitude,
                  buyerLongitude: session.longitude,
                  showToast: showToast,
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
                onRetryLogistics={retryLogistics}
              />
            )}

          {activeTab ===
            "Shipment" && (
              <Shipment
                orders={orders}
                onRetryLogistics={retryLogistics}
                logisticsReviewOrderId={logisticsReviewOrderId}
                setLogisticsReviewOrderId={setLogisticsReviewOrderId}
                logisticsReviewRating={logisticsReviewRating}
                setLogisticsReviewRating={setLogisticsReviewRating}
                logisticsReviewComment={logisticsReviewComment}
                setLogisticsReviewComment={setLogisticsReviewComment}
                submitLogisticsReview={submitLogisticsReview}
              />
            )}

          {activeTab ===
            "Analytics" && (
              <Analytics
                orders={
                  analyticsOrders
                }
                distributionOrders={
                  distributionOrders
                }
                requirements={
                  analyticsRequirements
                }
                requirementStatusHistory={analyticsRequirementStatusHistory}
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
                  void exportAnalytics(
                    analyticsOrders,
                    barData,
                    pieData,
                    requirementData,
                    analyticsRange,
                    customStart,
                    customEnd,
                  )
                }
                onResetOrders={resetBuyerOrderHistory}
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
                    const payload = await API("/api/profile/me", { method: "PATCH", body: JSON.stringify({ firstName: nextSession.username.split(" ")[0], lastName: nextSession.username.split(" ").slice(1).join(" ") || "Buyer", phone: nextSession.phoneNumber, email: nextSession.email, profileImage: nextSession.profileImage, location: nextSession.location, latitude: nextSession.latitude ?? null, longitude: nextSession.longitude ?? null, language: buyerLanguageCode(nextSession.language), company: nextSession.company }) });
                    const user = payload.user; setSession(current => ({ ...current, username: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || current.username, phoneNumber: user.phone ?? current.phoneNumber, email: user.email ?? current.email, profileImage: user.profileImage ?? current.profileImage, location: user.location ?? current.location, latitude: user.latitude ?? current.latitude, longitude: user.longitude ?? current.longitude, language: buyerLanguageCode(user.language), company: nextSession.company }));
                    showToast("Profile updated successfully.");
                  } catch (error) { showToast(error instanceof Error ? error.message : "Unable to update profile."); }
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
  onLanguage,
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
  onLanguage: (language: string) => void | Promise<void>;
}) {
  const [languageOpen, setLanguageOpen] = useState(false);

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
            <img src="/Khetlink_Logo.svg" alt="KhetLink Logo" width={38} height={38} />
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
          <div className="farmer-language-wrap">
            <button type="button" className="buyer-outline-button farmer-language-button" onClick={() => setLanguageOpen(v => !v)}><Languages size={15} /><span>{buyerLanguageLabel(session.language)}</span><ChevronDown size={13} /></button>
            {languageOpen && <div className="farmer-language-menu">{BUYER_LANGUAGES.map(([code, label]) => <button type="button" key={code} onClick={() => { setLanguageOpen(false); void onLanguage(code); }}>{label}{buyerLanguageCode(session.language) === code ? " ✓" : ""}</button>)}</div>}
          </div>
          <div className="buyer-notification-wrapper">
            <button
              type="button"
              className={`buyer-icon-button ${notificationOpen
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

                  <button
                    type="button"
                    onClick={
                      onMarkNotifications
                    }
                  >
                    Mark all read
                  </button>
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
                          className={`notification-item ${notification.read
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
        className={`buyer-sidebar ${open
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
  requirementStatusHistory,
  farmers,
  farmerReviews,
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
  requirementStatusHistory: Record<string, RequirementStatus>;
  farmers: Farmer[];
  farmerReviews: FarmerReview[];
  totalSpend: number;
  totalQuantity: number;
  confirmedOrders: number;
  activeShipments: number;
  onNavigate: (view: View) => void;
  onFarmer: (farmer: Farmer) => void;
}) {
  const [summaryRange, setSummaryRange] = useState<"week" | "month">("month");
  const summaryNow = new Date();
  const currentWeekStart = new Date(summaryNow); currentWeekStart.setHours(0, 0, 0, 0); currentWeekStart.setDate(currentWeekStart.getDate() - ((currentWeekStart.getDay() + 6) % 7));
  const summaryStart = summaryRange === "week" ? currentWeekStart.getTime() : new Date(summaryNow.getFullYear(), summaryNow.getMonth(), 1).getTime();
  const summaryOrders = orders.filter((order) => isCountedOrder(order) && new Date(order.createdAt).getTime() >= summaryStart);
  const summarySpend = summaryOrders.reduce((sum, order) => sum + order.cost, 0);
  const summaryQuantity = summaryOrders.reduce((sum, order) => sum + quantityInUnit(order.quantity, order.unit, "kg"), 0);
  const previousStart = summaryRange === "week" ? summaryStart - 7 * 24 * 60 * 60 * 1000 : new Date(summaryNow.getFullYear(), summaryNow.getMonth() - 1, 1).getTime();
  const previousOrders = orders.filter(order => { const t = new Date(order.createdAt).getTime(); return isCountedOrder(order) && t >= previousStart && t < summaryStart; });
  const previousSpend = previousOrders.reduce((sum, order) => sum + order.cost, 0);
  const previousQuantity = previousOrders.reduce((sum, order) => sum + quantityInUnit(order.quantity, order.unit, "kg"), 0);
  const pct = (current: number, previous: number) => previous === 0 ? (current === 0 ? 0 : 100) : ((current - previous) / previous) * 100;
  const summaryCostPerKg = summaryQuantity ? summarySpend / summaryQuantity : 0;
  const previousCostPerKg = previousQuantity ? previousSpend / previousQuantity : 0;
  const scoreForWindow = (start: number, end: number) => { const rows = farmerReviews.filter(review => { const t = new Date(review.createdAt).getTime(); return t >= start && t < end; }); return rows.length ? rows.reduce((sum, review) => sum + review.rating, 0) / rows.length : 0; };
  const summarySupplierScore = farmers.length ? farmers.reduce((sum, farmer) => sum + farmer.rating, 0) / farmers.length : 0;
  const previousSupplierScore = scoreForWindow(previousStart, summaryStart);
  const deliveryDays = (order: Order) =>
    order.status === "Delivered" && order.confirmedAt && order.deliveredAt
      ? Math.max(
        0,
        (new Date(order.deliveredAt).getTime() -
          new Date(order.confirmedAt).getTime()) /
        86400000
      )
      : null;

  const deliveredSummaryOrders = summaryOrders.filter(
    (order) =>
      order.status === "Delivered" &&
      order.confirmedAt &&
      order.deliveredAt
  );

  const deliveredPreviousOrders = previousOrders.filter((order) => order.status === "Delivered" && order.confirmedAt && order.deliveredAt);
  const summaryDelivery = deliveredSummaryOrders.length ? deliveredSummaryOrders.reduce((sum, order) => sum + (deliveryDays(order) ?? 0), 0) / deliveredSummaryOrders.length : 0;
  const previousDelivery = deliveredPreviousOrders.length ? deliveredPreviousOrders.reduce((sum, order) => sum + (deliveryDays(order) ?? 0), 0) / deliveredPreviousOrders.length : 0;
  const hasData = orders.some(isCountedOrder);

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
        <DashboardInsights orders={orders} requirements={requirements} requirementStatusHistory={requirementStatusHistory} />
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
                  Delivery by
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
                      <strong>{orderDisplayId(order)}</strong>
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
          <div className="dashboard-summary-toggle"><button type="button" className={summaryRange === "week" ? "active" : ""} onClick={() => setSummaryRange("week")}>This Week</button><button type="button" className={summaryRange === "month" ? "active" : ""} onClick={() => setSummaryRange("month")}>This Month</button><span className="procurement-summary-comparison">{summaryRange === "week" ? "Compared from last week" : "Compared from last month"}</span></div>

          <SummaryMetric
            icon={<ShoppingCart />}
            label="Total Spend"
            value={summaryOrders.length ? formatCurrency(summarySpend) : "—"}
            change={summaryOrders.length ? pct(summarySpend, previousSpend) : undefined} />
          <SummaryMetric
            icon={<Package />}
            label="Cost per Kg"
            value={summaryOrders.length ? formatCurrency(Math.round(summaryCostPerKg)) : "—"}
            change={summaryOrders.length ? pct(summaryCostPerKg, previousCostPerKg) : undefined} />
          <SummaryMetric
            icon={<Truck />}
            label="Avg. Delivery Time"
            value={summaryOrders.length ? `${summaryDelivery.toFixed(1)} Days` : "—"}
            change={summaryOrders.length ? pct(summaryDelivery, previousDelivery) : undefined} />

          <SummaryMetric
            icon={<Star />}
            label="Supplier Score"
            value={farmers.length ? `${summarySupplierScore.toFixed(1)}/5` : "—"}
            change={farmers.length ? pct(summarySupplierScore, previousSupplierScore,) : undefined} />
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
              text="Live shipment tracking will appear after a logistics provider accepts the delivery request."
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

export function ChartModeControl({ value, onChange }: { value: "bar" | "pie" | "line"; onChange: (value: "bar" | "pie" | "line") => void }) {
  return <div className="chart-mode-control">{(["bar", "pie", "line"] as const).map(mode => <button type="button" key={mode} className={value === mode ? "active" : ""} onClick={() => onChange(mode)}>{mode === "bar" ? "Bar" : mode === "pie" ? "Pie" : "Line"}</button>)}</div>;
}

export function FlexibleChart({ data, mode, dataKey, unitLabel = "" }: { data: Array<{ name: string; value: number }>; mode: "bar" | "pie" | "line"; dataKey?: string; unitLabel?: string }) {
  const key = dataKey || "value";
  if (mode === "pie") return <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey={key} nameKey="name" cx="50%" cy="50%" outerRadius={92} label>{data.map((item, index) => <Cell key={`${item.name}-${index}`} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6", "#0f766e", "#d53b39"][index % 7]} />)}</Pie><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Legend /></PieChart></ResponsiveContainer>;
  if (mode === "line") return <ResponsiveContainer width="100%" height="100%"><RechartsLineChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Line type="monotone" dataKey={key} stroke="#16834a" strokeWidth={3} dot={{ r: 4 }} /></RechartsLineChart></ResponsiveContainer>;
  return <ResponsiveContainer width="100%" height="100%"><BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip formatter={(value: any) => [`${value}${unitLabel ? ` ${unitLabel}` : ""}`, "Value"]} /><Bar dataKey={key} radius={[6, 6, 0, 0]}>{data.map((item, index) => <Cell key={`${item.name}-${index}`} fill={["#16834a", "#f1b51b", "#3b82f6", "#ef8b2c", "#8b5cf6", "#0f766e"][index % 6]} />)}</Bar></BarChart></ResponsiveContainer>;
}

function DashboardInsights({ orders, distributionOrders = orders, requirements, requirementStatusHistory }: { orders: Order[]; distributionOrders?: Order[]; requirements: Requirement[]; requirementStatusHistory: Record<string, RequirementStatus> }) {
  const [quantityUnit, setQuantityUnit] = useState<RequirementUnit>("kg");
  const [quantityMode, setQuantityMode] = useState<"bar" | "pie" | "line">("bar");
  const [orderMode, setOrderMode] = useState<"bar" | "pie" | "line">("pie");
  const [requirementMode, setRequirementMode] = useState<"bar" | "pie" | "line">("pie");
  const quantityData = useMemo(() => {
    const map = new Map<string, number>();
    orders.filter(isCountedOrder).forEach(order => map.set(order.product, (map.get(order.product) || 0) + quantityInUnit(order.quantity, order.unit, quantityUnit)));
    return [...map.entries()].map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }));
  }, [orders, quantityUnit]);
  const orderData = ["Confirmed", "Processing", "In Transit", "Delivered", "Cancelled"].map(name => ({ name, value: distributionOrders.filter(order => order.status === name).length, }));
  const requirementData = useMemo(() => {
    // Session history is authoritative for requirements whose Marketplace card
    // has reached a terminal state. This prevents a backend refresh that still
    // reports Pending from replacing an already recorded Not Found/Confirmed/Closed result.
    const statusById = new Map<string, RequirementStatus>();

    requirements.forEach(requirement => {
      statusById.set(requirement.id, requirement.status);
    });

    Object.entries(requirementStatusHistory).forEach(([id, status]) => {
      const currentStatus = statusById.get(id);

      if (
        status === "Closed" ||
        status === "Confirmed" ||
        status === "Not Found"
      ) {
        statusById.set(id, status);
        return;
      }

      if (!currentStatus) {
        statusById.set(id, status);
      }
    });
    return ["Matched", "Pending", "Not Found", "Confirmed", "Closed"].map(name => ({
      name,
      value: [...statusById.values()].filter(status =>
        name === "Pending" ? ["Draft", "Searching", "Pending"].includes(status) : status === name
      ).length,
    }));
  }, [requirements, requirementStatusHistory]);
  return <section className="dashboard-insights analytics-chart-grid">
    <article className="buyer-card analytics-chart-card"><div className="section-header"><h2>Product Quantity</h2><div className="chart-controls"><select value={quantityUnit} onChange={e => setQuantityUnit(e.target.value as RequirementUnit)}><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select><ChartModeControl value={quantityMode} onChange={setQuantityMode} /></div></div>{quantityData.length ? <div className="chart-container"><FlexibleChart data={quantityData} mode={quantityMode} unitLabel={quantityUnit} /></div> : <ChartEmpty text="Your product volume chart will appear after you place an order." />}</article>
    <article className="buyer-card analytics-chart-card"><div className="section-header"><h2>Order Distribution</h2><ChartModeControl value={orderMode} onChange={setOrderMode} /></div>{orderData.some(x => x.value) ? <div className="chart-container"><FlexibleChart data={orderData} mode={orderMode} /></div> : <ChartEmpty text="Your order status distribution will appear after your first purchase." />}</article>
    <article className="buyer-card analytics-chart-card"><div className="section-header"><h2>Requirement Status</h2><ChartModeControl value={requirementMode} onChange={setRequirementMode} /></div>{requirementData.some(x => x.value) ? <div className="chart-container"><FlexibleChart data={requirementData} mode={requirementMode} /></div> : <ChartEmpty text="Requirement status will appear after you create a procurement requirement." />}</article>
  </section>;
}


/* =========================================================
   MARKETPLACE
========================================================= */

function Marketplace({ products, categories, category, search, onCategory, onSearch, onProduct, procurement, onAddToRequest, farmers }: { products: Product[]; categories: string[]; category: string; search: string; onCategory: (category: string) => void; onSearch: (value: string) => void; onProduct: (product: Product) => void; procurement: Parameters<typeof Procurement>[0]; onAddToRequest: (product: Product, quantity: number, unit: RequirementUnit) => void; farmers: Farmer[]; }) {
  const defaultSortOrder = ["price", "rating", "delivery", "distance", "quantity", "produce"] as const;
  const [sortBy, setSortBy] = useState<string[]>([]);
  const toggleSort = (key: string) => setSortBy(current => current.includes(key) ? current.filter(x => x !== key) : [...current, key]);
  const displayProducts = useMemo(() => { const list = [...products]; const deliveryDays = (v: string) => Number(v.match(/\d+(?:\.\d+)?/)?.[0] ?? 999); const priority = [...sortBy, ...defaultSortOrder.filter(x => !sortBy.includes(x))]; list.sort((a, b) => { for (const key of priority) { let result = 0; if (key === "price") result = a.pricePerKg - b.pricePerKg; if (key === "rating") result = b.rating - a.rating || b.reviews - a.reviews; if (key === "delivery") result = deliveryDays(a.deliveryTime) - deliveryDays(b.deliveryTime); if (key === "distance") result = (farmers.find(f => f.id === a.farmerId)?.distanceKm ?? 9999) - (farmers.find(f => f.id === b.farmerId)?.distanceKm ?? 9999); if (key === "quantity") result = b.quantityAvailable - a.quantityAvailable; if (key === "produce") result = a.name.localeCompare(b.name); if (result) return result; } return 0; }); return list; }, [products, sortBy, farmers]);
  return <div className="buyer-main marketplace-main">
    <section className="marketplace-hero"><p className="eyebrow green">KHETLINK MARKETPLACE</p><h1>Fresh produce,<span> directly from farmers.</span></h1><p className="marketplace-description">Buy everyday produce from verified farmers and manage your purchases in one place.</p></section>
    <section className="marketplace-procurement-section"><div className="marketplace-section-divider"><p className="eyebrow green">1. CREATE REQUIREMENT</p><h2>Need produce at scale?</h2><p>Create a requirement, choose quantity and unit, match farmers, then request, negotiate, confirm or decline from the same Marketplace.</p></div><Procurement {...procurement} /></section>
    <section className="marketplace-browse-section"><div className="marketplace-section-divider"><p className="eyebrow green">2. BROWSE PRODUCTS</p><h2>Fresh produce from farmers</h2><p>Browse individual listings below. Send a request directly to the farmer, then negotiate and confirm from the same card.</p></div>
      <div className="marketplace-search marketplace-browse-search"><Search size={19} /><input value={search} onChange={e => onSearch(e.target.value)} placeholder="Search produce or farmer" /></div>
      <div className="marketplace-category-sort-wrap"><div className="marketplace-category-row">{categories.map(item => <button type="button" key={item} className={category === item ? "active" : ""} onClick={() => onCategory(item)}>{item}</button>)}</div><div className="marketplace-sort-row"><span>Sort by</span>{[["price", "Price"], ["rating", "Ratings"], ["delivery", "Delivery Time"], ["distance", "Distance"], ["quantity", "Quantity Available"], ["produce", "Produce"]].map(([key, label]) => <button type="button" key={key} className={sortBy.includes(key) ? "active" : ""} onClick={() => toggleSort(key)}>{label}{sortBy.includes(key) && <small>#{sortBy.indexOf(key) + 1}</small>}</button>)}</div></div>
      <div className="marketplace-heading"><div><p className="eyebrow">AVAILABLE NOW</p><h2>Fresh from farmers</h2></div><span>{displayProducts.length} products</span></div>
      {displayProducts.length === 0 ? <section className="buyer-card empty-state-large"><Search size={40} /><h2>No products found</h2><p>Try another search or category.</p></section> : <div className="product-grid">{displayProducts.map(product => <ProductCard key={product.id} product={product} farmer={farmers.find(f => f.id === product.farmerId)} onView={() => onProduct(product)} offer={procurement.offers.find(item => (item.productId === product.productId || item.selectedListingIds.includes(product.listingId)) && item.farmerId === product.farmerId && item.isBrowseProduct === true)} onAddToRequest={(quantity, unit) => onAddToRequest(product, quantity, unit)} onNegotiate={price => { const o = procurement.offers.find(x => (x.productId === product.productId || x.selectedListingIds.includes(product.listingId)) && x.farmerId === product.farmerId && x.isBrowseProduct === true); if (o) procurement.onNegotiate(o.requirementId, product.farmerId, convertPriceUnit(price, o.requestedUnit ?? product.unit, product.unit)); }} onConfirm={() => { const o = procurement.offers.find(x => (x.productId === product.productId || x.selectedListingIds.includes(product.listingId)) && x.farmerId === product.farmerId && x.isBrowseProduct === true); if (o) procurement.onConfirm(o.requirementId, product.farmerId); }} onDecline={() => { const o = procurement.offers.find(x => (x.productId === product.productId || x.selectedListingIds.includes(product.listingId)) && x.farmerId === product.farmerId && x.isBrowseProduct === true); if (o) procurement.onDeclineOffer(o.requirementId, product.farmerId); }} />)}</div>}
    </section>
  </div>;
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
  const [unit, setUnit] = useState<RequirementUnit>(product.unit ?? "kg");
  const [quantity, setQuantity] = useState(100);
  const [price, setPrice] = useState(offer?.offeredPrice ?? product.pricePerKg);
  const [visibleOffer, setVisibleOffer] = useState<FarmerOffer | undefined>(offer);
  const [acceptedFlash, setAcceptedFlash] = useState(false);

  const availableForUnit = quantityInUnit(product.quantityAvailable, product.unit, unit);
  const minimumForUnit = minimumQuantityForUnit(unit);
  const quantityStep = unit === "ton" ? 0.01 : unit === "dozen" ? 0.01 : 1;
  const priceForUnit = product.unit === unit ? product.pricePerKg : pricePerSelectedUnit(fromKg(product.pricePerKg, product.unit), unit);
  const priceForSelectedUnit = priceForUnit;
  const negotiatedPriceForUnit = price;
  const negotiationBase = visibleOffer ? convertPriceUnit(Number(visibleOffer.originalPrice ?? product.pricePerKg), product.unit, visibleOffer.requestedUnit ?? unit) : product.pricePerKg;
  const negotiationMin = Math.max(0, negotiationBase - 50);
  const negotiationMax = negotiationBase + 50;

  useEffect(() => {
    setVisibleOffer(offer);
    if (offer) {
      const offerUnit = offer.requestedUnit ?? product.unit;
      setPrice(convertPriceUnit(offer.offeredPrice, product.unit, offerUnit));
      if (offer.requestedUnit) setUnit(offer.requestedUnit);
      if (String(offer.status) === "Accepted" || String(offer.status) === "Rejected") {
        const timer = window.setTimeout(() => setVisibleOffer(undefined), 4500);
        return () => window.clearTimeout(timer);
      }
    }
  }, [offer]);
  useEffect(() => {
    if (offer?.farmerConfirmed && !offer.buyerConfirmed && String(offer.status) === "Negotiating") { setAcceptedFlash(true); const timer = window.setTimeout(() => setAcceptedFlash(false), 4000); return () => window.clearTimeout(timer); }
    setAcceptedFlash(false);
  }, [offer?.id, offer?.farmerConfirmed, offer?.buyerConfirmed, offer?.status]);

  const changeUnit = (nextUnit: RequirementUnit) => {
    const currentKg = toKg(quantity, unit);
    const nextMax = quantityInUnit(product.quantityAvailable, product.unit, nextUnit);
    const nextMin = minimumQuantityForUnit(nextUnit);
    const converted = fromKg(currentKg, nextUnit);
    setUnit(nextUnit);
    setQuantity(Math.min(nextMax, Math.max(nextMin, nextUnit === "dozen" ? Math.round(converted) : Number(converted.toFixed(2)))));
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

        <div className="product-location"><MapPin size={13} />{farmer?.location || "Location not shared"} · {farmer?.distanceKm ?? "—"} km</div>
        <div className="product-location product-logistics-fee"><Truck size={13} />Logistics fee {product.logisticsFee != null ? formatCurrency(product.logisticsFee) : "—"}</div>

        <div className="product-availability-price">
          <small className="product-availability">
            {availableForUnit.toLocaleString()} {unit} available
          </small>
          <div className="product-price">
            <strong>{formatCurrency(priceForUnit)}</strong>
            <span>/ {unit}</span>
          </div>
        </div>

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
          {!visibleOffer ? (
            <button type="button" className="product-request-btn" onClick={() => { const safeQuantity = Math.min(availableForUnit, Math.max(minimumForUnit, Number(quantity) || 0)); if (safeQuantity < minimumForUnit) return; setQuantity(safeQuantity); onAddToRequest(safeQuantity, unit); }}>
              <Send size={14} />{"Send Request"}
            </button>
          ) : visibleOffer.status !== "Rejected" && String(visibleOffer.status) !== "Accepted" && !visibleOffer.farmerConfirmed ? (
            <button type="button" className="product-decline-btn" onClick={onDecline}>Decline</button>
          ) : null}
        </div>

        {visibleOffer && acceptedFlash && <div className="request-response-flash buyer-accepted-flash"><CheckCircle2 size={16} /><strong>Accepted</strong><span>Farmer accepted your request. Continue with price confirmation after this update.</span></div>}

        {visibleOffer && !acceptedFlash && String(visibleOffer.status) === "Accepted" && (
          <div className="farmer-negotiation-box product-card-negotiation product-card-confirmed-state">
            <div>
              <span>Order confirmed</span>
              <strong>{formatCurrency(convertPriceUnit(visibleOffer.offeredPrice, product.unit, visibleOffer.requestedUnit ?? unit))} / {visibleOffer.requestedUnit ?? unit}</strong>
            </div>
            <StatusOffer status="Accepted" />
            <span className="farmer-response-waiting">Your order is confirmed. The product card will be ready for a new request shortly.</span>
          </div>
        )}

        {visibleOffer && !acceptedFlash && String(visibleOffer.status) !== "Accepted" && (
          <div className="farmer-negotiation-box product-card-negotiation">
            <div>
              <span>Negotiated price</span>
              <div className="negotiation-input"><span>₹</span><input type="number" min={negotiationMin} max={negotiationMax} step="0.01" value={price} onChange={(event) => setPrice(Number(event.target.value))} /><span>/ {visibleOffer.requestedUnit ?? unit}</span></div><small className="negotiation-range">Allowed: {formatCurrency(negotiationMin)} – {formatCurrency(negotiationMax)} / unit</small>
              <small className="negotiated-unit-price">{formatCurrency(negotiatedPriceForUnit)} / {visibleOffer.requestedUnit ?? unit}</small>
            </div>
            <StatusOffer status={visibleOffer.status} />
            <div className="negotiation-actions">
              {visibleOffer.status !== "Rejected" && visibleOffer.farmerConfirmed && !visibleOffer.buyerConfirmed && (
                <button type="button" onClick={() => onNegotiate(price)}>
                  Send New Price
                </button>
              )}
              {(String(visibleOffer.status) === "Countered" || (String(visibleOffer.status) === "Negotiating" && visibleOffer.farmerConfirmed)) && !visibleOffer.buyerConfirmed && (
                <button type="button" className="buyer-primary-button small product-action-confirm" onClick={onConfirm}>Confirm</button>
              )}
              {(String(visibleOffer.status) === "Countered" || (String(visibleOffer.status) === "Negotiating" && visibleOffer.farmerConfirmed)) && !visibleOffer.buyerConfirmed && (
                <button type="button" className="product-decline-btn" onClick={onDecline}>Decline</button>
              )}
              {!visibleOffer.farmerConfirmed && visibleOffer.status !== "Rejected" && String(visibleOffer.status) !== "Accepted" && (
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
  browseRequirementIds,
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
  buyerLocation,
  buyerLatitude,
  buyerLongitude,
  showToast,
}: {
  form: RequirementItem;
  draft?: Requirement;
  requirements: Requirement[];
  browseRequirementIds: Set<string>;
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
  buyerLocation?: string;
  buyerLatitude?: number | null;
  buyerLongitude?: number | null;
  showToast: (message: string) => void;
}) {
  const [produceOpen, setProduceOpen] = useState(false);
  const [deliveryQuery, setDeliveryQuery] = useState(buyerLocation || "");
  const [deliverySuggestions, setDeliverySuggestions] = useState<LocationSuggestion[]>([]);
  const [deliverySearching, setDeliverySearching] = useState(false);
  const deliveryLocationSelectionRef = useRef(false);
  const deliveryQueryEditedRef = useRef(false);

  useEffect(() => {
    if (deliveryQueryEditedRef.current) return;
    setDeliveryQuery(form.location ?? "");
  }, [form.location]);

  useEffect(() => {
    if (deliveryLocationSelectionRef.current) {
      deliveryLocationSelectionRef.current = false;
      setDeliverySuggestions([]);
      setDeliverySearching(false);
      return;
    }

    const q = deliveryQuery.trim();

    if (q.length < 3) {
      setDeliverySuggestions([]);
      setDeliverySearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setDeliverySearching(true);

        const results = await searchGoogleLocations(
          q,
          controller.signal,
        );

        if (!controller.signal.aborted) {
          setDeliverySuggestions(results);
        }
      } catch {
        if (!controller.signal.aborted) {
          setDeliverySuggestions([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setDeliverySearching(false);
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [deliveryQuery]);

  const selectDeliveryLocation = async (
    item: LocationSuggestion,
  ) => {
    try {
      deliveryLocationSelectionRef.current = true;
      deliveryQueryEditedRef.current = false;
      setDeliverySearching(true);

      // Nominatim results already carry coordinates. Their place_id is an
      // OpenStreetMap/Nominatim id, not a Google Place id, so never send it
      // to Google's Place Details API.
      if (item.lat != null && item.lon != null) {
        const lat = Number(item.lat);
        const lon = Number(item.lon);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          onFormChange({
            ...form,
            location: item.display_name,
            latitude: lat,
            longitude: lon,
          });
          setDeliveryQuery(item.display_name);
        } else {
          throw new Error("Invalid location coordinates.");
        }
      } else {
        const details = await getGooglePlaceDetails(item.place_id);

        if (details.lat === null || details.lon === null) {
          throw new Error("Selected place has no coordinates.");
        }

        onFormChange({
          ...form,
          location: details.display_name || item.display_name,
          latitude: details.lat,
          longitude: details.lon,
        });

        setDeliveryQuery(
          details.display_name || item.display_name,
        );
      }
    } catch {
      showToast("Unable to get the selected location.");
    } finally {
      setDeliverySuggestions([]);
      setDeliverySearching(false);
    }
  };

  const captureDeliveryLocation = () => {
    if (!navigator.geolocation) {
      showToast("Live location is not supported by this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const nextLat = pos.coords.latitude;
        const nextLng = pos.coords.longitude;

        let readable = "";

        try {
          readable = await reverseGeocodeGoogleLocation(
            nextLat,
            nextLng,
          );
        } catch {
          readable = "";
        }

        if (!readable.trim()) {
          showToast(
            "Unable to determine a readable locality. Please search and select your location manually.",
          );
          setDeliverySuggestions([]);
          return;
        }

        onFormChange({
          ...form,
          location: readable,
          latitude: nextLat,
          longitude: nextLng,
        });

        deliveryQueryEditedRef.current = false;
        setDeliveryQuery(readable);
        setDeliverySuggestions([]);
      },
      (error) => {
        showToast(
          error.message ||
          "Location permission was not granted.",
        );
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
      },
    );
  };
  const catalogOptions = FARMER_CATALOG_NAMES.map(([name, category]) => ({ name, category, image: getProductImage(name) }));
  const submittedRequirements =
    requirements.filter(
      (requirement) =>
        requirement.status !== "Draft" &&
        !requirement.isBrowseProduct &&
        !browseRequirementIds.has(requirement.id),
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
            <div className="catalog-combobox">
              <input value={form.produce} onFocus={() => setProduceOpen(true)} onChange={(event) => { onFormChange({ ...form, produce: event.target.value }); setProduceOpen(true); }} placeholder="Type or select produce" />
              {produceOpen && <><button type="button" className="catalog-combobox-backdrop" aria-label="Close produce menu" onClick={() => setProduceOpen(false)} /><div className="catalog-combobox-menu">{catalogOptions.filter(item => !form.produce || item.name.toLowerCase().includes(form.produce.toLowerCase())).map(item => <button type="button" key={item.name} onClick={() => { onFormChange({ ...form, produce: item.name }); setProduceOpen(false); }}><img src={item.image} alt="" /><span><strong>{item.name}</strong><small>{item.category}</small></span></button>)}</div></>}
            </div>
          </Field>

          <Field label="Quantity">
            <div className="buyer-quantity-control">
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), form.quantity - 1) })}><Minus size={14} /></button>
              <input type="number" min={minimumQuantityForUnit(form.unit ?? "kg")} value={form.quantity === 0 ? "" : form.quantity} onChange={(event) => { const raw = event.target.value; onFormChange({ ...form, quantity: raw === "" ? 0 : Number(raw) }); }} onBlur={() => onFormChange({ ...form, quantity: Math.max(minimumQuantityForUnit(form.unit ?? "kg"), Number(form.quantity) || minimumQuantityForUnit(form.unit ?? "kg")) })} />
              <button type="button" onClick={() => onFormChange({ ...form, quantity: Math.min(fromKg(999999, form.unit ?? "kg"), form.quantity + 1) })}><Plus size={14} /></button>
              <select value={form.unit ?? "kg"} onChange={(event) => { const nextUnit = event.target.value as RequirementUnit; const kg = toKg(form.quantity, form.unit ?? "kg"); onFormChange({ ...form, unit: nextUnit, quantity: Math.max(minimumQuantityForUnit(nextUnit), nextUnit === "dozen" ? Math.round(fromKg(kg, nextUnit)) : Number(fromKg(kg, nextUnit).toFixed(2))) }); }}><option value="kg">kg</option><option value="L">L</option><option value="ton">ton</option><option value="dozen">dozen</option></select>
            </div>
          </Field>

          <Field
            label="Minimum Price / unit"
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
            label="Maximum Price / unit"
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

          <Field label="Delivery Location">
            <div className="location-search-box procurement-location-box">
              <div className="location-input-wrap"><Search size={15} /><input value={deliveryQuery} onChange={e => { deliveryQueryEditedRef.current = true; setDeliveryQuery(e.target.value); onFormChange({ ...form, location: e.target.value }); }} onFocus={() => { if (deliveryQuery === form.location) { deliveryQueryEditedRef.current = true; setDeliveryQuery(""); } }} placeholder="Search a place, address, building, or locality" /><button type="button" title="Use current location" onClick={captureDeliveryLocation}><MapPin size={16} /></button></div>
              {(deliverySearching || deliverySuggestions.length > 0) && <div className="location-suggestions">{deliverySearching && <div className="location-suggestion muted">Searching locations…</div>}{deliverySuggestions.map((item) => (
                <button
                  type="button"
                  className="location-suggestion"
                  key={item.place_id}
                  onClick={() => {
                    void selectDeliveryLocation(item);
                  }}
                >
                  <MapPin size={14} />

                  <span>
                    <strong>{item.display_name}</strong>

                    {item.secondary_text && (
                      <small>{item.secondary_text}</small>
                    )}
                  </span>
                </button>))}</div>}
            </div>
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
                  <div className="requirement-product-icon"><img src={getProductImage(item.produce)} alt={item.produce} /></div>
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
  useEffect(() => {
    if (requirement.status === "Confirmed" || requirement.status === "Closed" || requirement.status === "Not Found") {
      const timer = window.setTimeout(() => onDismissRequirement(requirement.id), 3000);
      return () => window.clearTimeout(timer);
    }
    return;
  }, [requirement.id, requirement.status]);

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

          <h2>{requirement.id}</h2>

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
        {requirement.status !== "Confirmed" &&
          requirement.status !== "Not Found" &&
          requirement.status !== "Closed" && (<button type="button" className="buyer-outline-button small requirement-close-text" onClick={() => onCloseRequirement(requirement.id)}>Close Requirement</button>)}
      </div>
      {requirement.status === "Confirmed" || requirement.status === "Closed" ? (
        <div className="request-flash-banner request-response-flash">
          <CheckCircle2 size={17} />
          <strong>{requirement.status === "Confirmed" ? "Requirement complete" : "Requirement closed"}</strong>
          <span>Removing from Marketplace in 3 seconds…</span>
        </div>
      ) : requirement.status === "Not Found" ? (
        <InlineEmpty icon={<XCircle />} text="No farmer currently matches these requirements." />
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
                      farmer.id &&
                      offer.isBrowseProduct !== true,
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
  const eligible = farmer.listings.filter(listing => requirement.items.some(item => {
    const listingPriceInRequirementUnit = listing.unit === (item.unit ?? "kg") ? listing.pricePerKg : pricePerSelectedUnit(fromKg(listing.pricePerKg, listing.unit), (item.unit ?? "kg"));
    return item.produce.toLowerCase() === listing.produce.toLowerCase() && listingPriceInRequirementUnit >= item.minPrice && listingPriceInRequirementUnit <= item.maxPrice && toKg(listing.availableQuantity, listing.unit) >= toKg(item.quantity, item.unit);
  }));

  const [price, setPrice] =
    useState(
      offer?.offeredPrice ??
      eligible[0]?.pricePerKg ??
      1,
    );
  const [acceptedFlash, setAcceptedFlash] = useState(false);

  useEffect(() => {
    if (offer) { setPrice(offer.offeredPrice); }
  }, [offer]);
  useEffect(() => {
    if (offer?.farmerConfirmed && !offer.buyerConfirmed && String(offer.status) === "Negotiating") { setAcceptedFlash(true); const timer = window.setTimeout(() => setAcceptedFlash(false), 4000); return () => window.clearTimeout(timer); }
    setAcceptedFlash(false);
  }, [offer?.id, offer?.farmerConfirmed, offer?.buyerConfirmed, offer?.status]);
  const negotiationBase = Number(offer?.originalPrice ?? eligible[0]?.pricePerKg ?? 1);
  const negotiationMin = Math.max(0, negotiationBase - 50);
  const negotiationMax = negotiationBase + 50;

  return (
    <article className="matched-farmer-card">
      <div className="farmer-photo">
        {farmer.avatar ? (
          <img src={farmer.avatar} alt={farmer.name} />
        ) : (
          <span>{getInitials(farmer.name)}</span>
        )}

        {farmer.verified && (
          <em>
            Verified
          </em>
        )}
      </div>

      <div className="matched-farmer-copy">
        <div className="matched-title">
          <strong>{farmer.name}</strong>
          <div className="matched-review-summary">
            <span className="matched-rating"><Star size={12} fill="currentColor" />{farmer.rating}</span>
            <small>{farmer.reviews} reviews</small>
          </div>
        </div>

        <div className="matched-location">
          <MapPin size={13} />
          <span>{farmer.location || "Location not shared"}</span>
          <span>· {farmer.distanceKm ?? "—"} km</span>
        </div>

        <div className="matching-listings">
          {eligible.map(
            (listing) => (
              <label
                key={
                  listing.id
                }
              >
                <span className="matching-select-control">
                  <input
                    type="checkbox"
                    checked={selected.includes(listing.id)}
                    onChange={() => onToggle(listing.id)}
                  />
                  <span>Select</span>
                </span>

                <span className="matching-listing-info">
                  <b>{listing.produce}</b>
                  <small>
                    {formatQuantity(listing.availableQuantity, listing.unit)} available · {formatCurrency(listing.pricePerKg)}/{listing.unit}
                  </small>
                </span>
                <div className="matching-quantity-control">
                  <input type="number" min="1" max={listing.availableQuantity} value={selectedQuantities[listing.id] ?? Math.min(listing.availableQuantity, fromKg(toKg(requirement.items.find(i => i.produce.toLowerCase() === listing.produce.toLowerCase())?.quantity ?? 0, requirement.items.find(i => i.produce.toLowerCase() === listing.produce.toLowerCase())?.unit ?? "kg"), listing.unit))} onChange={(event) => { const raw = event.target.value; const next = raw === "" ? 0 : Number(raw); if (next > 0 && !selected.includes(listing.id)) onToggle(listing.id); if (next === 0 && selected.includes(listing.id)) onToggle(listing.id); onSetQuantity(listing.id, Number.isFinite(next) ? next : 0); }} onBlur={() => { const current = selectedQuantities[listing.id] ?? 0; if (current > 0) onSetQuantity(listing.id, Math.max(1, Math.min(listing.availableQuantity, current))); }} />
                  <span>{listing.unit}</span>
                </div>
              </label>
            ),
          )}
        </div>

        <div className="matching-logistics-fee"><Truck size={13} /> Logistics fee · {farmer.logisticsFee != null ? formatCurrency(farmer.logisticsFee) : "—"}</div>

        <div className="matched-farmer-actions">
          <button type="button" className="product-details-btn" onClick={onView}>
            <Eye size={14} />
            Details
          </button>
          {!offer ? (
            <button
              type="button"
              className="product-request-btn"
              onClick={onSend}
            >
              <Send size={14} />
              Send Request
            </button>
          ) : !offer.farmerConfirmed && offer.status !== "Rejected" && String(offer.status) !== "Accepted" ? (
            <button type="button" className="product-decline-btn" onClick={onDecline}>Decline</button>
          ) : null}
        </div>

        {offer && acceptedFlash && <div className="request-response-flash buyer-accepted-flash"><CheckCircle2 size={16} /><strong>Accepted</strong><span>Farmer accepted your request. Negotiation controls will be available next.</span></div>}

        {offer && !acceptedFlash && (
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
                  min={negotiationMin}
                  max={negotiationMax}
                  step="0.01"
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
                  /{offer.requestedUnit ?? eligible[0]?.unit ?? "unit"}
                </span>
              </div>
              <small className="negotiation-range">Allowed: {formatCurrency(negotiationMin)} – {formatCurrency(negotiationMax)} / unit</small>
            </div>

            <StatusOffer
              status={
                offer.status
              }
            />

            <div className="negotiation-actions">
              {String(offer.status) !== "Accepted" && offer.farmerConfirmed && !offer.buyerConfirmed && (
                <button type="button" onClick={() => onNegotiate(price)}>Send New Price</button>
              )}
              {!offer.buyerConfirmed && (offer.status === "Countered" || (offer.status === "Negotiating" && offer.farmerConfirmed)) && (
                <button type="button" className="buyer-primary-button small product-action-confirm" onClick={onConfirm}>Confirm</button>
              )}

              {!offer.buyerConfirmed && (offer.status === "Countered" || (offer.status === "Negotiating" && offer.farmerConfirmed)) && (
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

            </div>
            {!offer.farmerConfirmed && offer.status !== "Rejected" && String(offer.status) !== "Accepted" && (
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
  onRetryLogistics,
}: {
  orders: Order[];
  allOrders: Order[];
  filter: string;
  search: string;
  onSubmitReview: (order: Order, rating: number, comment: string) => Promise<boolean>;
  onPayOrder: (orderId: string) => Promise<void>;
  onRetryLogistics: (orderId: string) => Promise<boolean>;
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
    "Cancelled",
  ];
  const [orderRange, setOrderRange] = useState<AnalyticsRange>("month");
  const [orderCustomStart, setOrderCustomStart] = useState("");
  const [orderCustomEnd, setOrderCustomEnd] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(orders[0]?.id ?? null);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? orders[0];
  const orderLiveMapRef = useRef<HTMLDivElement | null>(null);
  const orderLiveMapInstanceRef = useRef<any>(null);
  const orderLiveMapMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!orderLiveMapRef.current || !selectedOrder) return;
    void loadGoogleMaps().then(() => {
      if (cancelled || !orderLiveMapRef.current) return;
      const g = (window as any).google;
      if (!g?.maps) return;
      const lat = selectedOrder.currentLat ?? selectedOrder.pickupLat ?? 20.5937;
      const lng = selectedOrder.currentLng ?? selectedOrder.pickupLng ?? 78.9629;
      orderLiveMapInstanceRef.current = new g.maps.Map(orderLiveMapRef.current, {
        center: { lat, lng },
        zoom: selectedOrder.currentLat != null && selectedOrder.currentLng != null ? 14 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      orderLiveMapMarkerRef.current = new g.maps.Marker({
        map: orderLiveMapInstanceRef.current,
        position: { lat, lng },
        title: selectedOrder.logisticsName ? `Logistics provider: ${selectedOrder.logisticsName}` : "Order location",
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      orderLiveMapInstanceRef.current = null;
      orderLiveMapMarkerRef.current = null;
    };
  }, [selectedOrder?.id, selectedOrder?.status]);

  useEffect(() => {
    if (!orderLiveMapInstanceRef.current || selectedOrder?.currentLat == null || selectedOrder?.currentLng == null) return;
    const position = { lat: selectedOrder.currentLat, lng: selectedOrder.currentLng };
    orderLiveMapMarkerRef.current?.setPosition(position);
    orderLiveMapInstanceRef.current.setCenter(position);
    orderLiveMapInstanceRef.current.setZoom(14);
  }, [selectedOrder?.currentLat, selectedOrder?.currentLng]);
  const rangeFilteredOrders = useMemo(() => {
    const now = new Date(); let start: Date; let end: Date;
    if (orderRange === "week") {
      start = new Date(now); start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7),);
      end = new Date(start); end.setDate(end.getDate() + 7,);
    }
    else if (orderRange === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1,);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1,);
    }
    else {
      start = orderCustomStart ? new Date(`${orderCustomStart}T00:00:00`,) : new Date(0);
      end = orderCustomEnd ? new Date(`${orderCustomEnd}T23:59:59.999`,) : new Date();
    }
    return orders.filter((order) => {
      const created = new Date(order.createdAt,).getTime();
      return (created >= start.getTime() && created <= end.getTime());
    });
  }, [orders, orderRange, orderCustomStart, orderCustomEnd,]);
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
      <div className="orders-range-bar buyer-card">
        <div className="analytics-range-buttons">
          <button
            type="button"
            className={
              orderRange === "week"
                ? "active"
                : ""
            }
            onClick={() =>
              setOrderRange("week")
            }
          >
            This Week
          </button>

          <button
            type="button"
            className={
              orderRange === "month"
                ? "active"
                : ""
            }
            onClick={() =>
              setOrderRange("month")
            }
          >
            This Month
          </button>

          <button
            type="button"
            className={
              orderRange === "custom"
                ? "active"
                : ""
            }
            onClick={() =>
              setOrderRange("custom")
            }
          >
            Custom
          </button>
        </div>

        {orderRange === "custom" && (
          <div className="analytics-custom-range">
            <label>
              From
              <input
                type="date"
                value={orderCustomStart}
                onChange={(event) =>
                  setOrderCustomStart(
                    event.target.value,
                  )
                }
              />
            </label>

            <label>
              To
              <input
                type="date"
                value={orderCustomEnd}
                onChange={(event) =>
                  setOrderCustomEnd(
                    event.target.value,
                  )
                }
              />
            </label>
          </div>
        )}
      </div>
      <OrderGroup
        title="Marketplace Orders"
        orders={rangeFilteredOrders}
        selectedOrderId={selectedOrderId}
        onSelect={setSelectedOrderId}
        onPayOrder={onPayOrder}
      />

      <aside className="orders-live-panel buyer-card">
        {selectedOrder ? (
          <>
            <div className="live-map order-live-map">
              {selectedOrder.logisticsAccepted || selectedOrder.currentLat != null || selectedOrder.pickupLat != null ? (
                <div ref={orderLiveMapRef} className="order-live-google-map" aria-label="Live logistics order map" />
              ) : (
                <>
                  <MapIcon size={28} />
                  <strong>{selectedOrder.paymentStatus === "PAID" && !selectedOrder.logisticsName ? "Searching logistics provider" : orderDisplayId(selectedOrder)}</strong>
                  <span>{selectedOrder.logisticsName ? `Tracking ${selectedOrder.logisticsName}` : selectedOrder.paymentStatus === "PAID" ? "Waiting for a logistics provider to accept the order" : "Live Order Map"}</span>
                  <small>{selectedOrder.currentLocation || `${selectedOrder.seller} → ${selectedOrder.buyer}`}{selectedOrder.logisticsRoleCode ? ` · Logistics ID ${selectedOrder.logisticsRoleCode}` : ""}</small>
                </>
              )}
            </div>
            <h3>Live Order Status</h3>
            <div className="selected-order-status"><StatusBadge status={selectedOrder.status} /><strong>{selectedOrder.product}</strong><span>{selectedOrder.quantity} kg · {formatCurrency(selectedOrder.cost)}</span></div>
            {selectedOrder.paymentStatus === "PAID" &&
              !selectedOrder.logisticsAccepted &&
              Boolean(selectedOrder.logisticsRequestExpiresAt) &&
              new Date(selectedOrder.logisticsRequestExpiresAt as string).getTime() <= Date.now() && (
                <div className="order-live-retry-card">
                  <div className="order-live-retry-icon">
                    <RefreshCw size={15} />
                  </div>

                  <div className="order-live-retry-content">
                    <strong>Logistics request expired</strong>
                    <span>No logistics provider accepted this request within one hour.</span>
                  </div>

                  <button
                    type="button"
                    className="buyer-primary-button small order-live-retry-button"
                    onClick={() => void onRetryLogistics(selectedOrder.id)}
                  >
                    <RefreshCw size={14} />
                    Retry Delivery Request
                  </button>
                </div>
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
            {selectedOrder.status === "Cancelled" ? (
              <div className="timeline-item cancelled"><span> <X size={13} /> </span><div>
                <strong> Cancelled </strong>
                <small> Due to payment failure </small>
              </div>
              </div>)
              : (<>
                <TimelineItem title="Order confirmed" time="Confirmed" done />
                <TimelineItem title="Processing" time="Preparing order" done={selectedOrder.status !== "Confirmed"} />
                <TimelineItem title="In transit" time="Live logistics update" done={selectedOrder.status === "In Transit" || selectedOrder.status === "Delivered"} />
                <TimelineItem title="Delivered" time={selectedOrder.deliveryDate} done={selectedOrder.status === "Delivered"} /></>)}
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
  onPayOrder,
}: {
  title: string;
  orders: Order[];
  selectedOrderId: string | null;
  onSelect: (id: string) => void;
  onPayOrder: (orderId: string) => Promise<void>;
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
                <th>Status</th>
                <th>Delivery by</th>
                <th>Payment</th>
                <th>Code</th>
              </tr>
            </thead>

            <tbody>
              {orders.map(
                (order) => (
                  <tr key={order.id} className={selectedOrderId === order.id ? "selected" : ""} onClick={() => onSelect(order.id)}>
                    <td>
                      <strong>{orderDisplayId(order)}</strong>
                    </td>

                    <td>
                      {new Date(
                        order.createdAt,
                      ).toLocaleDateString(
                        "en-IN",
                        {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
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
                      {order.status === "Cancelled" ? <div className="order-cancelled-cell"><strong className="order-cancelled-status" style={{ color: "#dc2626" }}>Cancelled</strong><small className="order-cancelled-message">Order is cancelled due to payment failure.</small></div> : <StatusBadge status={order.status} />}
                    </td>

                    <td><div>{order.deliveryDate}</div><small className="order-location-cell">{order.deliveryLocation || "Location not shared"}</small></td>
                    <td><div className="order-payment-cell">{order.status !== "Cancelled" && order.paymentStatus === "PENDING" ? <button type="button" className="buyer-primary-button small" onClick={(event) => { event.stopPropagation(); void onPayOrder(order.id); }}>Pay Now</button> : order.status === "Cancelled" ? "—" : (order.paymentStatus || "—")}</div>{order.status !== "Cancelled" && order.paymentStatus === "PENDING" && <small className="payment-deadline-warning table-warning">Attention: pay within one hour.</small>}</td>
                    <td>{order.paymentStatus === "PAID" ? <span className="logistics-code-cell">{order.verificationCode || "—"}</span> : "—"}</td>
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
  onRetryLogistics,
  logisticsReviewOrderId,
  setLogisticsReviewOrderId,
  logisticsReviewRating,
  setLogisticsReviewRating,
  logisticsReviewComment,
  setLogisticsReviewComment,
  submitLogisticsReview,
}: {
  orders: Order[];
  onRetryLogistics: (orderId: string) => Promise<boolean>;
  logisticsReviewOrderId: string | null;
  setLogisticsReviewOrderId: (value: string | null) => void;
  logisticsReviewRating: number;
  setLogisticsReviewRating: (value: number) => void;
  logisticsReviewComment: string;
  setLogisticsReviewComment: (value: string) => void;
  submitLogisticsReview: (order: Order, rating: number, comment: string) => Promise<boolean>;
}) {
  const sortedOrders = [...orders].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(sortedOrders[0]?.id ?? null);
  const [now, setNow] = useState(() => Date.now());
  const active = sortedOrders.find((order) => order.id === selectedOrderId) ?? sortedOrders[0];
  const shipmentMapRef = useRef<HTMLDivElement | null>(null);
  const shipmentMapInstanceRef = useRef<any>(null);
  const shipmentMapMarkerRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    if (!shipmentMapRef.current || active?.status === "Cancelled") return;
    void loadGoogleMaps().then(() => {
      if (cancelled || !shipmentMapRef.current) return;
      const g = (window as any).google;
      if (!g?.maps) return;
      const lat = active?.currentLat ?? active?.pickupLat ?? 20.5937;
      const lng = active?.currentLng ?? active?.pickupLng ?? 78.9629;
      shipmentMapInstanceRef.current = new g.maps.Map(shipmentMapRef.current, {
        center: { lat, lng },
        zoom: active?.currentLat != null && active?.currentLng != null ? 14 : 5,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });
      shipmentMapMarkerRef.current = new g.maps.Marker({
        map: shipmentMapInstanceRef.current,
        position: { lat, lng },
        title: active?.logisticsName ? `Logistics provider: ${active.logisticsName}` : "Shipment location",
      });
    }).catch(() => {});
    return () => { cancelled = true; shipmentMapInstanceRef.current = null; shipmentMapMarkerRef.current = null; };
  }, [active?.id, active?.status]);

  useEffect(() => {
    if (!shipmentMapInstanceRef.current || active?.currentLat == null || active?.currentLng == null) return;
    const position = { lat: active.currentLat, lng: active.currentLng };
    shipmentMapMarkerRef.current?.setPosition(position);
    shipmentMapInstanceRef.current.setCenter(position);
    shipmentMapInstanceRef.current.setZoom(14);
  }, [active?.currentLat, active?.currentLng]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const logisticsRequestExpired =
    Boolean(active?.logisticsRequestExpiresAt) &&
    new Date(active!.logisticsRequestExpiresAt as string).getTime() <= now;

  const showRetryLogistics =
    Boolean(active) &&
    active!.status !== "Cancelled" &&
    active!.paymentStatus === "PAID" &&
    !active!.logisticsAccepted &&
    logisticsRequestExpired;

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
              <button type="button" key={order.id} className={selectedOrderId === order.id ? "active" : ""} onClick={() => setSelectedOrderId(order.id)}><strong>{orderDisplayId(order)}</strong><span>{order.product} · {formatQuantity(order.quantity, order.unit)}</span><StatusBadge status={order.status} /></button>
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
                  {orderDisplayId(active)} —{" "}
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

              {active.status === "Cancelled"
                ? <span className="farmer-pill bad shipment-cancelled-label">Cancelled</span>
                : <StatusBadge status={active.status} />}
            </div>

            <div className={`shipment-map-placeholder ${active.status === "Cancelled" ? "shipment-cancelled-map" : ""}`}>
              {active.status === "Cancelled" ? (
                <>
                  <MapIcon size={42} />
                  <strong>Order cancelled</strong>
                  <span>Order is cancelled due to payment failure.</span>
                </>
              ) : (
                <div ref={shipmentMapRef} className="shipment-google-map" aria-label="Live logistics map" />
              )}
            </div>

            {showRetryLogistics && (
              <div className="shipment-retry-card">
                <strong>Logistics request expired</strong>
                <span>No logistics provider accepted this request within one hour.</span>
                <button
                  type="button"
                  className="buyer-primary-button small"
                  onClick={() => void onRetryLogistics(active.id)}
                >
                  <RefreshCw size={15} />
                  Retry Delivery Request
                </button>
              </div>
            )}

            <div className="shipment-route-summary buyer-card">
              <strong>Pickup</strong><span>{active.pickupLocation ?? "Not available"}</span>
              <strong>Delivery</strong><span>{active.deliveryLocation ?? "Not available"}</span>
              {active.logisticsName && <div className="shipment-logistics-provider-card">
                <div className="shipment-provider-heading"><div><span className="small-label">LOGISTICS PROVIDER</span><strong>{active.logisticsName}</strong></div>{active.logisticsRating != null && <span className="shipment-provider-rating"><Star size={13} fill="currentColor" />{Number(active.logisticsRating).toFixed(1)}/5</span>}</div>
                <div className="shipment-provider-grid">
                  <div><small>Provider ID</small><strong>{active.logisticsProvider?.roleCode || active.logisticsRoleCode || "—"}</strong></div>
                  <div><small>Phone</small><strong className="shipment-provider-phone">{active.logisticsPhone ? <a href={`tel:${active.logisticsPhone}`}><Phone size={13} /><span>{active.logisticsPhone}</span></a> : "—"}</strong></div>
                  <div><small>Vehicle Type</small><strong>{active.logisticsVehicleType || "—"}</strong></div>
                  <div><small>Vehicle Number</small><strong>{active.logisticsVehicleNumber || "—"}</strong></div>
                  <div><small>Reviews</small><strong>{active.logisticsReviews ?? 0}</strong></div>
                </div>
                {active.status === "Delivered" && !active.logisticsReviewSubmitted && (
                  logisticsReviewOrderId !== active.id ? <button type="button" className="buyer-outline-button small" onClick={() => { setLogisticsReviewOrderId(active.id); setLogisticsReviewRating(0); setLogisticsReviewComment(""); }}><Star size={14} /> Write Review</button> :
                  <div className="shipment-logistics-review-form">
                    <strong>Review {active.logisticsName}</strong>
                    <div className="order-review-stars">{[1,2,3,4,5].map(star => <button type="button" key={star} aria-label={`${star} star`} className={star <= logisticsReviewRating ? "active" : ""} onClick={() => setLogisticsReviewRating(logisticsReviewRating === star ? 0 : star)}><Star size={24} fill={star <= logisticsReviewRating ? "currentColor" : "none"} /></button>)}</div>
                    <textarea value={logisticsReviewComment} onChange={e => setLogisticsReviewComment(e.target.value)} placeholder="Write your experience with this logistics provider..." rows={4} />
                    <div className="modal-actions"><button type="button" className="buyer-outline-button small" onClick={() => setLogisticsReviewOrderId(null)}>Cancel</button><button type="button" className="buyer-primary-button small" onClick={async () => { if (await submitLogisticsReview(active, logisticsReviewRating, logisticsReviewComment)) { setLogisticsReviewOrderId(null); setLogisticsReviewRating(0); setLogisticsReviewComment(""); } }}>Submit Review</button></div>
                  </div>
                )}
                {active.logisticsReviewSubmitted && active.logisticsReview && <span className="shipment-review-submitted"><Star size={13} fill="currentColor" /> Your review: {active.logisticsReview.rating}/5</span>}
              </div>}
            </div>

            <div className="shipment-steps">
              <ShipmentStep
                title="Order Confirmed"
                done={active.status !== "Cancelled"}
              />

              <ShipmentStep
                title="Picked Up"
                done={
                  active.status !== "Cancelled" && active.status !== "Confirmed"
                }
              />

              <ShipmentStep
                title="In Transit"
                done={
                  active.status !== "Cancelled" && (active.status === "In Transit" || active.status === "Delivered")
                }
              />

              <ShipmentStep
                title="Delivered"
                done={
                  active.status !== "Cancelled" && active.status === "Delivered"
                }
              />
            </div>
          </article>

          <aside className="buyer-card shipment-side">
            <h3>
              Live Updates
            </h3>

            {active.status === "Cancelled"
              ? <TimelineItem title="Order cancelled" time="Order is cancelled due to payment failure." done={false} cancelled />
              : <TimelineItem title="Order confirmed" time="System event" done />}

            {active.status !== "Cancelled" && <>
              <TimelineItem title="Dispatch pending" time="Waiting for logistics update" done={active.status !== "Confirmed"} />
              <TimelineItem title="In transit" time="Live location starts when a logistics provider accepts the delivery request." done={active.status === "In Transit" || active.status === "Delivered"} />
              <TimelineItem title="Delivery complete" time={active.deliveryDate} done={active.status === "Delivered"} />
            </>}
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
  distributionOrders,
  requirements,
  requirementStatusHistory,
  barData,
  pieData,
  range,
  customStart,
  customEnd,
  onRange,
  onStart,
  onEnd,
  onExport,
  onResetOrders,
}: {
  orders: Order[];
  distributionOrders: Order[];
  requirements: Requirement[];
  requirementStatusHistory: Record<string, RequirementStatus>;
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
  onResetOrders: () => void | Promise<void>;
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

        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <button
            type="button"
            className="buyer-outline-button"
            onClick={onResetOrders}
            title="Permanently erase this buyer's stored order history"
          >
            <RefreshCw size={16} />
            Refresh
          </button>
          <button
            type="button"
            className="buyer-outline-button"
            onClick={onExport}
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
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
          title="Unique Products Ordered"
          value={String(
            barData.length,
          )}
        />
      </div>

      <DashboardInsights orders={orders} distributionOrders={distributionOrders} requirements={requirements} requirementStatusHistory={requirementStatusHistory} />

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
      <section className="buyer-card buyer-support-card"><div className="buyer-section-heading"><div><span>Need assistance?</span><h2>Contact Support</h2></div><Phone size={20} /></div><p>Report a discrepancy, issue or message. Your support request is stored in the backend.</p><form onSubmit={sendSupport} className="buyer-support-form"><input value={support.subject} onChange={e => setSupport(current => ({ ...current, subject: e.target.value }))} placeholder="Subject" /><textarea value={support.message} onChange={e => setSupport(current => ({ ...current, message: e.target.value }))} placeholder="Describe the issue" /><button type="submit" className="buyer-primary-button"><Send size={16} /> Contact Support</button></form></section>
      <section className="buyer-card buyer-support-tickets"><div className="buyer-section-heading"><div><span>Backend records</span><h2>My support tickets</h2></div></div>{tickets.length ? tickets.map(ticket => <div className="buyer-support-ticket" key={ticket.id}><div><strong>{ticket.subject}</strong><small>{ticket.message}</small></div><span>{ticket.status || "OPEN"}</span><time>{new Date(ticket.createdAt).toLocaleString()}</time></div>) : <div className="profile-empty"><HelpCircle size={22} /><strong>No support tickets yet</strong><span>Your submitted requests will appear here.</span></div>}</section>
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
  const [language, setLanguage] = useState(buyerLanguageCode(session.language));
  const [locationQuery, setLocationQuery] = useState(session.location ?? "");
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [locationSearching, setLocationSearching] = useState(false);
  const [busy, setBusy] = useState(false);
  const locationSelectionRef = useRef(false);
  const locationMapRef = useRef<HTMLDivElement | null>(null);
  const locationMapInstanceRef = useRef<any>(null);
  const locationMapMarkerRef = useRef<any>(null);

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
    setLanguage(buyerLanguageCode(session.language));
  }, [session, editing]);

  useEffect(() => {
    if (locationSelectionRef.current) {
      locationSelectionRef.current = false;
      setLocationSuggestions([]);
      setLocationSearching(false);
      return;
    }

    const q = locationQuery.trim();

    if (!editing || q.length < 3) {
      setLocationSuggestions([]);
      setLocationSearching(false);
      return;
    }

    const controller = new AbortController();

    const timer = window.setTimeout(async () => {
      try {
        setLocationSearching(true);

        const results = await searchGoogleLocations(
          q,
          controller.signal,
        );

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
  }, [locationQuery, editing]);

  const selectLocation = async (
    item: LocationSuggestion,
  ) => {
    try {
      locationSelectionRef.current = true;
      setLocationSearching(true);

      // Nominatim results already contain coordinates. Do not pass their
      // place_id to Google's Place API because it is not a Google Place ID.
      if (item.lat != null && item.lon != null) {
        const lat = Number(item.lat);
        const lon = Number(item.lon);

        if (Number.isFinite(lat) && Number.isFinite(lon)) {
          setLocation(item.display_name);
          setLocationQuery(item.display_name);
          setLatitude(lat);
          setLongitude(lon);
          setLocationSuggestions([]);
          return;
        }
      }

      // Google Places results do not contain coordinates yet, so fetch
      // their details only when they are genuine Google Place predictions.
      const details = await getGooglePlaceDetails(
        item.place_id,
      );

      if (
        !details.display_name &&
        details.lat == null &&
        details.lon == null
      ) {
        throw new Error("Selected location has no usable details.");
      }

      setLocation(
        details.display_name || item.display_name,
      );

      setLocationQuery(
        details.display_name || item.display_name,
      );

      setLatitude(details.lat);
      setLongitude(details.lon);
      setLocationSuggestions([]);
    } catch {
      showToast("Unable to get the selected location.");
    } finally {
      setLocationSearching(false);
    }
  };

  const captureLocation = () => {
    if (!navigator.geolocation) {
      showToast(
        "Live location is not supported by this browser.",
      );
      return;
    }

    setBusy(true);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const nextLat = position.coords.latitude;
        const nextLng = position.coords.longitude;

        try {
          const readable = await reverseGeocodeGoogleLocation(
            nextLat,
            nextLng,
          );

          setLatitude(nextLat);
          setLongitude(nextLng);

          if (readable) {
            setLocation(readable);
            setLocationQuery(readable);
          } else {
            showToast("Unable to determine your locality.");
          }

          setLocationSuggestions([]);
        } catch {
          showToast("Unable to determine your locality.");
        } finally {
          setBusy(false);
        }
      },
      (error) => {
        showToast(
          error.message ||
          "Location permission was not granted.",
        );
        setBusy(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 12000,
        maximumAge: 30000,
      },
    );
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
    setLanguage(buyerLanguageCode(session.language)); setLocationSuggestions([]); setEditing(false);
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

  useEffect(() => {
    let cancelled = false;

    if (!locationMapRef.current) return;

    void loadGoogleMaps().then(() => {
      if (cancelled || !locationMapRef.current) return;

      const g = (window as any).google;
      if (!g?.maps) return;

      const lat = latitude ?? 20.5937;
      const lng = longitude ?? 78.9629;

      locationMapInstanceRef.current = new g.maps.Map(
        locationMapRef.current,
        {
          center: { lat, lng },
          zoom: latitude != null && longitude != null ? 14 : 5,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        }
      );

      locationMapMarkerRef.current = new g.maps.Marker({
        map: locationMapInstanceRef.current,
        position: { lat, lng },
        title: "Buyer location",
      });
    }).catch(() => { });

    return () => {
      cancelled = true;
      locationMapInstanceRef.current = null;
      locationMapMarkerRef.current = null;
    };
  }, [latitude, longitude]);

  useEffect(() => {
    if (
      !locationMapInstanceRef.current ||
      latitude == null ||
      longitude == null
    ) {
      return;
    }

    const position = {
      lat: latitude,
      lng: longitude,
    };

    locationMapMarkerRef.current?.setPosition(position);
    locationMapInstanceRef.current.setCenter(position);
    locationMapInstanceRef.current.setZoom(14);
  }, [latitude, longitude]);
  const totalOrders = orders.filter(isCountedOrder).length;

  return (
    <div className="buyer-main profile-main">
      <div className="page-heading">
        <div><p className="eyebrow green">ACCOUNT</p><h1>Profile</h1><p>Manage your centralized identity and Buyer details.</p></div>
        {!editing && <button type="button" className="buyer-primary-button" onClick={() => setEditing(true)}><Pencil size={16} /> Edit profile</button>}
      </div>

      <section className="profile-cover buyer-card">
        <div className="profile-avatar-section">
          <div className="buyer-profile-avatar-large">{image ? <img src={image} alt={username} /> : getInitials(username)}</div>
          {editing && <label className="profile-upload-button"><Pencil size={15} /> Upload Photo<input type="file" accept="image/*" onChange={handleImage} /></label>}
        </div>
        <div className="profile-identity"><span className="verified-pill"><Check size={12} /> Verified Buyer</span><h2>{username}</h2><p>Buyer ID: <strong>{session.buyerId || "—"}</strong></p><small>{company || phone}</small></div>
        <div className="profile-mini-stat"><strong>{totalOrders}</strong><span>Total Orders</span></div>
      </section>

      <section className="profile-content-grid">
        <article className="buyer-card profile-form-card">
          <div className="buyer-section-heading"><div><span>Personal & buyer information</span><h2>Profile details</h2></div></div>
          <div className="profile-form-grid">
            {[["First name", username.split(" ")[0] || "Buyer"], ["Phone Number", phone], ["Email", email], ["Company / Organization", company]].map(([label, value], index) => <Field label={label} key={label}><input type={label === "Email" ? "email" : "text"} value={value} disabled={!editing || index < 2} readOnly={!editing || index < 2} onChange={e => { if (label === "Email") setEmail(e.target.value); else if (label === "Company / Organization") setCompany(e.target.value); }} /></Field>)}

          </div>

          <div className="profile-form-grid"><Field label="Language"><select value={language} disabled={!editing} onChange={e => setLanguage(buyerLanguageCode(e.target.value))}>{BUYER_LANGUAGES.map(([code, label]) => (<option key={code} value={code}>{label}</option>))}</select></Field></div>

          <div className="profile-location-section">
            <div className="buyer-section-heading"><div><span>Buyer location</span><h2>Location</h2></div></div>
            <div className="location-editor-grid">
              <div className="location-search-box">
                <div className="location-input-wrap"><Search size={15} /><input value={locationQuery} disabled={!editing} onChange={e => { setLocationQuery(e.target.value); setLocation(e.target.value); setLatitude(null); setLongitude(null); }} placeholder="Search a place, address, building, or locality" /><button type="button" title="Use current location" disabled={!editing || busy} onClick={captureLocation}><MapPin size={16} /></button></div>
                {editing && (locationSearching || locationSuggestions.length > 0) && <div className="location-suggestions">{locationSearching && <div className="location-suggestion muted">Searching locations…</div>}{locationSuggestions.map((item) => (
                  <button
                    type="button"
                    className="location-suggestion"
                    key={item.place_id}
                    onClick={() => {
                      void selectLocation(item);
                    }}
                  >
                    <MapPin size={14} />

                    <span>
                      <strong>{item.display_name}</strong>
                      {item.secondary_text && (
                        <small>{item.secondary_text}</small>
                      )}
                    </span>
                  </button>))}</div>}
                <p className="location-current-text">Search for a location or use the current-location button. The selected coordinates are saved with your Buyer profile.</p>
              </div>
            </div>
          </div>


          {editing && <div className="profile-form-actions"><button type="button" className="buyer-outline-button" onClick={cancelEdit} disabled={busy}>Cancel</button><button type="button" className="buyer-primary-button" onClick={() => void saveProfile()} disabled={busy}><Check size={16} /> {busy ? "Saving…" : "Save changes"}</button></div>}
        </article>

        <aside className="buyer-card profile-side-card">
          <div className="buyer-section-heading"><div><span>Account overview</span><h2>Buyer details</h2></div><UserCircle size={18} /></div>
          <div className="profile-info-list">
            <ProfileInfo icon={<UserCircle />} label="Buyer ID" value={session.buyerId || "—"} />
            <ProfileInfo icon={<Phone />} label="Phone" value={session.phoneNumber || "Not added"} />
            <ProfileInfo icon={<Languages />} label="Language" value={buyerLanguageLabel(session.language)} />
            <ProfileInfo icon={<MapPin />} label="Location" value={session.location || "Not added"} />
            <ProfileInfo icon={<Settings />} label="Account Type" value="Buyer" />
          </div>
          <div className="catalog-map-wrap"><div className="catalog-map-heading"><span>Buyer location map</span><MapPin size={15} /></div><div className="location-map-card"><div ref={locationMapRef} className="buyer-google-location-map" /></div></div>
          <button type="button" className="buyer-outline-button profile-orders-button" onClick={() => onNavigate("Orders")}>View My Orders <ArrowRight size={15} /></button>
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

          <p>{farmer.farm}</p>
          <p className="farmer-modal-meta">Farmer ID:{" "} <strong>{farmer.roleCode || farmer.id}</strong></p>

          <div className="modal-rating">
            <Star size={15} fill="currentColor" />
            {reviews.length ? (reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length).toFixed(1) : "0.0"}{" "}•{" "}{reviews.length} reviews
          </div>

          <div className="modal-location">
            <MapPin size={15} />
            <span>{farmer.location}</span>
            <strong> · {farmer.distanceKm} km </strong>
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

        <div><small>Land</small><strong>{farmer.landAcres != null ? `${farmer.landAcres} acres` : "Not provided"}</strong></div>
        <div><small>Listings</small><strong>{farmer.listings.length}</strong></div>
      </div>

      <div className="modal-crops farmer-table-wrap">
        <table className="farmer-table">
          <thead><tr><th>Product</th><th>Quantity</th><th>Price</th></tr></thead>
          <tbody>{farmer.listings.map(listing => <tr key={listing.id}>
            <td><div className="farmer-product-cell"><div className="farmer-product-icon"><img src={listing.image || getProductImage(listing.produce)} alt={listing.produce} /></div><div><strong>{listing.produce}</strong><div className="farmer-muted">{listing.category || "Catalog product"}</div></div></div></td>
            <td className="farmer-table-quantity">{formatQuantity(listing.availableQuantity, listing.unit)}</td>
            <td className="farmer-table-price">{formatCurrency(listing.pricePerKg)} / {listing.unit}</td>
          </tr>)}</tbody>
        </table>
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
            onNavigate("Marketplace");
            window.setTimeout(() => document.querySelector(".marketplace-procurement-section")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
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
const changeLabel = (value: number) => value === 0 ? "0%" : `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
function SummaryMetric({
  icon,
  label,
  value,
  change,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  change?: number;
}) {
  return (
    <div className="summary-metric">
      <span>{icon}</span>

      <div className="summary-metric-content">
        <div className="summary-metric-main">
          <small>{label}</small>
          <strong>{value}</strong>
        </div>

        {change !== undefined && (
          <small
            className={`summary-change ${change < 0
              ? "negative"
              : "positive"
              }`}
          >
            {changeLabel(change)}
          </small>
        )}
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
      className={`shipment-step ${done
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
  cancelled = false,
}: {
  title: string;
  time: string;
  done: boolean;
  cancelled?: boolean;
}) {
  return (
    <div
      className={`timeline-item ${done ? "done" : ""} ${cancelled ? "cancelled" : ""}`}
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
