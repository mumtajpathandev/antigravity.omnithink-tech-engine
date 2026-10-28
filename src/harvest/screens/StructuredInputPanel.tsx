import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { harvestApi } from '../api';
import type { StyleDetail, TechEngineInput } from '../types';
import { dedupeDevObjects, str, shapePlugin, shapeSeasonalDoc, shapeStyles } from './structuredInputLogic';
import type { PluginDataFile, PluginView, SeasonalView, StyleRow, DevObjectRow, PluginMaterialRow } from './structuredInputLogic';

const card = 'bg-white rounded-lg border border-slate-200 shadow-xs';
const th = 'px-3 py-2 text-left text-xs font-semibold text-slate-500';
const td = 'px-3 py-1.5 text-sm align-top';

// ---------------------------------------------------------------- small UI helpers

const Note: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="p-3 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-md">{children}</div>
);
const Blank = () => <span className="text-slate-400" aria-label="none">-</span>;
const Json: React.FC<{ value: unknown }> = ({ value }) => (
  <pre className="max-h-[420px] overflow-auto text-xs leading-relaxed bg-slate-900 text-slate-100 rounded-md p-3 font-mono">{JSON.stringify(value, null, 2)}</pre>
);
const Pill: React.FC<{ tone: 'green' | 'amber' | 'slate'; children: React.ReactNode }> = ({ tone, children }) => {
  const c = tone === 'green' ? 'bg-emerald-100 text-emerald-800' : tone === 'amber' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600';
  return <span className={`text-xs px-1.5 py-0.5 rounded whitespace-nowrap ${c}`}>{children}</span>;
};

/** Accordion item: a button with aria-expanded; children are only rendered while open. */
const Item: React.FC<{ title: React.ReactNode; meta?: React.ReactNode; children: React.ReactNode }> = ({ title, meta, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <li className="border-t border-slate-100 first:border-t-0">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-slate-400"
      >
        {open ? <ChevronDown size={16} className="shrink-0 text-slate-500" /> : <ChevronRight size={16} className="shrink-0 text-slate-500" />}
        <span className="text-sm font-medium text-slate-800 min-w-0 break-words">{title}</span>
        {meta && <span className="ml-auto pl-2 text-xs text-slate-500 text-right shrink-0">{meta}</span>}
      </button>
      {open && <div className="px-4 pb-4 pt-1 sm:pl-10 space-y-3">{children}</div>}
    </li>
  );
};

/** Section card whose header toggles it; `onFirstOpen` fires once (lazy loading). */
const Section: React.FC<{ title: string; hint?: string; onOpen?: () => void; children: React.ReactNode }> = ({ title, hint, onOpen, children }) => {
  const [open, setOpen] = useState(false);
  return (
    <section className={card}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((o) => !o);
        }}
        className="w-full flex items-center gap-2 px-4 py-3 text-left focus-visible:outline-2 focus-visible:outline-slate-400 rounded-lg"
      >
        {open ? <ChevronDown size={18} className="text-slate-500" /> : <ChevronRight size={18} className="text-slate-500" />}
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {hint && <span className="ml-auto text-xs text-slate-500">{hint}</span>}
      </button>
      {open && <div className="border-t border-slate-100">{children}</div>}
    </section>
  );
};

const KV: React.FC<{ rows: { label: string; value: string }[] }> = ({ rows }) => (
  <dl className="grid grid-cols-1 sm:grid-cols-[9rem_1fr] gap-x-4 gap-y-1 text-sm">
    {rows.map((r) => (
      <React.Fragment key={r.label}>
        <dt className="text-xs uppercase tracking-wider text-slate-500 font-semibold sm:pt-0.5">{r.label}</dt>
        <dd className="text-slate-800 break-words min-w-0">{r.value}</dd>
      </React.Fragment>
    ))}
  </dl>
);

