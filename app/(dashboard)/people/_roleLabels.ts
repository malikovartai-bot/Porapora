import { PersonRole } from '@prisma/client';

export const PERSON_ROLE_LABELS: Record<PersonRole, string> = {
  ACTOR: 'Актер',
   SOUND: 'Звук',
  LIGHT: 'Свет',
  STAGE_MACHINIST: 'Машинист',
  PROPS: 'Реквизит',
  COSTUME: 'Костюм',
  ASSISTANT_DIRECTOR: 'Помреж',
  ADMINISTRATOR: 'Администратор',
};
