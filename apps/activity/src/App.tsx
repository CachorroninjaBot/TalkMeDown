import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from './components/AppHeader';
import { ConnectionBanner } from './components/ConnectionBanner';
import { ErrorToast } from './components/ErrorToast';
import { Logo } from './components/Logo';
import { NoticeToast } from './components/NoticeToast';
import { BriefingScreen } from './screens/BriefingScreen';
import { GameScreen } from './screens/GameScreen';
import { LobbyScreen } from './screens/LobbyScreen';
import { ResultScreen } from './screens/ResultScreen';
import { bootstrap } from './bootstrap';
import { useGameStore } from './lib/store';

function BootScreen({ error }: { error: string | null }) {
  const { t } = useTranslation();

  return (
    <div className="boot">
      <div className="boot__card">
        <Logo />
        <p className="boot__tagline">{t('app.tagline')}</p>
        {error ? (
          <>
            <h1 className="boot__title">{t('app.bootError')}</h1>
            <p className="boot__error">{error}</p>
            <button
              type="button"
              className="button button--primary"
              onClick={() => window.location.reload()}
            >
              {t('app.retry')}
            </button>
          </>
        ) : (
          <span className="boot__spinner" aria-label={t('app.loading')} />
        )}
      </div>
    </div>
  );
}

function CurrentScreen() {
  const phase = useGameStore((store) => store.state?.phase);

  switch (phase) {
    case 'lobby':
      return <LobbyScreen />;
    case 'briefing':
      return <BriefingScreen />;
    case 'game':
      return <GameScreen />;
    case 'result':
      return <ResultScreen />;
    default:
      return null;
  }
}

export default function App() {
  const { t } = useTranslation();
  const status = useGameStore((store) => store.status);
  const bootError = useGameStore((store) => store.bootError);
  const state = useGameStore((store) => store.state);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void bootstrap();
  }, []);

  if (status === 'error') return <BootScreen error={bootError} />;
  if (status !== 'ready') return <BootScreen error={null} />;

  if (!state) {
    return (
      <div className="boot">
        <div className="boot__card">
          <Logo />
          <span className="boot__spinner" aria-label={t('app.loading')} />
          <p className="boot__tagline">{t('app.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <AppHeader />
      <main className="app-main">
        <CurrentScreen />
      </main>
      <ErrorToast />
      <NoticeToast />
      <ConnectionBanner />
    </div>
  );
}
