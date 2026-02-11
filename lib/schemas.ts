import { z } from 'zod';

export const playSchema = z.object({ title: z.string().min(1, 'Введите название'), description: z.string().optional() });
export const venueSchema = z.object({ title: z.string().min(1), address: z.string().optional(), notes: z.string().optional() });
export const personSchema = z.object({ fullName: z.string().min(1), role: z.enum(['ACTOR', 'TECH', 'OTHER']), phone: z.string().optional(), email: z.string().optional(), notes: z.string().optional(), userId: z.string().optional() });
export const eventSchema = z.object({ title: z.string().min(1), type: z.enum(['SHOW', 'REHEARSAL']), status: z.enum(['DRAFT', 'CONFIRMED', 'CANCELED']), startAt: z.string().min(1), endAt: z.string().optional(), playId: z.string().optional(), venueId: z.string().optional(), notes: z.string().optional() });
