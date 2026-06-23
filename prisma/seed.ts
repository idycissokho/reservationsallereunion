import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';

dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const ROLES = [
  { name: 'ADMIN', description: 'Administrateur système' },
  { name: 'MANAGER', description: 'Gestionnaire de salles' },
  { name: 'USER', description: 'Utilisateur standard' },
];

const PERMISSIONS = [
  { action: 'manage', subject: 'all', description: 'Accès total' },
  { action: 'manage', subject: 'reservation', description: 'Gérer les réservations' },
  { action: 'manage', subject: 'room', description: 'Gérer les salles' },
  { action: 'create', subject: 'reservation', description: 'Créer une réservation' },
  { action: 'read', subject: 'reservation', description: 'Consulter une réservation' },
  { action: 'cancel', subject: 'reservation', description: 'Annuler une réservation' },
  { action: 'read', subject: 'room', description: 'Consulter les salles' },
];

async function main() {
  console.log('🌱 Seeding started...');

  // Rôles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where: { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles created');

  // Permissions
  for (const perm of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { action_subject: { action: perm.action, subject: perm.subject } },
      update: {},
      create: perm,
    });
  }
  console.log('✅ Permissions created');

  // Assignation permissions → rôles
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'ADMIN' } });
  const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'MANAGER' } });
  const userRole = await prisma.role.findUniqueOrThrow({ where: { name: 'USER' } });

  const allPermissions = await prisma.permission.findMany();
  const manageAll = allPermissions.find((p) => p.action === 'manage' && p.subject === 'all');
  const managerPerms = allPermissions.filter((p) =>
    ['manage:reservation', 'manage:room', 'read:reservation', 'read:room'].includes(
      `${p.action}:${p.subject}`,
    ),
  );
  const userPerms = allPermissions.filter((p) =>
    ['create:reservation', 'read:reservation', 'cancel:reservation', 'read:room'].includes(
      `${p.action}:${p.subject}`,
    ),
  );

  if (manageAll) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: manageAll.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: manageAll.id },
    });
  }

  for (const perm of managerPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: managerRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: managerRole.id, permissionId: perm.id },
    });
  }

  for (const perm of userPerms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: userRole.id, permissionId: perm.id } },
      update: {},
      create: { roleId: userRole.id, permissionId: perm.id },
    });
  }
  console.log('✅ Role permissions assigned');

  // Utilisateur Admin par défaut
  const hashedPassword = await bcrypt.hash('Admin@1234', 12);

  await prisma.user.upsert({
    where: { email: 'admin@reservation.com' },
    update: {},
    create: {
      email: 'admin@reservation.com',
      password: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      roleId: adminRole.id,
    },
  });
  console.log('✅ Admin user created');

  console.log('🎉 Seeding completed');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
