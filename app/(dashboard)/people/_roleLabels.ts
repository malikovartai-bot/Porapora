import { PersonRole } from '@prisma/client';

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  ACTOR: 'Актер',
  TECH: 'Техперсонал',
  OTHER: 'Другое',
};
