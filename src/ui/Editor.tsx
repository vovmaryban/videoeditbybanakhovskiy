import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Player, type PlayerRef } from '@remotion/player';
import { api, type RenderJob } from '../api';
import { go } from '../App';
import { Reel } from '../remotion/Reel';
import { BUILTIN_FONTS } from '../remotion/fonts';
import { ADJUST_KEYS, COLOR_FILTERS, ZERO_ADJUST, type ColorAdjust } from '../remotion/color';
import { HEADLINE_STYLES } from '../remotion/Headline';
import { applyLook, CAMERA_PRESETS, CAPTION_PRESETS, CUT_PRESETS, FRAME_PRESETS, LOOKS, normalizeStyle, type Preset } from '../remotion/presets';
import { buildPages, buildTimeline, srcToOut } from '../remotion/timeline';
import type { CaptionStyle, Clip, ColorStyle, FontEntry, FxStyle, HeadlineStyle, Project, ProjectStyle, ReelProps, Word } from '../remotion/types';
import { Color, Row, Section, Segmented, Slider, Swatches, Toggle } from './controls';
import { VariantGrid, type Variant } from './VariantGrid';

type Tab = 'looks' | 'captions' | 'fx' | 'color' | 'camera' | 'music' | 'text' | 'export';
const TABS: [Tab, string][] = [['looks', 'Стилі'], ['captions', 'Субтитри'], ['fx', 'Ефекти'], ['color', 'Колір'], ['camera', 'Камера'], ['music', 'Музика'], ['text', 'Текст і склейки'], ['export', 'Експорт']];
const PALETTE = ['#FFFFFF', '#111111', '#FFD60A', '#3EE07A', '#E8202A', '#FF5A36', '#7C3AED', '#00E5FF', '#F2C46D', '#FF4FA3', '#F1EBDD', '#D8F53C', '#CFE3FF', '#5B0F1A'];
const BG_PALETTE = ['#FFFFFF', '#F3F1F4', '#F1EFEA', '#111111', '#4A0710', '#6F7B3B', '#1E3A2A', '#0B2A66', '#F5C928', '#E8E6F8'];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
const fmtT = (t: number) => `${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}`;

// CapCut-like adjustment sliders: label, range, how to show the number
const ADJUST_UI: Record<keyof ColorAdjust, { label: string; min: number; max: number }> = {
  exposure: { label: 'Експозиція', min: -1, max: 1 },
  brightness: { label: 'Яскравість', min: -1, max: 1 },
  contrast: { label: 'Контраст', min: -1, max: 1 },
  highlights: { label: 'Світлі ділянки', min: -1, max: 1 },
  shadows: { label: 'Тіні', min: -1, max: 1 },
  saturation: { label: 'Насиченість', min: -1, max: 1 },
  temperature: { label: 'Температура', min: -1, max: 1 },
  tint: { label: 'Відтінок (зелений ↔ пурпур)', min: -1, max: 1 },
  fade: { label: 'Вицвітання', min: 0, max: 1 },
  vignette: { label: 'Віньєтка', min: 0, max: 1 },
  grain: { label: 'Зерно', min: 0, max: 1 },
};

