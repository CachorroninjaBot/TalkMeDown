import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

export function Logo({ compact = false }: { compact?: boolean }) {
  const { t } = useTranslation();

  return (
    <span className={clsx('logo', compact && 'logo--compact')}>
      <svg className="logo__mark" viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="22" cy="26" r="13" fill="none" stroke="currentColor" strokeWidth="3" />
        <path
          d="M31 17l5-5M36 12h6v6"
          fill="none"
          stroke="var(--green)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M17 21l10 10M27 21L17 31"
          stroke="var(--red)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      </svg>
      <span className="logo__text">
        <span className="logo__name">{t('app.name')}</span>
        {compact ? null : <span className="logo__tagline">{t('app.tagline')}</span>}
      </span>
    </span>
  );
}
