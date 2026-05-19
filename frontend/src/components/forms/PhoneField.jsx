import { PHONE_COUNTRIES } from '../../utils/phoneCountries.js';

export default function PhoneField({ lang = 'ar', label, countryCode = 'SY', phone = '', onCountryChange, onPhoneChange, error, required = false }) {
  return <label>{label || (lang === 'ar' ? 'رقم الهاتف' : 'Phone number')}
    <div className="phone-field" style={{ display: 'grid', gridTemplateColumns: 'minmax(9rem, 12rem) 1fr', gap: '.6rem' }}>
      <select value={countryCode} onChange={e => onCountryChange(e.target.value)} aria-label={lang === 'ar' ? 'رمز الدولة' : 'Country code'} required={required}>
        {PHONE_COUNTRIES.map(country => <option key={country.code} value={country.code}>
          {country.dialCode} — {lang === 'ar' ? country.ar : country.en}
        </option>)}
      </select>
      <input
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={e => onPhoneChange(e.target.value)}
        placeholder={lang === 'ar' ? 'اكتب الرقم بدون رمز الدولة' : 'Number without country code'}
        required={required}
      />
    </div>
    {error && <p className="error-box" role="alert">{error}</p>}
  </label>;
}
