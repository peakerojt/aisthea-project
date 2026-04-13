-- =============================================================
-- Manual SQL equivalent of:
--   npm run repair:coupon-min-order-rules
--
-- Safe to run directly against MySQL / Railway when the TS script
-- cannot be executed in the target environment.
--
-- Important:
-- - This mirrors the current repo logic in server/src/scripts/repair-coupon-min-order-rules.ts
-- - Under the current rule set, refund benefit coupons:
--   * 10% / max 50.000 => min order 500.000
--   * 12% / max 80.000 => min order 800.000
--   * 15% / max 120.000 => min order 1.200.000
-- =============================================================
--
-- Uncomment and replace only if your SQL client requires an explicit DB:
-- USE `AISTHEA`;

SET @OLD_SQL_SAFE_UPDATES = @@SQL_SAFE_UPDATES;
SET SQL_SAFE_UPDATES = 0;

START TRANSACTION;

-- Preview coupon rows that will be normalized.
SELECT
  c.`CouponId`,
  c.`Code`,
  c.`Source`,
  c.`Type`,
  c.`Value`,
  c.`MaxDiscountAmount`,
  c.`MinOrderValue` AS `CurrentMinOrderValue`,
  targets.`TargetMinOrderValue`
FROM `Coupons` c
INNER JOIN (
  SELECT
    c0.`CouponId`,
    CASE
      WHEN c0.`Source` = 'REFUND_BENEFIT' THEN
        CASE
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'FIXED_AMOUNT'
            AND c0.`MaxDiscountAmount` IS NULL
            THEN 300000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 10
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 50000
            THEN 500000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 12
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 80000
            THEN 800000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 15
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 120000
            THEN 1200000
          WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0 THEN 300000
          WHEN c0.`MinOrderValue` <= 399999 THEN 300000
          WHEN c0.`MinOrderValue` <= 649999 THEN 500000
          WHEN c0.`MinOrderValue` <= 999999 THEN 800000
          WHEN c0.`MinOrderValue` <= 1499999 THEN 1200000
          ELSE 1800000
        END
      WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0
        AND c0.`Source` IS NOT NULL
        THEN 0
      WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0 THEN 300000
      WHEN c0.`MinOrderValue` <= 399999 THEN 300000
      WHEN c0.`MinOrderValue` <= 649999 THEN 500000
      WHEN c0.`MinOrderValue` <= 999999 THEN 800000
      WHEN c0.`MinOrderValue` <= 1499999 THEN 1200000
      ELSE 1800000
    END AS `TargetMinOrderValue`
  FROM `Coupons` c0
) targets ON targets.`CouponId` = c.`CouponId`
WHERE COALESCE(c.`MinOrderValue`, 0) <> targets.`TargetMinOrderValue`
ORDER BY c.`CouponId`;

UPDATE `Coupons` c
INNER JOIN (
  SELECT
    c0.`CouponId`,
    CASE
      WHEN c0.`Source` = 'REFUND_BENEFIT' THEN
        CASE
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'FIXED_AMOUNT'
            AND c0.`MaxDiscountAmount` IS NULL
            THEN 300000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 10
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 50000
            THEN 500000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 12
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 80000
            THEN 800000
          WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
            AND c0.`Value` = 15
            AND COALESCE(c0.`MaxDiscountAmount`, -1) = 120000
            THEN 1200000
          WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0 THEN 300000
          WHEN c0.`MinOrderValue` <= 399999 THEN 300000
          WHEN c0.`MinOrderValue` <= 649999 THEN 500000
          WHEN c0.`MinOrderValue` <= 999999 THEN 800000
          WHEN c0.`MinOrderValue` <= 1499999 THEN 1200000
          ELSE 1800000
        END
      WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0
        AND c0.`Source` IS NOT NULL
        THEN 0
      WHEN COALESCE(c0.`MinOrderValue`, 0) <= 0 THEN 300000
      WHEN c0.`MinOrderValue` <= 399999 THEN 300000
      WHEN c0.`MinOrderValue` <= 649999 THEN 500000
      WHEN c0.`MinOrderValue` <= 999999 THEN 800000
      WHEN c0.`MinOrderValue` <= 1499999 THEN 1200000
      ELSE 1800000
    END AS `TargetMinOrderValue`
  FROM `Coupons` c0
) targets ON targets.`CouponId` = c.`CouponId`
SET
  c.`MinOrderValue` = targets.`TargetMinOrderValue`,
  c.`UpdatedAt` = NOW()
WHERE COALESCE(c.`MinOrderValue`, 0) <> targets.`TargetMinOrderValue`;

