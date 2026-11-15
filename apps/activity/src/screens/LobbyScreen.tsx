import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { MAX_PLAYERS, MIN_PLAYERS } from '@talk-me-down/shared';
import { Avatar } from '../components/Avatar';
import { LocaleSelect } from '../components/LocaleSelect';
import { copyText } from '../lib/clipboard';
import { emitGame } from '../lib/socket';
import { useGameStore } from '../lib/store';

export function LobbyScreen() {
  const { t } = useTranslation();
  const state = useGameStore((store) => store.state);
  const auth = useGameStore((store) => store.auth);
  const locales = useGameStore((store) => store.locales);
  const [copied, setCopied] = useState(false);

  if (!state || !auth) return null;

  const me = state.players.find((player) => player.id === auth.user.id);
  const isHost = me?.isHost ?? false;
  const canStart = isHost && state.players.length >= MIN_PLAYERS;

  const copyCode = async () => {
    const ok = await copyText(state.roomId);
    setCopied(ok);
    setTimeout(() => setCopied(false), 2_000);
  };

  return (
    <div className="lobby">
      <section className="lobby__intro">
        <p className="eyebrow">{t('lobby.title')}</p>
        <h1 className="lobby__heading">{t('app.name')}</h1>
        <p className="lobby__subtitle">{t('lobby.subtitle')}</p>

        <div className="room-card">
          <span className="room-card__label">{t('lobby.roomCode')}</span>
          <span className="room-card__code">{state.roomId}</span>
          <button type="button" className="button button--ghost" onClick={copyCode}>
            {copied ? t('common.copied') : t('common.copy')}
          </button>
        </div>

        <div className="role-cards">
          <article className="role-card role-card--defuser">
            <h2>{t('roles.defuser')}</h2>
            <p>{t('roles.defuserHint')}</p>
          </article>
          <article className="role-card role-card--support">
            <h2>{t('roles.support')}</h2>
            <p>{t('roles.supportHint')}</p>
          </article>
        </div>
      </section>

      <section className="lobby__crew panel">
        <header className="panel__head">
          <h2 className="panel__title">
            {t('lobby.crew')}{' '}
            <span className="panel__count">
              {state.players.length}/{MAX_PLAYERS}
            </span>
          </h2>
          <span className="panel__hint">
            {t('lobby.needPlayers', { count: state.players.length, min: MIN_PLAYERS })}
          </span>
        </header>

        <ul className="players">
          {state.players.map((player) => (
            <li
              key={player.id}
              className={clsx(
                'player',
                player.isDefuser && 'player--defuser',
                !player.connected && 'player--offline',
              )}
            >
              <Avatar name={player.name} avatarUrl={player.avatarUrl} color={player.color} />
              <div className="player__info">
                <span className="player__name">
                  {player.name}
                  {player.id === auth.user.id ? <em className="player__you"> · {t('common.you')}</em> : null}
                </span>
                <span className="player__tags">
                  {player.isHost ? <span className="tag">{t('common.host')}</span> : null}
                  {player.isDefuser ? (
                    <span className="tag tag--defuser">{t('roles.defuser')}</span>
                  ) : (
                    <span className="tag tag--muted">{t('roles.support')}</span>
                  )}
                  {!player.connected ? <span className="tag tag--muted">{t('common.offline')}</span> : null}
                </span>
              </div>
              {isHost && !player.isDefuser && state.phase === 'lobby' ? (
                <button
                  type="button"
                  className="button button--tiny"
                  onClick={() => emitGame('lobby:set-defuser', { playerId: player.id })}
                >
                  {t('lobby.chooseDefuser')}
                </button>
              ) : null}
            </li>
          ))}
        </ul>

        <div className="lobby__controls">
          {locales.length > 0 ? (
            isHost ? (
              <LocaleSelect
                locales={locales}
                value={state.contentLocale}
                onChange={(locale) => emitGame('lobby:set-locale', { locale })}
              />
            ) : (
              <div className="field">
                <span className="field__label">{t('lobby.language')}</span>
                <span className="field__value">{state.contentLocale}</span>
              </div>
            )
          ) : null}

          {isHost ? (
            <button
              type="button"
              className="button button--primary button--wide"
              disabled={!canStart}
              onClick={() => emitGame('lobby:start')}
            >
              {t('lobby.start')}
            </button>
          ) : (
            <p className="lobby__waiting">{t('lobby.waitingHost')}</p>
          )}
        </div>
      </section>
    </div>
  );
}
