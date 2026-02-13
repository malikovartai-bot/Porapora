import { z } from 'zod';

export const playSchema = z.object({ title: z.string().min(1, 'Введите название'), description: z.string().optional() });
export const venueSchema = z.object({ title: z.string().min(1), address: z.string().optional(), notes: z.string().optional() });
export const personSchema = z.object({ fullName: z.string().min(1), role: z.enum(['ACTOR', 'TECH', 'OTHER']), phone: z.string().optional(), email: z.string().optional(), notes: z.string().optional(), userId: z.string().optional() });

export const eventSchema = z.object({
  title: z.string().min(1),
  type: z.enum(['SHOW', 'REHEARSAL']),
  status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELED']),
  startAt: z.string().datetime(),
  endAt: z.string().datetime().optional(),
  playId: z.string().cuid().optional(),
  venueId: z.string().cuid().optional(),
  notes: z.string().optional()
}).refine((value) => {
  if (!value.endAt) return true;
  return new Date(value.endAt) > new Date(value.startAt);
}, { message: 'endAt must be later than startAt', path: ['endAt'] });

export const assignmentSchema = z.object({
  personId: z.string().cuid(),
  roleId: z.string().cuid(),
  jobTitle: z.string().optional(),
  notes: z.string().optional(),
  callTime: z.string().datetime().optional()
});
