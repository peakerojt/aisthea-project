import type { ChangeEvent, FormEvent, MouseEvent } from 'react';
import type { TFunction } from 'i18next';
import type { CartItem } from '@/types';
import type { OrderQuoteCoupon } from '@/common/services/order.service';
import type {
  CheckoutErrorField,
  CheckoutFormValues,
} from '@/common/hooks/useCheckoutForm';
import type { Address as SavedAddress } from '@/store/services/user.service';
import type { VNLocationOption } from '@/common/utils/vnLocation';

export type CheckoutSelectChangeEvent = ChangeEvent<HTMLSelectElement>;
export type CheckoutInputChangeEvent = ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>;
export type CheckoutFieldErrorGetter = (field: CheckoutErrorField) => string | undefined;
export type CheckoutInputChangeHandler = (event: CheckoutInputChangeEvent) => void;
export type CheckoutSelectChangeHandler = (event: CheckoutSelectChangeEvent) => void;
export type CheckoutSubmitHandler = (event: FormEvent | MouseEvent<HTMLButtonElement>) => Promise<void>;
export type CheckoutTranslator = TFunction;

type CheckoutFieldPresentationProps = {
  fieldErrorClassName: string;
  fieldLabelClassName: string;
};

type CheckoutFormSectionProps = CheckoutFieldPresentationProps & {
  formData: CheckoutFormValues;
  getFieldError: CheckoutFieldErrorGetter;
  handleInputChange: CheckoutInputChangeHandler;
  inputClassName: string;
  t: CheckoutTranslator;
};

export type CheckoutContactSectionProps = CheckoutFormSectionProps;

export type CheckoutShippingSectionProps = CheckoutFormSectionProps & {
  districts: VNLocationOption[];
  formatSavedAddressOption: (address: SavedAddress) => string;
  handleDistrictChange: CheckoutSelectChangeHandler;
  handleProvinceChange: CheckoutSelectChangeHandler;
  handleSavedAddressChange: CheckoutSelectChangeHandler;
  handleWardChange: CheckoutSelectChangeHandler;
  isSavedAddressLoading: boolean;
  provinces: VNLocationOption[];
  savedAddresses: SavedAddress[];
  selectClassName: string;
  selectedCityCode: string;
  selectedDistrictCode: string;
  selectedSavedAddress: SavedAddress | null;
  selectedSavedAddressId: string;
  selectedWardCode: string;
  standardPreviewFee: number;
  subtotal: number;
  wards: VNLocationOption[];
};

export type CheckoutPaymentSectionProps = {
  formData: CheckoutFormValues;
  handleInputChange: CheckoutInputChangeHandler;
  t: CheckoutTranslator;
  vnpayLogo: string;
};

export type CheckoutSummaryRailProps = {
  appliedCoupon: OrderQuoteCoupon | null;
  cart: CartItem[];
  couponError: string;
  couponSuccessMsg: string;
  discountValue: number;
  handlePlaceOrder: CheckoutSubmitHandler;
  handleRemoveCoupon: () => void;
  isQuoteLoading: boolean;
  loading: boolean;
  onOpenCouponModal: () => void;
  selectedCityCode: string;
  shippingFee: number;
  subtotal: number;
  total: number;
};
