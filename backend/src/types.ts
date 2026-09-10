export type Role = "BUYER" | "FARMER" | "LOGISTICS";
export interface JwtPayload { userId: string; firstName: string; lastName: string; email: string; }
