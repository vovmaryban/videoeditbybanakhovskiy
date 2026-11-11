import { spawn } from 'node:child_process';
import { FF_ENV, FFMPEG, FFPROBE } from './paths';

export const run = (bin: string, args: string[], opts: { onStdout?: (s: string) => void; env?: NodeJS.ProcessEnv } = {}) =>
  new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
    const p = spawn(bin, args, { env: opts.env ?? FF_ENV, windowsHide: true });
    let stdout = '';
    let stderr = '';
    p.stdout.on('data', (d) => { const s = d.toString(); stdout += s; opts.onStdout?.(s); });
    p.stderr.on('data', (d) => { stderr += d.toString(); if (stderr.length > 200000) stderr = stderr.slice(-100000); });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve({ stdout, stderr }) : reject(new Error(`${bin.split(/[\\/]/).pop()} exited ${code}: ${stderr.slice(-1500)}`))));
  });

export const ffmpeg = (args: string[], onProgress?: (seconds: number) => void) =>
  run(FFMPEG, ['-hide_banner', '-v', 'error', '-y', ...(onProgress ? ['-progress', 'pipe:1', '-nostats'] : []), ...args], {
    onStdout: onProgress
      ? (s) => {
          const m = [...s.matchAll(/out_time_(?:ms|us)=(\d+)/g)].pop();
          if (m) onProgress(Number(m[1]) / 1e6);
        }
      : undefined,
  });

export type Probe = { duration: number; width: number; height: number; rotation: number; hasAudio: boolean; fps: number };

export const probe = async (file: string): Promise<Probe> => {
  const { stdout } = await run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
  const j = JSON.parse(stdout);
  const v = j.streams.find((s: any) => s.codec_type === 'video');
  if (!v) throw new Error('У файлі немає відеодоріжки');
  const rot = Number(v.side_data_list?.find((d: any) => d.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0);
  const [a, b] = String(v.r_frame_rate ?? '30/1').split('/').map(Number);
  const swap = Math.abs(rot) % 180 === 90;
  return {
    duration: Number(j.format.duration),
    width: swap ? v.height : v.width,
    height: swap ? v.width : v.height,
    rotation: rot,
    hasAudio: j.streams.some((s: any) => s.codec_type === 'audio'),
    fps: b ? a / b : 30,
  };
};
