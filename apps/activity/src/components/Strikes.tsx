import { useTranslation } from 'react-i18next';
import clsx from 'clsx';

interface StrikesProps {
  strikes: number;
  maxStrikes: number;
  label?: boolean;
}

export function Strikes({ strikes, maxStrikes, label = false }: StrikesProps) {
  const { t } = useTranslation();

  return (
    <span className="strikes" aria-label={`${t('game.strikes')}: ${strikes}/${maxStrikes}`}>
      {Array.from({ length: maxStrikes }, (_, index) => (
        <span
          key={index}
          className={clsx('strikes__lamp', index < strikes && 'strikes__lamp--on')}
          aria-hidden="true"
        />
      ))}
      {label ? <span className="strikes__text">{t('game.strikes')}</span> : null}
    </span>
  );
}
