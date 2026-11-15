import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { ModuleStatusRow } from '../components/ModuleStatusRow';
import { Strikes } from '../components/Strikes';
import { emitGame } from '../lib/socket';
import { useGameStore } from '../lib/store';

export function ResultScreen() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const auth = useGameStore((store) => store.auth);

  if (!state) return null;

  const me = state.players.find((player) => player.id === auth?.user.id);
  const result = state.result ?? 'aborted';

  return (
    <div className={clsx('result', `result--${result}`)}>
      <div className="result__card panel">
        <p className="eyebrow">{t('app.name')}</p>
        <h1 className="result__title">{t(`result.${result}`)}</h1>
        <p className="result__text">{t(`result.${result}Text`)}</p>
        {state.resultSeconds !== null ? (
          <p className="result__timer">
            {t('result.timeLeft', { seconds: state.resultSeconds })}
          </p>
        ) : null}

        <div className="result__stats">
          <Strikes strikes={state.strikes} maxStrikes={state.maxStrikes} label />
          <ModuleStatusRow modules={state.moduleStatus} />
        </div>

        {me?.isHost ? (
          <button
            type="button"
            className="button button--primary"
            onClick={() => emitGame('game:rematch')}
          >
            {t('result.rematch')}
          </button>
        ) : (
          <p className="result__waiting">{t('result.waitingHost')}</p>
        )}
      </div>
    </div>
  );
}
