import {
  ArrowUpRight,
  Boxes,
  CircleDollarSign,
  ClipboardList,
  Clock,
  LoaderCircle,
  RotateCw,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import AreaChart from "../../components/charts/AreaChart";
import BarChart from "../../components/charts/BarChart";
import DonutChart from "../../components/charts/DonutChart";
import Sparkline from "../../components/charts/Sparkline";
import { palette } from "../../lib/chartUtils";
import { formatAxisDate, formatCompact, formatPrice } from "../../lib/format";

const RANGES = [7, 30, 90];

const Panel = ({ title, subtitle, action, children, className = "" }) => (
  <section
    className={`flex flex-col rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)] sm:p-5 ${className}`}
  >
    <header className="mb-4 flex items-start justify-between gap-3">
      <div>
        <h3 className="text-sm font-semibold text-neutral-950">{title}</h3>
        {subtitle && (
          <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>
        )}
      </div>
      {action}
    </header>
    {children}
  </section>
);

const Delta = ({ value }) => {
  if (value === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-400">
        <ArrowUpRight size={12} aria-hidden="true" /> 0%
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 text-[11px] font-semibold ${up ? "text-emerald-700" : "text-red-700"}`}
    >
      {up ? (
        <TrendingUp size={12} aria-hidden="true" />
      ) : (
        <TrendingDown size={12} aria-hidden="true" />
      )}
      {Math.abs(value)}%
    </span>
  );
};

const KpiCard = ({ label, value, delta, hint, series, icon: Icon, colour }) => (
  <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
    <div className="flex items-center justify-between">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-widest text-neutral-500 uppercase">
        <Icon size={13} aria-hidden="true" />
        {label}
      </span>
      <Delta value={delta} />
    </div>
    <p className="mt-2 text-2xl font-semibold tracking-tight text-neutral-950 tabular-nums">
      {value}
    </p>
    <div className="mt-3">
      <Sparkline values={series} colour={colour} />
    </div>
    {hint && <p className="mt-1.5 text-[11px] text-neutral-500">{hint}</p>}
  </article>
);

const ShareBar = ({ share, colour = palette.amber }) => (
  <div className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-100">
    <div
      className="h-full rounded-full transition-[width] duration-500"
      style={{ width: `${Math.min(Math.max(share, 0), 100)}%`, backgroundColor: colour }}
    />
  </div>
);

const STATUS_STEPS = [
  { key: "pending", label: "Awaiting fulfilment" },
  { key: "processing", label: "Being prepared" },
  { key: "shipped", label: "In transit" },
  { key: "delivered", label: "Delivered" },
];

const Overview = ({ report, loading, error, range, onRangeChange, onRetry }) => {
  const currency = report?.currency || "USD";
  const series = report?.series || [];
  const revenueSeries = series.map((point) => point.revenue);
  const orderSeries = series.map((point) => point.orders);

  return (
    <div className="mt-6 space-y-4" aria-label="Store analytics">
      <div className="flex flex-col justify-between gap-3 rounded-xl border border-neutral-200 bg-white p-4 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-sm font-semibold text-neutral-950">Performance</h2>
          <p className="mt-0.5 text-xs text-neutral-500">
            {report
              ? `${report.rangeStart} to ${report.rangeEnd}, compared with the previous ${range} days`
              : "Loading the selected range…"}
          </p>
        </div>
        <div
          className="inline-flex w-fit rounded-lg border border-neutral-200 bg-neutral-50 p-0.5"
          role="group"
          aria-label="Reporting range"
        >
          {RANGES.map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onRangeChange(option)}
              aria-pressed={range === option}
              className={`min-h-8 rounded-md px-3 text-xs font-semibold transition-colors ${range === option ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-600 hover:bg-white"}`}
            >
              {option}d
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="flex min-h-48 flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white p-6 text-center">
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="mt-4 inline-flex items-center gap-2 text-sm font-semibold underline underline-offset-4"
          >
            Try again <RotateCw size={14} aria-hidden="true" />
          </button>
        </div>
      ) : !report ? (
        <div className="flex min-h-64 items-center justify-center gap-3 rounded-xl border border-neutral-200 bg-white text-sm text-neutral-500">
          <LoaderCircle size={18} className="animate-spin" aria-hidden="true" />
          Building the report
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              label="Revenue"
              icon={CircleDollarSign}
              colour={palette.amber}
              value={formatPrice(report.kpis.revenue.value, currency)}
              delta={report.kpis.revenue.delta}
              series={revenueSeries}
              hint={`was ${formatPrice(report.kpis.revenue.previous, currency)}`}
            />
            <KpiCard
              label="Orders"
              icon={ClipboardList}
              colour={palette.sky}
              value={report.kpis.orders.value}
              delta={report.kpis.orders.delta}
              series={orderSeries}
              hint={`was ${report.kpis.orders.previous}`}
            />
            <KpiCard
              label="Average order"
              icon={TrendingUp}
              colour={palette.violet}
              value={formatPrice(report.kpis.averageOrderValue.value, currency)}
              delta={report.kpis.averageOrderValue.delta}
              series={revenueSeries}
              hint={`${report.kpis.unitsSold.value} units sold`}
            />
            <KpiCard
              label="New customers"
              icon={Users}
              colour={palette.emerald}
              value={report.kpis.newCustomers.value}
              delta={report.kpis.newCustomers.delta}
              series={orderSeries}
              hint={`was ${report.kpis.newCustomers.previous}`}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel
              title="Revenue over time"
              subtitle={`Daily revenue across the last ${range} days`}
              className="lg:col-span-2"
              action={
                <span className="text-sm font-semibold text-neutral-950 tabular-nums">
                  {formatPrice(report.kpis.revenue.value, currency)}
                </span>
              }
            >
              <AreaChart
                data={series}
                valueKey="revenue"
                height={220}
                id="revenue"
                formatValue={(value) => formatCompact(value, currency)}
                formatLabel={formatAxisDate}
              />
            </Panel>

            <Panel title="Orders per day" subtitle="Volume by day">
              <BarChart
                data={series}
                valueKey="orders"
                height={220}
                formatLabel={formatAxisDate}
              />
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Panel title="Payment mix" subtitle="Revenue by method">
              <DonutChart
                data={report.paymentMethods}
                valueKey="revenue"
                centreLabel="Collected"
                formatValue={(value) => formatCompact(value, currency)}
              />
            </Panel>

            <Panel
              title="Fulfilment"
              subtitle={`${report.statusCounts.cancelled} cancelled in range`}
            >
              <ul className="space-y-3">
                {STATUS_STEPS.map((step) => {
                  const count = report.statusCounts[step.key] || 0;
                  const peak = Math.max(
                    ...STATUS_STEPS.map(
                      (entry) => report.statusCounts[entry.key] || 0,
                    ),
                    1,
                  );
                  return (
                    <li key={step.key}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className="text-neutral-700">{step.label}</span>
                        <span className="font-semibold text-neutral-950 tabular-nums">
                          {count}
                        </span>
                      </div>
                      <ShareBar
                        share={(count / peak) * 100}
                        colour={palette.sky}
                      />
                    </li>
                  );
                })}
              </ul>
            </Panel>

            <Panel
              title="Inventory value"
              subtitle={`${report.inventory.products} products · ${report.inventory.units} units`}
              action={
                <span className="text-sm font-semibold text-neutral-950 tabular-nums">
                  {formatPrice(report.inventory.value, currency)}
                </span>
              }
            >
              {report.lowStock.length === 0 ? (
                <p className="py-6 text-center text-sm text-neutral-500">
                  Stock levels are healthy.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {report.lowStock.map((product) => (
                    <li key={product.id} className="flex items-center gap-3">
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="size-8 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="size-8 shrink-0 rounded bg-neutral-100" />
                      )}
                      <span className="min-w-0 flex-1 truncate text-xs text-neutral-700">
                        {product.name}
                      </span>
                      <span className="inline-flex shrink-0 items-center gap-1 text-[11px] font-semibold text-amber-800">
                        <Clock size={11} aria-hidden="true" />
                        {product.stock} left
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Panel title="Revenue by category" subtitle="Share of item revenue">
              {report.categories.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  No sales in this range yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {report.categories.map((category) => (
                    <li key={category.name}>
                      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="truncate text-neutral-800">
                            {category.name}
                          </span>
                          <span className="shrink-0 text-neutral-400">
                            {category.units} units
                          </span>
                        </span>
                        <span className="shrink-0 font-semibold text-neutral-950 tabular-nums">
                          {formatPrice(category.revenue, currency)}
                        </span>
                      </div>
                      <ShareBar
                        share={category.share}
                        colour={palette.violet}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Panel>

            <Panel title="Best sellers" subtitle="By revenue in range">
              {report.topProducts.length === 0 ? (
                <p className="py-8 text-center text-sm text-neutral-500">
                  No sales in this range yet.
                </p>
              ) : (
                <ol className="space-y-2.5">
                  {report.topProducts.map((product, index) => (
                    <li key={product.id} className="flex items-center gap-3">
                      <span className="w-4 shrink-0 text-xs text-neutral-400 tabular-nums">
                        {index + 1}
                      </span>
                      {product.image ? (
                        <img
                          src={product.image}
                          alt=""
                          className="size-9 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="flex size-9 shrink-0 items-center justify-center rounded bg-neutral-100">
                          <Boxes size={13} className="text-neutral-400" />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-neutral-900">
                          {product.name}
                        </p>
                        <p className="text-[11px] text-neutral-500">
                          {product.category} · {product.units} units
                        </p>
                      </div>
                      <span className="shrink-0 text-xs font-semibold text-neutral-950 tabular-nums">
                        {formatPrice(product.revenue, currency)}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </Panel>
          </div>

          {loading && (
            <p className="flex items-center justify-center gap-2 text-xs text-neutral-400">
              <LoaderCircle
                size={13}
                className="animate-spin"
                aria-hidden="true"
              />
              Refreshing figures…
            </p>
          )}
        </>
      )}
    </div>
  );
};

export default Overview;
