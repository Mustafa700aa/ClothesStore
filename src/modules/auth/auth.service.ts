import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database.js';
import { env } from '../../config/environment.js';
import { UnauthorizedError, NotFoundError } from '../../types/errors.js';
import { LoginInput, UpdatePasswordInput } from './auth.schemas.js';

export class AuthService {
  async login(input: LoginInput) {
    const admin = await prisma.admin.findUnique({
      where: { email: input.email.toLowerCase() },
    });

    if (!admin || !admin.isActive) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(input.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    const token = jwt.sign(
      { adminId: admin.id, email: admin.email },
      env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return {
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
      },
      token,
    };
  }

  async getProfile(adminId: string) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });

    if (!admin) {
      throw new NotFoundError('Admin profile');
    }

    return admin;
  }

  async updatePassword(adminId: string, input: UpdatePasswordInput) {
    const admin = await prisma.admin.findUnique({
      where: { id: adminId },
    });

    if (!admin) {
      throw new NotFoundError('Admin profile');
    }

    const isMatch = await bcrypt.compare(input.currentPassword, admin.password);
    if (!isMatch) {
      throw new UnauthorizedError('Incorrect current password');
    }

    const newHashedPassword = await bcrypt.hash(input.newPassword, 12);
    await prisma.admin.update({
      where: { id: adminId },
      data: { password: newHashedPassword },
    });

    return { message: 'Password updated successfully' };
  }
}

export const authService = new AuthService();
