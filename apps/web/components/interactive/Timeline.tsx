"use client";
type Item = { id: string; date: string; label: string; description?: string };
type Props = { title?: string; items: Item[] };

export function Timeline({ title, items }: Props) {
  return (
    <div className="w-full">
      {title && <div className="mb-2 font-semibold">{title}</div>}
      <div className="relative w-full overflow-x-auto py-4">
        <div className="absolute left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-zinc-300" />
        <div className="flex gap-8">
          {items.map((it, idx) => (
            <div key={it.id} className="relative">
              <div className="flex flex-col items-start">
                <div className="h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-white shadow relative z-10" />
                <div className="mt-2 min-w-[220px] rounded border bg-white p-3 shadow-sm">
                  <div className="text-xs text-zinc-500">{it.date}</div>
                  <div className="font-medium">{it.label}</div>
                  {it.description && (
                    <div className="text-sm text-zinc-600 mt-1">{it.description}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

