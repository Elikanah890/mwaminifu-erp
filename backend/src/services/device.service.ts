import prisma from '../config/database';

export class DeviceService {
  async register(userId: string, deviceId: string) {
    return prisma.deviceSession.upsert({
      where: { userId_deviceId: { userId, deviceId } },
      update: { lastActive: new Date() },
      create: { userId, deviceId, lastActive: new Date() },
    });
  }

  async listByDevice(deviceId: string) {
    const sessions = await prisma.deviceSession.findMany({
      where: { deviceId },
      orderBy: { lastActive: 'desc' },
      include: {
        user: { select: { id: true, name: true, phone: true, role: true, isActive: true } },
      },
    });
    return sessions
      .map((s) => s.user)
      .filter((u) => u.isActive);
  }

  async remove(id: string) {
    return prisma.deviceSession.deleteMany({ where: { id } });
  }
}

export const deviceService = new DeviceService();
