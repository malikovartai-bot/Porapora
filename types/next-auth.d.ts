import { Role } from '@prisma/client';
import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      role: Role;
      personId?: string | null;
    };
  }

  interface User {
    role: Role;
    personId?: string | null;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    personId?: string | null;
  }
}
