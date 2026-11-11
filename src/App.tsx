import React, { useEffect, useState } from 'react';
import { Home } from './ui/Home';
import { Editor } from './ui/Editor';

const route = () => window.location.hash.replace(/^#\/?/, '');

export const App: React.FC = () => {
  const [path, setPath] = useState(route());
  useEffect(() => {
    const on = () => setPath(route());
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  const m = path.match(/^p\/(.+)$/);
  return m ? <Editor id={m[1]} /> : <Home />;
};

export const go = (to: string) => { window.location.hash = to; };
