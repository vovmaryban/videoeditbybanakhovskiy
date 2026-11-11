import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { api, type RenderJob } from '../api';
import { go } from '../App';
import { Reel } from '../remotion/Reel';
import { BUILTIN_FONTS } from '../remotion/fonts';
import { CAMERA_PRESETS, CAPTION_PRESETS, COLOR_PRESETS, LOOKS, type Preset } from '../remotion/presets';
import { buildPages, buildTimeline, srcToOut } from '../remotion/timeline';
import type { CaptionStyle, Clip, FontEntry, Project, ProjectStyle, ReelProps, Word } from '../remotion/types';
import { Color, Row, Section, Segmented, Slider, Swatches, Toggle } from './controls';
import { VariantGrid, type Variant } from './VariantGrid';

type Tab = 'looks' | 'captions' | 'color' | 'camera' | 'music' | 'text' | 'export';
const TABS: [Tab, string][] = [['looks', 'Стилі'], ['captions', 'Субтитри'], ['color', 'Колір'], ['camera', 'Камера'], ['music', 'Музика'], ['text', 'Текст і склейки'], ['export', 'Експорт']];
const PALETTE = ['#FFFFFF', '#111111', '#FFD60A', '#3EE07A', '#E8202A', '#FF5A36', '#7C3AED', '#00E5FF', '#F2C46D', '#FF4FA3'];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fmtT = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

