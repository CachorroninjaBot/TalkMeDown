import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { KEYPAD_COLUMNS } from '@talk-me-down/shared';
import type { ManualPageId } from '@talk-me-down/shared';
import { contentList, contentText } from '../lib/content';

const PAGE_KEYS: Record<ManualPageId, string> = {
  wires: 'game.wires',
  button: 'game.button',
  keypad: 'game.keypad',
};

interface ManualPanelProps {
  resource: Record<string, unknown> | null;
  pages: ManualPageId[];
}

function RuleList({ rules }: { rules: string[] }) {
  if (rules.length === 0) return null;
  return (
    <ol className="manual__rules">
      {rules.map((rule, index) => (
        <li key={index}>{rule}</li>
      ))}
    </ol>
  );
}

function WiresPage({ resource }: { resource: Record<string, unknown> | null }) {
  const { t } = useTranslation();
  return (
    <>
      <p className="manual__intro">{contentText(resource, 'manual.wires.intro')}</p>
      {(['4', '5', '6'] as const).map((count) => (
        <div className="manual__group" key={count}>
          <h4 className="manual__group-title">
            {t('game.wires')} · {count}
          </h4>
          <RuleList rules={contentList(resource, `manual.wires.rules${count}`)} />
        </div>
      ))}
      <p className="manual__note">{contentText(resource, 'manual.wires.note')}</p>
    </>
  );
}

function ButtonPage({ resource }: { resource: Record<string, unknown> | null }) {
  return (
    <>
      <p className="manual__intro">{contentText(resource, 'manual.button.intro')}</p>
      <RuleList rules={contentList(resource, 'manual.button.rules')} />
      <h4 className="manual__group-title">{contentText(resource, 'manual.button.releaseTitle')}</h4>
      <p className="manual__intro">{contentText(resource, 'manual.button.releaseIntro')}</p>
      <RuleList rules={contentList(resource, 'manual.button.releaseRules')} />
      <p className="manual__note manual__note--warning">
        {contentText(resource, 'manual.button.releaseWarning')}
      </p>
    </>
  );
}

function KeypadPage({ resource }: { resource: Record<string, unknown> | null }) {
  return (
    <>
      <p className="manual__intro">{contentText(resource, 'manual.keypad.intro')}</p>
      <h4 className="manual__group-title">{contentText(resource, 'manual.keypad.columnsTitle')}</h4>
      <div className="symbol-columns">
        {KEYPAD_COLUMNS.map((column, index) => (
          <div className="symbol-column" key={index}>
            <span className="symbol-column__index">{index + 1}</span>
            {column.map((symbol) => (
              <span className="symbol-column__symbol" key={symbol}>
                {symbol}
              </span>
            ))}
          </div>
        ))}
      </div>
      <p className="manual__note manual__note--warning">
        {contentText(resource, 'manual.keypad.warning')}
      </p>
    </>
  );
}

function PageBody({
  page,
  resource,
}: {
  page: ManualPageId;
  resource: Record<string, unknown> | null;
}) {
  if (page === 'wires') return <WiresPage resource={resource} />;
  if (page === 'button') return <ButtonPage resource={resource} />;
  return <KeypadPage resource={resource} />;
}

export function ManualPanel({ resource, pages }: ManualPanelProps) {
  const { t } = useTranslation();
  const [active, setActive] = useState<ManualPageId | null>(pages[0] ?? null);

  useEffect(() => {
    if (!active || !pages.includes(active)) {
      setActive(pages[0] ?? null);
    }
  }, [pages, active]);

  const sharedRules = contentList(resource, 'manual.sharedRules');

  return (
    <section className="manual panel">
      <header className="manual__head">
        <div>
          <h2 className="manual__title">{t('game.manualConsole')}</h2>
          <p className="manual__subtitle">{contentText(resource, 'manual.intro', t('game.watchBomb'))}</p>
        </div>
        <span className="manual__badge">{t('game.yourPages')}</span>
      </header>

      <div className="manual__shared">
        <h3 className="manual__shared-title">{contentText(resource, 'manual.sharedTitle')}</h3>
        <ul className="manual__shared-rules">
          {sharedRules.map((rule, index) => (
            <li key={index}>{rule}</li>
          ))}
        </ul>
      </div>

      {pages.length === 0 || !active ? (
        <p className="manual__empty">{t('game.noPages')}</p>
      ) : (
        <>
          <div className="manual__tabs" role="tablist" aria-label={t('game.yourPages')}>
            {pages.map((page) => (
              <button
                key={page}
                type="button"
                role="tab"
                aria-selected={page === active}
                className={clsx('manual__tab', page === active && 'manual__tab--active')}
                onClick={() => setActive(page)}
              >
                {t(PAGE_KEYS[page])}
              </button>
            ))}
          </div>
          <div className="manual__body" role="tabpanel">
            <h3 className="manual__page-title">{contentText(resource, `manual.${active}.title`)}</h3>
            <PageBody page={active} resource={resource} />
          </div>
        </>
      )}
    </section>
  );
}