const Table: React.FC<{ head: string[]; children: React.ReactNode }> = ({ head, children }) => (
  <div className="overflow-x-auto rounded-md border border-slate-200">
    <table className="w-full min-w-[480px]">
      <thead className="bg-slate-50"><tr>{head.map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
  </div>
);

// ---------------------------------------------------------------- lazy loader

type Load<T> = { state: 'idle' } | { state: 'loading' } | { state: 'error'; message: string } | { state: 'done'; data: T | null };

function useLazyJson<T>(styleRef: string, name: 'pluginData' | 'styleSeasonal') {
  const [load, setLoad] = useState<Load<T>>({ state: 'idle' });
  useEffect(() => setLoad({ state: 'idle' }), [styleRef]);
  const start = useCallback(() => {
    setLoad((cur) => {
      if (cur.state !== 'idle') return cur;
      harvestApi
        .styleJson<T>(styleRef, name)
        .then((data) => setLoad({ state: 'done', data }))
        .catch((e) => setLoad({ state: 'error', message: e instanceof Error ? e.message : String(e) }));
      return { state: 'loading' };
    });
  }, [styleRef, name]);
  return [load, start] as const;
}

const LoadState: React.FC<{ load: Load<unknown>; empty: string }> = ({ load, empty }) => {
  if (load.state === 'loading' || load.state === 'idle') return <div className="p-4 text-sm text-slate-500" role="status">Loading saved file...</div>;
  if (load.state === 'error') return <div role="alert" className="m-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">{load.message}</div>;
  return <div className="p-4"><Note>{empty}</Note></div>;
};

// ---------------------------------------------------------------- sections

const StylesSection: React.FC<{ t: TechEngineInput }> = ({ t }) => {
  const { styles, unlinked, collapsed } = shapeStyles(t);
  const s = t.summary;
  const devTable = (rows: DevObjectRow[]) =>
    rows.length === 0 ? (
      <Note>No development objects are listed for this style.</Note>
    ) : (
      <Table head={['Development object', 'PDAM', 'Materials', 'In development']}>
        {rows.map((r) => (
          <tr key={r.devObjectId}>
            <td className={td}><span className="font-mono">{r.devObjectId}</span>{r.name && <div className="text-xs text-slate-500">{r.name}</div>}</td>
            <td className={td}>{r.confirmed ? <Pill tone="green">confirmed in PDAM</Pill> : <Pill tone="amber">not confirmed</Pill>}</td>
            <td className={td}>{r.hasParts ? r.materialCount : <Blank />}</td>
            <td className={td}>{r.hasParts ? r.inDevCount : <Blank />}</td>
          </tr>
        ))}
      </Table>
    );
  return (
    <Section title="Styles" hint={`${styles.length} style${styles.length === 1 ? '' : 's'}`}>
      {styles.length === 0 ? (
        <div className="p-4"><Note>No style ids were read for this master style.</Note></div>
      ) : (
        <ul>
          {styles.map((st) => (
            <Item key={st.styleId} title={<span className="font-mono">{st.styleId}</span>} meta={`${st.devObjects.length} dev object${st.devObjects.length === 1 ? '' : 's'}`}>
              <KV rows={[
                { label: 'Season', value: str(t.seasonYear) || '-' },
                { label: 'Classification', value: str(t.classification) || '-' },
                { label: 'Summary', value: s ? `${s.styleCount} styles, ${s.developmentObjectCount} dev objects, ${s.partCount} parts, ${s.materialCount} materials` : '-' }
              ]} />
              {devTable(st.devObjects)}
            </Item>
          ))}
        </ul>
      )}
      {unlinked.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="text-xs text-slate-500">Development objects from the plugin that match none of the listed styles</div>
          {devTable(unlinked)}
        </div>
      )}
      {collapsed > 0 && <div className="px-4 pb-4 text-xs text-slate-500">{collapsed} repeated save{collapsed === 1 ? '' : 's'} of the same development object collapsed (last copy used).</div>}
    </Section>
  );
};

const SeasonalSection: React.FC<{ styleRef: string }> = ({ styleRef }) => {
  const [load, start] = useLazyJson<unknown>(styleRef, 'styleSeasonal');
  const docs = load.state === 'done' && Array.isArray(load.data) ? load.data : null;
  const [raw, setRaw] = useState<Record<number, boolean>>({});
  return (
    <Section title="Style seasonal" hint={docs ? `${docs.length} document${docs.length === 1 ? '' : 's'}` : undefined} onOpen={start}>
      {docs && docs.length > 0 ? (
        <ul>
          {docs.map((doc, i) => {
            const v = shapeSeasonalDoc(doc, i);
            return (
              <Item key={i} title={v.title} meta={v.devObjects.length ? `${v.devObjects.length} dev object${v.devObjects.length === 1 ? '' : 's'}` : undefined}>
                {v.fields.length > 0 ? <KV rows={v.fields} /> : <Note>This document has no style properties.</Note>}
                {v.devObjects.length > 0 && (
                  <Table head={['Development object', 'Name', 'Status']}>
                    {v.devObjects.map((d, j) => (
                      <tr key={`${d.id}-${j}`}>
                        <td className={`${td} font-mono`}>{d.id}</td>
                        <td className={td}>{d.name || <Blank />}</td>
                        <td className={td}>{d.status || <Blank />}</td>
                      </tr>
                    ))}
                  </Table>
                )}
                <button
                  type="button"
                  aria-pressed={!!raw[i]}
                  onClick={() => setRaw((r) => ({ ...r, [i]: !r[i] }))}
                  className="text-xs px-2 py-1 rounded border border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  {raw[i] ? 'Hide raw JSON' : 'Show raw JSON'}
                </button>
                {raw[i] && <Json value={doc} />}
              </Item>
            );
          })}
        </ul>
      ) : (
        <LoadState load={load.state === 'done' && load.data !== null && !docs ? { state: 'error', message: 'The saved style seasonal file is not a list of documents.' } : load} empty="No style seasonal file was saved for this style." />
      )}
    </Section>
  );
};

