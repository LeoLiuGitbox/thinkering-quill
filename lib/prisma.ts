import { PrismaLibSql } from "@prisma/adapter-libsql";
// @ts-ignore — Prisma 7 generated client
import { PrismaClient } from "../app/generated/prisma/client";

// Absolute path for local SQLite
const DB_URL = "file:///Users/leo/Project/thinkering_quill/prisma/dev.db";

const globalForPrisma = globalThis as unknown as {
  prisma: InstanceType<typeof PrismaClient> | undefined;
};

function createPrismaClient() {
  // PrismaLibSql takes a config object { url }, NOT a pre-created libsql client
  const adapter = new PrismaLibSql({ url: DB_URL });
  return new PrismaClient({ adapter } as never);
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
