import { describe, it, expect } from 'vitest';
import { orderStateMachine, ALLOWED_TRANSITIONS } from '../../src/modules/orders/orderStateMachine.js';
import { OrderStatus } from '@prisma/client';

describe('Order State Machine - Unit Tests', () => {
  it('should allow valid transition from PENDING to CONFIRMED or CANCELLED', () => {
    expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
    expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
  });

  it('should reject invalid transition from PENDING to DELIVERED or SHIPPED directly', () => {
    expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.DELIVERED)).toBe(false);
    expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toBe(false);
    expect(orderStateMachine.canTransition(OrderStatus.PENDING, OrderStatus.READY_FOR_PICKUP)).toBe(false);
  });

  it('should allow CONFIRMED to transition to READY_FOR_PICKUP or CANCELLED', () => {
    expect(orderStateMachine.canTransition(OrderStatus.CONFIRMED, OrderStatus.READY_FOR_PICKUP)).toBe(true);
    expect(orderStateMachine.canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
    expect(orderStateMachine.canTransition(OrderStatus.CONFIRMED, OrderStatus.DELIVERED)).toBe(false);
  });

  it('should treat DELIVERED, CANCELLED, and RETURNED as terminal states', () => {
    expect(ALLOWED_TRANSITIONS[OrderStatus.DELIVERED]).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS[OrderStatus.CANCELLED]).toHaveLength(0);
    expect(ALLOWED_TRANSITIONS[OrderStatus.RETURNED]).toHaveLength(0);

    expect(orderStateMachine.canTransition(OrderStatus.DELIVERED, OrderStatus.CANCELLED)).toBe(false);
    expect(orderStateMachine.canTransition(OrderStatus.CANCELLED, OrderStatus.CONFIRMED)).toBe(false);
    expect(orderStateMachine.canTransition(OrderStatus.RETURNED, OrderStatus.DELIVERED)).toBe(false);
  });
});
