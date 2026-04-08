ALTER TABLE `Products`
  ADD COLUMN `SizeGuideTemplateKey` VARCHAR(100) NULL AFTER `BasePrice`,
  ADD COLUMN `FitType` VARCHAR(50) NULL AFTER `SizeGuideTemplateKey`,
  ADD COLUMN `FitNote` VARCHAR(500) NULL AFTER `FitType`,
  ADD COLUMN `ModelHeightCm` INT NULL AFTER `FitNote`,
  ADD COLUMN `ModelWeightKg` INT NULL AFTER `ModelHeightCm`,
  ADD COLUMN `ModelWearSize` VARCHAR(20) NULL AFTER `ModelWeightKg`,
  ADD COLUMN `SizeGuideOverrideJson` JSON NULL AFTER `ModelWearSize`;
