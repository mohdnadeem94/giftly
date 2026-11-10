// Run with: npm run db:seed
import { PrismaClient } from "@prisma/client";
import { resetAndSeed } from "../lib/seed";

const db = new PrismaClient();

resetAndSeed(db)
  .then((result) => {
    console.log("Seeded demo data:", result);
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