export const Editor: React.FC<{ id: string }> = ({ id }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [fonts, setFonts] = useState<FontEntry[]>(BUILTIN_FONTS);
  const [tab, setTab] = useState<Tab>('looks');
  const [safe, setSafe] = useState(true);
  const [saving, setSaving] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const player = useRef<PlayerRef>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<Partial<Project>>({});

  // load + poll while processing
  useEffect(() => {
    let alive = true;
    const load = () => api.get(id).then((p) => {
      if (!alive) return;
      setProject((old) => (old && old.status === 'ready' ? old : p));
      if (p.status !== 'ready' && p.status !== 'error') setTimeout(load, 1500);
    }).catch(() => go(''));
    load();
    api.fonts().then(setFonts).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const update = useCallback((patch: Partial<Project>) => {
    setProject((p) => (p ? { ...p, ...patch } : p));
    pending.current = { ...pending.current, ...patch };
    setSaving('dirty');
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const body = pending.current;
      pending.current = {};
      api.patch(id, body).then(() => setSaving('saved')).catch(() => setSaving('dirty'));
    }, 500);
  }, [id]);

  const setStyle = useCallback((fn: (s: ProjectStyle) => ProjectStyle) => {
    setProject((p) => {
      if (!p) return p;
      const style = fn(p.style);
      pending.current = { ...pending.current, style };
      setSaving('dirty');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => {
        const body = pending.current; pending.current = {};
        api.patch(id, body).then(() => setSaving('saved')).catch(() => setSaving('dirty'));
      }, 500);
      return { ...p, style };
    });
  }, [id]);

  const preview = project ? `/media/${project.id}/preview.mp4` : '';
  const musicSrc = project?.style.music.file ? `/media/${project.id}/${encodeURIComponent(project.style.music.file)}` : null;
  const timeline = useMemo(() => (project ? buildTimeline(project.clips, project.fps) : null), [project?.clips, project?.fps]);
  const sampleFrame = useMemo(() => {
    if (!project || !timeline) return 0;
    const pages = buildPages(project.words, timeline.pieces, project.fps, { maxWords: 3, maxChars: 18 });
    const target = timeline.durationInFrames * 0.18;
    const p = pages.filter((x) => x.words.length >= 2).sort((a, b) => Math.abs(a.o0 - target) - Math.abs(b.o0 - target))[0];
    return p ? p.o0 + 6 : Math.round(target);
  }, [project?.words, timeline]);

  if (!project) return <div className="center muted">Завантаження…</div>;
  if (project.status === 'error') {
    return (
      <div className="center">
        <div className="err">Помилка обробки: {project.error}</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="primary" onClick={() => api.reprocess(project.id).then(() => window.location.reload())}>Спробувати ще раз</button>
          <button onClick={() => go('')}>← До проєктів</button>
        </div>
      </div>
    );
  }
  if (project.status !== 'ready') {
    return (
      <div className="center">
        <div className="proc">
          <div className="drop-title">{project.step ?? 'Обробка'}…</div>
          <div className="bar"><i style={{ width: `${(project.progress ?? 0) * 100}%` }} /></div>
          <div className="muted small">Відео готується, розпізнається мова і шукаються паузи та дублі. Це один раз на відео.</div>
        </div>
      </div>
    );
  }

  const duration = timeline!.durationInFrames;
  const props = (style: ProjectStyle, opts: Partial<ReelProps> = {}): ReelProps => ({
    src: preview, project: { words: project.words, clips: project.clips, fps: project.fps, style }, fonts, musicSrc: null, ...opts,
  });
  const mainProps = props(project.style, { musicSrc, showSafeZones: safe });
  const seekSrc = (t: number) => {
    const f = srcToOut(timeline!.pieces, t, project.fps);
    if (f !== null) player.current?.seekTo(f);
  };

  const grid = <T,>(presets: Preset<T>[], apply: (s: ProjectStyle, v: T) => ProjectStyle, current: (s: ProjectStyle) => unknown) => {
    const variants: Variant[] = presets.map((pr) => ({ id: pr.id, name: pr.name, tag: pr.tag, props: props(apply(project.style, pr.value)) }));
    const sel = presets.find((pr) => same(current(apply(project.style, pr.value)), current(project.style)))?.id ?? null;
    return <VariantGrid variants={variants} selected={sel} frame={sampleFrame} duration={duration} onPick={(pid) => setStyle((s) => apply(s, presets.find((x) => x.id === pid)!.value))} />;
  };

  const capt = project.style.captions;
  const setCap = (patch: Partial<CaptionStyle>) => setStyle((s) => ({ ...s, captions: { ...s.captions, ...patch } }));
  const col = project.style.color;
  const setCol = (patch: Partial<ProjectStyle['color']>) => setStyle((s) => ({ ...s, color: { ...s.color, ...patch, preset: 'custom' } }));

  const looks: Preset<ProjectStyle>[] = LOOKS.map((l) => ({
    id: l.id, name: l.name,
    value: {
      ...project.style,
      captions: CAPTION_PRESETS.find((x) => x.id === l.captions)!.value,
      color: COLOR_PRESETS.find((x) => x.id === l.color)!.value,
      camera: CAMERA_PRESETS.find((x) => x.id === l.camera)!.value,
    },
  }));

  return (
    <div className="editor">
      <header className="top">
        <button className="ghost" onClick={() => go('')}>← Проєкти</button>
        <input className="title" value={project.name} onChange={(e) => update({ name: e.target.value })} />
        <span className="muted small">{saving === 'dirty' ? 'зберігаю…' : saving === 'saved' ? 'збережено' : ''}</span>
        <span className="spacer" />
        <label className="chk"><input type="checkbox" checked={safe} onChange={(e) => setSafe(e.target.checked)} /> сліпі зони</label>
        <button className="primary" onClick={() => setTab('export')}>Експорт</button>
      </header>
      <div className="body">
        <div className="stage">
          <div className="player-wrap">
            <Player
              ref={player}
              component={Reel}
              inputProps={mainProps}
              durationInFrames={duration}
              compositionWidth={1080}
              compositionHeight={1920}
              fps={project.fps}
              controls
              clickToPlay
              spaceKeyToPlayOrPause
              showVolumeControls
              acknowledgeRemotionLicense
              style={{ height: '100%', aspectRatio: '9 / 16' }}
            />
            {capt.enabled && <CaptionHandle y={capt.y} onChange={(y) => setCap({ y })} />}
          </div>
          <div className="muted small">{(duration / project.fps).toFixed(1)} с після склейок · з {project.duration.toFixed(0)} с запису</div>
        </div>
        <aside className="panel">
          <nav className="tabs">
            {TABS.map(([t, l]) => <button key={t} className={t === tab ? 'on' : ''} onClick={() => setTab(t)}>{l}</button>)}
          </nav>
          <div className="panel-body">
            {tab === 'looks' && (
              <Section title="Готові стилі" right={<span className="muted small">наведи — програє, клік — застосує</span>}>
                {grid(looks, (_s, v) => v, (s) => [s.captions, s.color, s.camera])}
              </Section>
            )}

            {tab === 'captions' && (
              <>
                <Section title="Стиль субтитрів" right={<Toggle label="" value={capt.enabled} onChange={(v) => setCap({ enabled: v })} />}>
                  {grid(CAPTION_PRESETS, (s, v) => ({ ...s, captions: { ...v, y: s.captions.y, enabled: true } }), (s) => ({ ...s.captions, y: 0, enabled: true }))}
                </Section>
                <Section title="Шрифт">
                  <div className="fonts">
                    {fonts.map((f) => (
                      <button key={f.id} className={f.id === capt.font ? 'on' : ''} style={{ fontFamily: `"${f.id}"` }} onClick={() => setCap({ font: f.id, weight: Math.min(Math.max(capt.weight, f.weights[0]), f.weights[1]) })}>{f.label}</button>
                    ))}
                    <FontUpload onDone={setFonts} />
                  </div>
                  <Slider label="Товщина" value={capt.weight} min={100} max={1000} step={50} onChange={(weight) => setCap({ weight })} />
                  <Slider label="Розмір" value={capt.size} min={24} max={160} onChange={(size) => setCap({ size })} />
                  <Slider label="Міжлітерний" value={capt.letterSpacing} min={-0.05} max={0.2} step={0.005} onChange={(letterSpacing) => setCap({ letterSpacing })} fmt={(v) => v.toFixed(3)} />
                  <Toggle label="ВЕЛИКІ ЛІТЕРИ" value={capt.uppercase} onChange={(uppercase) => setCap({ uppercase })} />
                  <Toggle label="Курсив" value={capt.italic} onChange={(italic) => setCap({ italic })} />
                </Section>
                <Section title="Анімація">
                  <Segmented label="Поява" value={capt.animation} onChange={(animation) => setCap({ animation })}
                    options={[['none', 'без'], ['fade', 'проява'], ['pop', 'поп'], ['slide-up', 'знизу'], ['blur', 'розмиття'], ['drop', 'падіння']]} />
                  <Segmented label="Слова" value={capt.wordMode} onChange={(wordMode) => setCap({ wordMode })}
                    options={[['static', 'разом'], ['reveal', 'по одному'], ['highlight', 'підсвітка'], ['karaoke', 'караоке'], ['pop-active', 'стрибок'], ['box', 'плашка'], ['marker', 'маркер'], ['underline', 'риска']]} />
                  <Slider label="Слів на екрані" value={capt.maxWords} min={1} max={7} onChange={(maxWords) => setCap({ maxWords, maxChars: Math.max(capt.maxChars, maxWords * 6) })} />
                  <Slider label="Символів у рядку" value={capt.maxChars} min={6} max={40} onChange={(maxChars) => setCap({ maxChars })} />
                </Section>
                <Section title="Кольори">
                  <Swatches label="Текст" value={capt.color} colors={PALETTE} onChange={(color) => setCap({ color, gradient: null })} />
                  <Swatches label="Акцент / виділення" value={capt.activeColor} colors={PALETTE} onChange={(v) => setCap({ activeColor: v, accent: v })} />
                  {(capt.wordMode === 'box' || capt.wordMode === 'marker' || capt.wordMode === 'underline') && <Swatches label="Плашка слова" value={capt.boxColor} colors={PALETTE} onChange={(boxColor) => setCap({ boxColor })} />}
                  <Segmented label="Фон" value={capt.bg} onChange={(bg) => setCap({ bg })} options={[['none', 'без'], ['plate', 'плашка'], ['line-plates', 'по рядках'], ['glass', 'скло']]} />
                  {capt.bg !== 'none' && (
                    <>
                      <Swatches label="Колір фону" value={capt.bgColor} colors={PALETTE} onChange={(bgColor) => setCap({ bgColor })} />
                      <Slider label="Прозорість фону" value={capt.bgOpacity} min={0} max={1} step={0.02} onChange={(bgOpacity) => setCap({ bgOpacity })} fmt={(v) => `${Math.round(v * 100)}%`} />
                      <Slider label="Заокруглення" value={capt.radius} min={0} max={48} onChange={(radius) => setCap({ radius })} />
                    </>
                  )}
                  <Slider label="Контур" value={capt.stroke} min={0} max={16} onChange={(stroke) => setCap({ stroke })} />
                  {capt.stroke > 0 && <Color label="Колір контуру" value={capt.strokeColor} onChange={(strokeColor) => setCap({ strokeColor })} />}
                  <Slider label="Тінь" value={capt.shadow} min={0} max={40} onChange={(shadow) => setCap({ shadow })} />
                  <Slider label="Світіння" value={capt.glow} min={0} max={40} onChange={(glow) => setCap({ glow })} />
                </Section>
                <Section title="Положення">
                  <Slider label="Висота" value={capt.y} min={0.1} max={0.92} step={0.005} onChange={(y) => setCap({ y })} fmt={(v) => `${Math.round(v * 1920)} px`} />
                  <div className="muted small">Або тягни білу ручку зліва від відео.</div>
                </Section>
              </>
            )}

            {tab === 'color' && (
              <>
                <Section title="Кольорові пресети">{grid(COLOR_PRESETS, (s, v) => ({ ...s, color: v }), (s) => s.color)}</Section>
                <Section title="Тонке налаштування">
                  <Slider label="Яскравість" value={col.brightness} min={0.6} max={1.4} step={0.01} onChange={(brightness) => setCol({ brightness })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Контраст" value={col.contrast} min={0.6} max={1.6} step={0.01} onChange={(contrast) => setCol({ contrast })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Насиченість" value={col.saturation} min={0} max={2} step={0.01} onChange={(saturation) => setCol({ saturation })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Тепло ↔ холод" value={col.warmth} min={-1} max={1} step={0.01} onChange={(warmth) => setCol({ warmth })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Підняті тіні" value={col.fade} min={0} max={0.4} step={0.01} onChange={(fade) => setCol({ fade })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Віньєтка" value={col.vignette} min={0} max={1} step={0.01} onChange={(vignette) => setCol({ vignette })} fmt={(v) => v.toFixed(2)} />
                  <Slider label="Зерно плівки" value={col.grain} min={0} max={1} step={0.01} onChange={(grain) => setCol({ grain })} fmt={(v) => v.toFixed(2)} />
                </Section>
              </>
            )}

            {tab === 'camera' && (
              <>
                <Section title="Рух камери">{grid(CAMERA_PRESETS, (s, v) => ({ ...s, camera: { ...v, focusY: s.camera.focusY } }), (s) => s.camera.mode)}</Section>
                <Section title="Налаштування">
                  <Slider label="Сила наїзду" value={project.style.camera.amount} min={0} max={0.3} step={0.01} onChange={(amount) => setStyle((s) => ({ ...s, camera: { ...s.camera, amount } }))} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Точка фокусу (обличчя)" value={project.style.camera.focusY} min={0} max={1} step={0.01} onChange={(focusY) => setStyle((s) => ({ ...s, camera: { ...s.camera, focusY } }))} fmt={(v) => `${Math.round(v * 100)}%`} />
                </Section>
              </>
            )}

            {tab === 'music' && <MusicPanel project={project} setStyle={setStyle} onUploaded={(p) => setProject((o) => (o ? { ...o, style: p.style } : o))} />}
            {tab === 'text' && <TextPanel project={project} update={update} seek={seekSrc} />}
            {tab === 'export' && <ExportPanel project={project} onDone={(p) => setProject((o) => (o ? { ...o, exports: p.exports } : o))} />}
          </div>
        </aside>
      </div>
    </div>
  );
};

const CaptionHandle: React.FC<{ y: number; onChange: (y: number) => void }> = ({ y, onChange }) => {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const box = ref.current!.parentElement!.getBoundingClientRect();
    onChange(Math.min(0.92, Math.max(0.1, (e.clientY - box.top) / box.height)));
  };
  return (
    <div ref={ref} className="cap-handle" style={{ top: `${y * 100}%` }}
      onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture(e.pointerId); }}
      onPointerMove={(e) => { if (e.buttons) move(e); }}>
      <span>субтитри ↕</span>
    </div>
  );
};

