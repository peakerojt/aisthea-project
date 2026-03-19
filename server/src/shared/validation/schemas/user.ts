import { z } from 'zod';
import {
  addressLineField,
  cityField,
  districtField,
  fullNameField,
  optionalFullNameField,
  optionalPhoneField,
  phoneField,
  wardField,
} from '../fields';

export const updateProfileSchema = z.object({
  fullName: optionalFullNameField,
  phone: optionalPhoneField,
}).strict();

export const addressSchema = z.object({
  recipientName: fullNameField,
  phone: phoneField,
  addressLine: addressLineField,
  city: cityField,
  district: districtField,
  ward: wardField,
  isDefault: z.boolean().optional(),
}).strict();

export const addressIdParamSchema = z.object({
  id: z.coerce.number().int('Address id must be an integer').positive('Address id must be greater than 0'),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type AddressInput = z.infer<typeof addressSchema>;
export type AddressIdParams = z.infer<typeof addressIdParamSchema>;