export const Editor: React.FC<{ id: string }> = ({ id }) => {
  const [project, setProject] = useState<Project | null>(null);
  const [fonts, setFonts] = useState<FontEntry[]>(BUILTIN_FONTS);
  const [tab, setTab] = useState<Tab>('looks');
  const [safe, setSafe] = useState(true);
  const [before, setBefore] = useState(false);
  const [saving, setSaving] = useState<'idle' | 'dirty' | 'saved'>('idle');
  const player = useRef<PlayerRef>(null);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<Partial<Project>>({});

  // load + poll while processing
  useEffect(() => {
    let alive = true;
    const load = () => api.get(id).then((p) => {
      if (!alive) return;
      setProject((old) => (old && old.status === 'ready' ? old : { ...p, style: normalizeStyle(p.style) }));
      if (p.status !== 'ready' && p.status !== 'error') setTimeout(load, 1500);
    }).catch(() => go(''));
    load();
    api.fonts().then(setFonts).catch(() => {});
    return () => { alive = false; };
  }, [id]);

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const body = pending.current;
      pending.current = {};
      api.patch(id, body).then(() => setSaving('saved')).catch(() => setSaving('dirty'));
    }, 500);
  }, [id]);

  const update = useCallback((patch: Partial<Project>) => {
    setProject((p) => (p ? { ...p, ...patch } : p));
    pending.current = { ...pending.current, ...patch };
    setSaving('dirty');
    flush();
  }, [flush]);

  const setStyle = useCallback((fn: (s: ProjectStyle) => ProjectStyle) => {
    setProject((p) => {
      if (!p) return p;
      const style = fn(p.style);
      pending.current = { ...pending.current, style };
      setSaving('dirty');
      flush();
      return { ...p, style };
    });
  }, [flush]);

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
  // tiles for transitions start a bit before a cut, so hovering shows the effect
  const cutFrame = useMemo(() => {
    if (!timeline) return 0;
    const c = timeline.pieces.slice(1).map((p) => p.from).find((f) => f > 20) ?? sampleFrame + 12;
    return Math.max(0, c - 14);
  }, [timeline, sampleFrame]);

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
  const mainProps = props(project.style, { musicSrc, showSafeZones: safe, colorBypass: before });
  const seekSrc = (t: number) => {
    const f = srcToOut(timeline!.pieces, t, project.fps);
    if (f !== null) player.current?.seekTo(f);
  };

  const grid = <T,>(presets: Preset<T>[], apply: (s: ProjectStyle, v: T) => ProjectStyle, current: (s: ProjectStyle) => unknown, frame = sampleFrame) => {
    const variants: Variant[] = presets.map((pr) => ({ id: pr.id, name: pr.name, tag: pr.tag, props: props(apply(project.style, pr.value)) }));
    const sel = presets.find((pr) => same(current(apply(project.style, pr.value)), current(project.style)))?.id ?? null;
    return <VariantGrid variants={variants} selected={sel} frame={frame} duration={duration} onPick={(pid) => setStyle((s) => apply(s, presets.find((x) => x.id === pid)!.value))} />;
  };

  const capt = project.style.captions;
  const setCap = (patch: Partial<CaptionStyle>) => setStyle((s) => ({ ...s, captions: { ...s.captions, ...patch } }));
  const col = project.style.color;
  const setCol = (patch: Partial<ColorStyle>) => setStyle((s) => ({ ...s, color: { ...s.color, ...patch } }));
  const fxs = project.style.fx;
  const setFx = (patch: Partial<FxStyle>) => setStyle((s) => ({ ...s, fx: { ...s.fx, ...patch } }));
  const hl = project.style.headline;
  const setHl = (patch: Partial<HeadlineStyle>) => setStyle((s) => ({ ...s, headline: { ...s.headline, ...patch } }));

  const looks: Preset<ProjectStyle>[] = LOOKS.map((l) => ({ id: l.id, name: l.name, tag: l.tag, value: applyLook(project.style, l) }));
  const capApply = (s: ProjectStyle, v: CaptionStyle) => ({ ...s, captions: { ...v, enabled: true } });
  const capCurrent = (s: ProjectStyle) => ({ ...s.captions, enabled: true });
  const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}`;

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
              <Section title="Стилі монтажу" right={<span className="muted small">субтитри + камера + ефекти · колір не змінюється</span>}>
                {grid(looks, (_s, v) => v, (s) => [s.captions, s.camera, s.fx, s.headline.style])}
              </Section>
            )}

            {tab === 'captions' && (
              <>
                <Section title="З твоїх референсів" right={<Toggle label="" value={capt.enabled} onChange={(v) => setCap({ enabled: v })} />}>
                  {grid(CAPTION_PRESETS.filter((p) => p.group === 'refs'), capApply, capCurrent)}
                </Section>
                <Section title="Класичні">
                  {grid(CAPTION_PRESETS.filter((p) => p.group === 'classic'), capApply, capCurrent)}
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
                  <Slider label="Міжрядковий" value={capt.lineHeight} min={0.8} max={1.6} step={0.01} onChange={(lineHeight) => setCap({ lineHeight })} fmt={(v) => v.toFixed(2)} />
                  <Toggle label="ВЕЛИКІ ЛІТЕРИ" value={capt.uppercase} onChange={(uppercase) => setCap({ uppercase })} />
                  <Toggle label="Курсив" value={capt.italic} onChange={(italic) => setCap({ italic })} />
                </Section>
                <Section title="Анімація">
                  <Segmented label="Поява" value={capt.animation} onChange={(animation) => setCap({ animation })}
                    options={[['none', 'без'], ['fade', 'проява'], ['pop', 'поп'], ['slide-up', 'знизу'], ['blur', 'розмиття'], ['drop', 'падіння'], ['zoom-out', 'зум'], ['wipe', 'шторка'], ['stamp', 'штамп'], ['glitch', 'глітч']]} />
                  <Segmented label="Слова" value={capt.wordMode} onChange={(wordMode) => setCap({ wordMode })}
                    options={[['static', 'разом'], ['reveal', 'по одному'], ['blur-in', 'з розмиття'], ['rise', 'знизу'], ['typewriter', 'машинка'], ['highlight', 'підсвітка'], ['karaoke', 'караоке'], ['pop-active', 'стрибок'], ['box', 'плашка'], ['marker', 'маркер'], ['underline', 'риска']]} />
                  <Slider label="Слів на екрані" value={capt.maxWords} min={1} max={8} onChange={(maxWords) => setCap({ maxWords, maxChars: Math.max(capt.maxChars, maxWords * 6) })} />
                  <Slider label="Символів у рядку" value={capt.maxChars} min={6} max={40} onChange={(maxChars) => setCap({ maxChars })} />
                </Section>
                <Section title="Ключові слова" right={<span className="muted small">★ у «Текст і склейки» або автоматично</span>}>
                  <Segmented label="Автовибір" value={capt.autoAccent} onChange={(autoAccent) => setCap({ autoAccent })} options={[['off', 'лише ★'], ['longest', 'найдовше'], ['last', 'останнє']]} />
                  <Segmented label="Як виділяти" value={capt.accentStyle} onChange={(accentStyle) => setCap({ accentStyle })}
                    options={[['color', 'колір'], ['font', 'інший шрифт'], ['big', 'великим'], ['box', 'бокс'], ['marker', 'маркер'], ['glow', 'світіння']]} />
                  <Toggle label="Два яруси (ключове слово окремим рядком)" value={capt.tiers} onChange={(tiers) => setCap({ tiers })} />
                  {(capt.accentStyle === 'font' || capt.accentStyle === 'big' || capt.accentStyle === 'box') && (
                    <Row label="Шрифт акценту">
                      <select value={capt.accentFont ?? ''} onChange={(e) => setCap({ accentFont: e.target.value || null })}>
                        <option value="">той самий</option>
                        {fonts.map((f) => <option key={f.id} value={f.id}>{f.label}</option>)}
                      </select>
                    </Row>
                  )}
                  <Slider label="Розмір акценту" value={capt.accentScale} min={0.5} max={3} step={0.05} onChange={(accentScale) => setCap({ accentScale })} fmt={(v) => `×${v.toFixed(2)}`} />
                  <Segmented label="Регістр акценту" value={capt.accentUpper} onChange={(accentUpper) => setCap({ accentUpper })} options={[['same', 'як усе'], ['upper', 'ВЕЛИКІ'], ['lower', 'малі']]} />
                  <Toggle label="Акцент курсивом" value={capt.accentItalic} onChange={(accentItalic) => setCap({ accentItalic })} />
                  <Swatches label="Колір акценту" value={capt.accent} colors={PALETTE} onChange={(accent) => setCap({ accent })} />
                  {(capt.accentStyle === 'box' || capt.accentStyle === 'marker') && (
                    <>
                      <Swatches label="Колір боксу" value={capt.boxColor} colors={PALETTE} onChange={(boxColor) => setCap({ boxColor })} />
                      <Swatches label="Текст у боксі" value={capt.accentInk} colors={PALETTE} onChange={(accentInk) => setCap({ accentInk })} />
                    </>
                  )}
                </Section>
                <Section title="Кольори">
                  <Swatches label="Текст" value={capt.color} colors={PALETTE} onChange={(color) => setCap({ color, gradient: null })} />
                  <Swatches label="Сказане слово" value={capt.activeColor} colors={PALETTE} onChange={(v) => setCap({ activeColor: v })} />
                  {capt.wordMode === 'karaoke' && <Swatches label="Ще не сказані" value={capt.futureColor} colors={PALETTE} onChange={(futureColor) => setCap({ futureColor })} />}
                  {(capt.wordMode === 'box' || capt.wordMode === 'marker' || capt.wordMode === 'underline') && <Swatches label="Плашка слова" value={capt.boxColor} colors={PALETTE} onChange={(boxColor) => setCap({ boxColor })} />}
                  <Segmented label="Фон" value={capt.bg} onChange={(bg) => setCap({ bg })} options={[['none', 'без'], ['plate', 'плашка'], ['line-plates', 'по рядках'], ['word-tags', 'теги'], ['glass', 'скло'], ['brush', 'пензель']]} />
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
                  <Slider label="Висота" value={capt.y} min={0.08} max={0.92} step={0.005} onChange={(y) => setCap({ y })} fmt={(v) => `${Math.round(v * 1920)} px`} />
                  <Segmented label="Вирівнювання" value={capt.align} onChange={(align) => setCap({ align, x: align === 'left' ? 0.08 : align === 'right' ? 0.92 : 0.5 })} options={[['left', 'ліворуч'], ['center', 'по центру'], ['right', 'праворуч']]} />
                  <Slider label="Зсув по горизонталі" value={capt.x} min={0} max={1} step={0.005} onChange={(x) => setCap({ x })} fmt={(v) => `${Math.round(v * 1080)} px`} />
                  <Slider label="Нахил" value={capt.rotate} min={-15} max={15} step={0.5} onChange={(rotate) => setCap({ rotate })} fmt={(v) => `${v}°`} />
                  <div className="muted small">Або тягни білу ручку зліва від відео.</div>
                </Section>
              </>
            )}

            {tab === 'fx' && (
              <>
                <Section title="Переходи на склейках" right={<span className="muted small">наведи — побачиш склейку</span>}>
                  {grid(CUT_PRESETS, (s, v) => ({ ...s, fx: { ...s.fx, ...v } }), (s) => s.fx.cut, cutFrame)}
                  <Slider label="Сила переходу" value={fxs.cutStrength} min={0.1} max={1} step={0.05} onChange={(cutStrength) => setFx({ cutStrength })} fmt={(v) => `${Math.round(v * 100)}%`} />
                </Section>
                <Section title="Ключові слова">
                  <Slider label="Наїзд на ключове слово" value={project.style.camera.accentPunch ?? 0} min={0} max={0.25} step={0.01} onChange={(accentPunch) => setStyle((s) => ({ ...s, camera: { ...s.camera, accentPunch } }))} fmt={(v) => (v ? `+${Math.round(v * 100)}%` : 'вимк.')} />
                  <Toggle label="Тряска на ключовому слові" value={fxs.shakeOnAccent} onChange={(shakeOnAccent) => setFx({ shakeOnAccent })} />
                  <div className="muted small">Ключові слова — ★ у «Текст і склейки» або автовибір у «Субтитрах».</div>
                </Section>
                <Section title="Кадр і фон">
                  {grid(FRAME_PRESETS, (s, v) => ({ ...s, fx: { ...s.fx, ...v } }), (s) => [s.fx.frame, s.fx.letterbox, s.fx.framePattern, s.fx.frameBg])}
                  {fxs.frame !== 'full' && (
                    <>
                      <Swatches label="Фон" value={fxs.frameBg} colors={BG_PALETTE} onChange={(frameBg) => setFx({ frameBg })} />
                      <Swatches label="Візерунок / другий колір" value={fxs.frameBg2} colors={BG_PALETTE} onChange={(frameBg2) => setFx({ frameBg2 })} />
                      <Segmented label="Візерунок" value={fxs.framePattern} onChange={(framePattern) => setFx({ framePattern })} options={[['plain', 'однотон'], ['dots', 'крапки'], ['grid', 'клітинка'], ['gradient', 'градієнт'], ['paper', 'папір']]} />
                    </>
                  )}
                  <Slider label="Кіно-смуги" value={fxs.letterbox} min={0} max={0.18} step={0.005} onChange={(letterbox) => setFx({ letterbox })} fmt={(v) => (v ? `${Math.round(v * 1920)} px` : 'вимк.')} />
                </Section>
                <Section title="Заголовок" right={<Toggle label="" value={hl.enabled} onChange={(enabled) => setHl({ enabled })} />}>
                  <Row label="Текст"><textarea rows={2} value={hl.text} placeholder="Напр.: 3 ПОМИЛКИ В REELS" onChange={(e) => setHl({ text: e.target.value, enabled: true })} /></Row>
                  <Row label="Підрядок / номер"><input value={hl.kicker} placeholder="необов’язково" onChange={(e) => setHl({ kicker: e.target.value })} /></Row>
                  <Row label="Вигляд">
                    <select value={hl.style} onChange={(e) => setHl({ style: e.target.value as HeadlineStyle['style'] })}>
                      {HEADLINE_STYLES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
                    </select>
                  </Row>
                  <Slider label="Висота (верхній край)" value={hl.y} min={0.06} max={0.9} step={0.005} onChange={(y) => setHl({ y })} fmt={(v) => `${Math.round(v * 1920)} px`} />
                  <Slider label="Скільки тримати" value={hl.until} min={0} max={30} step={0.5} onChange={(until) => setHl({ until })} fmt={(v) => (v ? `${v} с` : 'весь ролик')} />
                </Section>
              </>
            )}

            {tab === 'color' && (
              <>
                <Section title="Фільтр" right={<button className={`ghost ${before ? 'on' : ''}`} onPointerDown={() => setBefore(true)} onPointerUp={() => setBefore(false)} onPointerLeave={() => setBefore(false)}>утримуй — до/після</button>}>
                  {grid(COLOR_FILTERS.map((f) => ({ id: f.id, name: f.name, value: f.id })), (s, v) => ({ ...s, color: { ...s.color, filter: v, intensity: s.color.filter === v ? s.color.intensity : 1 } }), (s) => s.color.filter)}
                  <Slider label="Сила фільтра" value={col.intensity} min={0} max={1} step={0.01} onChange={(intensity) => setCol({ intensity })} fmt={(v) => `${Math.round(v * 100)}%`} />
                </Section>
                <Section title="Налаштування" right={<button className="ghost" onClick={() => setCol({ ...ZERO_ADJUST })}>скинути все</button>}>
                  {ADJUST_KEYS.map((key) => (
                    <div key={key} onDoubleClick={() => setCol({ [key]: 0 } as Partial<ColorStyle>)} title="Подвійний клік — скинути">
                      <Slider label={ADJUST_UI[key].label} value={col[key]} min={ADJUST_UI[key].min} max={ADJUST_UI[key].max} step={0.01} onChange={(v) => setCol({ [key]: v } as Partial<ColorStyle>)} fmt={pct} />
                    </div>
                  ))}
                  <div className="muted small">Колір не залежить від стилю монтажу: перемикай «Стилі», а кольорокорекція лишається твоя. Подвійний клік по повзунку повертає 0.</div>
                </Section>
              </>
            )}

            {tab === 'camera' && (
              <>
                <Section title="Рух камери">{grid(CAMERA_PRESETS, (s, v) => ({ ...s, camera: { ...v, focusY: s.camera.focusY } }), (s) => [s.camera.mode, s.camera.accentPunch ?? 0])}</Section>
                <Section title="Налаштування">
                  <Slider label="Сила наїзду" value={project.style.camera.amount} min={0} max={0.3} step={0.01} onChange={(amount) => setStyle((s) => ({ ...s, camera: { ...s.camera, amount } }))} fmt={(v) => `${Math.round(v * 100)}%`} />
                  <Slider label="Наїзд на ключові слова" value={project.style.camera.accentPunch ?? 0} min={0} max={0.25} step={0.01} onChange={(accentPunch) => setStyle((s) => ({ ...s, camera: { ...s.camera, accentPunch } }))} fmt={(v) => (v ? `+${Math.round(v * 100)}%` : 'вимк.')} />
                  <Slider label="Точка фокусу (обличчя)" value={project.style.camera.focusY} min={0} max={1} step={0.01} onChange={(focusY) => setStyle((s) => ({ ...s, camera: { ...s.camera, focusY } }))} fmt={(v) => `${Math.round(v * 100)}%`} />
                </Section>
              </>
            )}

            {tab === 'music' && <MusicPanel project={project} setStyle={setStyle} onUploaded={(p) => setProject((o) => (o ? { ...o, style: normalizeStyle(p.style) } : o))} />}
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
          <button onClick={() => { if (confirm('Розпізнати текст і склейки заново? Ручні правки тексту й склейок буде втрачено, стиль залишиться.')) api.patch(project.id, { asrMode: project.asrMode ?? 'fast' }).then(() => api.reprocess(project.id, project.language)).then(() => window.location.reload()); }}>Розпізнати заново</button>
        </Row>
        <Row label="Розпізнавання" hint={project.asrSeconds ? ` минулого разу: ${Math.round(project.asrSeconds)} с` : undefined}>
          <select value={project.asrMode ?? 'fast'} onChange={(e) => update({ asrMode: e.target.value as Project['asrMode'] })}>
            <option value="fast">швидко — великими шматками + перевірка сумнівних фраз</option>
            <option value="precise">точно — кожна фраза окремо (у 3–5 разів довше)</option>
          </select>
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
