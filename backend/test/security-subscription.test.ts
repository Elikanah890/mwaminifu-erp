import { subscriptionStatus } from '../src/services/subscription.service';

const DAY = 24 * 60 * 60 * 1000;

describe('subscriptionStatus', () => {
  it('is ACTIVE when there is no end date', () => {
    expect(subscriptionStatus({ isActive: true, endDate: null })).toBe('ACTIVE');
  });

  it('is ACTIVE before the end date', () => {
    expect(subscriptionStatus({ isActive: true, endDate: new Date(Date.now() + DAY) })).toBe('ACTIVE');
  });

  it('is GRACE within the 5-day grace window', () => {
    expect(subscriptionStatus({ isActive: true, endDate: new Date(Date.now() - 2 * DAY) })).toBe('GRACE');
  });

  it('is LAPSED after the grace window', () => {
    expect(subscriptionStatus({ isActive: true, endDate: new Date(Date.now() - 10 * DAY) })).toBe('LAPSED');
  });

  it('is LAPSED when inactive regardless of end date', () => {
    expect(subscriptionStatus({ isActive: false, endDate: new Date(Date.now() + DAY) })).toBe('LAPSED');
  });
});
