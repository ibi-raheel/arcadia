import dynamic from 'next/dynamic';

const GameWorldV3 = dynamic(() => import('./GameWorldV3'), { ssr: false });

export default function WorldV3Page(): React.JSX.Element {
  return <GameWorldV3 />;
}
