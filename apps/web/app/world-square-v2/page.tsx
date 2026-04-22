import dynamic from 'next/dynamic';

const GameWorldSquareV2 = dynamic(() => import('./GameWorldSquareV2'), { ssr: false });

export default function WorldSquareV2Page(): React.JSX.Element {
  return <GameWorldSquareV2 />;
}
