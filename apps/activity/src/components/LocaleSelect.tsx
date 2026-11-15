import { useTranslation } from 'react-i18next';
import type { LocaleInfo } from '@talk-me-down/shared';

interface LocaleSelectProps {
  locales: LocaleInfo[];
  value: string;
  disabled?: boolean;
  onChange: (locale: string) => void;
}

export function LocaleSelect({ locales, value, disabled = false, onChange }: LocaleSelectProps) {
  const { t } = useTranslation();

  return (
    <label className="field">
      <span className="field__label">{t('lobby.language')}</span>
      <select
        className="select"
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      >
        {locales.map((locale) => (
          <option key={locale.code} value={locale.code}>
            {locale.nativeName} · {locale.name}
          </option>
        ))}
      </select>
      <span className="field__hint">{t('lobby.languageHint')}</span>
    </label>
  );
}
