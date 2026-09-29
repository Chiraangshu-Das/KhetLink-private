import { Router } from "express";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, type AuthRequest } from "../middleware/auth.js";
import { kgEquivalent, notify, logisticsFee } from "../services/business.js";

const router = Router();
router.use(requireAuth);
const paramId = (req: AuthRequest) => typeof req.params.id === "string" ? req.params.id : null;
const item = z.object({ productId:z.string(), quantity:z.number().positive(), unit:z.string(), minPrice:z.number().nonnegative(), maxPrice:z.number().positive(), requiredBy:z.string().optional(), location:z.string().optional() });
const create = z.object({ location:z.string().optional(), latitude:z.number().nullable().optional(), longitude:z.number().nullable().optional(), browse:z.boolean().optional(), items:z.array(item).min(1) });
const broadRegion=(location?:string|null)=>{const p=String(location||"").split(",").map(x=>x.trim()).filter(Boolean);return p.length>=2?`${p[p.length-2]}, ${p[p.length-1]}`:(p[0]||"Location not shared")};
const distanceKm=(lat1:number,lon1:number,lat2:number,lon2:number)=>{const r=6371,dLat=(lat2-lat1)*Math.PI/180,dLon=(lon2-lon1)*Math.PI/180,a=Math.sin(dLat/2)**2+Math.cos(lat1*Math.PI/180)*Math.cos(lat2*Math.PI/180)*Math.sin(dLon/2)**2;return Math.round(r*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a))*10)/10};
const fromKg=(quantity:number,unit:string)=>unit==="ton"?quantity/1000:unit==="dozen"?quantity/12:quantity;
const pricePerKg=(price:number,unit:string)=>unit==="ton"?price/1000:unit==="dozen"?price/12:price;

async function matchRequirement(requirementId:string){
  const r=await prisma.requirement.findUnique({where:{id:requirementId},include:{items:true}}); if(!r)return [] as string[];
  const listings=await prisma.listing.findMany({where:{status:"Active"}}); const matched=new Set<string>();
  for(const requested of r.items){let remaining=kgEquivalent(requested.quantity,requested.unit);const candidates=listings.filter(l=>l.productId===requested.productId&&pricePerKg(l.price,l.unit)>=requested.minPrice&&pricePerKg(l.price,l.unit)<=requested.maxPrice&&kgEquivalent(l.quantity,l.unit)>0).sort((a,b)=>kgEquivalent(b.quantity,b.unit)-kgEquivalent(a.quantity,a.unit));for(const l of candidates){if(remaining<=0)break;const take=Math.min(kgEquivalent(l.quantity,l.unit),remaining);if(take>0){matched.add(l.farmerId);remaining-=take;}}if(remaining>0)return [] as string[];}
  return [...matched];
}

async function createOrderFromAcceptedOffer(offerId:string){
  return prisma.$transaction(async tx=>{
    const offer=await tx.offer.findUnique({where:{id:offerId},include:{items:{include:{listing:true}},requirement:true}}); if(!offer||!offer.buyerConfirmed||!offer.farmerConfirmed)return null;
    const existing=await tx.order.findFirst({where:{requirementId:offer.requirementId,sellerId:offer.farmerId}}); if(existing)return existing;
    let subtotal=0; const rows:any[]=[];
    for(const item of offer.items){const changed=await tx.listing.updateMany({where:{id:item.listingId,farmerId:offer.farmerId,status:"Active",quantity:{gte:item.quantity}},data:{quantity:{decrement:item.quantity}}});if(changed.count!==1)throw new Error("Inventory changed; please retry");subtotal+=item.quantity*offer.offeredPrice;rows.push({productId:item.listing.productId,listingId:item.listingId,quantity:item.quantity,unit:item.listing.unit,unitPrice:offer.offeredPrice});}
    const [buyer,farmer]=await Promise.all([tx.user.findUnique({where:{id:offer.requirement.buyerId},select:{latitude:true,longitude:true,location:true}}),tx.user.findUnique({where:{id:offer.farmerId},select:{latitude:true,longitude:true,location:true}})]);
    const distance=buyer?.latitude!=null&&buyer.longitude!=null&&farmer?.latitude!=null&&farmer.longitude!=null?distanceKm(buyer.latitude,buyer.longitude,farmer.latitude,farmer.longitude):0;
    const fee=logisticsFee(distance),platform=subtotal*0.05,expires=new Date(Date.now()+3600000),total=subtotal+platform+fee;
    const order=await tx.order.create({data:{id:randomUUID(),buyerId:offer.requirement.buyerId,sellerId:offer.farmerId,requirementId:offer.requirementId,status:"CONFIRMED",paymentStatus:"PENDING",paymentExpiresAt:expires,platformFee:platform,logisticsFee:fee,total,items:{create:rows},payment:{create:{amount:total,status:"PENDING",expiresAt:expires}},shipment:{create:{status:"CONFIRMED",pickupLocation:farmer?.location,deliveryLocation:buyer?.location,pickupLat:farmer?.latitude,pickupLng:farmer?.longitude,deliveryLat:buyer?.latitude,deliveryLng:buyer?.longitude,distanceKm:distance}},statusHistory:{create:{toStatus:"CONFIRMED"}}}});
    await tx.requirement.update({where: { id: offer.requirementId },data: { status: "CONFIRMED" },}); return order;
  });
}

