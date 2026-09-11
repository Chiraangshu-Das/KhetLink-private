import { Router } from "express";
import { z } from "zod";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router = Router();
router.use(requireAuth);

router.post("/translate", async (req: AuthRequest, res) => {
  const parsed = z.object({ text: z.string().min(1), targetLanguage: z.string().min(2), sourceLanguage: z.string().optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid translation request" });
  if (parsed.data.targetLanguage.toLowerCase().startsWith("en")) return res.json({ translatedText: parsed.data.text });
  const key = process.env.GOOGLE_TRANSLATE_API_KEY;
  if (!key) return res.status(503).json({ error: "Translation service is not configured" });
  try {
    const response = await fetch(`https://translation.googleapis.com/language/translate/v2?key=${encodeURIComponent(key)}`, { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ q:parsed.data.text, target:parsed.data.targetLanguage, ...(parsed.data.sourceLanguage ? {source:parsed.data.sourceLanguage} : {}) }) });
    const data:any = await response.json();
    if (!response.ok) return res.status(502).json({ error: "Translation provider failed" });
    res.json({ translatedText: data?.data?.translations?.[0]?.translatedText ?? parsed.data.text });
  } catch { res.status(502).json({ error: "Translation provider unavailable" }); }
});

router.post("/route", async (req: AuthRequest, res) => {
  const parsed = z.object({ origin:z.object({latitude:z.number(),longitude:z.number()}), destination:z.object({latitude:z.number(),longitude:z.number()}), intermediates:z.array(z.object({latitude:z.number(),longitude:z.number()})).optional() }).safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid route request" });
  const key = process.env.GOOGLE_MAPS_API_KEY ?? process.env.API_KEY;
  if (!key) return res.status(503).json({ error: "Maps API is not configured" });
  try {
    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", { method:"POST", headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline"}, body:JSON.stringify({ origin:{location:{latLng:{latitude:parsed.data.origin.latitude,longitude:parsed.data.origin.longitude}}}, destination:{location:{latLng:{latitude:parsed.data.destination.latitude,longitude:parsed.data.destination.longitude}}}, intermediates:(parsed.data.intermediates??[]).map(x=>({location:{latLng:{latitude:x.latitude,longitude:x.longitude}}})), travelMode:"DRIVE", routingPreference:"TRAFFIC_AWARE" }) });
    const data=await response.json(); if(!response.ok)return res.status(502).json({error:"Routes provider failed"}); res.json(data);
  } catch { res.status(502).json({error:"Routes provider unavailable"}); }
});

export default router;
