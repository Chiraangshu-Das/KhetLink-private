import { prisma } from "../../lib/prisma.js";

export const ROLE_CODE_PREFIX = { BUYER: "BUY", FARMER: "FAR", LOGISTICS: "LOG" } as const;
export const TERMS_VERSION = "1.0";

export function kgEquivalent(quantity: number, unit: string) {
  if (unit === "ton") return quantity * 1000;
  if (unit === "dozen") return quantity * 12;
  return quantity;
}

export function logisticsFee(distanceKm: number, fuelRate = Number(process.env.CURRENT_FUEL_PRICE ?? 8)) { return Math.max(0, distanceKm) * Math.max(0, fuelRate); }

export function negotiatedPriceIsValid(originalPrice: number, price: number) {
  const base = Number(originalPrice);
  const next = Number(price);
  return Number.isFinite(base) && Number.isFinite(next) && next >= Math.max(0, base - 50) && next <= base + 50;
}

export function assertNegotiatedPrice(originalPrice: number, price: number) {
  if (!negotiatedPriceIsValid(originalPrice, price)) {
    throw new Error(`Negotiated price must stay between ₹${Math.max(0, originalPrice - 50).toFixed(2)} and ₹${(originalPrice + 50).toFixed(2)} per unit.`);
  }
}

export function verificationCode() {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  return Array.from({ length: 4 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

export async function uniqueCode(prefix: string) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const code = Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    if (!(await prisma.userRole.findUnique({ where: { roleCode: code } }))) return code;
  }
}

export async function uniqueOrderId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  for (;;) {
    const id = Array.from({ length: 6 },() => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
    const existingOrder = await prisma.order.findUnique({where: { id },});
    if (!existingOrder) return id;}
}

export async function ensureRoleCode(roleId: string, currentCode?: string | null) {
  if (currentCode && currentCode.length === 6) return currentCode;
  const role = await prisma.userRole.findUnique({ where: { id: roleId }, select: { roleCode: true } });
  if (role?.roleCode && role.roleCode.length === 6) return role.roleCode;
  const code = await uniqueCode("");
  await prisma.userRole.update({ where: { id: roleId }, data: { roleCode: code } });
  return code;
}
export async function notify(userId: string, type: any, title: string, message: string, role?: any) {
  return prisma.notification.create({ data: { userId, type, title, message, role } });
}
