import { useTranslation } from 'react-i18next';
import { ButtonModule } from '../components/modules/ButtonModule';
import { KeypadModule } from '../components/modules/KeypadModule';
import { WireModule } from '../components/modules/WireModule';
import { ManualPanel } from '../components/ManualPanel';
import { GameStatusBar } from '../components/GameStatusBar';
import { Avatar } from '../components/Avatar';
import { useContentResource } from '../lib/content';
import { emitGame } from '../lib/socket';
import { useGameStore } from '../lib/store';

export function GameScreen() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const content = useContentResource(state?.contentLocale);

  if (!state) return null;

  const resource = content?.resource ?? null;
  const isDefuser = state.myRole === 'defuser';
  const bomb = state.bomb;

  return (
    <div className="game">
      <GameStatusBar />

      {isDefuser ? (
        <div className="game__defuser">
          <div className="bomb panel">
            <header className="bomb__head">
              <div>
                <p className="eyebrow">{t('game.defuserConsole')}</p>
                <h1 className="bomb__title">{t('game.title')}</h1>
              </div>
              <span className="bomb__hint">{t('game.onlyDefuser')}</span>
            </header>

            {bomb ? (
              <div className="bomb__modules">
                {bomb.wires ? (
                  <WireModule
                    wires={bomb.wires}
                    solved={state.moduleStatus.find((module) => module.id === 'wires')?.solved ?? false}
                    disabled={false}
                    onCut={(wireId) => emitGame('game:cut-wire', { wireId })}
                  />
                ) : null}
                {bomb.button ? (
                  <ButtonModule
                    button={bomb.button}
                    solved={state.moduleStatus.find((module) => module.id === 'button')?.solved ?? false}
                    disabled={false}
                    contentResource={resource}
                    onPress={() => emitGame('game:press-button')}
                    onRelease={() => emitGame('game:release-button')}
                  />
                ) : null}
                {bomb.keypad ? (
                  <KeypadModule
                    keypad={bomb.keypad}
                    solved={state.moduleStatus.find((module) => module.id === 'keypad')?.solved ?? false}
                    disabled={false}
                    onPress={(symbol) => emitGame('game:press-keypad', { symbol })}
                  />
                ) : null}
              </div>
            ) : (
              <p className="bomb__empty">{t('app.loading')}</p>
            )}
          </div>

          <aside className="game__aside">
            <section className="panel aside-card">
              <h2 className="aside-card__title">{t('roles.defuser')}</h2>
              <p className="aside-card__text">{t('briefing.defuser')}</p>
              <ul className="side-players">
                {state.players.map((player) => (
                  <li
                    key={player.id}
                    className={player.connected ? 'side-player' : 'side-player side-player--offline'}
                  >
                    <Avatar
                      name={player.name}
                      avatarUrl={player.avatarUrl}
                      color={player.color}
                      size="sm"
                    />
                    <span className="side-player__name">{player.name}</span>
                    <span className="side-player__role">
                      {player.isDefuser ? t('roles.defuser') : t('roles.support')}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </aside>
        </div>
      ) : (
        <div className="game__support">
          <p className="game__support-hint">{t('game.askDefuser')}</p>
          <ManualPanel resource={resource} pages={state.myManualPages} />
        </div>
      )}
    </div>
  );
}
