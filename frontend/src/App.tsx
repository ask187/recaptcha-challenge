import { lazy, Suspense, useEffect, useState } from 'react';
import { MotionConfig } from 'motion/react';
import { Game } from './components/GameShell/Game';

const Dashboard = lazy(() => import('./dashboard/Dashboard'));

function useHashRoute() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHashRoute();
  return (
    <MotionConfig reducedMotion="user">
      {hash.startsWith('#/dashboard') ? (
        <Suspense fallback={<div className="p-10 font-display text-2xl">loading the lab…</div>}>
          <Dashboard />
        </Suspense>
      ) : (
        <Game />
      )}
    </MotionConfig>
  );
}
