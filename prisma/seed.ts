import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "admin@amma.ru";
  const plainPassword = "Admin123!";

  const passwordHash = await bcryptjs.hash(plainPassword, 10);

  await prisma.user.upsert({
    where: { email },
    update: {
      name: "Admin",
      passwordHash,
      role: "OWNER" as any,
    },
    create: {
      email,
      name: "Admin",
      passwordHash,
      role: "OWNER" as any,
    },
  });

  console.log(`Seed done for ${email} / ${plainPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