-- Preview refund benefit rows that will be normalized.
SELECT
  rb.`RefundBenefitId`,
  rb.`CouponId`,
  rb.`BenefitType`,
  rb.`PercentValue`,
  rb.`MaxDiscountAmount`,
  rb.`MinOrderValue` AS `CurrentMinOrderValue`,
  rb.`RuleVersion` AS `CurrentRuleVersion`,
  targets.`TargetMinOrderValue`,
  'refund-benefit-v2' AS `TargetRuleVersion`
FROM `RefundBenefits` rb
INNER JOIN (
  SELECT
    rb0.`RefundBenefitId`,
    CASE
      WHEN UPPER(COALESCE(rb0.`BenefitType`, '')) = 'FREESHIP'
        OR (
          UPPER(COALESCE(c0.`Type`, '')) = 'FIXED_AMOUNT'
          AND c0.`MaxDiscountAmount` IS NULL
        )
        THEN 300000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 10
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 50000
        THEN 500000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 12
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 80000
        THEN 800000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 15
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 120000
        THEN 1200000
      WHEN COALESCE(rb0.`MinOrderValue`, 0) <= 0 THEN 300000
      WHEN rb0.`MinOrderValue` <= 399999 THEN 300000
      WHEN rb0.`MinOrderValue` <= 649999 THEN 500000
      WHEN rb0.`MinOrderValue` <= 999999 THEN 800000
      WHEN rb0.`MinOrderValue` <= 1499999 THEN 1200000
      ELSE 1800000
    END AS `TargetMinOrderValue`
  FROM `RefundBenefits` rb0
  LEFT JOIN `Coupons` c0 ON c0.`CouponId` = rb0.`CouponId`
) targets ON targets.`RefundBenefitId` = rb.`RefundBenefitId`
WHERE COALESCE(rb.`MinOrderValue`, 0) <> targets.`TargetMinOrderValue`
   OR COALESCE(rb.`RuleVersion`, '') <> 'refund-benefit-v2'
ORDER BY rb.`RefundBenefitId`;

UPDATE `RefundBenefits` rb
INNER JOIN (
  SELECT
    rb0.`RefundBenefitId`,
    CASE
      WHEN UPPER(COALESCE(rb0.`BenefitType`, '')) = 'FREESHIP'
        OR (
          UPPER(COALESCE(c0.`Type`, '')) = 'FIXED_AMOUNT'
          AND c0.`MaxDiscountAmount` IS NULL
        )
        THEN 300000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 10
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 50000
        THEN 500000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 12
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 80000
        THEN 800000
      WHEN UPPER(COALESCE(c0.`Type`, '')) = 'PERCENTAGE'
        AND COALESCE(c0.`Value`, rb0.`PercentValue`, 0) = 15
        AND COALESCE(c0.`MaxDiscountAmount`, rb0.`MaxDiscountAmount`, -1) = 120000
        THEN 1200000
      WHEN COALESCE(rb0.`MinOrderValue`, 0) <= 0 THEN 300000
      WHEN rb0.`MinOrderValue` <= 399999 THEN 300000
      WHEN rb0.`MinOrderValue` <= 649999 THEN 500000
      WHEN rb0.`MinOrderValue` <= 999999 THEN 800000
      WHEN rb0.`MinOrderValue` <= 1499999 THEN 1200000
      ELSE 1800000
    END AS `TargetMinOrderValue`
  FROM `RefundBenefits` rb0
  LEFT JOIN `Coupons` c0 ON c0.`CouponId` = rb0.`CouponId`
) targets ON targets.`RefundBenefitId` = rb.`RefundBenefitId`
SET
  rb.`MinOrderValue` = targets.`TargetMinOrderValue`,
  rb.`RuleVersion` = 'refund-benefit-v2'
WHERE COALESCE(rb.`MinOrderValue`, 0) <> targets.`TargetMinOrderValue`
   OR COALESCE(rb.`RuleVersion`, '') <> 'refund-benefit-v2';

-- Post-check after normalization.
SELECT
  c.`CouponId`,
  c.`Code`,
  c.`Source`,
  c.`Type`,
  c.`Value`,
  c.`MaxDiscountAmount`,
  c.`MinOrderValue`,
  c.`UpdatedAt`
FROM `Coupons` c
WHERE c.`Source` = 'REFUND_BENEFIT'
ORDER BY c.`CouponId`;

SELECT
  rb.`RefundBenefitId`,
  rb.`CouponId`,
  rb.`BenefitType`,
  rb.`PercentValue`,
  rb.`MaxDiscountAmount`,
  rb.`MinOrderValue`,
  rb.`RuleVersion`
FROM `RefundBenefits` rb
ORDER BY rb.`RefundBenefitId`;

COMMIT;

SET SQL_SAFE_UPDATES = @OLD_SQL_SAFE_UPDATES;