router.get("/",async(req:AuthRequest,res)=>{
  // Marketplace feed: only requirements that can still be acted on.
  // Terminal states remain permanently stored in the database and are exposed
  // through /history for Dashboard/Analytics.
  const rows=await prisma.requirement.findMany({where:{buyerId:req.userId!,status:{notIn:["CONFIRMED","CLOSED","NOT_FOUND"]}},orderBy:{createdAt:"desc"}}); const result:any[]=[];
  for(const requirement of rows){const items=await prisma.requirementItem.findMany({where:{requirementId:requirement.id},include:{product:true}});const offers=await prisma.offer.findMany({where:{requirementId:requirement.id,status:{notIn:["ACCEPTED","REJECTED"]}},include:{items:true,farmer:{select:{id:true,firstName:true,lastName:true}}}});result.push({...requirement,items,offers,matchedFarmerIds:await matchRequirement(requirement.id)});}
  return res.json({requirements:result});
});

router.get("/history",async(req:AuthRequest,res)=>{
  // Full buyer requirement history. This is the durable source used by
  // Dashboard/Analytics, including NOT_FOUND, CONFIRMED and CLOSED records
  // after their Marketplace cards have disappeared.
  const rows=await prisma.requirement.findMany({where:{buyerId:req.userId!},orderBy:{createdAt:"desc"},select:{id:true,status:true,createdAt:true,updatedAt:true}});
  return res.json({requirements:rows});
});

router.delete("/history/orders",async(req:AuthRequest,res)=>{
  // Permanently erase every order record belonging to the authenticated buyer
  // while leaving requirements and farmer inventory untouched. This is used by
  // the Buyer Analytics "Refresh" action as a deliberate data-reset operation.
  try {
    const orders=await prisma.order.findMany({where:{buyerId:req.userId!},select:{id:true}});
    const orderIds=orders.map(order=>order.id);

    const requirements=await prisma.requirement.findMany({
      where:{buyerId:req.userId!},
      select:{id:true}
    });
    const requirementIds=requirements.map(requirement=>requirement.id);

    await prisma.$transaction(async tx=>{
      // Remove records that reference Order before deleting the parent rows.
      await tx.review.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.logisticsAssignment.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.participantCode.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.orderStatusHistory.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.orderItem.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.payment.deleteMany({where:{orderId:{in:orderIds}}});
      await tx.shipment.deleteMany({where:{orderId:{in:orderIds}}});
      if(orderIds.length){
        await tx.order.deleteMany({where:{id:{in:orderIds},buyerId:req.userId!}});
      }
      // RequirementItem and Offer records cascade from Requirement, so removing
      // the buyer's requirements also removes the durable requirement-status history.
      if(requirementIds.length){
        await tx.requirement.deleteMany({where:{id:{in:requirementIds},buyerId:req.userId!}});
      }
    });

    return res.json({
      deletedOrders:orderIds.length,
      deletedRequirements:requirementIds.length
    });
  } catch (error) {
    console.error("Failed to erase buyer order history:", error);
    return res.status(500).json({error:"Unable to erase buyer order history"});
  }
});

