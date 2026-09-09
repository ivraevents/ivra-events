/**
 * "Our Statistics" section — every number here is a real, live count from
 * the public event listing (events, cities, stalls, and stalls already
 * booked). No marketing placeholders like footfall or satisfaction % since
 * IVRA has no real data source for those yet.
 */
export function HomeStatistics({
  eventsCount,
  citiesCount,
  totalStalls,
  stallsBooked,
}: {
  eventsCount: number;
  citiesCount: number;
  totalStalls: number;
  stallsBooked: number;
}) {
  const stats = [
    { icon: "📅", value: eventsCount, label: "Events Listed" },
    { icon: "🏙️", value: citiesCount, label: "Cities Covered" },
    { icon: "🏬", value: totalStalls, label: "Total Stalls" },
    { icon: "✅", value: stallsBooked, label: "Stalls Booked" },
  ];

  return (
    <section className="mt-2 text-center">
      <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-500/25 bg-gold-500/10 px-3.5 py-2 text-[10px] font-bold text-gold-400">
        📊 IVRA Events by the Numbers
      </span>
      <h2 className="mt-4 font-display text-2xl font-bold tracking-tight text-white sm:text-[27px]">
        Our{" "}
        <span className="bg-gradient-to-r from-gold-500 to-[#ff9135] bg-clip-text text-transparent">
          Statistics
        </span>
      </h2>
      <p className="mt-1.5 text-xs text-cloud-300">Connecting vendors with flea markets across India</p>

      <div className="mt-5 grid grid-cols-2 gap-2.5">
        {stats.map((s) => (
          <div
            key={s.label}
            className="flex min-h-[150px] flex-col items-center justify-center rounded-[1.25rem] border border-navy-700 bg-navy-900 px-2 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.2)]"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full border border-gold-500/25 bg-gold-500/10 text-lg">
              {s.icon}
            </span>
            <span className="mt-3 bg-gradient-to-r from-gold-500 to-[#ff9135] bg-clip-text text-2xl font-black tracking-tight text-transparent">
              {s.value}
            </span>
            <span className="my-2 h-1 w-8 rounded-full bg-gradient-to-r from-gold-500 to-[#ff9135]" />
            <span className="text-[9px] font-semibold text-charcoal-300">{s.label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}
