"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";
import {
  BarChart3, Bell, Check, ChevronDown, ChevronRight, CircleHelp, Clock3, ExternalLink,
  Gauge, Languages, LocateFixed, MapPin, Menu, Navigation, Package, Pencil, Phone, Power,
  RefreshCw, Route, Save, Search, Send, Settings, ShieldCheck, Truck, UserCircle, X
} from "lucide-react";
import {
  Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import "./Logistics.css";

type Tab = "dashboard" | "shipments" | "analytics" | "help" | "profile";
type CapacityUnit = "KG" | "QUINTAL" | "TON" | "LITRE";
type Stage = "PICKUP" | "QC" | "DROPOFF";

type Profile = {
  id: string; userId: string; roleCode?: string; rating?: number; reviews?: number; capacity: number; capacityUnit: CapacityUnit; maxCapacityKg: number;
  availableCapacityKg: number; vehicleType?: string; vehicleNumber?: string; experience?: string;
  isOnline: boolean; locationTrackingEnabled: boolean; currentLat?: number | null; currentLng?: number | null;
  user?: { firstName?: string; lastName?: string; phone?: string; email?: string; profileImage?: string; location?: string; language?: string; roleCode?: string; roles?: { role?: string; roleCode?: string }[] };
};
type Item = { quantity: number; unit: string; product: { name: string } };
type Assignment = { id: string; orderId: string; status: string; fee: number; offeredAt: string; acceptedAt?: string; expiresAt?: string; loadKg: number; distanceToPickupKm?: number; sequence?: number;
  order: { id: string; createdAt?: string; buyer: { firstName: string; lastName: string; phone: string; roles?: { roleCode: string }[] }; seller: { firstName: string; lastName: string; phone: string; roles?: { roleCode: string }[] }; items: Item[]; shipment?: Shipment };
};
type Shipment = { status: string; pickupLocation?: string; deliveryLocation?: string; pickupLat?: number; pickupLng?: number; deliveryLat?: number; deliveryLng?: number; currentLat?: number; currentLng?: number; distanceKm?: number; etaMinutes?: number; requiredBy?: string; qcStatus?: string; qcNote?: string; returnRequired?: boolean; pickupVerifiedAt?: string; qcAt?: string; dropoffVerifiedAt?: string };
type Notice = { id: string; title: string; message: string; read: boolean; createdAt: string };
type Analytics = { completed: number; quantityKg: number; distanceKm: number; earnings: number; itemTypes: Record<string, number>; pickupPlaces?: Record<string, number>; dropoffPlaces?: Record<string, number>; deliveriesByDate?: Record<string, number> };
type ChartMode = "bar" | "pie" | "line";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "";
const api = (path: string, init?: RequestInit) => fetch(`${API_BASE}${path}`, { ...init, credentials: "include", cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
const kg = (quantity: number, unit: string) => { const u = unit.toUpperCase(); if (u === "TON") return quantity * 1000; if (u === "QUINTAL") return quantity * 100; return quantity; };
const money = (v: number) => `₹${Number(v || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const shortDisplayId = (...parts: string[]) => {
  const source = parts.filter(Boolean).join("|");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let output = "", value = hash >>> 0;
  for (let i = 0; i < 6; i += 1) { output += alphabet[value % alphabet.length]; value = Math.floor(value / alphabet.length) || ((hash + i * 97) >>> 0); }
  return output;
};
const orderDisplayId = (order?: { id?: string }) => shortDisplayId("ORDER", order?.id || "");
const formatLogNotification = (message: string, orders: Assignment[]) => {
  let result = message || "";
  for (const assignment of orders) {
    const id = assignment.order?.id;
    if (id && result.includes(id)) result = result.split(id).join(orderDisplayId(assignment.order));
  }
  return result;
};
const buildNavUrl = (lat?: number | null, lng?: number | null, dlat?: number | null, dlng?: number | null) => lat != null && lng != null && dlat != null && dlng != null ? `https://www.google.com/maps/dir/?api=1&origin=${lat},${lng}&destination=${dlat},${dlng}&travelmode=driving` : "https://www.google.com/maps";

const LOG_LANGUAGES = [["en","English"],["hi","हिन्दी"],["bn","বাংলা"],["ta","தமிழ்"],["te","తెలుగు"],["mr","मराठी"],["gu","ગુજરાતી"],["kn","ಕನ್ನಡ"],["ml","മലയാളം"],["pa","ਪੰਜਾਬੀ"]] as const;
const languageLabel=(value?:string)=>LOG_LANGUAGES.find(x=>x[0]===String(value||"en").toLowerCase())?.[1]||"English";
const capacityUnitLabel=(value?:CapacityUnit)=>({KG:"Kg",QUINTAL:"Quintal",TON:"Ton",LITRE:"Litre"}[value||"KG"]);


type LocationSuggestion = { place_id: string; display_name: string; secondary_text?: string; lat?: string; lon?: string };
let logisticsMapsPromise: Promise<void> | null = null;
const loadLogisticsMaps = (): Promise<void> => {
  if (typeof window === "undefined") return Promise.reject(new Error("Maps are browser-only."));
  if ((window as any).google?.maps) return Promise.resolve();
  if (logisticsMapsPromise) return logisticsMapsPromise;
  const key = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!key) return Promise.reject(new Error("Google Maps key is not configured."));
  logisticsMapsPromise = new Promise((resolve,reject)=>{
    const existing=document.querySelector('script[data-khetlink-logistics-maps="true"],script[src*="maps.googleapis.com/maps/api/js"]') as HTMLScriptElement|null;
    if(existing){
      if((window as any).google?.maps) { resolve(); return; }
      const finish=()=>{ if((window as any).google?.maps) resolve(); else { logisticsMapsPromise=null; reject(new Error("Google Maps loaded without the Maps API.")); } };
      existing.addEventListener("load",finish,{once:true});
      existing.addEventListener("error",()=>{logisticsMapsPromise=null;reject(new Error("Failed to load Google Maps."))},{once:true});
      return;
    }
    const script=document.createElement("script"); script.dataset.khetlinkLogisticsMaps="true"; script.src=`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&loading=async`; script.async=true; script.defer=true; script.onload=()=>{ if((window as any).google?.maps) resolve(); else { logisticsMapsPromise=null; reject(new Error("Google Maps loaded without the Maps API.")); } }; script.onerror=()=>{logisticsMapsPromise=null;reject(new Error("Failed to load Google Maps."))}; document.head.appendChild(script);
  });
  return logisticsMapsPromise;
};
const searchLogisticsNominatim = async (query:string, signal:AbortSignal):Promise<LocationSuggestion[]> => {
  const q=query.trim(); if(q.length<3) return [];
  const compact=q.replace(/[,]+/g," ").replace(/\\s+/g," ").trim();
  const queries=[q,`${q}, India`,`${compact}, India`].filter(Boolean);
  const all:any[]=[];
  for(const text of queries){ if(signal.aborted) return []; try{const r=await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=10&addressdetails=1&namedetails=1&dedupe=1&countrycodes=in&accept-language=en&q=${encodeURIComponent(text)}`,{signal,headers:{Accept:"application/json"}}); if(!r.ok) continue; const d=await r.json(); if(Array.isArray(d)) all.push(...d); if(Array.isArray(d)&&d.length) break;}catch{if(signal.aborted)return[];} }
  const seen=new Set<string>(); return all.map((x:any)=>{const a=x.address||{}; const secondary=[a.house_number?`House ${a.house_number}`:"",a.road||"",a.suburb||a.neighbourhood||a.city_district||"",a.city||a.town||a.municipality||a.village||""].filter(Boolean); return {place_id:String(x.place_id),display_name:String(x.display_name||""),secondary_text:secondary.length?[...new Set(secondary)].join(", "):String(x.type||"").replace(/_/g," "),lat:x.lat,lon:x.lon};}).filter((x:any)=>{const k=`${x.display_name}|${x.lat}|${x.lon}`.toLowerCase();if(!x.display_name||seen.has(k))return false;seen.add(k);return true;}).slice(0,10);
};
const searchLogisticsGoogle = async (query:string, signal:AbortSignal):Promise<LocationSuggestion[]> => {
  try{await loadLogisticsMaps(); if(signal.aborted)return[]; const places=(await (window as any).google.maps.importLibrary("places")); const token=new places.AutocompleteSessionToken(); const response=await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({input:query.trim(),sessionToken:token,includedRegionCodes:["in"]}); return response.suggestions.map((s:any)=>s.placePrediction).filter(Boolean).map((p:any)=>({place_id:`google:${p.placeId}`,display_name:p.text?.text||"",secondary_text:p.secondaryText?.text})).filter((x:any)=>x.display_name);}catch{return[]}
};
const searchLogisticsLocations = async (query:string, signal:AbortSignal):Promise<LocationSuggestion[]> => {
  const googleResults=await searchLogisticsGoogle(query,signal); if(signal.aborted)return[];
  const nominatimResults=await searchLogisticsNominatim(query,signal); if(signal.aborted)return[];
  const merged=[...googleResults,...nominatimResults], unique:LocationSuggestion[]=[];
  for(const item of merged){const current=item.display_name.trim().toLowerCase(); if(!current)continue; const duplicate=unique.some(x=>{const other=x.display_name.trim().toLowerCase(); return other===current || (other.includes(current)&&other.length>current.length);}); if(!duplicate)unique.push(item);}
  return unique.slice(0,10);
};
const getGoogleLogisticsPlace = async (placeId:string):Promise<{display_name:string;lat:number|null;lon:number|null}> => {
  await loadLogisticsMaps(); const {Place}=await (window as any).google.maps.importLibrary("places"); const place=new Place({id:placeId}); await place.fetchFields({fields:["displayName","formattedAddress","location"]}); const location=place.location; return {display_name:place.formattedAddress||place.displayName||"",lat:location?location.lat():null,lon:location?location.lng():null};
};
const reverseLogisticsLocation = async (lat:number,lon:number):Promise<string> => {
  try{await loadLogisticsMaps(); const {Geocoder}=await (window as any).google.maps.importLibrary("geocoding"); const response=await new Geocoder().geocode({location:{lat,lng:lon}}); const result=response.results?.[0]; if(result?.formatted_address)return result.formatted_address;}catch{}
  const r=await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&addressdetails=1&namedetails=1&zoom=18&layer=address,poi`,{headers:{Accept:"application/json"}}); const d=await r.json(); const a=d?.address||{}; const parts=[a.house_number,a.road,a.neighbourhood||a.suburb||a.city_district,a.city||a.town||a.municipality||a.village,a.state,a.country].filter(Boolean); return [...new Set(parts.map(String))].join(", ")||String(d?.display_name||"Current location");
};

const logisticsProviderId = (profile: Profile | null) => {
  const roleCode = profile?.roleCode || profile?.user?.roleCode || profile?.user?.roles?.find(r => String(r.role || "").toUpperCase() === "LOGISTICS")?.roleCode;
  if (roleCode && /^[A-Za-z0-9]{6}$/.test(String(roleCode))) return String(roleCode).toUpperCase();
  const source = String(profile?.userId || profile?.id || "LOGISTICS");
  let hash = 2166136261;
  for (let i = 0; i < source.length; i += 1) { hash ^= source.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let value = hash >>> 0, code = "";
  for (let i = 0; i < 6; i += 1) { code += alphabet[value % alphabet.length]; value = Math.floor(value / alphabet.length) || ((hash + i * 97) >>> 0); }
  return code;
};

const exportDeliveryPdf = (rows: Assignment[], single?: Assignment) => {
  if (!rows.length) return;
  const targets = single ? [single] : rows;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  targets.forEach((a, index) => {
    if (index > 0) doc.addPage();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 16;
    const fee = Number(a.fee || 0);
    const platformFee = fee * 0.05;
    const netFee = fee - platformFee;
    doc.setFillColor(13, 104, 50);
    doc.roundedRect(margin, 14, pageWidth - margin * 2, 24, 4, 4, "F");
    doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(18);
    doc.text("KhetLink", margin + 8, 25);
    doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text("LOGISTICS DELIVERY RECEIPT", margin + 8, 32);
    doc.setFont("helvetica","bold"); doc.setFontSize(12);
    doc.text(`Order ${orderDisplayId(a.order)}`, pageWidth - margin - 8, 25, { align:"right" });
    doc.setFont("helvetica","normal"); doc.setFontSize(8);
    doc.text(new Date(a.order?.createdAt || a.acceptedAt || Date.now()).toLocaleDateString("en-IN"), pageWidth - margin - 8, 32, { align:"right" });
    let y = 50;
    const boxW = (pageWidth - margin * 2 - 6) / 2;
    doc.setDrawColor(225,230,227); doc.setFillColor(250,252,250);
    doc.roundedRect(margin,y,boxW,30,3,3,"FD"); doc.roundedRect(margin+boxW+6,y,boxW,30,3,3,"FD");
    doc.setTextColor(90,100,94); doc.setFontSize(8); doc.setFont("helvetica","bold");
    doc.text("PICKUP", margin+6, y+8); doc.text("DROPOFF", margin+boxW+12, y+8);
    doc.setTextColor(30,40,34); doc.setFontSize(9); doc.setFont("helvetica","normal");
    doc.text(doc.splitTextToSize(a.order.shipment?.pickupLocation || "Pickup location", boxW-12), margin+6, y+15);
    doc.text(doc.splitTextToSize(a.order.shipment?.deliveryLocation || "Dropoff location", boxW-12), margin+boxW+12, y+15);
    y += 42;
    doc.setTextColor(13,104,50); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("DELIVERY DETAILS", margin, y); y += 8;
    const rows = [
      ["Status", a.order.shipment?.status || "DELIVERED"],
      ["Distance covered", `${Number(a.order.shipment?.distanceKm || 0).toFixed(1)} km`],
      ["Load moved", `${Math.round(a.loadKg || 0).toLocaleString()} kg`],
      ["Completed on", a.order.shipment?.dropoffVerifiedAt ? new Date(a.order.shipment.dropoffVerifiedAt).toLocaleString("en-IN") : "—"],
    ];
    rows.forEach(([label,value])=>{doc.setDrawColor(235,239,236);doc.line(margin,y,pageWidth-margin,y);doc.setTextColor(100,108,103);doc.setFontSize(8);doc.text(label,margin+2,y+7);doc.setTextColor(35,45,39);doc.setFont("helvetica","bold");doc.setFontSize(9);doc.text(String(value),pageWidth-margin-2,y+7,{align:"right"});doc.setFont("helvetica","normal");y+=11;});
    y += 8; doc.setTextColor(13,104,50); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("FEE SUMMARY", margin, y); y += 8;
    doc.setDrawColor(225,230,227); doc.roundedRect(pageWidth-margin-82,y,82,43,3,3,"S");
    doc.setTextColor(90,95,92); doc.setFont("helvetica","normal"); doc.setFontSize(8.5);
    doc.text("Total delivery fee", pageWidth-margin-76,y+9); doc.text(money(fee),pageWidth-margin-6,y+9,{align:"right"});
    doc.text("Platform fee (5%)", pageWidth-margin-76,y+19); doc.text(money(platformFee),pageWidth-margin-6,y+19,{align:"right"});
    doc.setDrawColor(205,210,207); doc.line(pageWidth-margin-76,y+24,pageWidth-margin-6,y+24);
    doc.setTextColor(13,104,50); doc.setFont("helvetica","bold"); doc.setFontSize(11); doc.text("NET EARNED",pageWidth-margin-76,y+35); doc.text(money(netFee),pageWidth-margin-6,y+35,{align:"right"});
    doc.setTextColor(105,112,108); doc.setFont("helvetica","normal"); doc.setFontSize(8); doc.text("Net earnings shown after the 5% KhetLink platform deduction.", margin, y+15);
    doc.setDrawColor(235,239,236); doc.line(margin,pageHeight-24,pageWidth-margin,pageHeight-24);
    doc.setTextColor(120,126,122); doc.text("Generated from the KhetLink logistics delivery record.",margin,pageHeight-17);
  });
  doc.save(single ? `khetlink-delivery-${orderDisplayId(single.order)}.pdf` : `khetlink-all-deliveries-${new Date().toISOString().slice(0,10)}.pdf`);
};

export default function Logistics() {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [offers, setOffers] = useState<Assignment[]>([]);
  const [accepted, setAccepted] = useState<Assignment[]>([]);
  const [history, setHistory] = useState<Assignment[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState("");
  const [notifications, setNotifications] = useState<Notice[]>([]);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [online, setOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [support, setSupport] = useState({ subject: "", message: "" });
  const [tickets, setTickets] = useState<Array<{ id: string; subject: string; message: string; status: string; createdAt: string }>>([]);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [languageOpen, setLanguageOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [verify, setVerify] = useState<{ orderId: string; stage: Stage } | null>(null);
  const [code, setCode] = useState("");
  const [qcPassed, setQcPassed] = useState(true);
  const [qcNote, setQcNote] = useState("");
  const [language, setLanguage] = useState("en");
  const [from, setFrom] = useState(() => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return start.toISOString().slice(0, 10); });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [analyticsRange, setAnalyticsRange] = useState<"week" | "month" | "custom">("week");
  const [analyticsChartMode, setAnalyticsChartMode] = useState<ChartMode>("bar");
  const [shipmentRange, setShipmentRange] = useState<"week" | "month" | "custom">("week");
  const [shipmentFrom, setShipmentFrom] = useState(() => { const now = new Date(); const start = new Date(now); start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); return start.toISOString().slice(0, 10); });
  const [shipmentTo, setShipmentTo] = useState(() => new Date().toISOString().slice(0, 10));
  const inFlight = useRef(false);
  const mapRef = useRef<HTMLDivElement | null>(null);
  const mapObject = useRef<any>(null);
  const marker = useRef<any>(null);
  const profileMapRef = useRef<HTMLDivElement | null>(null);
  const profileMapObject = useRef<any>(null);
  const profileMarker = useRef<any>(null);
  const watchId = useRef<number | null>(null);

  const refresh = useCallback(async () => {
    if (inFlight.current || document.visibilityState === "hidden") return;
    inFlight.current = true;
    try {
      const r = await api("/api/logistics/snapshot");
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Unable to load logistics data.");
      setProfile(d.profile); setOnline(Boolean(d.profile?.isOnline)); setOffers(d.offers || []); setAccepted(d.accepted || []); setLanguage(d.profile?.user?.language || "en");
      const allAssignments = [...(d.offers || []), ...(d.accepted || [])];
      setNotifications((d.notifications || []).map((n: Notice) => ({ ...n, message: formatLogNotification(n.message, allAssignments) })));
      const qs = new URLSearchParams(); if (from) qs.set("from", from); if (to) qs.set("to", to);
      const [ar, hr, sr] = await Promise.all([api(`/api/logistics/analytics${qs.toString() ? `?${qs}` : ""}`), api("/api/logistics/history"), api("/api/support")]);
      if (ar.ok) setAnalytics(await ar.json());
      if (hr.ok) { const hd = await hr.json().catch(() => ({})); const completedHistory = hd.history || []; setHistory(completedHistory); setNotifications((d.notifications || []).map((n: Notice) => ({ ...n, message: formatLogNotification(n.message, [...allAssignments, ...completedHistory]) }))); }
      if (sr.ok) { const sd = await sr.json().catch(() => ({})); setTickets((sd.tickets || []).map((t: any) => ({ id: t.id, subject: t.subject, message: t.message, status: t.status, createdAt: t.createdAt }))); }
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load logistics data."); }
    finally { setLoading(false); inFlight.current = false; }
  }, [from, to]);

  useEffect(() => { document.title = "KhetLink"; }, []);
  useEffect(() => { refresh(); const timer = window.setInterval(refresh, 5000); return () => window.clearInterval(timer); }, [refresh]);

  const locationUpdate = useCallback((position: GeolocationPosition) => {
    const latitude = position.coords.latitude, longitude = position.coords.longitude;
    setProfile(p => p ? { ...p, currentLat: latitude, currentLng: longitude, locationTrackingEnabled: true } : p);
    void api("/api/logistics/location", { method: "POST", body: JSON.stringify({ latitude, longitude }) });
    if (marker.current && mapObject.current) { marker.current.setPosition({ lat: latitude, lng: longitude }); mapObject.current.panTo({ lat: latitude, lng: longitude }); }
  }, []);

  useEffect(() => {
    if (!online || !navigator.geolocation) { if (watchId.current != null) navigator.geolocation?.clearWatch(watchId.current); watchId.current = null; return; }
    watchId.current = navigator.geolocation.watchPosition(locationUpdate, () => setError("Location permission is required while you are online."), { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 });
    return () => { if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current); watchId.current = null; };
  }, [online, locationUpdate]);

  const needsProfile = !profile || !profile.vehicleNumber || !profile.vehicleType || !profile.experience || profile.maxCapacityKg <= 0 || !profile.user?.location || profile.currentLat == null || profile.currentLng == null;

  useEffect(() => {
    if (tab !== "dashboard" || needsProfile || !mapRef.current || mapObject.current || typeof window === "undefined") return;
    let cancelled = false;
    void loadLogisticsMaps().then(() => {
      if (cancelled || tab !== "dashboard" || !mapRef.current || mapObject.current) return;
      const g = (window as any).google;
      if (!g?.maps) return;
      const lat = profile?.currentLat ?? 20.5937;
      const lng = profile?.currentLng ?? 78.9629;
      mapObject.current = new g.maps.Map(mapRef.current, {
        center: { lat, lng },
        zoom: profile?.currentLat != null && profile?.currentLng != null ? 14 : 5,
        mapTypeControl: false,
        streetViewControl: false,
      });
      marker.current = new g.maps.Marker({
        map: mapObject.current,
        position: { lat, lng },
        title: "Your live location",
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      mapObject.current = null;
      marker.current = null;
    };
  }, [tab, needsProfile, profile?.currentLat, profile?.currentLng]);

  useEffect(() => {
    if (!mapObject.current || profile?.currentLat == null || profile?.currentLng == null) return;
    const position = { lat: profile.currentLat, lng: profile.currentLng };
    marker.current?.setPosition(position);
    mapObject.current.setCenter(position);
    mapObject.current.setZoom(14);
  }, [profile?.currentLat, profile?.currentLng]);

  const act = async (url: string, method: "POST" | "PUT", body?: unknown) => {
    setBusy(true); setError("");
    try { const r = await api(url, { method, ...(body === undefined ? {} : { body: JSON.stringify(body) }) }); const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "Request failed"); setNotice(d.message || "Updated successfully."); await refresh(); window.setTimeout(() => setNotice(""), 2500); return d; }
    catch (e) { setError(e instanceof Error ? e.message : "Request failed"); return null; } finally { setBusy(false); }
  };

  const toggleOnline = async () => {
    if (!profile) return navigate("profile");
    if (needsProfile) return navigate("profile");
    if (!online && !navigator.geolocation) return setError("This device does not support location tracking.");
    const position = await new Promise<GeolocationPosition | null>(resolve => navigator.geolocation?.getCurrentPosition(resolve, () => resolve(null), { enableHighAccuracy: true, timeout: 10000 }));
    if (!online && !position) return setError("Allow location permission before going online.");
    const next = !online; setOnline(next);
    const d = await act("/api/logistics/status", "POST", { online: next, locationTrackingEnabled: next, latitude: position?.coords.latitude ?? profile.currentLat ?? null, longitude: position?.coords.longitude ?? profile.currentLng ?? null });
    if (!d) setOnline(!next);
  };

  const accept = (id: string) => act(`/api/logistics/offers/${id}/accept`, "POST");
  const decline = (id: string) => act(`/api/logistics/offers/${id}/decline`, "POST");
  const emergencyCancel = (orderId: string) => { if (window.confirm("Cancel this delivery assignment and release your reserved capacity?")) void act(`/api/logistics/orders/${orderId}/emergency-cancel`, "POST"); };

  const submitVerify = async () => {
    if (!verify) return;
    const payload = verify.stage === "QC"
      ? { stage: "QC", qcPassed, qcNote }
      : { stage: verify.stage, code: code.trim().toUpperCase() };
    const result = await act(`/api/logistics/${verify.orderId}/verify`, "POST", payload);
    if (result) { setVerify(null); setCode(""); setQcNote(""); setQcPassed(true); }
  };

  const sendSupport = async (event: React.FormEvent) => {
    event.preventDefault();
    const subject = support.subject.trim();
    const message = support.message.trim();
    if (!subject || !message) { setError("Please enter a subject and describe the issue."); return; }
    try {
      const result = await api("/api/support", { method: "POST", body: JSON.stringify({ subject, message }) });
      const data = await result.json().catch(() => ({}));
      if (!result.ok) throw new Error(data.error || "Unable to contact support.");
      if (data.ticket) setTickets(current => [data.ticket, ...current]);
      setSupport({ subject: "", message: "" });
      setNotice("Support request submitted successfully.");
      window.setTimeout(() => setNotice(""), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to contact support."); }
  };

  const name = `${profile?.user?.firstName || ""} ${profile?.user?.lastName || ""}`.trim() || "Logistics Provider";
  const initials = name.split(" ").map(x => x[0]).join("").slice(0, 2).toUpperCase();
  const completed = analytics?.completed ?? 0;
  const urgentOffers = offers.filter(o => o.expiresAt && new Date(o.expiresAt).getTime() - Date.now() <= 60000);
  const urgentOfferIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const current = new Set(urgentOffers.map(o => o.id));
    const hasNew = [...current].some(id => !urgentOfferIdsRef.current.has(id));
    if (hasNew && urgentOfferIdsRef.current.size > 0) {
      try {
        const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
          osc.type = "sine"; osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.16);
          gain.gain.setValueAtTime(0.0001, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.16, ctx.currentTime + 0.02); gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
          osc.connect(gain); gain.connect(ctx.destination); osc.start(); osc.stop(ctx.currentTime + 0.26);
        }
      } catch {}
    }
    urgentOfferIdsRef.current = current;
  }, [urgentOffers]);
  const navigate = useCallback((next: Tab) => {
    if (needsProfile && next !== "profile") {
      setTab("profile");
      setMobileMenuOpen(false);
      return;
    }
    setTab(next);
    setMobileMenuOpen(false);
  }, [needsProfile]);

  useEffect(() => { if (!loading && needsProfile) setTab("profile"); }, [loading, needsProfile]);

  const navItems = [
    ["dashboard","Dashboard",Truck],
    ["shipments","Shipment",ShieldCheck],
    ["analytics","Analytics",BarChart3],
    ["help","Help",CircleHelp],
  ] as const;

  return <div className="log-page">
    <header className="log-header">
      <div className="log-header-inner">
        <button type="button" className="log-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)} aria-label="Open navigation"><Menu size={22}/></button>
        <button type="button" className="log-brand" onClick={() => navigate(needsProfile ? "profile" : "dashboard")}>
          <span className="log-brand-mark"><img src="/Khetlink_Logo.svg" alt="KhetLink Logo"/></span>
          <span><strong>KhetLink</strong><small>Farm Fresh • Smart Supply</small></span>
        </button>
        <nav className="log-top-nav" aria-label="Logistics navigation">
          {navItems.map(([id,label,Icon]) => <a href={`#${id}`} key={id} className={tab===id ? "active" : ""} onClick={e=>{e.preventDefault();navigate(id)}}><Icon size={14}/><span>{label}</span></a>)}
        </nav>
        <div className="log-header-spacer"/>
        <div className="log-header-actions">
          <div className="log-language-wrap">
            <button type="button" className="log-outline-button" onClick={() => setLanguageOpen(v=>!v)}><Languages size={15}/><span>{languageLabel(language)}</span><ChevronDown size={13}/></button>
            {languageOpen && <div className="log-language-menu">{LOG_LANGUAGES.map(([code,label])=><button type="button" key={code} onClick={()=>{setLanguageOpen(false);setLanguage(code);void api("/api/profile/me",{method:"PATCH",body:JSON.stringify({language:code})})}}>{label}{language===code?" ✓":""}</button>)}</div>}
          </div>
          <div className="log-notification-wrap">
            <button type="button" className="log-icon-btn" onClick={() => setNotificationOpen(v=>!v)} aria-label="Notifications"><Bell size={20}/>{notifications.filter(n=>!n.read).length>0&&<span className="log-notification-count">{notifications.filter(n=>!n.read).length>9?"9+":notifications.filter(n=>!n.read).length}</span>}</button>
            {notificationOpen && <div className="log-notification-dropdown"><div className="log-notification-head"><div><strong>Notifications</strong><small>{notifications.filter(n=>!n.read).length} unread</small></div><button type="button" onClick={()=>{void api("/api/notifications/read?role=LOGISTICS",{method:"DELETE"});setNotifications([]);setNotificationOpen(false)}}>Mark all read</button></div>{notifications.filter(n=>!n.read).length===0?<div className="log-notification-empty"><Bell size={25}/><p>No notifications yet.</p></div>:notifications.filter(n=>!n.read).slice(0,8).map(n=><div className="log-notification-item" key={n.id}><span><Check size={16}/></span><div><strong>{n.title}</strong><p>{n.message}</p></div></div>)}</div>}
          </div>
          <button type="button" className="log-profile-button" onClick={()=>navigate("profile")}><span className="log-avatar">{profile?.user?.profileImage?<img src={profile.user.profileImage} alt={name}/>:initials}</span><span className="log-profile-copy"><strong>{name}</strong><small>{({dashboard:"Dashboard",shipments:"Shipment",analytics:"Analytics",help:"Help",profile:"Profile"} as Record<string,string>)[tab]}</small></span><ChevronDown size={15}/></button>
        </div>
      </div>
    </header>
    {mobileMenuOpen && <button type="button" className="log-sidebar-backdrop" onClick={() => setMobileMenuOpen(false)} aria-label="Close navigation"/>}
    <div className="log-layout">
      <aside className={`log-sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="log-sidebar-mobile-header"><strong>Logistics Menu</strong><button type="button" className="log-sidebar-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close"><X size={20}/></button></div>
        <p className="log-sidebar-label">Workspace</p>
        <nav className="log-sidebar-nav">
          {navItems.map(([id,label,Icon]) => <button type="button" key={id} className={tab===id ? "active" : ""} onClick={() => navigate(id)}><Icon size={18}/><span>{label}</span></button>)}
        </nav>
      </aside>
      <main className="log-main">
        {tab !== "profile" && <div className="log-page-head"><div><span className="log-eyebrow">LOGISTICS OPERATIONS</span><h1>{tab === "dashboard" ? "Delivery command center" : ({shipments:"Shipment & Verification",analytics:"Analytics",help:"Help & Support"} as Record<string,string>)[tab]}</h1><p>{tab === "dashboard" ? "Track your capacity, nearby jobs and live delivery operations." : "KhetLink logistics operations connected to the shared order and shipment backend."}</p></div><div className="log-head-actions"><button className={`log-online ${online ? "on" : ""}`} onClick={toggleOnline} disabled={busy}><Power size={16}/>{online ? "Online" : "Offline"}</button><button className="log-refresh" onClick={refresh} disabled={loading}><RefreshCw size={16} className={loading ? "spin" : ""}/>Refresh</button></div></div>}
        {error && <div className="log-alert"><X size={17}/><span>{error}</span></div>}{notice && <div className="log-success"><Check size={17}/><span>{notice}</span></div>}

        {tab === "dashboard" && !needsProfile && <Dashboard profile={profile} online={online} offers={offers} accepted={accepted} urgentOffers={urgentOffers} mapRef={mapRef} setTab={setTab} accept={accept} decline={decline} navUrl={buildNavUrl} completed={completed} />}
        {tab === "shipments" && !needsProfile && <Shipments accepted={accepted} history={history} selectedHistoryId={selectedHistoryId} setSelectedHistoryId={setSelectedHistoryId} onVerify={(orderId, stage) => setVerify({orderId, stage})} emergencyCancel={emergencyCancel} navUrl={buildNavUrl} onRefresh={refresh} range={shipmentRange} setRange={setShipmentRange} from={shipmentFrom} to={shipmentTo} setFrom={setShipmentFrom} setTo={setShipmentTo} setNotice={setNotice} setError={setError} />}
        {tab === "analytics" && !needsProfile && <AnalyticsView analytics={analytics} from={from} to={to} setFrom={setFrom} setTo={setTo} range={analyticsRange} setRange={setAnalyticsRange} chartMode={analyticsChartMode} setChartMode={setAnalyticsChartMode} onRefresh={refresh} setNotice={setNotice} setError={setError}/>} 
        {tab === "help" && !needsProfile && <Help support={support} setSupport={setSupport} sendSupport={sendSupport} tickets={tickets} busy={busy}/>}
        {tab === "profile" && <ProfileEditor profile={profile} onSaved={refresh} locked={needsProfile} mapRef={profileMapRef} mapObject={profileMapObject} marker={profileMarker} online={online} onToggleOnline={toggleOnline} onRefresh={refresh} refreshing={loading} busy={busy} language={language} setLanguage={setLanguage}/>} 
      </main>
    </div>
    {verify && <VerifyModal verify={verify} code={code} setCode={setCode} qcPassed={qcPassed} setQcPassed={setQcPassed} qcNote={qcNote} setQcNote={setQcNote} busy={busy} onClose={() => setVerify(null)} onSubmit={submitVerify}/>} 
  </div>;
}

function Dashboard({profile,online,offers,accepted,urgentOffers,mapRef,setTab,accept,decline,navUrl,completed}:{profile:Profile|null;online:boolean;offers:Assignment[];accepted:Assignment[];urgentOffers:Assignment[];mapRef:React.RefObject<HTMLDivElement|null>;setTab:(t:Tab)=>void;accept:(id:string)=>void;decline:(id:string)=>void;navUrl:typeof buildNavUrl;completed:number}){
 return <>
  <div className="log-kpis"><Kpi icon={Gauge} label="Available capacity" value={`${Math.round(profile?.availableCapacityKg || 0).toLocaleString()} kg`} sub={profile ? `${profile.capacity} ${capacityUnitLabel(profile.capacityUnit)} max` : "Complete profile"}/><Kpi icon={Package} label="Delivery requests" value={String(offers.length)} sub={urgentOffers.length ? `${urgentOffers.length} urgent` : "No urgent requests"}/><Kpi icon={Truck} label="Active deliveries" value={String(accepted.length)} sub={online ? "You are online" : "You are offline"}/><Kpi icon={Check} label="Completed" value={String(completed)} sub="Selected analytics period"/></div>
  <div className="log-dashboard-top">
   <section className="log-card log-requests-card"><div className="log-card-head"><div><h2>Delivery requests</h2><p>Closest eligible drivers receive paid-order requests first.</p></div><span className="log-count-pill">{offers.length} requests</span></div><RequestTable offers={offers} accept={accept} decline={decline}/></section>
   <section className="log-card log-map-card"><div className="log-card-head"><div><h2>Live location & route</h2><p>{online ? "Your device location is being shared for dispatch." : "Go online and allow location access to receive nearby jobs."}</p></div><div className="log-location-state"><LocateFixed size={16}/>{online ? "Location active" : "Location paused"}</div></div><div className="log-map" ref={mapRef}>{!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY && <div className="log-map-overlay"><MapPin size={30}/><strong>Google Maps</strong><span>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the live map.</span></div>}</div></section>
  </div>
  <section className="log-card log-accepted-card"><div className="log-card-head"><div><h2>Accepted deliveries</h2><p>Active jobs assigned to your vehicle.</p></div><button className="log-text-btn" onClick={() => setTab("shipments")}>Open shipment <ChevronRight size={16}/></button></div><AcceptedTable accepted={accepted} navUrl={buildNavUrl}/></section>
 </>;
}
function Kpi({icon:Icon,label,value,sub}:{icon:any;label:string;value:string;sub:string}){return <div className="log-kpi"><div className="log-kpi-icon"><Icon size={19}/></div><span>{label}</span><strong>{value}</strong><small>{sub}</small></div>}
function Requests({offers,accept,decline}:{offers:Assignment[];accept:(id:string)=>void;decline:(id:string)=>void}){return <section className="log-card"><div className="log-card-head"><div><h2>All delivery requests</h2><p>New requests expire after two minutes and are rerouted automatically.</p></div></div><RequestTable offers={offers} accept={accept} decline={decline}/></section>}
function RequestTable({offers,accept,decline}:{offers:Assignment[];accept:(id:string)=>void;decline:(id:string)=>void}){
 if(!offers.length)return <Empty icon={Package} title="No delivery requests" text="Paid orders with an eligible route and available capacity will appear here."/>;
 return <div className="log-table-wrap log-request-table-wrap"><table className="log-table log-request-table"><thead><tr><th>Order ID</th><th>Route</th><th>Required by</th><th>Buyer / Farmer</th><th>Load</th><th>Items</th><th>Delivery fee</th><th>Action</th></tr></thead><tbody>{offers.map(o=>{const urgent=Boolean(o.expiresAt && new Date(o.expiresAt).getTime()-Date.now()<60000);return <tr key={o.id} className={urgent?"urgent-row":""}><td><strong className="log-order-id">{orderDisplayId(o.order)}</strong>{urgent&&<div className="log-urgent-badge"><span className="log-urgent-shine"/>Urgent request</div>}</td><td><strong>{o.order.shipment?.pickupLocation||"Pickup"}</strong><span className="log-route-arrow">→</span><strong>{o.order.shipment?.deliveryLocation||"Dropoff"}</strong><small>{o.distanceToPickupKm != null ? `${o.distanceToPickupKm.toFixed(1)} km from you` : "Distance unavailable"}</small></td><td>{o.order.shipment?.requiredBy?new Date(o.order.shipment.requiredBy).toLocaleString("en-IN",{day:"2-digit",month:"short",hour:"2-digit",minute:"2-digit"}):"—"}</td><td><strong>{o.order.buyer?.roles?.[0]?.roleCode||"—"}</strong><small>Buyer</small><strong>{o.order.seller?.roles?.[0]?.roleCode||"—"}</strong><small>Farmer</small></td><td><strong>{Math.round(o.loadKg).toLocaleString()} kg</strong></td><td>{o.order.items.map(i=><span className="log-item-line" key={`${i.product.name}-${i.unit}`}>{i.product.name} · {i.quantity} {i.unit}</span>)}</td><td><strong>{money(o.fee)}</strong></td><td><div className="log-row-actions"><button className="log-accept" onClick={()=>accept(o.id)}><Check size={15}/>Accept</button><button className="log-decline" onClick={()=>decline(o.id)}><X size={15}/>Decline</button></div></td></tr>})}</tbody></table></div>
}
function Orders({accepted,emergencyCancel,navUrl}:{accepted:Assignment[];emergencyCancel:(id:string)=>void;navUrl:typeof buildNavUrl}){return <section className="log-card"><div className="log-card-head"><div><h2>Accepted orders</h2><p>Buyer and farmer contact details are available only while the delivery is active.</p></div></div><AcceptedTable accepted={accepted} navUrl={buildNavUrl} emergencyCancel={emergencyCancel}/></section>}
function AcceptedTable({accepted,navUrl,emergencyCancel}:{accepted:Assignment[];navUrl:typeof buildNavUrl;emergencyCancel?:(id:string)=>void}){if(!accepted.length)return <Empty icon={Truck} title="No active deliveries" text="Accepted delivery assignments will appear here."/>;return <div className="log-table-wrap"><table className="log-table"><thead><tr><th>Order</th><th>Buyer</th><th>Farmer</th><th>Route</th><th>Load</th><th>Fee</th><th>Actions</th></tr></thead><tbody>{accepted.map(a=><tr key={a.id}><td><strong>{orderDisplayId(a.order)}</strong><br/><span>{a.order.shipment?.status}</span></td><td>{a.order.buyer.firstName} {a.order.buyer.lastName}<br/><a href={`tel:${a.order.buyer.phone}`} className="log-phone"><Phone size={13}/>{a.order.buyer.phone}</a></td><td>{a.order.seller.firstName} {a.order.seller.lastName}<br/><a href={`tel:${a.order.seller.phone}`} className="log-phone"><Phone size={13}/>{a.order.seller.phone}</a></td><td>{a.order.shipment?.pickupLocation||"Pickup"}<br/>→ {a.order.shipment?.deliveryLocation||"Dropoff"}</td><td>{Math.round(a.loadKg).toLocaleString()} kg</td><td>{money(a.fee)}</td><td><div className="log-row-actions"><a className="log-nav-btn" target="_blank" rel="noreferrer" href={navUrl(a.order.shipment?.currentLat,a.order.shipment?.currentLng,a.order.shipment?.pickupLat,a.order.shipment?.pickupLng)}><Navigation size={15}/>Navigate</a>{emergencyCancel&&<button className="log-danger" onClick={()=>emergencyCancel(a.order.id)}>Emergency cancel</button>}</div></td></tr>)}</tbody></table></div>}
function Shipments({accepted,history,selectedHistoryId,setSelectedHistoryId,onVerify,emergencyCancel,navUrl,onRefresh,range,setRange,from,to,setFrom,setTo,setNotice,setError}:{accepted:Assignment[];history:Assignment[];selectedHistoryId:string;setSelectedHistoryId:(id:string)=>void;onVerify:(id:string,s:Stage)=>void;emergencyCancel:(id:string)=>void;navUrl:typeof buildNavUrl;onRefresh:()=>void;range:"week"|"month"|"custom";setRange:(x:"week"|"month"|"custom")=>void;from:string;to:string;setFrom:(x:string)=>void;setTo:(x:string)=>void;setNotice:(x:string)=>void;setError:(x:string)=>void}){
 const totalEarned=history.reduce((sum,a)=>sum+Number(a.fee||0)*0.95,0);
 const totalDistance=history.reduce((sum,a)=>sum+Number(a.order.shipment?.distanceKm||0),0);
 const filteredHistory=history.filter(a=>{const d=new Date(a.order.shipment?.dropoffVerifiedAt||a.acceptedAt||a.offeredAt).getTime();const start=new Date(`${from}T00:00:00`).getTime();const end=new Date(`${to}T23:59:59.999`).getTime();return d>=start&&d<=end;});
 const selected=history.find(a=>a.id===selectedHistoryId);
 const applyRange=(next:"week"|"month"|"custom")=>{setRange(next);if(next==="custom")return;const now=new Date();const start=new Date(now);if(next==="week"){const offset=(now.getDay()+6)%7;start.setDate(now.getDate()-offset);}else start.setDate(1);setFrom(start.toISOString().slice(0,10));setTo(now.toISOString().slice(0,10));};
 return <div className="log-shipment-page">
  <div className="log-kpis"><Kpi icon={Package} label="Active delivery requests" value={String(accepted.length)} sub="Currently assigned"/><Kpi icon={Check} label="Completed delivery requests" value={String(history.length)} sub="All completed deliveries"/><Kpi icon={Gauge} label="Total earned" value={money(totalEarned)} sub="After 5% platform deduction"/><Kpi icon={Route} label="Total distance covered" value={`${totalDistance.toFixed(1)} km`} sub="Completed delivery routes"/></div>
  <div className="log-shipment-toolbar log-card"><div><span className="log-eyebrow">SHIPMENT CONTROL</span><h2>Active orders & delivery history</h2><p>Complete pickup, quality check and dropoff in sequence. Completed deliveries move automatically to history.</p></div><div className="log-shipment-toolbar-actions"><button className="log-outline-button" disabled={!selected} onClick={()=>{if(!selected)return;try{exportDeliveryPdf(history,selected);setNotice("Delivery PDF exported successfully.");window.setTimeout(()=>setNotice(""),2500);}catch(e){setError(e instanceof Error?e.message:"Unable to export delivery PDF.")}}}>Export Delivery PDF</button><button className="log-outline-button" disabled={!history.length} onClick={()=>{if(!history.length)return;try{exportDeliveryPdf(history);setNotice("All delivery PDFs exported successfully.");window.setTimeout(()=>setNotice(""),2500);}catch(e){setError(e instanceof Error?e.message:"Unable to export delivery PDFs.")}}}>All Delivery PDF</button><button className="log-refresh" onClick={onRefresh}><RefreshCw size={15}/>Refresh</button></div></div>
  <section className="log-card"><div className="log-card-head"><div><h2>Active deliveries</h2><p>Pickup → quality check → dropoff.</p></div></div><div className="log-shipment-grid">{accepted.length?accepted.map(a=><article className="log-shipment-card" key={a.id}><div className="log-shipment-top"><div><span className="log-order-chip">{orderDisplayId(a.order)}</span><h3>{a.order.items.map(i=>i.product.name).join(", ")}</h3><p>{Math.round(a.loadKg)} kg · {money(a.fee)}</p></div><span className={`log-status status-${(a.order.shipment?.status||"").toLowerCase()}`}>{a.order.shipment?.status}</span></div><div className="log-route-steps"><Step done={!!a.order.shipment?.pickupVerifiedAt} title="Farmer pickup"/><Step done={a.order.shipment?.qcStatus==="PASSED"} failed={a.order.shipment?.qcStatus==="FAILED"} title="Quality check"/><Step done={!!a.order.shipment?.dropoffVerifiedAt} title="Buyer dropoff"/></div>{a.order.shipment?.returnRequired&&<div className="log-qc-fail">QC failed. Shipment remains pending until the required return workflow is completed.</div>}<div className="log-shipment-actions"><a className="log-nav-btn" target="_blank" rel="noreferrer" href={navUrl(a.order.shipment?.currentLat,a.order.shipment?.currentLng,a.order.shipment?.pickupLat,a.order.shipment?.pickupLng)}><Navigation size={15}/>Navigate</a>{a.order.shipment?.status==="CONFIRMED"&&<button className="log-accept" onClick={()=>onVerify(a.order.id,"PICKUP")}>Verify pickup</button>}{a.order.shipment?.status==="PROCESSING"&&<button className="log-accept" onClick={()=>onVerify(a.order.id,"QC")}>Open quality check</button>}{a.order.shipment?.status==="IN_TRANSIT"&&<button className="log-accept" onClick={()=>onVerify(a.order.id,"DROPOFF")}>Verify dropoff</button>}<button className="log-danger" onClick={()=>emergencyCancel(a.order.id)}>Emergency cancel</button></div></article>):<Empty icon={ShieldCheck} title="No active shipment" text="Accepted deliveries will appear here after a delivery request is accepted."/>}</div></section>
  <section className="log-card"><div className="log-card-head"><div><span className="log-eyebrow">COMPLETED DELIVERIES</span><h2>Delivery history</h2><p>Select one completed delivery for an individual PDF export.</p></div><div className="log-shipment-history-controls"><div className="log-range-buttons"><button className={range==="week"?"active":""} onClick={()=>applyRange("week")}>This Week</button><button className={range==="month"?"active":""} onClick={()=>applyRange("month")}>This Month</button><button className={range==="custom"?"active":""} onClick={()=>applyRange("custom")}>Custom</button></div>{range === "custom" && <div className="log-filter"><input type="date" value={from} onChange={e=>{setFrom(e.target.value);setRange("custom")}}/><span>to</span><input type="date" value={to} onChange={e=>{setTo(e.target.value);setRange("custom")}}/></div>}</div></div>{filteredHistory.length?<div className="log-table-wrap"><table className="log-table log-history-table"><thead><tr><th>Select</th><th>Order ID</th><th>Items</th><th>Pickup</th><th>Dropoff</th><th>Load</th><th>Distance</th><th>Fee earned</th><th>Completed</th></tr></thead><tbody>{filteredHistory.map(a=><tr key={a.id} className={selectedHistoryId===a.id?"selected-history-row":""}><td><input type="radio" name="delivery-history" checked={selectedHistoryId===a.id} onChange={()=>setSelectedHistoryId(a.id)} aria-label={`Select ${orderDisplayId(a.order)}`}/></td><td><strong>{orderDisplayId(a.order)}</strong></td><td>{a.order.items.map(i=><span className="log-item-line" key={`${a.id}-${i.product.name}`}>{i.product.name} · {i.quantity} {i.unit}</span>)}</td><td>{a.order.shipment?.pickupLocation||"—"}</td><td>{a.order.shipment?.deliveryLocation||"—"}</td><td>{Math.round(a.loadKg).toLocaleString()} kg</td><td>{Number(a.order.shipment?.distanceKm||0).toFixed(1)} km</td><td>{money(Number(a.fee||0)*0.95)}</td><td>{a.order.shipment?.dropoffVerifiedAt?new Date(a.order.shipment.dropoffVerifiedAt).toLocaleString("en-IN"):"—"}</td></tr>)}</tbody></table></div>:<Empty icon={Check} title="No completed deliveries in this period" text="Completed deliveries will appear here after successful buyer dropoff verification."/>}</section>
 </div>
}
function Step({done,failed,title}:{done:boolean;failed?:boolean;title:string}){return <div className={`log-step ${done?"done":""} ${failed?"failed":""}`}><span>{failed?<X size={14}/>:done?<Check size={14}/>:<Clock3 size={14}/>}</span><small>{title}</small></div>}
function AnalyticsView({analytics,from,to,setFrom,setTo,range,setRange,chartMode,setChartMode,onRefresh,setNotice,setError}:{analytics:Analytics|null;from:string;to:string;setFrom:(x:string)=>void;setTo:(x:string)=>void;range:"week"|"month"|"custom";setRange:(x:"week"|"month"|"custom")=>void;chartMode:ChartMode;setChartMode:(x:ChartMode)=>void;onRefresh:()=>void;setNotice:(x:string)=>void;setError:(x:string)=>void}){
 const itemData=Object.entries(analytics?.itemTypes||{}).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([name,value])=>({name,value:Number(value||0)}));
 const pickupData=Object.entries(analytics?.pickupPlaces||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value:Number(value||0)}));
 const dropoffData=Object.entries(analytics?.dropoffPlaces||{}).sort((a,b)=>b[1]-a[1]).slice(0,6).map(([name,value])=>({name,value:Number(value||0)}));
 const frequencyData=Object.entries(analytics?.deliveriesByDate||{}).map(([name,value])=>({name,value:Number(value||0)}));
 const applyRange=(next:"week"|"month"|"custom")=>{setRange(next);if(next==="custom")return;const now=new Date();const start=new Date(now);if(next==="week"){const offset=(now.getDay()+6)%7;start.setDate(now.getDate()-offset);}else start.setDate(1);setFrom(start.toISOString().slice(0,10));setTo(now.toISOString().slice(0,10));};
 const chart=(data:{name:string;value:number}[],label:string)=><div className="log-chart-container">{data.length?(chartMode==="bar"?<ResponsiveContainer width="100%" height="100%"><BarChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={65}/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Bar dataKey="value" name={label} fill="#087a43" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>:chartMode==="line"?<ResponsiveContainer width="100%" height="100%"><LineChart data={data}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" angle={-18} textAnchor="end" interval={0} height={65}/><YAxis allowDecimals={false}/><Tooltip/><Legend/><Line type="monotone" dataKey="value" name={label} stroke="#087a43" strokeWidth={3} dot={{r:4}}/></LineChart></ResponsiveContainer>:<ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="45%" outerRadius="70%" label>{data.map((_,i)=><Cell key={i} fill={["#087a43","#9edc55","#f2b84b","#3983cf","#a78bfa","#ed8759","#0f766e","#d53b39"][i%8]}/>)}</Pie><Tooltip/><Legend/></PieChart></ResponsiveContainer>):<Empty icon={BarChart3} title={`No ${label.toLowerCase()} data`} text="Completed deliveries will populate this chart."/>}</div>;
 return <div className="log-analytics-page">
  <div className="log-page-heading"><div><p className="log-eyebrow">ANALYTICS</p><h1>Delivery Analytics</h1><p>Understand your delivery volume, item quantities, distance and delivery earnings.</p></div><div className="log-head-actions"><button className="log-outline-button" onClick={onRefresh}><RefreshCw size={16}/>Refresh</button><button className="log-save-btn" onClick={()=>{try{exportAnalyticsPdf(analytics,from,to);setNotice("Analytics PDF exported successfully.");window.setTimeout(()=>setNotice(""),2500);}catch(e){setError(e instanceof Error?e.message:"Unable to export analytics PDF.")}}}>Export Analytics PDF</button></div></div>
  <div className="log-range-bar log-card"><div className="log-range-buttons"><button type="button" className={range==="week"?"active":""} onClick={()=>applyRange("week")}>This Week</button><button type="button" className={range==="month"?"active":""} onClick={()=>applyRange("month")}>This Month</button><button type="button" className={range==="custom"?"active":""} onClick={()=>applyRange("custom")}>Custom</button></div>{range === "custom" && <div className="log-filter"><input aria-label="Start date" type="date" value={from} onChange={e=>{setFrom(e.target.value);setRange("custom")}}/><span>to</span><input aria-label="End date" type="date" value={to} onChange={e=>{setTo(e.target.value);setRange("custom")}}/></div>}</div>
  <div className="log-kpis"><Kpi icon={Check} label="Completed deliveries" value={String(analytics?.completed||0)} sub={range==="week"?"This week":range==="month"?"This month":"Custom date range"}/><Kpi icon={Package} label="Quantity delivered" value={`${Math.round(analytics?.quantityKg||0).toLocaleString()} kg`} sub="Normalized load"/><Kpi icon={Route} label="Distance travelled" value={`${(analytics?.distanceKm||0).toFixed(1)} km`} sub="Completed routes"/><Kpi icon={Gauge} label="Net earnings" value={money(analytics?.earnings||0)} sub="After 5% deduction"/></div>
  <section className="log-card log-analytics-chart-card"><div className="log-card-head"><div><h2>Items delivered & quantity</h2><p>Quantity moved by product type.</p></div><div className="log-chart-modes">{(["bar","pie","line"] as ChartMode[]).map(mode=><button type="button" key={mode} className={chartMode===mode?"active":""} onClick={()=>setChartMode(mode)}>{mode==="bar"?"Bar":mode==="pie"?"Pie":"Line"}</button>)}</div></div>{chart(itemData,"Quantity (kg)")}</section>
  <div className="log-analytics-two-col"><section className="log-card log-analytics-chart-card"><div className="log-card-head"><div><h2>Frequently visited pickup places</h2><p>Completed pickup locations.</p></div></div>{chart(pickupData,"Deliveries")}</section><section className="log-card log-analytics-chart-card"><div className="log-card-head"><div><h2>Frequently visited dropoff places</h2><p>Completed buyer delivery locations.</p></div></div>{chart(dropoffData,"Deliveries")}</section></div>
  <section className="log-card log-analytics-chart-card"><div className="log-card-head"><div><h2>Delivery frequency</h2><p>Number of completed deliveries over the selected period.</p></div></div>{chart(frequencyData,"Completed deliveries")}</section>
 </div>;
}

function exportAnalyticsPdf(analytics:Analytics|null,from:string,to:string){
 const doc=new jsPDF({unit:"mm",format:"a4"}); const w=doc.internal.pageSize.getWidth(); const m=16;
 doc.setFillColor(13,104,50); doc.roundedRect(m,14,w-m*2,24,4,4,"F"); doc.setTextColor(255,255,255); doc.setFont("helvetica","bold"); doc.setFontSize(18); doc.text("KhetLink",m+8,25); doc.setFontSize(9); doc.text("LOGISTICS ANALYTICS REPORT",m+8,32);
 let y=50; doc.setTextColor(13,104,50); doc.setFontSize(12); doc.text("PERIOD",m,y); doc.setTextColor(40,50,44); doc.setFont("helvetica","normal"); doc.setFontSize(9); doc.text(`${from} to ${to}`,m+25,y); y+=13;
 const values=[["Completed deliveries",String(analytics?.completed||0)],["Quantity delivered",`${Math.round(analytics?.quantityKg||0).toLocaleString()} kg`],["Distance travelled",`${(analytics?.distanceKm||0).toFixed(1)} km`],["Net earnings",money(analytics?.earnings||0)]];
 values.forEach(([l,v])=>{doc.setDrawColor(230,235,232);doc.roundedRect(m,y,w-m*2,15,2,2,"S");doc.setTextColor(100,108,103);doc.setFontSize(8);doc.text(l,m+5,y+9);doc.setTextColor(13,104,50);doc.setFont("helvetica","bold");doc.setFontSize(10);doc.text(v,w-m-5,y+9,{align:"right"});doc.setFont("helvetica","normal");y+=19;});
 y+=4; doc.setTextColor(13,104,50);doc.setFont("helvetica","bold");doc.setFontSize(11);doc.text("ITEM QUANTITIES",m,y);y+=8; Object.entries(analytics?.itemTypes||{}).slice(0,12).forEach(([name,value])=>{doc.setTextColor(55,65,59);doc.setFontSize(8);doc.text(String(name),m,y);doc.text(`${Math.round(Number(value))} kg`,w-m,y,{align:"right"});y+=7;if(y>270){doc.addPage();y=20;}});
 doc.setTextColor(120,126,122);doc.setFontSize(8);doc.text("Net earnings are calculated after the 5% KhetLink platform deduction.",m,285);
 doc.save(`khetlink-logistics-analytics-${to||new Date().toISOString().slice(0,10)}.pdf`);
}
function Help({support,setSupport,sendSupport,tickets,busy}:{support:{subject:string;message:string};setSupport:React.Dispatch<React.SetStateAction<{subject:string;message:string}>>;sendSupport:(event:React.FormEvent)=>Promise<void>;tickets:Array<{id:string;subject:string;message:string;status:string;createdAt:string}>;busy:boolean}){
 return <div className="log-help-page log-buyer-parity-page">
  <div className="log-page-heading"><div><p className="log-eyebrow">HELP & SUPPORT</p><h1>How can we help?</h1><p>Follow the process and contact KhetLink support when something needs attention.</p></div></div>
  <div className="log-help-grid log-help-process-grid">
   <section className="log-card log-help-card log-help-process-card"><h2>How Logistics deliveries work</h2>{[
    "Accept an eligible paid-order delivery request from the dashboard.",
    "Reach the farmer pickup location and enter the farmer’s 4-character code.",
    "Reach the quality-check location, currently the buyer location, and complete QC.",
    "Reach the buyer dropoff location and enter the buyer’s 4-character delivery code.",
    "After successful dropoff verification, the shipment becomes DELIVERED and moves to history."
   ].map((text,index)=><div className="log-help-step" key={text}><span>{index+1}</span><p>{text}</p></div>)}</section>
   <section className="log-card log-help-card log-help-process-card"><h2>How Shipment works</h2>{[
    "Open Shipment to see active delivery verification and completed delivery history.",
    "After accepting a request, complete pickup, quality check and dropoff in the required sequence.",
    "Use the correct farmer and buyer 4-character codes; the backend validates the order and location.",
    "Completed deliveries move automatically from Active deliveries into Delivery history.",
    "If anything looks incorrect, report the issue through Contact Support."
   ].map((text,index)=><div className="log-help-step" key={text}><span>{index+1}</span><p>{text}</p></div>)}</section>
  </div>
  <section className="log-card log-support-card"><div className="log-section-heading"><div><span>Need assistance?</span><h2>Contact Support</h2></div><Phone size={20}/></div><p>Report a discrepancy, issue or message. Your support request is stored in the backend.</p><form onSubmit={sendSupport} className="log-support-form"><input value={support.subject} onChange={e=>setSupport(current=>({...current,subject:e.target.value}))} placeholder="Subject"/><textarea value={support.message} onChange={e=>setSupport(current=>({...current,message:e.target.value}))} placeholder="Describe the issue"/><button type="submit" className="log-primary-button" disabled={busy}>{busy ? <RefreshCw className="spin" size={16}/> : <Send size={16}/>} Contact Support</button></form></section>
  <section className="log-card log-support-tickets"><div className="log-section-heading"><div><span>Backend records</span><h2>My support tickets</h2></div></div>{tickets.length ? tickets.map(ticket=><div className="log-support-ticket" key={ticket.id}><div><strong>{ticket.subject}</strong><small>{ticket.message}</small></div><span>{ticket.status}</span><time>{new Date(ticket.createdAt).toLocaleString("en-IN")}</time></div>) : <div className="log-empty-text">No support tickets yet.</div>}</section>
 </div>
}

function ProfileEditor({profile,onSaved,locked,mapRef,mapObject,marker,online,onToggleOnline,onRefresh,refreshing,busy,language,setLanguage}:{profile:Profile|null;onSaved:()=>void;locked:boolean;mapRef:React.RefObject<HTMLDivElement|null>;mapObject:React.MutableRefObject<any>;marker:React.MutableRefObject<any>;online:boolean;onToggleOnline:()=>void;onRefresh:()=>void;refreshing:boolean;busy:boolean;language:string;setLanguage:(value:string)=>void}){
  const [form,setForm]=useState(()=>profileForm(profile));
  const [saving,setSaving]=useState(false);
  const [locating,setLocating]=useState(false);
  const [editing,setEditing]=useState(locked);
  const profileIdentityRef = useRef<string | null>(null);
  const [locationQuery,setLocationQuery]=useState(profile?.user?.location||"");
  const [suggestions,setSuggestions]=useState<Array<{display_name:string;secondary_text?:string;lat?:string;lon?:string;place_id:string}>>([]);
  const [searching,setSearching]=useState(false);
  useEffect(()=>{
    const nextId = profile?.id || null;
    if (nextId !== profileIdentityRef.current) {
      profileIdentityRef.current = nextId;
      setForm(profileForm(profile));
      setLocationQuery(profile?.user?.location || "");
      setSuggestions([]);
    } else if (!editing) {
      setForm(profileForm(profile));
      setLocationQuery(profile?.user?.location || "");
    }
    if (locked) setEditing(true);
  },[profile,locked,editing]);
  useEffect(()=>{
    if(!editing || locationQuery.trim().length<3){ setSuggestions([]); return; }
    const controller=new AbortController();
    const timer=window.setTimeout(async()=>{setSearching(true);try{setSuggestions(await searchLogisticsLocations(locationQuery,controller.signal));}catch{}finally{setSearching(false)}},350);
    return()=>{window.clearTimeout(timer);controller.abort()};
  },[locationQuery,editing]);
  const field=(key:string)=>(e:any)=>setForm((f:any)=>({...f,[key]:e.target.value}));
  const handleImage=(e:any)=>{const file=e.target.files?.[0];if(!file)return;if(!file.type.startsWith("image/")){alert("Please select an image file.");return;}const reader=new FileReader();reader.onload=()=>setForm((f:any)=>({...f,profileImage:String(reader.result)}));reader.readAsDataURL(file)};
  const chooseLocation=async(item:{place_id:string;display_name:string;secondary_text?:string;lat?:string;lon?:string})=>{try{let location=item.display_name,latitude=item.lat?Number(item.lat):null,longitude=item.lon?Number(item.lon):null;if((latitude==null||longitude==null)&&item.place_id.startsWith("google:")){const details=await getGoogleLogisticsPlace(item.place_id.slice(7));location=details.display_name||location;latitude=details.lat;longitude=details.lon}setLocationQuery(location);setSuggestions([]);setForm((f:any)=>({...f,location,latitude,longitude}));}catch{alert("Unable to resolve that location. Please try another result.")}};
  const useCurrentLocation=()=>{if(!navigator.geolocation){alert("Live location is not supported by this browser.");return}setLocating(true);navigator.geolocation.getCurrentPosition(async p=>{const latitude=p.coords.latitude,longitude=p.coords.longitude;let location=locationQuery||form.location;try{location=await reverseLogisticsLocation(latitude,longitude)}catch{}setLocationQuery(location);setSuggestions([]);setForm((f:any)=>({...f,latitude,longitude,location}));setLocating(false)},()=>{setLocating(false);alert("Location permission was not granted.")},{enableHighAccuracy:true,timeout:12000,maximumAge:30000})};
  const save=async()=>{if(!form.vehicleType||!form.vehicleNumber||!form.experience||Number(form.capacity)<=0){alert("Please complete vehicle, capacity, experience and location details.");return}if(!form.location||form.latitude==null||form.longitude==null){alert("Please select a location or use current location before saving.");return}setSaving(true);const r=await api("/api/logistics/profile",{method:"PUT",body:JSON.stringify(form)});const d=await r.json().catch(()=>({}));setSaving(false);if(!r.ok){alert(d.error||"Unable to save profile");return}setEditing(false);onSaved()};
  const cancel=()=>{setForm(profileForm(profile));setLocationQuery(profile?.user?.location||"");setSuggestions([]);setEditing(false)};
  const name=`${profile?.user?.firstName||""} ${profile?.user?.lastName||""}`.trim()||"Logistics Provider";const initials=name.split(" ").map(x=>x[0]).join("").slice(0,2).toUpperCase();
  useEffect(()=>{
    if(!mapRef.current || mapObject.current || typeof window === "undefined") return;
    let cancelled=false;
    void loadLogisticsMaps().then(()=>{
      if(cancelled || !mapRef.current || mapObject.current) return;
      const g=(window as any).google;
      if(!g?.maps) return;
      const lat=form.latitude ?? 20.5937;
      const lng=form.longitude ?? 78.9629;
      mapObject.current=new g.maps.Map(mapRef.current,{
        center:{lat,lng},
        zoom:form.latitude != null && form.longitude != null ? 14 : 5,
        mapTypeControl:false,
        streetViewControl:false,
      });
      marker.current=new g.maps.Marker({
        map:mapObject.current,
        position:{lat,lng},
        title:"Your logistics location",
      });
    }).catch(()=>{});
    return()=>{
      cancelled=true;
      mapObject.current=null;
      marker.current=null;
    };
  },[mapRef,mapObject,marker]);

  useEffect(()=>{
    if(!mapObject.current || form.latitude == null || form.longitude == null) return;
    const position={lat:form.latitude,lng:form.longitude};
    marker.current?.setPosition(position);
    mapObject.current.setCenter(position);
    mapObject.current.setZoom(14);
  },[form.latitude,form.longitude]);
  return <div className="log-profile-page">
    <div className="log-page-head"><div><span className="log-eyebrow">ACCOUNT</span><h1>Profile</h1><p>Manage your centralized identity and Logistics provider details.</p></div><div className="log-profile-head-actions"><button className={`log-online ${online ? "on" : ""}`} onClick={onToggleOnline} disabled={busy}><Power size={16}/>{online ? "Online" : "Offline"}</button><button className="log-refresh" onClick={onRefresh} disabled={refreshing}><RefreshCw size={16} className={refreshing ? "spin" : ""}/>Refresh</button>{!locked&&!editing&&<button className="log-save-btn" onClick={()=>setEditing(true)}><Pencil size={15}/>Edit profile</button>}</div></div>
    {locked&&<div className="log-profile-required"><ShieldCheck size={18}/><div><strong>Complete your profile first</strong><span>Dashboard, delivery requests, orders, shipment verification and analytics unlock after your vehicle, capacity, experience and location are saved.</span></div></div>}
    <section className="log-profile-cover">
      <div className="log-profile-avatar-section"><div className="log-profile-avatar">{form.profileImage?<img src={form.profileImage} alt={name}/>:initials}</div>{editing&&<label className="log-profile-upload"><Pencil size={15}/>Upload Photo<input type="file" accept="image/*" onChange={handleImage}/></label>}</div>
      <div className="log-profile-identity"><span className="log-verified-pill"><Check size={12}/>Verified Logistics Provider</span><h2>{name}</h2><p>Logistics ID: <strong>{logisticsProviderId(profile)}</strong></p><small>{form.vehicleType||"Vehicle details pending"}</small></div>
      <div className="log-profile-stat"><strong>{Number(profile?.rating || 0).toFixed(1)}<span className="log-rating-star">★</span></strong><span>Provider Rating · {profile?.reviews || 0} Reviews</span></div>
    </section>
    <section className="log-profile-grid">
      <article className="log-card log-profile-form-card"><div className="log-card-head"><div><span className="log-eyebrow">PERSONAL & LOGISTICS INFORMATION</span><h2>Profile details</h2></div></div>
        <div className="log-profile-form">
          <label>First name<input value={profile?.user?.firstName||""} disabled readOnly/></label>
          <label>Phone<input value={form.phone||""} type="tel" disabled readOnly/></label>
          <label>Email<input value={profile?.user?.email||""} type="email" disabled readOnly/></label>
          <label>Language<select value={language} onChange={e=>{setLanguage(e.target.value);void api("/api/profile/me",{method:"PATCH",body:JSON.stringify({language:e.target.value})})}}>{LOG_LANGUAGES.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
          <label>Vehicle type<input value={form.vehicleType} onChange={field("vehicleType")} placeholder="Truck / Mini truck / Van" readOnly={!editing}/></label>
          <label>Vehicle number<input value={form.vehicleNumber} onChange={field("vehicleNumber")} placeholder="WB-00-XX-0000" readOnly={!editing}/></label>
          <label>Experience<input value={form.experience} onChange={field("experience")} placeholder="e.g. 5 years" readOnly={!editing}/></label>
          <label>Maximum load capacity<div className="log-inline"><input type="number" min="0" value={form.capacity} onChange={e=>setForm({...form,capacity:Number(e.target.value)})} readOnly={!editing}/><select value={form.capacityUnit} onChange={field("capacityUnit")} disabled={!editing}><option value="KG">Kg</option><option value="QUINTAL">Quintal</option><option value="TON">Ton</option><option value="LITRE">Litre</option></select></div></label>
        </div>
        <div className="log-profile-location"><div className="log-card-head"><div><span className="log-eyebrow">PROVIDER LOCATION</span><h2>Location</h2></div></div><div className={`log-location-editor ${editing?"editing":""}`}><Search size={16}/><input value={locationQuery} onChange={e=>{setLocationQuery(e.target.value);setForm({...form,location:e.target.value,latitude:null,longitude:null})}} placeholder="Search city, area or address" readOnly={!editing}/>{editing&&<button type="button" className="log-location-current-button" title="Use current location" aria-label="Use current location" onClick={useCurrentLocation} disabled={locating}>{locating?<RefreshCw size={15} className="spin"/>:<MapPin size={16}/>}</button>}</div>{editing&&(searching||suggestions.length>0)&&<div className="log-location-suggestions">{searching&&<div className="log-location-suggestion-muted">Searching locations…</div>}{suggestions.map(item=><button type="button" key={item.place_id} onClick={()=>void chooseLocation(item)}><MapPin size={15}/><span><strong>{item.display_name}</strong>{item.secondary_text&&<small>{item.secondary_text}</small>}</span></button>)}</div>}<p className="log-location-note">Your selected coordinates are saved with the logistics profile and used for dispatch.</p></div>
        {editing&&<label className="log-check"><input type="checkbox" checked={Boolean(form.locationTrackingEnabled)} onChange={e=>setForm({...form,locationTrackingEnabled:e.target.checked})}/><span><strong>Allow live location tracking</strong><small>Required for nearest-driver dispatch and live shipment tracking.</small></span></label>}
        {editing&&<div className="log-profile-actions"><button className="log-decline" onClick={cancel} disabled={saving}>Cancel</button><button className="log-save-btn" onClick={save} disabled={saving}><Save size={15}/>{saving?"Saving…":"Save changes"}</button></div>}
      </article>
      <aside className="log-card log-profile-side-card"><div className="log-card-head"><div><span className="log-eyebrow">ACCOUNT OVERVIEW</span><h2>Provider details</h2></div><UserCircle size={18}/></div><div className="log-profile-info-list"><div><span><UserCircle size={14}/></span><div><small>Logistics ID</small><strong>{logisticsProviderId(profile)}</strong></div></div><div><span><Phone size={14}/></span><div><small>Phone</small><strong>{form.phone||"Not added"}</strong></div></div><div><span><Settings size={14}/></span><div><small>Email</small><strong>{form.email||profile?.user?.email||"Not added"}</strong></div></div><div><span><Truck size={14}/></span><div><small>Vehicle</small><strong>{form.vehicleType||"Not added"}</strong></div></div><div><span><MapPin size={14}/></span><div><small>Location</small><strong>{form.location||"Not added"}</strong></div></div><div><span><Settings size={14}/></span><div><small>Account Type</small><strong>Logistics Provider</strong></div></div></div><div className="log-profile-map-wrap"><div><span>Provider location map</span><MapPin size={15}/></div><div className="log-profile-map" ref={mapRef}>{!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY&&<div><MapPin size={28}/><span>Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to show the map.</span></div>}</div></div></aside>
    </section>
  </div>;
}
function profileForm(p:Profile|null){return {capacity:p?.capacity||0,capacityUnit:p?.capacityUnit||"KG" as CapacityUnit,vehicleType:p?.vehicleType||"",vehicleNumber:p?.vehicleNumber||"",experience:p?.experience||"",profileImage:p?.user?.profileImage||"",phone:p?.user?.phone||"",email:p?.user?.email||"",location:p?.user?.location||"",latitude:p?.currentLat??null,longitude:p?.currentLng??null,locationTrackingEnabled:p?.locationTrackingEnabled||false};}
function VerifyModal({verify,code,setCode,qcPassed,setQcPassed,qcNote,setQcNote,busy,onClose,onSubmit}:{verify:{orderId:string;stage:Stage};code:string;setCode:(x:string)=>void;qcPassed:boolean;setQcPassed:(x:boolean)=>void;qcNote:string;setQcNote:(x:string)=>void;busy:boolean;onClose:()=>void;onSubmit:()=>void}){const isQc=verify.stage==="QC";return <div className="log-modal-backdrop"><div className="log-modal log-verify"><div className="log-modal-head"><div><span className="log-eyebrow">{verify.stage}</span><h2>{verify.stage==="PICKUP"?"Farmer pickup verification":isQc?"Buyer quality check":"Buyer dropoff verification"}</h2><p>{isQc?`Order ${verify.orderId} · complete the quality check before the shipment enters transit.`:`Order ${verify.orderId} · enter the 4-character alphanumeric ${verify.stage==="PICKUP"?"farmer pickup":"buyer delivery"} code.`}</p></div><button onClick={onClose}><X/></button></div>{!isQc&&<label>{verify.stage==="PICKUP"?"Farmer pickup code":"Buyer delivery code"}<input autoFocus maxLength={4} value={code} onChange={e=>setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,""))} placeholder="AB12" inputMode="text" autoComplete="one-time-code"/></label>}{isQc&&<><div className="log-qc-buttons"><button type="button" className={qcPassed?"selected":""} onClick={()=>setQcPassed(true)}><Check size={16}/>QC Passed</button><button type="button" className={!qcPassed?"selected":""} onClick={()=>setQcPassed(false)}><X size={16}/>QC Failed</button></div><textarea value={qcNote} onChange={e=>setQcNote(e.target.value)} placeholder="QC notes (optional)"/></>}<div className="log-modal-actions"><button className="log-decline" onClick={onClose}>Cancel</button><button className="log-save-btn" disabled={busy||(!isQc&&code.length!==4)} onClick={onSubmit}><ShieldCheck size={15}/>{isQc?(qcPassed?"Pass QC":"Fail QC"):"Verify code"}</button></div></div></div>}
function Empty({icon:Icon,title,text}:{icon:any;title:string;text:string}){return <div className="log-empty"><Icon size={30}/><strong>{title}</strong><span>{text}</span></div>}
