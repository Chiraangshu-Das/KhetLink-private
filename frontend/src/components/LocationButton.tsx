'use client';
import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { apiGet } from '../lib/api';
export default function LocationButton({ onLocation }: { onLocation:(x:{text:string;latitude:number;longitude:number})=>void }) { const [loading,setLoading]=useState(false); const locate=()=>{if(!navigator.geolocation)return;setLoading(true);navigator.geolocation.getCurrentPosition(async p=>{try{const d=await apiGet<{displayName:string}>(`/geo/reverse?lat=${p.coords.latitude}&lng=${p.coords.longitude}`);onLocation({text:d.displayName,latitude:p.coords.latitude,longitude:p.coords.longitude});}catch{}finally{setLoading(false)}},()=>setLoading(false),{enableHighAccuracy:true,timeout:15000});};return <button type="button" onClick={locate} disabled={loading} style={{display:'inline-flex',alignItems:'center',gap:5}}><MapPin size={15}/>{loading?'Locating…':'Use live location'}</button> }