const FontUpload: React.FC<{ onDone: (f: FontEntry[]) => void }> = ({ onDone }) => {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <>
      <input ref={ref} type="file" accept=".ttf,.otf,.woff,.woff2" hidden onChange={async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        try { await api.upload('/api/fonts', f); onDone(await api.fonts()); } catch (err: any) { alert(err.message); }
      }} />
      <button className="add" onClick={() => ref.current?.click()}>+ свій шрифт</button>
    </>
  );
};

const MusicPanel: React.FC<{ project: Project; setStyle: (fn: (s: ProjectStyle) => ProjectStyle) => void; onUploaded: (p: Project) => void }> = ({ project, setStyle, onUploaded }) => {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const m = project.style.music;
  const setM = (patch: Partial<ProjectStyle['music']>) => setStyle((s) => ({ ...s, music: { ...s.music, ...patch } }));
  return (
    <>
      <Section title="Фонова музика">
        <input ref={ref} type="file" accept="audio/*" hidden onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          setBusy(true);
          try { onUploaded(await api.upload(`/api/projects/${project.id}/music`, f)); } catch (err: any) { alert(err.message); } finally { setBusy(false); }
        }} />
        <Row label="Трек">
          <button onClick={() => ref.current?.click()}>{busy ? 'Завантажую…' : m.file ? 'Замінити' : 'Завантажити MP3 / WAV'}</button>
          {m.file && <button className="ghost" onClick={() => setM({ file: null })}>прибрати</button>}
        </Row>
        {m.file && <div className="muted small">{m.file}</div>}
        <Slider label="Гучність музики" value={m.volume} min={0} max={0.6} step={0.01} onChange={(volume) => setM({ volume })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <Slider label="Тихіше під голос" value={m.duck} min={0.1} max={1} step={0.05} onChange={(duck) => setM({ duck })} fmt={(v) => `${Math.round(v * 100)}%`} />
        <div className="muted small">Музика автоматично притихає, коли ти говориш, і плавно виходить у кінці.</div>
      </Section>
      <Section title="Голос">
        <Slider label="Гучність голосу" value={project.style.voiceVolume} min={0} max={2} step={0.05} onChange={(voiceVolume) => setStyle((s) => ({ ...s, voiceVolume }))} fmt={(v) => `${Math.round(v * 100)}%`} />
      </Section>
    </>
  );
};

