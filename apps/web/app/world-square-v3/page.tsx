import dynamic from 'next/dynamic';

const GameWorldSquareV3 = dynamic(() => import('./GameWorldSquareV3'), { ssr: false });

export default function WorldSquareV3Page(): React.JSX.Element {
  return <GameWorldSquareV3 />;
}
