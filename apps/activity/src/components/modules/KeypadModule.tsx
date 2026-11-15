import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PublicKeypad } from '@talk-me-down/shared';

interface KeypadModuleProps {
  keypad: PublicKeypad;
  solved: boolean;
  disabled: boolean;
  onPress: (symbol: string) => void;
}

export function KeypadModule({ keypad, solved, disabled, onPress }: KeypadModuleProps) {
  const { t } = useTranslation();

  return (
    <section className={clsx('module', solved && 'module--solved')}>
      <header className="module__head">
        <h3 className="module__title">{t('game.keypad')}</h3>
        <span className={clsx('module__state', solved && 'module__state--solved')}>
          {solved ? t('game.solved') : t('game.armed')}
        </span>
      </header>
      <div className="keypad" role="group" aria-label={t('game.keypad')}>
        {keypad.symbols.map((symbol) => {
          const entered = keypad.entered.includes(symbol);
          return (
            <button
              key={symbol}
              type="button"
              className={clsx('keypad__key', entered && 'keypad__key--entered')}
              disabled={disabled || solved}
              onClick={() => onPress(symbol)}
            >
              {symbol}
            </button>
          );
        })}
      </div>
      <div className="keypad__progress" aria-hidden="true">
        {Array.from({ length: 4 }, (_, index) => (
          <span
            key={index}
            className={clsx('keypad__slot', index < keypad.entered.length && 'keypad__slot--filled')}
          />
        ))}
      </div>
    </section>
  );
}
