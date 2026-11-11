import React, { useCallback, useEffect, useRef, useState } from 'react';
import { api, type ProjectSummary } from '../api';
import { go } from '../App';

export const Home: React.FC = () => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [status, setStatus] = useState<{ whisper: boolean; model: boolean } | null>(null);
  const [upload, setUpload] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => { api.list().then(setProjects).catch(() => {}); }, []);
  useEffect(() => {
    refresh();
    api.status().then(setStatus).catch(() => {});
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh]);

  const send = async (file: File) => {
    setError(null);
    setUpload(0);
    try {
      const p = await api.upload('/api/projects', file, setUpload);
      go(`p/${p.id}`);
    } catch (e: any) { setError(e.message); } finally { setUpload(null); }
  };

  return (
    <div className="home">
      <header className="home-head">
        <div className="logo">video<span>studio</span></div>
        <div className="muted">локальний монтаж вертикальних відео</div>
      </header>
      {status && (!status.whisper || !status.model) && (
        <div className="warn">Розпізнавання мови не встановлене. Закрий студію і запусти <b>setup.bat</b> (або <code>npm run setup:whisper</code>).</div>
      )}
      <div
        className={`drop ${drag ? 'on' : ''}`}
        onClick={() => input.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) send(f); }}
      >
        <input ref={input} type="file" accept="video/*,.mov,.mp4,.mkv" hidden onChange={(e) => e.target.files?.[0] && send(e.target.files[0])} />
        {upload === null ? (
          <>
            <div className="drop-title">Перетягни сюди відео</div>
            <div className="muted">або натисни, щоб вибрати файл · MOV, MP4 з телефона</div>
          </>
        ) : (
          <>
            <div className="drop-title">Завантажую… {Math.round(upload * 100)}%</div>
            <div className="bar"><i style={{ width: `${upload * 100}%` }} /></div>
          </>
        )}
      </div>
      {error && <div className="err">{error}</div>}
      <h3>Проєкти</h3>
      <div className="plist">
        {projects.map((p) => (
          <div key={p.id} className="pcard" onClick={() => go(`p/${p.id}`)}>
            <div className="pthumb">{p.status === 'ready' ? <video src={`/media/${p.id}/preview.mp4#t=1`} muted preload="metadata" /> : <div className="pstate">{p.step ?? p.status}</div>}</div>
            <div className="pname">{p.name}</div>
            <div className="muted small">
              {p.status === 'ready' ? `${Math.round(p.duration)} с · ${p.exports.length} експорт.` : p.status === 'error' ? `помилка: ${p.error}` : `${p.step ?? 'обробка'}${p.progress != null ? ` ${Math.round(p.progress * 100)}%` : ''}`}
            </div>
            <button className="x" title="Видалити проєкт" onClick={(e) => { e.stopPropagation(); if (confirm(`Видалити «${p.name}» разом з усіма експортами?`)) api.remove(p.id).then(refresh); }}>×</button>
          </div>
        ))}
        {!projects.length && <div className="muted">Поки порожньо.</div>}
      </div>
    </div>
  );
};
