import "dotenv/config";
import { prisma } from "../lib/prisma.js";
const catalog: Record<string,string[]>={Vegetables:["Tomato","Potato","Onion","Brinjal","Spinach","Cucumber","Carrot","Cauliflower","Peas","Cabbage"],Fruits:["Banana","Mango","Apple","Orange","Grapes"],Pulses:["Lentils","Chickpeas","Pigeon Pea"],Grains:["Rice","Wheat","Maize"],Spices:["Turmeric","Chilli","Cumin"],Flowers:["Rose","Marigold"],"Non-Edible":["Cotton"],Herbs:["Coriander","Mint"],Other:["Sugarcane"],Livestock:["Milk","Eggs","Honey","Fish"]};
const image:Record<string,string>={Tomato:"/product-images/tomato.jpg",Potato:"/product-images/potato.jpg",Onion:"/product-images/onion.jpg",Rice:"/product-images/rice.jpg",Honey:"/product-images/honey.jpg"};
for(const [name,products] of Object.entries(catalog)){const cat=await prisma.productCategory.upsert({where:{name},update:{},create:{name}});for(const product of products)await prisma.product.upsert({where:{name:product},update:{imageUrl:image[product]},create:{name:product,imageUrl:image[product],categoryId:cat.id}})}
await prisma.$disconnect();
