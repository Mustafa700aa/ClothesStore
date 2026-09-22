import { Request, Response, NextFunction } from 'express';
import { ordersService } from './orders.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class OrdersController {
  async createOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const idempotencyKey = req.headers['x-idempotency-key'] as string | undefined;
      const result = await ordersService.createOrder(req.body, idempotencyKey);

      if (result.isIdempotent) {
        return sendSuccess(res, { ...result.order, _idempotent: true }, 'Order already placed', 200);
      }

      return sendSuccess(res, result.order, 'Order created successfully', 201);
    } catch (error) {
      next(error);
    }
  }

  async trackOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.trackOrder(req.params.orderNumber);
      return sendSuccess(res, order);
    } catch (error) {
      next(error);
    }
  }

  async getAdminOrders(req: Request, res: Response, next: NextFunction) {
    try {
      const result = await ordersService.getAdminOrders(req.query as never);
      return sendSuccess(res, result.orders, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async getAdminOrderById(req: Request, res: Response, next: NextFunction) {
    try {
      const order = await ordersService.getAdminOrderById(req.params.id);
      return sendSuccess(res, order);
    } catch (error) {
      next(error);
    }
  }

  async updateStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const adminId = req.admin?.adminId;
      const updated = await ordersService.updateStatus(req.params.id, req.body, adminId);
      return sendSuccess(res, updated, 'Order status updated successfully');
    } catch (error) {
      next(error);
    }
  }

  async updateNotes(req: Request, res: Response, next: NextFunction) {
    try {
      const { note } = req.body;
      const updated = await ordersService.updateNotes(req.params.id, note);
      return sendSuccess(res, updated, 'Order note appended successfully');
    } catch (error) {
      next(error);
    }
  }
}

export const ordersController = new OrdersController();
