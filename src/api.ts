import type { FontEntry, Project } from './remotion/types';

const j = async <T,>(r: Response): Promise<T> => {
  if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? `HTTP ${r.status}`);
  return r.json();
};

export type ProjectSummary = Omit<Project, 'words' | 'clips'> & { clipCount: number };
export type RenderJob = { id: string; status: 'bundling' | 'rendering' | 'done' | 'error'; progress: number; file?: string; error?: string };

export const api = {
  status: () => fetch('/api/status').then((r) => j<{ whisper: boolean; model: boolean }>(r)),
  list: () => fetch('/api/projects').then((r) => j<ProjectSummary[]>(r)),
  get: (id: string) => fetch(`/api/projects/${id}`).then((r) => j<Project>(r)),
  patch: (id: string, body: Partial<Project>) =>
    fetch(`/api/projects/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => j<Project>(r)),
  remove: (id: string) => fetch(`/api/projects/${id}`, { method: 'DELETE' }).then((r) => j(r)),
  fonts: () => fetch('/api/fonts').then((r) => j<FontEntry[]>(r)),
  reprocess: (id: string, language?: string) =>
    fetch(`/api/projects/${id}/reprocess`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ language }) }).then((r) => j<Project>(r)),
  render: (id: string) => fetch(`/api/projects/${id}/render`, { method: 'POST' }).then((r) => j<RenderJob>(r)),
  job: (id: string) => fetch(`/api/renders/${id}`).then((r) => j<RenderJob>(r)),
  upload: (url: string, file: File, onProgress?: (p: number) => void) =>
    new Promise<any>((resolve, reject) => {
      const x = new XMLHttpRequest();
      const fd = new FormData();
      fd.append('file', file);
      x.open('POST', url);
      x.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
      x.onload = () => (x.status < 300 ? resolve(JSON.parse(x.responseText)) : reject(new Error(JSON.parse(x.responseText || '{}').error ?? `HTTP ${x.status}`)));
      x.onerror = () => reject(new Error('Помилка мережі'));
      x.send(fd);
    }),
};
