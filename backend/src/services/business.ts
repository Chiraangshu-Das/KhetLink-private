import { prisma } from "../../lib/prisma.js";

export const ROLE_CODE_PREFIX = { BUYER: "BUY", FARMER: "FAR", LOGISTICS: "LOG" } as const;
export const TERMS_VERSION = "1.0";

export function kgEquivalent(quantity: number, unit: string) {
  if (unit === "ton") return quantity * 1000;
  if (unit === "dozen") return quantity * 12;
  return quantity;
}

export function logisticsFee(distanceKm: number, fuelRate = Number(process.env.CURRENT_FUEL_PRICE ?? 8)) { return Math.max(0, distanceKm) * Math.max(0, fuelRate); }

export function verificationCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function uniqueCode(prefix: string) {
  for (;;) {
    const code = `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    if (!(await prisma.userRole.findUnique({ where: { roleCode: code } }))) return code;
  }
}

export async function notify(userId: string, type: any, title: string, message: string, role?: any) {
  return prisma.notification.create({ data: { userId, type, title, message, role } });
}
