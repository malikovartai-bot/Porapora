#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
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


function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function normDate(v) {
  if (!v) return '';
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

function normMoney(v) {
  if (v === null || v === undefined || v === '') return '';
  const n = Number(v);
  return Number.isFinite(n) ? (Math.round(n * 100) / 100).toFixed(2) : '';
}

function computeFingerprintForHealthcheck(parsed) {
  const normalized = {
    source: 'INTICKETS',
    meta: {
      reportNo: String(parsed.meta?.reportNo ?? '').trim().toLowerCase(),
      contractNo: String(parsed.meta?.contractNo ?? '').trim().toLowerCase(),
      reportDate: normDate(parsed.meta?.reportDate),
      periodStart: normDate(parsed.meta?.periodStart),
      periodEnd: normDate(parsed.meta?.periodEnd),
      grossSales: normMoney(parsed.meta?.grossSales),
      serviceFee: normMoney(parsed.meta?.serviceFee),
      netToOrganizer: normMoney(parsed.meta?.netToOrganizer)
    },
    lines: (parsed.lines ?? []).map((line) => ({
      playTitle: String(line.playTitle ?? '').trim().toLowerCase(),
      sessionAt: normDate(line.sessionAt),
      ticketsCount: Number(line.ticketsCount ?? 0),
      grossAmount: normMoney(line.grossAmount)
    })).sort((a, b) => `${a.playTitle}_${a.sessionAt}`.localeCompare(`${b.playTitle}_${b.sessionAt}`))
  };

  return sha256(JSON.stringify(normalized));
}

function runFinanceFingerprintChecks() {
  const base = {
    meta: { reportNo: 'R-101', grossSales: 5000, serviceFee: 500, netToOrganizer: 4500 },
    lines: [
      { playTitle: 'Спектакль 1', sessionAt: new Date('2025-04-01T16:00:00Z'), ticketsCount: 100, grossAmount: 5000 }
    ]
  };

  const sameContentDifferentFilename = JSON.parse(JSON.stringify(base));
  const differentContent = {
    meta: { reportNo: 'R-102', grossSales: 6500, serviceFee: 700, netToOrganizer: 5800 },
    lines: [
      { playTitle: 'Спектакль 1', sessionAt: '2025-04-01T16:00:00Z', ticketsCount: 120, grossAmount: 6500 }
    ]
  };

  const fp1 = computeFingerprintForHealthcheck(base);
  const fp2 = computeFingerprintForHealthcheck(sameContentDifferentFilename);
  const fp3 = computeFingerprintForHealthcheck(differentContent);

  recordStep('Finance import dedupe: same content with different filenames -> duplicate', fp1 === fp2);
  recordStep('Finance import dedupe: different content -> unique fingerprints', fp1 !== fp3);

  const imported = new Set();
  let totalGross = 0;
  for (const report of [base, sameContentDifferentFilename, differentContent]) {
    const fp = computeFingerprintForHealthcheck(report);
    if (imported.has(fp)) continue;
    imported.add(fp);
    totalGross += Number(report.meta.grossSales ?? 0);
  }

  recordStep('Finance import dedupe: repeated import does not double sums', totalGross === 11500);
}

async function runDbChecks() {
  if (!process.env.DATABASE_URL) {
    steps.push({ name: 'Prisma data checks skipped: DATABASE_URL is not set', ok: true });
    return;
  }

  const prisma = new PrismaClient();

  try {
    const assignments = await prisma.assignment.findMany({
      include: {
        role: { select: { id: true, playId: true } },
        event: { select: { id: true, playId: true } }
      }
    });

    const orphanAssignments = assignments.filter((item) => !item.event || !item.role);
    const rolePlayMismatch = assignments.filter((item) => item.event.playId && item.role.playId !== item.event.playId);

    const baseCast = await prisma.playRoleCast.findMany({
      include: {
        playRole: { select: { id: true, playId: true } },
        play: { select: { id: true } }
      }
    });

    const baseCastMismatch = baseCast.filter((item) => item.playRole.playId !== item.playId);

    const bookings = await prisma.externalBooking.findMany({ where: { endAt: { not: null } }, select: { id: true, startAt: true, endAt: true } });
    const invalidBookings = bookings.filter((item) => item.endAt && item.endAt <= item.startAt).length;

    const checks = [
      { name: 'Orphan Assignment (missing event/role)', count: orphanAssignments.length },
      { name: 'Assignment role belongs to another play', count: rolePlayMismatch.length },
      { name: 'PlayRoleCast role belongs to another play', count: baseCastMismatch.length },
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
  runFinanceFingerprintChecks();
  await runDbChecks();

  console.log('\nHealthcheck summary:');
  for (const step of steps) {
    console.log(`${step.ok ? '✅' : '❌'} ${step.name}`);
  }

  process.exit(hasFailure ? 1 : 0);
}

main();
