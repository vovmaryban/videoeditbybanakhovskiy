import React from 'react';

export const Row: React.FC<{ label: string; children: React.ReactNode; hint?: string }> = ({ label, children, hint }) => (
  <label className="row">
    <span className="row-label">{label}{hint && <em>{hint}</em>}</span>
    <span className="row-ctl">{children}</span>
  </label>
);

export const Slider: React.FC<{ label: string; value: number; min: number; max: number; step?: number; onChange: (v: number) => void; fmt?: (v: number) => string }> = ({ label, value, min, max, step = 1, onChange, fmt }) => (
  <Row label={label}>
    <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
    <span className="val">{fmt ? fmt(value) : value}</span>
  </Row>
);

const toHex = (c: string) => {
  if (/^#[0-9a-f]{6}$/i.test(c)) return c;
  const m = c.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  return m ? `#${[m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('')}` : '#ffffff';
};

export const Color: React.FC<{ label: string; value: string; onChange: (v: string) => void }> = ({ label, value, onChange }) => (
  <Row label={label}>
    <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} />
    <span className="val mono">{toHex(value).toUpperCase()}</span>
  </Row>
);

export const Swatches: React.FC<{ label: string; value: string; colors: string[]; onChange: (v: string) => void }> = ({ label, value, colors, onChange }) => (
  <Row label={label}>
    <span className="swatches">
      {colors.map((c) => (
        <button key={c} className={`sw ${toHex(value).toLowerCase() === c.toLowerCase() ? 'on' : ''}`} style={{ background: c }} onClick={(e) => { e.preventDefault(); onChange(c); }} />
      ))}
      <input type="color" value={toHex(value)} onChange={(e) => onChange(e.target.value)} title="Свій колір" />
    </span>
  </Row>
);

export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <Row label={label}>
      <span className="seg">
        {options.map(([v, l]) => (
          <button key={v} className={v === value ? 'on' : ''} onClick={(e) => { e.preventDefault(); onChange(v); }}>{l}</button>
        ))}
      </span>
    </Row>
  );
}

export const Toggle: React.FC<{ label: string; value: boolean; onChange: (v: boolean) => void }> = ({ label, value, onChange }) => (
  <Row label={label}>
    <button className={`toggle ${value ? 'on' : ''}`} onClick={(e) => { e.preventDefault(); onChange(!value); }}><i /></button>
  </Row>
);

export const Section: React.FC<{ title: string; children: React.ReactNode; right?: React.ReactNode }> = ({ title, children, right }) => (
  <section className="sec">
    <div className="sec-head"><h4>{title}</h4>{right}</div>
    {children}
  </section>
);
