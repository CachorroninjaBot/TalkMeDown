import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PublicButton, StripColor } from '@talk-me-down/shared';
import { contentText } from '../../lib/content';

interface ButtonModuleProps {
  button: PublicButton;
  solved: boolean;
  disabled: boolean;
  contentResource: Record<string, unknown> | null;
  onPress: () => void;
  onRelease: () => void;
}

const STRIP_NAMES: Record<StripColor, string> = {
  blue: 'colors.blue',
  white: 'colors.white',
  yellow: 'colors.yellow',
  red: 'colors.red',
};

export function ButtonModule({
  button,
  solved,
  disabled,
  contentResource,
  onPress,
  onRelease,
}: ButtonModuleProps) {
  const { t } = useTranslation();
  const [armed, setArmed] = useState(false);
  const label = contentText(contentResource, `labels.${button.label}`, button.label.toUpperCase());
  const stripName = button.strip
    ? contentText(contentResource, STRIP_NAMES[button.strip], button.strip)
    : null;

  const begin = () => {
    if (disabled || solved || armed) return;
    setArmed(true);
    onPress();
  };

  const end = () => {
    if (!armed) return;
    setArmed(false);
    onRelease();
  };

  return (
    <section className={clsx('module', solved && 'module--solved')}>
      <header className="module__head">
        <h3 className="module__title">{t('game.button')}</h3>
        <span className={clsx('module__state', solved && 'module__state--solved')}>
          {solved ? t('game.solved') : t('game.armed')}
        </span>
      </header>
      <div className="button-module">
        <button
          type="button"
          className={clsx('bomb-button', `bomb-button--${button.color}`, button.holding && 'bomb-button--held')}
          disabled={disabled || solved}
          onPointerDown={(event) => {
            event.preventDefault();
            event.currentTarget.setPointerCapture(event.pointerId);
            begin();
          }}
          onPointerUp={end}
          onPointerCancel={end}
          onPointerLeave={end}
          onContextMenu={(event) => event.preventDefault()}
          onKeyDown={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            if (!event.repeat) begin();
          }}
          onKeyUp={(event) => {
            if (event.key !== ' ' && event.key !== 'Enter') return;
            event.preventDefault();
            end();
          }}
        >
          <span className="bomb-button__cap">
            <span className="bomb-button__label">{label}</span>
          </span>
        </button>
        <div className="button-module__hint">
          {button.holding ? (
            <>
              <span className="holding-dot" aria-hidden="true" />
              <span>{t('game.holding')}</span>
              {stripName ? (
                <span className={clsx('strip-chip', `strip-chip--${button.strip}`)}>
                  {t('game.strip')}: {stripName}
                </span>
              ) : null}
            </>
          ) : (
            <span>{t('game.hold')} · {t('game.release')}</span>
          )}
        </div>
      </div>
    </section>
  );
}
