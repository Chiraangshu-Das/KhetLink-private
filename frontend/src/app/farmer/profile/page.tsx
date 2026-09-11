import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = { title: "KhetLink | Farmer Profile" };

export default function FarmerProfileRoute() {
  redirect("/farmer?view=profile");
}
