import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import type { ManualPageId, ModuleStatus } from '@talk-me-down/shared';

const PAGE_KEYS: Record<ManualPageId, string> = {
  wires: 'game.wires',
  button: 'game.button',
  keypad: 'game.keypad',
};

export function ModuleStatusRow({ modules }: { modules: ModuleStatus[] }) {
  const { t } = useTranslation();

  return (
    <ul className="module-status">
      {modules.map((module) => (
        <li
          key={module.id}
          className={clsx('module-status__item', module.solved && 'module-status__item--solved')}
        >
          <span className="module-status__led" aria-hidden="true" />
          {t(PAGE_KEYS[module.id])}
        </li>
      ))}
    </ul>
  );
}
