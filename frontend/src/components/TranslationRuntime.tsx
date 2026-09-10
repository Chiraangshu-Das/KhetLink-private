'use client';
import { useEffect } from 'react';

export default function TranslationRuntime(){
 useEffect(()=>{
  const originals=new WeakMap<Text,string>();
  const remember=()=>{const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){const t=n as Text;if(!t.parentElement)continue;const tag=t.parentElement.tagName;if(['SCRIPT','STYLE','NOSCRIPT','INPUT','TEXTAREA'].includes(tag))continue;if(!originals.has(t))originals.set(t,t.nodeValue||'');}};
  const translate=async(code:string)=>{remember();const nodes:Text[]=[];const texts:string[]=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;while((n=walker.nextNode())){const t=n as Text;if(!t.parentElement)continue;const tag=t.parentElement.tagName;if(['SCRIPT','STYLE','NOSCRIPT','INPUT','TEXTAREA','OPTION'].includes(tag))continue;const original=originals.get(t)||t.nodeValue||'';if(!original.trim()||/KhetLink/i.test(original)&&original.trim().toLowerCase()==='khetlink')continue;nodes.push(t);texts.push(original);}if(code==='en'){nodes.forEach(t=>{const o=originals.get(t);if(o!==undefined)t.nodeValue=o;});return;}if(!texts.length)return;try{const r=await fetch('/api/translate',{method:'POST',headers:{'Content-Type':'application/json'},credentials:'include',body:JSON.stringify({texts,target:code})});const d=await r.json();if(!r.ok)return;(d.texts||[]).forEach((value:string,i:number)=>{if(nodes[i]&&value)nodes[i].nodeValue=value;});}catch{}};
  const onChange=(e:Event)=>translate(String((e as CustomEvent).detail||'en'));window.addEventListener('khetlink-language-change',onChange);remember();const observer=new MutationObserver(()=>remember());observer.observe(document.body,{childList:true,subtree:true});return()=>{window.removeEventListener('khetlink-language-change',onChange);observer.disconnect();};
 },[]);return null;
}
