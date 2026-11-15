import { useTranslation } from 'react-i18next';
import { ModuleStatusRow } from './ModuleStatusRow';
import { Strikes } from './Strikes';
import { Timer } from './Timer';
import { useGameStore } from '../lib/store';

export function GameStatusBar() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const serverOffset = useGameStore((store) => store.serverOffset);

  if (!state) return null;

  return (
    <section className="status-bar panel">
      <div className="status-bar__timer">
        <span className="status-bar__label">{t('game.time')}</span>
        <Timer
          deadlineAt={state.deadlineAt}
          serverOffset={serverOffset}
          totalSeconds={state.totalSeconds}
        />
      </div>

      <div className="status-bar__facts">
        <div className="fact">
          <span className="fact__label">{t('game.serial')}</span>
          <span className="fact__value">{state.bombContext?.serial ?? '—'}</span>
        </div>
        <div className="fact">
          <span className="fact__label">{t('game.batteries')}</span>
          <span className="fact__value">{state.bombContext?.batteries ?? '—'}</span>
        </div>
        <div className="fact">
          <span className="fact__label">{t('game.strikes')}</span>
          <Strikes strikes={state.strikes} maxStrikes={state.maxStrikes} />
        </div>
      </div>

      <ModuleStatusRow modules={state.moduleStatus} />
    </section>
  );
}