router.post("/",async(req:AuthRequest,res)=>{
  const p=create.safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid requirement",details:p.error.flatten()});
  const browse=!!p.data.browse;
  const r=await prisma.$transaction(tx=>tx.requirement.create({data:{buyerId:req.userId!,location:p.data.location,latitude:p.data.latitude,longitude:p.data.longitude,status:browse?"BROWSE_PRODUCTS":"PENDING",items:{create:p.data.items.map(i=>({...i,requiredBy:i.requiredBy?new Date(i.requiredBy):undefined}))}}}));
  if(browse) return res.status(201).json({requirementId:r.id,matchedFarmers:[],status:"BROWSE_PRODUCTS"});
  const matched=await matchRequirement(r.id);if(!matched.length)await prisma.requirement.update({where:{id:r.id},data:{status:"NOT_FOUND"}});for(const farmerId of matched)await notify(farmerId,"REQUEST","New buyer request",`A new KhetLink procurement request ${r.id} is waiting for your response.` ,"FARMER");
  return res.status(201).json({requirementId:r.id,matchedFarmers:matched,status:matched.length?"PENDING":"NOT_FOUND"});
});

router.post("/:id/offer",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const p=z.object({farmerId:z.string(),offeredPrice:z.number().positive(),items:z.array(z.object({listingId:z.string(),quantity:z.number().positive()}))}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid offer"});const reqt=await prisma.requirement.findFirst({where:{id,buyerId:req.userId!}});if(!reqt)return res.status(404).json({error:"Requirement not found"});const listings=await prisma.listing.findMany({where:{id:{in:p.data.items.map(i=>i.listingId)},farmerId:p.data.farmerId,status:"Active"}});if(listings.length!==p.data.items.length)return res.status(400).json({error:"Invalid listings"});for(const i of p.data.items){const l=listings.find(x=>x.id===i.listingId)!;if(i.quantity>l.quantity)return res.status(409).json({error:"Insufficient inventory"});}const offer=await prisma.$transaction(tx=>tx.offer.upsert({where:{requirementId_farmerId:{requirementId:reqt.id,farmerId:p.data.farmerId}},update:{offeredPrice:p.data.offeredPrice,status:"OFFERED",buyerConfirmed:false,farmerConfirmed:false,items:{deleteMany:{},create:p.data.items}},create:{requirementId:reqt.id,farmerId:p.data.farmerId,offeredPrice:p.data.offeredPrice,originalPrice:p.data.offeredPrice,status:"OFFERED",items:{create:p.data.items}}}));await notify(p.data.farmerId,"REQUEST","New buyer request",`A new KhetLink procurement request ${reqt.id} is waiting for your response.` ,"FARMER");return res.status(201).json({offer});});

router.post("/:id/counter",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const p=z.object({farmerId:z.string(),price:z.number().positive()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid counter offer"});const offer=await prisma.offer.findFirst({where:{requirementId:id,farmerId:p.data.farmerId,requirement:{buyerId:req.userId!}}});if(!offer)return res.status(404).json({error:"Offer not found"});const original=offer.originalPrice ?? offer.offeredPrice; if(Math.abs(p.data.price-original)>50)return res.status(400).json({error:"Counter price must be within ₹50 of the original price"}); const updated=await prisma.offer.update({where:{id:offer.id},data:{offeredPrice:p.data.price,status:"COUNTERED",buyerConfirmed:false,farmerConfirmed:false}});await notify(p.data.farmerId,"COUNTER_OFFER","Buyer sent a counter offer",`Buyer countered requirement ${id} at ₹${p.data.price}.`,"FARMER");return res.json({offer:updated});});
router.post("/:id/decline",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const p=z.object({farmerId:z.string()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"Farmer is required"});const offer=await prisma.offer.findFirst({where:{requirementId:id,farmerId:p.data.farmerId,requirement:{buyerId:req.userId!}}});if(!offer)return res.status(404).json({error:"Offer not found"});const updated=await prisma.offer.update({where:{id:offer.id},data:{status:"REJECTED",buyerConfirmed:false}});await notify(p.data.farmerId,"SYSTEM","Buyer declined the offer",`Buyer declined the offer for requirement ${id}.`,"FARMER");return res.json({offer:updated});});

router.post("/:id/accept",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const p=z.object({farmerId:z.string()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"Farmer is required"});const offer=await prisma.offer.findFirst({where:{requirementId:id,farmerId:p.data.farmerId,requirement:{buyerId:req.userId!}}});if(!offer)return res.status(404).json({error:"Offer not found"});const updated=await prisma.offer.update({where:{id:offer.id},data:{buyerConfirmed:true,status:offer.farmerConfirmed?"ACCEPTED":"NEGOTIATING"}});let order=null;if(updated.farmerConfirmed){order=await createOrderFromAcceptedOffer(updated.id);if(order){await notify(req.userId!,"ORDER","Order confirmed",`Order ${order.id} is confirmed and payment is due within one hour.` ,"BUYER");await notify(p.data.farmerId,"ORDER","Order confirmed",`Order ${order.id} is confirmed with the buyer.` ,"FARMER");}}return res.json({message:"Offer accepted",offerId:updated.id,orderCreated:Boolean(order),order});});

router.post("/:id/farmer-response",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const p=z.object({action:z.enum(["accept","decline","counter"]),price:z.number().positive().optional(),items:z.array(z.object({listingId:z.string(),quantity:z.number().positive()})).optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:"Invalid farmer response"});const role=await prisma.userRole.findUnique({where:{userId_role:{userId:req.userId!,role:"FARMER"}}});if(!role)return res.status(403).json({error:"Farmer role required"});const requirement=await prisma.requirement.findUnique({where:{id}});if(!requirement)return res.status(404).json({error:"Requirement not found"});const requirementItems=await prisma.requirementItem.findMany({where:{requirementId:id}});
  if(p.data.action==="decline"){const offer=await prisma.offer.findUnique({where:{requirementId_farmerId:{requirementId:id,farmerId:req.userId!}}});if(offer)await prisma.offer.update({where:{id:offer.id},data:{status:"REJECTED",farmerConfirmed:false,buyerConfirmed:false}});const farmer=await prisma.user.findUnique({where:{id:req.userId!},select:{firstName:true,lastName:true}});const farmerName=`${farmer?.firstName??""} ${farmer?.lastName??""}`.trim()||"Farmer";await notify(requirement.buyerId,"SYSTEM",`${farmerName} has rejected your request`,`${farmerName} has rejected your request for requirement ${id}.`,"BUYER");return res.json({status:"REJECTED"});}
  const listings=await prisma.listing.findMany({where:{farmerId:req.userId!,status:"Active",productId:{in:requirementItems.map(i=>i.productId)}}});const requestedItems=p.data.items?.length?p.data.items:requirementItems.flatMap(ri=>{const l=listings.find(x=>x.productId===ri.productId&&x.quantity>0);if(!l)return [];const q=Math.min(fromKg(kgEquivalent(ri.quantity,ri.unit),l.unit),l.quantity);return q>0?[{listingId:l.id,quantity:q}]:[];});if(!requestedItems.length)return res.status(409).json({error:"No matching inventory"});for(const selected of requestedItems){const l=listings.find(x=>x.id===selected.listingId);if(!l||selected.quantity>l.quantity)return res.status(409).json({error:"Insufficient inventory"});}
  const farmer=await prisma.user.findUnique({where:{id:req.userId!},select:{firstName:true,lastName:true}});const farmerName=`${farmer?.firstName??""} ${farmer?.lastName??""}`.trim()||"Farmer"; const existingOffer=await prisma.offer.findUnique({where:{requirementId_farmerId:{requirementId:id,farmerId:req.userId!}}}); const listingPrice=Math.round(requestedItems.reduce((sum,x)=>sum+(listings.find(l=>l.id===x.listingId)?.price||0),0)/Math.max(requestedItems.length,1)); const basePrice=p.data.action==="counter" ? (p.data.price ?? 0) : p.data.action==="accept" ? (existingOffer?.offeredPrice ?? listingPrice) : listingPrice; if(p.data.action==="counter" && basePrice<=0)return res.status(400).json({error:"Counter price is required"}); if(p.data.action==="counter" && existingOffer && Math.abs(basePrice-(existingOffer.originalPrice ?? existingOffer.offeredPrice))>50)return res.status(400).json({error:"Counter price must be within ₹50 of the original price"});const buyerConfirmed=existingOffer?.buyerConfirmed??false;const status=p.data.action==="counter"?"COUNTERED":(buyerConfirmed?"ACCEPTED":"NEGOTIATING");const offer=await prisma.offer.upsert({where:{requirementId_farmerId:{requirementId:id,farmerId:req.userId!}},update:{offeredPrice:basePrice,status,farmerConfirmed:p.data.action==="accept",buyerConfirmed: p.data.action==="accept" ? buyerConfirmed : false,items:{deleteMany:{},create:requestedItems}},create:{requirementId:id,farmerId:req.userId!,offeredPrice:basePrice,originalPrice:basePrice,status,farmerConfirmed:p.data.action==="accept",buyerConfirmed:false,items:{create:requestedItems}}});await notify(requirement.buyerId,p.data.action==="counter"?"COUNTER_OFFER":"ACCEPTED",p.data.action==="counter"?`${farmerName} sent a counter offer`:`${farmerName} has accepted`,p.data.action==="counter"?`${farmerName} sent a counter offer for requirement ${id} at ₹${basePrice}.`:`${farmerName} has accepted your request for requirement ${id} at ₹${basePrice}.`,"BUYER");let order=null;if(offer.buyerConfirmed&&offer.farmerConfirmed)order=await createOrderFromAcceptedOffer(offer.id);if(order){await notify(requirement.buyerId,"ORDER","Order confirmed",`Order ${order.id} is confirmed and payment is due within one hour.` ,"BUYER");await notify(req.userId!,"ORDER","Order confirmed",`Order ${order.id} is confirmed with the buyer.` ,"FARMER");}return res.json({offer,order});
});

router.post("/:id/close",async(req:AuthRequest,res)=>{const id=paramId(req);if(!id)return res.status(400).json({error:"Invalid requirement id"});const requirement=await prisma.requirement.findFirst({where:{id,buyerId:req.userId!}});if(!requirement)return res.status(404).json({error:"Requirement not found"});return res.json({requirement:await prisma.requirement.update({where:{id},data:{status:"CLOSED"}})});});

router.get("/incoming",async(req:AuthRequest,res)=>{const farmer=await prisma.userRole.findUnique({where:{userId_role:{userId:req.userId!,role:"FARMER"}}});if(!farmer)return res.status(403).json({error:"Farmer role required"});const listings=await prisma.listing.findMany({where:{farmerId:req.userId!,status:"Active"},select:{productId:true}});const productIds=listings.map(x=>x.productId);const requirements=await prisma.requirement.findMany({where:{status:{in:["PENDING","BROWSE_PRODUCTS"]},items:{some:{productId:{in:productIds}}},offers:{none:{farmerId:req.userId!,status:"REJECTED"}},orders:{none:{sellerId:req.userId!}}},orderBy:{createdAt:"desc"}});const result=[];for(const r of requirements){const items=await prisma.requirementItem.findMany({where:{requirementId:r.id},include:{product:true}});const buyer=await prisma.user.findUnique({where:{id:r.buyerId},select:{id:true,firstName:true,lastName:true,location:true,buyer:true,roles:{where:{role:"BUYER"},select:{roleCode:true}}}});result.push({...r,items,buyer:{...buyer,location:broadRegion(r.location||buyer?.location)},location:broadRegion(r.location||buyer?.location)});}return res.json({requirements:result});});

export default router;
