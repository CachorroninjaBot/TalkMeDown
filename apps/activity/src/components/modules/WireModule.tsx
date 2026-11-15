import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { PublicWire } from '@talk-me-down/shared';

interface WireModuleProps {
  wires: PublicWire[];
  solved: boolean;
  disabled: boolean;
  onCut: (wireId: string) => void;
}

export function WireModule({ wires, solved, disabled, onCut }: WireModuleProps) {
  const { t } = useTranslation();

  return (
    <section className={clsx('module', solved && 'module--solved')}>
      <header className="module__head">
        <h3 className="module__title">{t('game.wires')}</h3>
        <span className={clsx('module__state', solved && 'module__state--solved')}>
          {solved ? t('game.solved') : t('game.armed')}
        </span>
      </header>
      <div className="wires" role="group" aria-label={t('game.wires')}>
        {wires.map((wire, index) => (
          <button
            key={wire.id}
            type="button"
            className={clsx('wire', `wire--${wire.color}`, wire.cut && 'wire--cut')}
            disabled={disabled || solved || wire.cut}
            onClick={() => onCut(wire.id)}
            aria-label={`${t('game.cutWire')} ${index + 1} (${wire.color})`}
          >
            <span className="wire__line" aria-hidden="true" />
            <span className="wire__terminal wire__terminal--top" aria-hidden="true" />
            <span className="wire__terminal wire__terminal--bottom" aria-hidden="true" />
            <span className="wire__index" aria-hidden="true">
              {index + 1}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}
