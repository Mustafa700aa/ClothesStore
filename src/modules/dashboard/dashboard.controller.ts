import { Request, Response, NextFunction } from 'express';
import { dashboardService } from './dashboard.service.js';
import { sendSuccess } from '../../utils/apiResponse.js';

export class DashboardController {
  async getOverview(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getOverview();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getRevenue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getRevenue();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getTopProducts(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const data = await dashboardService.getTopProducts(limit);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getTopBundles(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = req.query.limit ? Number(req.query.limit) : 5;
      const data = await dashboardService.getTopBundles(limit);
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getGovernorates(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getGovernorates();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getReturnRate(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getReturnRate();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getConversion(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getConversion();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getPendingActions(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getPendingActions();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getAverageOrderValue(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getAverageOrderValue();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getRepeatCustomers(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getRepeatCustomers();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getDayOfWeek(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getDayOfWeek();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getGovernorateReturns(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await dashboardService.getGovernorateReturns();
      return sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
