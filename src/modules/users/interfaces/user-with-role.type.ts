import { Role, User } from '@prisma/client';

export type UserWithRole = Omit<User, 'password' | 'refreshToken'> & {
  role: Role;
};
