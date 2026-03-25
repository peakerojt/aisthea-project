import { CSSProperties } from 'react';
import { CheckoutSectionCard } from '@/common/components/CheckoutSectionCard';
import { CheckoutShippingSectionProps } from '@/common/types/checkout.types';
import { formatCurrencyVND } from '@/common/utils/currency';

const selectArrowStyle: CSSProperties = {
  backgroundImage: 'url("data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%23FFFFFF%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E")',
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right .7rem top 50%',
  backgroundSize: '.65rem auto',
};

export const CheckoutShippingSection = ({
  districts,
  fieldErrorClassName,
  fieldLabelClassName,
  formData,
  formatSavedAddressOption,
  getFieldError,
  handleDistrictChange,
  handleInputChange,
  handleProvinceChange,
  handleSavedAddressChange,
  handleWardChange,
  inputClassName,
  isSavedAddressLoading,
  provinces,
  savedAddresses,
  selectClassName,
  selectedCityCode,
  selectedDistrictCode,
  selectedSavedAddress,
  selectedSavedAddressId,
  selectedWardCode,
  standardPreviewFee,
  subtotal,
  t,
  wards,
}: CheckoutShippingSectionProps) => (
  <CheckoutSectionCard
    title={t('sections.shipping')}
    description={t('descriptions.shipping')}
    style={{ animationDelay: '0.2s' }}
  >
    <div className="space-y-4">
      {savedAddresses.length > 0 && (
        <div>
          <label htmlFor="checkout-saved-address" className={fieldLabelClassName}>
            {t('labels.savedAddress')}
          </label>
          <select
            id="checkout-saved-address"
            value={selectedSavedAddressId}
            onChange={handleSavedAddressChange}
            className={`${selectClassName} cursor-pointer text-white`}
            style={selectArrowStyle}
          >
            <option value="">{t('placeholders.manualAddressEntry')}</option>
            {savedAddresses.map((addressOption) => (
              <option key={addressOption.addressId} value={String(addressOption.addressId)}>
                {`${formatSavedAddressOption(addressOption)}${addressOption.isDefault ? ` • ${t('savedAddress.defaultBadge')}` : ''}`}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-gray-400">
            {isSavedAddressLoading ? t('savedAddress.loading') : t('savedAddress.hint')}
          </p>
          {selectedSavedAddress && (
            <p className="mt-2 text-xs text-white/60">
              {formatSavedAddressOption(selectedSavedAddress)}
              {selectedSavedAddress.isDefault ? ` • ${t('savedAddress.defaultDescription')}` : ''}
            </p>
          )}
        </div>
      )}

      <div>
        <label htmlFor="checkout-address" className={fieldLabelClassName}>{t('labels.address')}</label>
        <input
          id="checkout-address"
          type="text"
          name="address"
          required
          autoComplete="street-address"
          placeholder={t('placeholders.addressRequired')}
          value={formData.address}
          onChange={handleInputChange}
          className={`${inputClassName} ${getFieldError('address') ? 'border-red-500 focus:border-red-400' : ''}`}
        />
        {getFieldError('address') && <p className={fieldErrorClassName}>{getFieldError('address')}</p>}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="checkout-city" className={fieldLabelClassName}>{t('labels.city')}</label>
          <select
            id="checkout-city"
            name="city"
            required
            value={selectedCityCode}
            onChange={handleProvinceChange}
            className={`${selectClassName} cursor-pointer text-white ${getFieldError('city') ? 'border-red-500 focus:border-red-400' : ''}`}
            style={selectArrowStyle}
          >
            <option value="" disabled>{t('placeholders.selectProvince')}</option>
            {provinces.map((city) => (
              <option key={city.code} value={city.code}>{city.name}</option>
            ))}
          </select>
          {getFieldError('city') && <p className={fieldErrorClassName}>{getFieldError('city')}</p>}
        </div>

        <div>
          <label htmlFor="checkout-district" className={fieldLabelClassName}>{t('labels.district')}</label>
          <select
            id="checkout-district"
            name="district"
            required
            value={selectedDistrictCode}
            onChange={handleDistrictChange}
            disabled={!selectedCityCode}
            className={`${selectClassName} ${!selectedCityCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'} ${getFieldError('district') ? 'border-red-500 focus:border-red-400' : ''}`}
            style={selectArrowStyle}
          >
            <option value="" disabled>{t('placeholders.selectDistrict')}</option>
            {districts.map((district) => (
              <option key={district.code} value={district.code}>{district.name}</option>
            ))}
          </select>
          {getFieldError('district') && <p className={fieldErrorClassName}>{getFieldError('district')}</p>}
        </div>

        <div>
          <label htmlFor="checkout-ward" className={fieldLabelClassName}>{t('labels.ward')}</label>
          <select
            id="checkout-ward"
            name="ward"
            required
            value={selectedWardCode}
            onChange={handleWardChange}
            disabled={!selectedDistrictCode}
            className={`${selectClassName} ${!selectedDistrictCode ? 'cursor-not-allowed text-gray-500 opacity-50' : 'cursor-pointer text-white'} ${getFieldError('ward') ? 'border-red-500 focus:border-red-400' : ''}`}
            style={selectArrowStyle}
          >
            <option value="" disabled>{t('placeholders.selectWard')}</option>
            {wards.map((ward) => (
              <option key={ward.code} value={ward.code}>{ward.name}</option>
            ))}
          </select>
          {getFieldError('ward') && <p className={fieldErrorClassName}>{getFieldError('ward')}</p>}
        </div>
      </div>

      <div>
        <label htmlFor="checkout-note" className={fieldLabelClassName}>{t('labels.note')}</label>
        <textarea
          id="checkout-note"
          name="note"
          placeholder={t('placeholders.noteOptional')}
          rows={3}
          maxLength={500}
          value={formData.note}
          onChange={handleInputChange}
          aria-describedby="checkout-note-count"
          className={`${inputClassName} resize-none ${getFieldError('note') ? 'border-red-500 focus:border-red-400' : ''}`}
        />
        {getFieldError('note') && <p className={fieldErrorClassName}>{getFieldError('note')}</p>}
        <div id="checkout-note-count" className="mt-1 text-right text-[10px] uppercase tracking-widest text-gray-500">
          {formData.note.length}/500
        </div>
      </div>

      <fieldset className="mt-6 border-t border-border-dark pt-4">
        <legend className="mb-4 text-sm font-bold uppercase tracking-wide text-gray-300">
          {t('labels.shippingMethod')}
        </legend>

        {!selectedCityCode ? (
          <div className="rounded-sm border border-dashed border-yellow-500/50 bg-yellow-500/10 p-4" role="status">
            <p className="text-center text-sm font-medium text-yellow-500">{t('shipping.selectProvinceFirst')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="rounded-sm border border-primary bg-primary/[0.08] px-4 py-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h4 className="text-base font-bold text-white">{t('shipping.standard.title')}</h4>
                  <p className="mt-1 text-sm text-gray-300">{t('shipping.standard.eta')}</p>
                  <p className="mt-3 text-xs text-gray-400">{t('shipping.freeShipPolicy')}</p>
                </div>
                <div className="text-right">
                  <p className={`text-base font-black ${standardPreviewFee === 0 ? 'text-emerald-400' : 'text-white'}`}>
                    {standardPreviewFee === 0 ? t('shipping.free') : formatCurrencyVND(standardPreviewFee)}
                  </p>
                  {subtotal > 500000 && (
                    <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                      {t('shipping.freeShipBadge')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </fieldset>
    </div>
  </CheckoutSectionCard>
);
