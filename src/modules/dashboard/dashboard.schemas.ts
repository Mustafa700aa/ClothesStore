import { z } from 'zod';

export const dashboardLimitQuerySchema = z.object({
  limit: z.coerce.number().int().positive('Limit must be a positive integer').max(50, 'Maximum limit is 50').optional().default(5),
});

export type DashboardLimitQueryInput = z.infer<typeof dashboardLimitQuerySchema>;
