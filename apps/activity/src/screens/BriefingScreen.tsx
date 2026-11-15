import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { BRIEFING_SECONDS } from '@talk-me-down/shared';
import { Timer } from '../components/Timer';
import { useGameStore } from '../lib/store';
import { useNow } from '../lib/useNow';

const PAGE_KEYS: Record<string, string> = {
  wires: 'game.wires',
  button: 'game.button',
  keypad: 'game.keypad',
};

export function BriefingScreen() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const serverOffset = useGameStore((store) => store.serverOffset);
  const now = useNow(250);

  if (!state) return null;

  const isDefuser = state.myRole === 'defuser';
  const remaining =
    state.deadlineAt === null
      ? BRIEFING_SECONDS
      : Math.max(0, Math.ceil((state.deadlineAt - (now + serverOffset)) / 1000));

  return (
    <div className="briefing">
      <div className={clsx('briefing__card panel', isDefuser ? 'briefing__card--defuser' : 'briefing__card--support')}>
        <span className="briefing__role">{isDefuser ? t('roles.defuser') : t('roles.support')}</span>
        <h1 className="briefing__title">{t('briefing.title')}</h1>
        <p className="briefing__text">{isDefuser ? t('briefing.defuser') : t('briefing.support')}</p>

        {!isDefuser && state.myManualPages.length > 0 ? (
          <ul className="briefing__pages">
            {state.myManualPages.map((page) => (
              <li key={page} className="tag tag--page">
                {t(PAGE_KEYS[page] ?? page)}
              </li>
            ))}
          </ul>
        ) : null}

        <Timer
          deadlineAt={state.deadlineAt}
          serverOffset={serverOffset}
          totalSeconds={BRIEFING_SECONDS}
        />
        <p className="briefing__countdown">{t('briefing.startingIn', { seconds: remaining })}</p>
        <p className="briefing__strikes">{t('briefing.strikes')}</p>
      </div>
    </div>
  );
}