const PluginSection: React.FC<{ styleRef: string }> = ({ styleRef }) => {
  const [load, start] = useLazyJson<PluginDataFile>(styleRef, 'pluginData');
  const view = load.state === 'done' ? shapePlugin(load.data) : null;
  return (
    <Section title="Plugin data" hint={view ? `${view.parts.length} parts, ${view.devObjects.length} dev objects` : undefined} onOpen={start}>
      {view ? (
        <div className="space-y-4 py-3">
          <div>
            <h4 className="px-4 pb-1 text-xs uppercase tracking-wider text-slate-500 font-semibold">Parts</h4>
            {view.parts.length === 0 ? (
              <div className="px-4"><Note>The plugin file lists no parts.</Note></div>
            ) : (
              <ul>
                {view.parts.map((p) => (
                  <Item key={p.partId} title={p.name || p.partId} meta={[p.partType, p.placement].filter(Boolean).join(' / ')}>
                    <KV rows={[
                      { label: 'Part id', value: p.partId },
                      { label: 'Part type', value: p.partType || '-' },
                      { label: 'Placement', value: p.placement || '-' },
                      { label: 'Linked', value: p.linked === undefined ? '-' : p.linked ? 'yes' : 'no' },
                      { label: 'Used by', value: p.usedBy.length ? p.usedBy.join(', ') : 'no dev object assigns a material to it' }
                    ]} />
                  </Item>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4 className="px-4 pb-1 text-xs uppercase tracking-wider text-slate-500 font-semibold">Development objects</h4>
            {view.collapsed > 0 && (
              <div className="px-4 pb-2 text-xs text-slate-500">
                The plugin saved some development objects more than once: {view.collapsed} extra cop{view.collapsed === 1 ? 'y was' : 'ies were'} collapsed, each id is shown once (last copy wins).
              </div>
            )}
            {view.devObjects.length === 0 ? (
              <div className="px-4"><Note>The plugin file lists no development objects.</Note></div>
            ) : (
              <ul>
                {view.devObjects.map((d) => (
                  <Item key={d.devObjectId} title={<span><span className="font-mono">{d.devObjectId}</span>{d.name ? ` - ${d.name}` : ''}</span>} meta={`${d.materials.length} material${d.materials.length === 1 ? '' : 's'}`}>
                    <KV rows={[
                      { label: 'Dev object id', value: d.devObjectId },
                      { label: 'Name', value: d.name || '-' },
                      { label: 'Style id', value: d.styleId || '-' }
                    ]} />
                    {d.materials.length === 0 ? (
                      <Note>No materials are assigned to this dev object.</Note>
                    ) : (
                      <Table head={['Part', 'Placement', 'Material', 'Article no.', 'Label']}>
                        {d.materials.map((m, i) => (
                          <tr key={i}>
                            <td className={td}>{m.partName}</td>
                            <td className={td}>{m.placement || <Blank />}</td>
                            <td className={td}>
                              <span className={m.isInDevelopment ? 'line-through text-slate-400' : ''}>{m.materialName}</span>
                              {m.isInDevelopment && <span className="ml-1.5 text-xs px-1 rounded bg-amber-100 text-amber-800">in development</span>}
                            </td>
                            <td className={`${td} font-mono`}>{m.articleNumber || <Blank />}</td>
                            <td className={`${td} text-xs`}>{m.label || <Blank />}</td>
                          </tr>
                        ))}
                      </Table>
                    )}
                  </Item>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : (
        <LoadState load={load} empty="No plugin data was saved for this style." />
      )}
    </Section>
  );
};

// ---------------------------------------------------------------- screen

export const StructuredInputPanel: React.FC<{ detail: StyleDetail; styleRef: string }> = ({ detail, styleRef }) => {
  const t = detail.techInput;
  const s = t.summary;
  const bits = [
    t.masterStyleID,
    t.seasonYear ? `season ${t.seasonYear}` : null,
    t.classification ? t.classification : null,
    s ? `${s.styleCount} styles, ${s.developmentObjectCount} dev objects, ${s.partCount} parts, ${s.materialCount} materials` : null
  ].filter(Boolean);
  return (
    <div className="space-y-4">
      <div className={`${card} px-4 py-3`}>
        <div className="text-sm font-semibold text-slate-800 break-words">{bits.join(' | ')}</div>
        <p className="text-xs text-slate-500 mt-1">Saved data: nothing here is fetched now. Open an item to see what was read earlier from PDAM.</p>
      </div>
      <StylesSection t={t} />
      <SeasonalSection styleRef={styleRef} />
      <PluginSection styleRef={styleRef} />
    </div>
  );
};
