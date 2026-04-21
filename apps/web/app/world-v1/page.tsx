import dynamic from 'next/dynamic';

const GameWorldV1 = dynamic(() => import('./GameWorldV1'), { ssr: false });

export default function WorldV1Page(): React.JSX.Element {
  return <GameWorldV1 />;
}
