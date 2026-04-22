import dynamic from 'next/dynamic';

const GameWorldSquare = dynamic(() => import('./GameWorldSquare'), { ssr: false });

export default function WorldSquarePage(): React.JSX.Element {
  return <GameWorldSquare />;
}
