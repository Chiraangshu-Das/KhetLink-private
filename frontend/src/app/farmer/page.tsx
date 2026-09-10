'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Farmer from '../../components/Farmer';
export default function FarmerPage(){
 const router=useRouter(); const [ready,setReady]=useState(false); const [hasProfile,setHasProfile]=useState(false);
 useEffect(()=>{document.title='KhetLink | Farmer Interface';(async()=>{try{const me=await (await fetch('/api/auth/me',{credentials:'include'})).json();if(!me.farmer){router.replace('/farmer/profile');return;}setHasProfile(true);}catch{router.replace('/');}finally{setReady(true);}})();},[router]);
 if(!ready||!hasProfile)return <div style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Loading KhetLink…</div>;
 return <Farmer/>;
}
