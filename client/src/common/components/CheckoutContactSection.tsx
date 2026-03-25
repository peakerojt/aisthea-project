import { CheckoutSectionCard } from '@/common/components/CheckoutSectionCard';
import { CheckoutContactSectionProps } from '@/common/types/checkout.types';

export const CheckoutContactSection = ({
  fieldErrorClassName,
  fieldLabelClassName,
  formData,
  getFieldError,
  handleInputChange,
  inputClassName,
  t,
}: CheckoutContactSectionProps) => (
  <CheckoutSectionCard
    title={t('sections.contactInfo')}
    description={t('descriptions.contactInfo')}
    style={{ animationDelay: '0.1s' }}
  >
    <div className="space-y-4">
      <div>
        <label htmlFor="checkout-email" className={fieldLabelClassName}>{t('labels.email')}</label>
        <input
          id="checkout-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder={t('placeholders.emailRequired')}
          value={formData.email}
          onChange={handleInputChange}
          className={`${inputClassName} ${getFieldError('email') ? 'border-red-500 focus:border-red-400' : ''}`}
        />
        {getFieldError('email') && <p className={fieldErrorClassName}>{getFieldError('email')}</p>}
      </div>

      <div>
        <label htmlFor="checkout-full-name" className={fieldLabelClassName}>{t('labels.fullName')}</label>
        <input
          id="checkout-full-name"
          type="text"
          name="fullName"
          required
          autoComplete="name"
          placeholder={t('placeholders.fullNameRequired')}
          value={formData.fullName}
          onChange={handleInputChange}
          className={`${inputClassName} ${getFieldError('fullName') ? 'border-red-500 focus:border-red-400' : ''}`}
        />
        {getFieldError('fullName') && <p className={fieldErrorClassName}>{getFieldError('fullName')}</p>}
      </div>

      <div>
        <label htmlFor="checkout-phone" className={fieldLabelClassName}>{t('labels.phone')}</label>
        <input
          id="checkout-phone"
          type="tel"
          name="phone"
          required
          autoComplete="tel"
          inputMode="tel"
          placeholder={t('placeholders.phoneRequired')}
          value={formData.phone}
          onChange={handleInputChange}
          className={`${inputClassName} ${getFieldError('phone') ? 'border-red-500 focus:border-red-400' : ''}`}
        />
        {getFieldError('phone') && <p className={fieldErrorClassName}>{getFieldError('phone')}</p>}
      </div>
    </div>
  </CheckoutSectionCard>
);
