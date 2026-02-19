import { GrainientPageShell } from '@/app/components/grainient-page-shell';
import { AdSlotDetail } from './components/ad-slot-detail';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function AdSlotPage({ params }: Props) {
  const { id } = await params;

  return (
    <GrainientPageShell>
      <AdSlotDetail id={id} />
    </GrainientPageShell>
  );
}
