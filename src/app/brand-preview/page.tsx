import { MarkA, MarkB, MarkC } from "@/components/brand-marks";

// Temporary preview page — once a mark is chosen this whole route gets
// deleted and the winner gets wired into BrandLogo.
export default function BrandPreviewPage() {
  const options = [
    {
      letter: "A",
      Mark: MarkA,
      title: "Open book + spark",
      pitch:
        "Familiar education mark, hint of something new happening. Reads at small sizes.",
    },
    {
      letter: "B",
      Mark: MarkB,
      title: "Speech bubble + grad cap",
      pitch:
        "Tells the product story — education that's about parent ↔ teacher conversation.",
    },
    {
      letter: "C",
      Mark: MarkC,
      title: "P monogram",
      pitch:
        "Minimalist, modern tech feel. Easiest to print on cards / shirts. Most generic.",
    },
  ];

  return (
    <div className="min-h-dvh bg-background p-8 sm:p-12">
      <div className="mx-auto max-w-5xl space-y-12">
        <header className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Logo preview</h1>
          <p className="text-muted-foreground">
            Three directions. Each shown big (landing hero), medium (topbar),
            small (favicon), and on light + dark backgrounds. Tell me which
            letter (A / B / C) you want and I&apos;ll wire it in.
          </p>
        </header>

        {options.map((o) => {
          const Mark = o.Mark;
          return (
            <section
              key={o.letter}
              className="bg-card space-y-6 rounded-2xl border p-6 shadow-sm sm:p-8"
            >
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="text-2xl font-semibold">
                  Option {o.letter} · {o.title}
                </h2>
                <p className="text-muted-foreground max-w-md text-sm">
                  {o.pitch}
                </p>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-3 rounded-lg border bg-background p-6">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    On light · large
                  </p>
                  <div className="flex items-center gap-4">
                    <Mark className="text-primary size-20" />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        Cổng Phụ Huynh
                      </p>
                      <p className="text-muted-foreground text-sm">
                        Parent Portal
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-foreground text-background space-y-3 rounded-lg p-6">
                  <p className="text-background/70 text-xs uppercase tracking-wide">
                    On dark · large
                  </p>
                  <div className="flex items-center gap-4">
                    <Mark className="text-primary size-20" />
                    <div>
                      <p className="text-2xl font-semibold tracking-tight">
                        Cổng Phụ Huynh
                      </p>
                      <p className="text-background/70 text-sm">
                        Parent Portal
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-3">
                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Topbar · medium
                  </p>
                  <div className="flex items-center gap-2.5">
                    <Mark className="text-primary size-9" />
                    <span className="text-lg font-semibold tracking-tight">
                      Cổng Phụ Huynh
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Compact · small
                  </p>
                  <div className="flex items-center gap-2">
                    <Mark className="text-primary size-7" />
                    <span className="text-base font-semibold tracking-tight">
                      Cổng Phụ Huynh
                    </span>
                  </div>
                </div>

                <div className="space-y-2 rounded-lg border p-4">
                  <p className="text-muted-foreground text-xs uppercase tracking-wide">
                    Favicon · tiny
                  </p>
                  <div className="flex items-center gap-3">
                    <Mark className="text-primary size-4" />
                    <Mark className="text-primary size-5" />
                    <Mark className="text-primary size-6" />
                  </div>
                </div>
              </div>
            </section>
          );
        })}

        <p className="text-muted-foreground pt-4 text-center text-sm">
          Pick A, B, or C — or say &quot;none, try again&quot; with feedback.
        </p>
      </div>
    </div>
  );
}
