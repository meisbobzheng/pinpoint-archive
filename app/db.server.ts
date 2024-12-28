import { PrismaClient } from "@prisma/client";

// Declare a global variable for Prisma to handle reinitialization during development
declare global {
  // Prevent multiple PrismaClient instances during hot reloads
  var __prisma: PrismaClient | undefined;
}

// Create the Prisma client instance
const prisma =
  globalThis.__prisma ||
  new PrismaClient({
    log:
      process.env.NODE_ENV === "production"
        ? ["error"]
        : ["info", "warn", "error"],
  });

// In development, attach Prisma to the global object to prevent reinitialization
if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
}

// Explicitly export the `prisma` variable
export { prisma };
export default prisma;
