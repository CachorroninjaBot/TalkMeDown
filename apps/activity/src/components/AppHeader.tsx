import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Logo } from './Logo';
import { useGameStore } from '../lib/store';

export function AppHeader() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const connection = useGameStore((store) => store.connection);
  const latency = useGameStore((store) => store.latency);

  const role = state?.myRole;

  return (
    <header className="app-header">
      <Logo compact />
      <div className="app-header__meta">
        {state ? (
          <span className="code-chip" title={t('lobby.roomCode')}>
            <span className="code-chip__label">{t('lobby.roomCode')}</span>
            <span className="code-chip__value">{state.roomId}</span>
          </span>
        ) : null}
        {role ? (
          <span className={clsx('role-chip', `role-chip--${role}`)}>{t(`roles.${role}`)}</span>
        ) : null}
        <span
          className={clsx('conn-dot', connection === 'connected' ? 'conn-dot--on' : 'conn-dot--off')}
          title={connection === 'connected' ? t('common.connected') : t('common.offline')}
        >
          <span aria-hidden="true" />
          {connection === 'connected' && latency !== null ? `${latency} ms` : t('common.offline')}
        </span>
      </div>
    </header>
  );
}
