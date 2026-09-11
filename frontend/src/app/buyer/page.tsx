import type { Metadata } from "next";
import Buyer from "../../components/Buyer";
import "./buyer.css";
export const metadata: Metadata = { title: "KhetLink | Buyer Interface" };
export default function BuyerPage(){return <div className="buyer-route"><Buyer/></div>}