const TextPanel: React.FC<{ project: Project; update: (p: Partial<Project>) => void; seek: (t: number) => void }> = ({ project, update, seek }) => {
  const [sel, setSel] = useState<number | null>(null);
  const clips = [...project.clips].sort((a, b) => a.start - b.start);
  const wordsOf = (c: Clip) => project.words.map((w, i) => ({ w, i })).filter(({ w }) => { const m = (w.start + w.end) / 2; return m >= c.start - 0.05 && m < c.end + 0.05; });
  const setClip = (cid: string, patch: Partial<Clip>) => update({ clips: project.clips.map((c) => (c.id === cid ? { ...c, ...patch, reason: patch.enabled !== undefined ? 'manual' : c.reason } : c)) });
  const setWord = (i: number, patch: Partial<Word>) => update({ words: project.words.map((w, k) => (k === i ? { ...w, ...patch } : w)) });
  const w = sel !== null ? project.words[sel] : null;
  const kept = project.clips.filter((c) => c.enabled).length;
  return (
    <>
      <Section title="Склейки" right={<span className="muted small">{kept} з {project.clips.length} фраз у ролику</span>}>
        <Row label="Мова запису">
          <select value={project.language} onChange={(e) => update({ language: e.target.value })}>
            {[['uk', 'українська'], ['ru', 'російська'], ['en', 'англійська'], ['pl', 'польська'], ['auto', 'визначити самому']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={() => { if (confirm('Розпізнати текст і склейки заново? Ручні правки тексту й склейок буде втрачено, стиль залишиться.')) api.reprocess(project.id, project.language).then(() => window.location.reload()); }}>Розпізнати заново</button>
        </Row>
        <div className="muted small">Вимкни фразу — вона випаде з ролика. Сірі — автоматично визнані дублями або шумом. Клік на слово — виправити текст або зробити акцентом.</div>
        {w && sel !== null && (
          <div className="word-edit">
            <input autoFocus value={w.text} onChange={(e) => setWord(sel, { text: e.target.value })} />
            <button className={w.accent ? 'on' : ''} onClick={() => setWord(sel, { accent: !w.accent })}>★ акцент</button>
            <button className="ghost" onClick={() => setSel(null)}>готово</button>
          </div>
        )}
      </Section>
      <div className="clips">
        {clips.map((c) => (
          <div key={c.id} className={`clip ${c.enabled ? '' : 'off'}`}>
            <input type="checkbox" checked={c.enabled} onChange={(e) => setClip(c.id, { enabled: e.target.checked })} />
            <button className="tc" onClick={() => seek(c.start + 0.01)} title="Перейти">{fmtT(c.start)}</button>
            <div className="ctext">
              {!c.enabled && c.reason && c.reason !== 'manual' && <span className="badge">{c.reason === 'retake' ? 'дубль' : 'шум'}</span>}
              {wordsOf(c).map(({ w: ww, i }) => (
                <span key={i} className={`w ${ww.accent ? 'acc' : ''} ${sel === i ? 'sel' : ''}`} onClick={() => { setSel(i); if (c.enabled) seek(ww.start); }}>{ww.text} </span>
              ))}
              {!wordsOf(c).length && <span className="muted small">без слів</span>}
            </div>
          </div>
        ))}
      </div>
    </>
  );
};

const ExportPanel: React.FC<{ project: Project; onDone: (p: Project) => void }> = ({ project, onDone }) => {
  const [job, setJob] = useState<RenderJob | null>(null);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    if (!job || job.status === 'done' || job.status === 'error') return;
    const t = setTimeout(() => api.job(job.id).then((j) => {
      setJob(j);
      if (j.status === 'done') api.get(project.id).then(onDone);
    }).catch(() => {}), 1000);
    return () => clearTimeout(t);
  }, [job]);
  const busy = job && (job.status === 'bundling' || job.status === 'rendering');
  return (
    <>
      <Section title="Експорт MP4">
        <div className="muted small">1080×1920, 30 к/с, H.264. Кожен експорт — нова версія (v1, v2…), старі не перезаписуються.</div>
        <button className="primary big" disabled={!!busy} onClick={() => { setErr(null); api.render(project.id).then(setJob).catch((e) => setErr(e.message)); }}>
          {busy ? (job!.status === 'bundling' ? 'Готую рендер…' : `Рендер ${Math.round(job!.progress * 100)}%`) : `Зробити v${project.exports.length + 1}`}
        </button>
        {busy && <div className="bar"><i style={{ width: `${(job!.progress ?? 0) * 100}%` }} /></div>}
        {job?.status === 'error' && <div className="err">{job.error}</div>}
        {err && <div className="err">{err}</div>}
      </Section>
      <Section title="Готові версії">
        {[...project.exports].reverse().map((e) => (
          <div key={e.file} className="export">
            <video src={`/media/${project.id}/exports/${e.file}`} controls preload="metadata" />
            <div>
              <b>{e.file}</b>
              <div className="muted small">{new Date(e.createdAt).toLocaleString('uk-UA')}</div>
              <a className="btn" href={`/media/${project.id}/exports/${e.file}`} download={`${project.name}-${e.file}`}>Завантажити</a>
            </div>
          </div>
        ))}
        {!project.exports.length && <div className="muted small">Ще немає експортів.</div>}
      </Section>
    </>
  );
};
