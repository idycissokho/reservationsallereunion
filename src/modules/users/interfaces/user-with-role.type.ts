import { Role, User } from '@prisma/client';

export type UserWithRole = User & { role: Role };
