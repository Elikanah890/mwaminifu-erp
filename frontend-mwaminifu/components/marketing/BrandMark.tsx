import Image from 'next/image';

export default function BrandMark({
  onDark = false,
  compact = false,
}: {
  onDark?: boolean;
  compact?: boolean;
}) {
  const text = onDark ? 'text-white' : 'text-foreground';
  const sub = 'text-[#d4af37]';
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-white/20">
        <Image src="/logo.jpeg" alt="Mwaminifu" width={30} height={30} className="h-[30px] w-[30px] object-cover" />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-[15px] font-bold tracking-tight ${text}`}>Mwaminifu</span>
        <span className="mt-1 flex items-center gap-1">
          <span className="h-[2px] w-full flex-1 rounded-full bg-[#d4af37]" />
          {!compact && <span className={`text-[9px] font-bold uppercase tracking-[0.28em] ${sub}`}>APP</span>}
          <span className="h-[2px] w-full flex-1 rounded-full bg-[#d4af37]" />
        </span>
      </span>
    </span>
  );
}
