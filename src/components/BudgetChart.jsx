import React, { useState } from 'react';
import { BarChart2, PieChart, Info, TrendingUp, TrendingDown } from 'lucide-react';

const CHART_COLORS = ['var(--c1)', 'var(--c2)', 'var(--c3)', 'var(--c4)', 'var(--c5)', 'var(--c6)'];

export default function BudgetChart({ transactions, formatRupiah }) {
  const [activeTab,      setActiveTab]      = useState('pie');
  const [hoveredSlice,   setHoveredSlice]   = useState(null);

  // ── Calculations
  const totalIncome  = transactions.filter(t => t.type === 'INCOME' ).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const totalFlow    = totalIncome + totalExpense || 1;

  const catMap = transactions
    .filter(t => t.type === 'EXPENSE')
    .reduce((acc, t) => { acc[t.category] = (acc[t.category] || 0) + Number(t.amount); return acc; }, {});

  const catData = Object.entries(catMap)
    .map(([name, value], idx) => ({ name, value, color: CHART_COLORS[idx % CHART_COLORS.length] }))
    .sort((a, b) => b.value - a.value);

  // ── Donut SVG maths
  const R = 52; const SW = 14;
  const CIRC = 2 * Math.PI * R;

  let cumOffset = 0;
  const slices = catData.map((cat) => {
    const pct    = totalExpense > 0 ? cat.value / totalExpense : 0;
    const dash   = pct * CIRC;
    const offset = CIRC - dash - cumOffset;
    cumOffset   += dash;
    return { ...cat, pct, dash, offset };
  });

  const active = hoveredSlice ?? (slices[0] || null);

  // ── Render: Pie chart tab
  const renderPie = () => {
    if (totalExpense === 0) {
      return (
        <div className="empty-state" style={{ padding: '2rem 1rem' }}>
          <PieChart className="empty-icon" />
          <p className="empty-title" style={{ fontSize: '0.875rem' }}>Belum ada pengeluaran</p>
          <p className="empty-desc">Tambahkan pengeluaran agar grafik terisi.</p>
        </div>
      );
    }
    return (
      <div className="chart-body">
        {/* Donut SVG */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <svg width="160" height="160" viewBox="0 0 140 140"
            style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
            {/* Track */}
            <circle cx="70" cy="70" r={R} fill="none"
              stroke="var(--bg-surface-2)" strokeWidth={SW} />
            {/* Slices */}
            {slices.map((s, i) => (
              <circle key={i} cx="70" cy="70" r={R}
                fill="none"
                stroke={s.color}
                strokeWidth={hoveredSlice?.name === s.name ? SW + 3 : SW}
                strokeDasharray={CIRC}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
                style={{ transition: 'stroke-width 150ms ease', cursor: 'pointer' }}
                onMouseEnter={() => setHoveredSlice(s)}
                onMouseLeave={() => setHoveredSlice(null)} />
            ))}
          </svg>

          {/* Centre label */}
          {active && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center', pointerEvents: 'none', width: '90px'
            }}>
              <span style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--text-muted)',
                textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block' }}>
                {active.name}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85rem', fontWeight: 700,
                color: 'var(--text-primary)', display: 'block', marginTop: '0.15rem' }}>
                {formatRupiah(active.value)}
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: active.color, display: 'block' }}>
                {(active.pct * 100).toFixed(0)}%
              </span>
            </div>
          )}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.1rem', minWidth: 0 }}>
          {slices.map((s) => (
            <div key={s.name}
              className={`legend-row ${hoveredSlice?.name === s.name ? 'active' : ''}`}
              onMouseEnter={() => setHoveredSlice(s)}
              onMouseLeave={() => setHoveredSlice(null)}>
              <span className="legend-dot" style={{ background: s.color }} />
              <span className="legend-name">{s.name}</span>
              <div className="legend-vals">
                <span className="legend-amount">{formatRupiah(s.value)}</span>
                <span className="legend-pct">{(s.pct * 100).toFixed(0)}%</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // ── Render: Cashflow tab
  const renderCashflow = () => {
    const inPct  = totalIncome  / totalFlow * 100;
    const outPct = totalExpense / totalFlow * 100;
    const net    = totalIncome - totalExpense;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div className="cf-row">
          <div className="cf-header">
            <span style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingUp size={13} /> Pemasukan
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
              {formatRupiah(totalIncome)}
            </span>
          </div>
          <div className="cf-bar-track">
            <div className="cf-bar-fill"
              style={{ width: `${inPct}%`, background: 'linear-gradient(90deg, var(--primary), #3b82f6)' }} />
          </div>
        </div>

        <div className="cf-row">
          <div className="cf-header">
            <span style={{ color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <TrendingDown size={13} /> Pengeluaran
            </span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '0.8rem' }}>
              {formatRupiah(totalExpense)}
            </span>
          </div>
          <div className="cf-bar-track">
            <div className="cf-bar-fill"
              style={{ width: `${outPct}%`, background: 'linear-gradient(90deg, var(--danger), #f97316)' }} />
          </div>
        </div>

        <div className="cf-insight">
          <Info size={15} className="cf-insight-icon" />
          <span>
            {net > 0
              ? <>Anda menyisakan <strong>{formatRupiah(net)}</strong> ({((net / (totalIncome || 1)) * 100).toFixed(0)}% dari pemasukan) bulan ini. Pertahankan pola keuangan yang sehat ini! 🎉</>
              : net < 0
              ? <>Pengeluaran melebihi pemasukan sebesar <strong>{formatRupiah(-net)}</strong>. Pertimbangkan untuk mengurangi pengeluaran non-esensial.</>
              : <>Arus kas seimbang. Pertimbangkan untuk mengalokasikan sebagian ke tabungan atau investasi.</>
            }
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="panel-card chart-panel">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        paddingBottom: '0.875rem', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <BarChart2 size={16} style={{ color: 'var(--primary)', flexShrink: 0 }} />
          <span className="panel-title">Analisis Finansial</span>
        </div>
        <div className="chart-tabs">
          <button
            className={`chart-tab ${activeTab === 'pie' ? 'active' : ''}`}
            onClick={() => setActiveTab('pie')}>
            Distribusi
          </button>
          <button
            className={`chart-tab ${activeTab === 'bar' ? 'active' : ''}`}
            onClick={() => setActiveTab('bar')}>
            Arus Kas
          </button>
        </div>
      </div>

      {/* Body */}
      {activeTab === 'pie' ? renderPie() : renderCashflow()}
    </div>
  );
}
