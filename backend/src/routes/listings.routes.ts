import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";

const router=Router(); router.use(requireAuth);
const schema=z.object({productId:z.string(),quantity:z.number().positive(),unit:z.string().min(1),price:z.number().positive(),status:z.enum(["Active","Sold","Paused"]).default("Active")});
const distanceKm=(lat1:number,lon1:number,lat2:number,lon2:number)=>{const r=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return Math.round(r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10};
const broadRegion=(location?:string|null)=>{const p=String(location||"").split(",").map(x=>x.trim()).filter(Boolean);return p.length>=2?`${p[p.length-2]}, ${p[p.length-1]}`:(p[0]||"Location not shared")};
router.get("/",async(req:AuthRequest,res)=>{
 const viewer=await prisma.user.findUnique({where:{id:req.userId!},select:{latitude:true,longitude:true}});
 const rows=await prisma.listing.findMany({where:{status:"Active"},include:{product:{include:{category:true}},farmer:{include:{farmer:true}}},orderBy:{createdAt:"desc"}});
 const ids=[...new Set(rows.map(x=>x.farmerId))]; const reviews=await prisma.review.findMany({where:{revieweeId:{in:ids}},select:{revieweeId:true,rating:true}});
 const ratingMap=new Map<string,{sum:number;count:number}>(); for(const review of reviews){const v=ratingMap.get(review.revieweeId)||{sum:0,count:0};v.sum+=review.rating;v.count++;ratingMap.set(review.revieweeId,v);}
 const listings=rows.map(row=>{const r=ratingMap.get(row.farmerId);const distance=viewer?.latitude!=null&&viewer.longitude!=null&&row.farmer.latitude!=null&&row.farmer.longitude!=null?distanceKm(viewer.latitude,viewer.longitude,row.farmer.latitude,row.farmer.longitude):null;return {...row,farmer:{id:row.farmer.id,firstName:row.farmer.firstName,lastName:row.farmer.lastName,profileImage:row.farmer.profileImage,location:broadRegion(row.farmer.location),farmer:row.farmer.farmer?{id:row.farmer.farmer.id,farmName:row.farmer.farmer.farmName,landAcres:row.farmer.farmer.landAcres,verified:row.farmer.farmer.verified}:null,rating:r?.count?Math.round(r.sum/r.count*10)/10:null,reviews:r?.count||0},distanceKm:distance};});
 return res.json({listings});
});
router.get("/mine",async(req:AuthRequest,res)=>res.json({listings:await prisma.listing.findMany({where:{farmerId:req.userId!},include:{product:true},orderBy:{createdAt:"desc"}})}));
router.post("/",async(req:AuthRequest,res)=>{const p=schema.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid listing",details:p.error.flatten()});const role=await prisma.userRole.findUnique({where:{userId_role:{userId:req.userId!,role:"FARMER"}}});if(!role)return res.status(403).json({error:"Farmer role required"});return res.status(201).json(await prisma.listing.create({data:{...p.data,farmerId:req.userId!}}));});
router.patch("/:id",async(req:AuthRequest,res)=>{const p=schema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid listing"});const id=typeof req.params.id==="string"?req.params.id:null;if(!id)return res.status(400).json({error:"Invalid listing id"});const own=await prisma.listing.findFirst({where:{id,farmerId:req.userId!}});if(!own)return res.status(404).json({error:"Listing not found"});return res.json(await prisma.listing.update({where:{id:own.id},data:p.data}));});
router.delete("/:id",async(req:AuthRequest,res)=>{const id=typeof req.params.id==="string"?req.params.id:null;if(!id)return res.status(400).json({error:"Invalid listing id"});const own=await prisma.listing.findFirst({where:{id,farmerId:req.userId!}});if(!own)return res.status(404).json({error:"Listing not found"});await prisma.$transaction(async tx=>{await tx.orderItem.updateMany({where:{listingId:id},data:{listingId:null}});await tx.offerItem.deleteMany({where:{listingId:id}});await tx.listing.delete({where:{id}})});return res.json({ok:true});});
export default router;
