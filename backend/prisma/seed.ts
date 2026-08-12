import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

// Documented test password for all seeded grading accounts (also see README).
const TEST_PASSWORD = "Password123!";

const USERS: { name: string; email: string; role: Role }[] = [
  { name: "Admin User", email: "admin@erp.test", role: Role.Admin },
  { name: "Sales User", email: "sales@erp.test", role: Role.Sales },
  { name: "Warehouse User", email: "warehouse@erp.test", role: Role.Warehouse },
  { name: "Accounts User", email: "accounts@erp.test", role: Role.Accounts },
];

async function main() {
  const hashedPassword = await bcrypt.hash(TEST_PASSWORD, 10);

  for (const user of USERS) {
    await prisma.user.upsert({
      where: { email: user.email },
      update: {},
      create: { ...user, password: hashedPassword },
    });
  }

  console.log("Seeded users (all share the same test password):");
  console.table(USERS.map((u) => ({ role: u.role, email: u.email, password: TEST_PASSWORD })));
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
