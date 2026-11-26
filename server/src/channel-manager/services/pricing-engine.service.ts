import { Injectable } from '@nestjs/common';
import { ChannelPricingRule, PricingAdjustmentType } from '../../entities';
import { TenantConnectionManager } from '../../database/tenant-connection-manager.service';

export interface CalculatedRate {
  baseRate: number;
  adjustedRate: number;
  adjustmentType: PricingAdjustmentType;
  adjustmentValue: number;
  currency: string;
}

@Injectable()
export class PricingEngineService {
  constructor(private readonly tenantConn: TenantConnectionManager) {}

  /**
   * Calculate external channel rate based on base price and connection pricing rules
   */
  async calculateExternalRate(
    rawTenantId: string,
    connectionId: string,
    roomTypeId: string,
    baseRate: number,
  ): Promise<CalculatedRate> {
    const { ds } = await this.tenantConn.getDataSourceForTenant(rawTenantId);
    const repo = ds.getRepository(ChannelPricingRule);

    // 1. Check for specific room type rule
    let rule = await repo.findOne({
      where: { connectionId, roomTypeId, isActive: true },
    });

    // 2. Fallback to channel-wide default rule
    if (!rule) {
      rule = await repo.findOne({
        where: { connectionId, applyToAllRoomTypes: true, isActive: true },
      });
    }

    if (!rule) {
      return {
        baseRate,
        adjustedRate: baseRate,
        adjustmentType: PricingAdjustmentType.PERCENTAGE_MARKUP,
        adjustmentValue: 0,
        currency: 'LKR',
      };
    }

    const value = Number(rule.adjustmentValue);
    let adjusted = baseRate;

    switch (rule.adjustmentType) {
      case PricingAdjustmentType.PERCENTAGE_MARKUP:
        adjusted = baseRate * (1 + value / 100);
        break;
      case PricingAdjustmentType.FIXED_MARKUP:
        adjusted = baseRate + value;
        break;
      case PricingAdjustmentType.PERCENTAGE_DISCOUNT:
        adjusted = Math.max(0, baseRate * (1 - value / 100));
        break;
    }

    return {
      baseRate,
      adjustedRate: Number(adjusted.toFixed(2)),
      adjustmentType: rule.adjustmentType,
      adjustmentValue: value,
      currency: rule.currency || 'LKR',
    };
  }

  /**
   * Helper to preview pricing calculations without persisting
   */
  previewCalculation(
    baseRate: number,
    adjustmentType: PricingAdjustmentType,
    adjustmentValue: number,
  ): CalculatedRate {
    let adjusted = baseRate;
    const value = Number(adjustmentValue);

    switch (adjustmentType) {
      case PricingAdjustmentType.PERCENTAGE_MARKUP:
        adjusted = baseRate * (1 + value / 100);
        break;
      case PricingAdjustmentType.FIXED_MARKUP:
        adjusted = baseRate + value;
        break;
      case PricingAdjustmentType.PERCENTAGE_DISCOUNT:
        adjusted = Math.max(0, baseRate * (1 - value / 100));
        break;
    }

    return {
      baseRate,
      adjustedRate: Number(adjusted.toFixed(2)),
      adjustmentType,
      adjustmentValue: value,
      currency: 'LKR',
    };
  }
}
