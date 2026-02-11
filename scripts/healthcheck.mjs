#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';

const steps = [];
let hasFailure = false;

const fallbackEnv = {
  ...process.env,
  DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/postgres?schema=public',
  DATABASE_URL_UNPOOLED: process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/postgres?schema=public'
};

function recordStep(name, ok) {
  steps.push({ name, ok });
  if (!ok) hasFailure = true;
}

function runStep(command, args) {
  const result = spawnSync(command, args, {
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: fallbackEnv
  });

  recordStep(`${command} ${args.join(' ')}`, result.status === 0);
}

async function runDbChecks() {
  if (!process.env.DATABASE_URL) {
    steps.push({ name: 'Prisma data checks skipped: DATABASE_URL is not set', ok: true });
    return;
  }

  const prisma = new PrismaClient();

  try {
    const assignments = await prisma.assignment.findMany({
      where: { roleId: { not: null } },
      include: {
        role: { select: { id: true, playId: true } },
        event: { select: { id: true, playId: true } }
      }
    });

    const brokenRoleLinks = assignments.filter((item) => !item.role);
    const rolePlayMismatch = assignments.filter((item) => item.role && item.event.playId && item.role.playId !== item.event.playId);

    const bookings = await prisma.externalBooking.findMany({ where: { endAt: { not: null } }, select: { id: true, startAt: true, endAt: true } });
    const invalidBookings = bookings.filter((item) => item.endAt && item.endAt <= item.startAt).length;

    const checks = [
      { name: 'Assignment has missing role record', count: brokenRoleLinks.length },
      { name: 'Assignment role belongs to another play', count: rolePlayMismatch.length },
      { name: 'ExternalBooking has endAt <= startAt', count: invalidBookings }
    ];

    for (const check of checks) {
      recordStep(`${check.name} (found ${check.count})`, check.count === 0);
    }
  } catch (error) {
    recordStep(`Prisma data checks failed: ${String(error)}`, false);
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log('Running healthcheck...');
  runStep('npx', ['prisma', 'validate']);
  runStep('npx', ['tsc', '--noEmit']);
  await runDbChecks();

  console.log('\nHealthcheck summary:');
  for (const step of steps) {
    console.log(`${step.ok ? '✅' : '❌'} ${step.name}`);
  }

  process.exit(hasFailure ? 1 : 0);
}

main();
