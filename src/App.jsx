import React, { useState, useEffect } from 'react';
import {
  TrendingUp, TrendingDown, DollarSign,
  PlusCircle, Trash2, Wallet, Calendar,
  Layers, Info, User, BarChart2, PieChart
} from 'lucide-react';
import { supabase } from './lib/supabase';
import ThemeToggle from './components/ThemeToggle';
import BudgetChart from './components/BudgetChart';
import './App.css';

// ─── Constants ───────────────────────────────────────────
const DEFAULT_TRANSACTIONS = [
  { id: '1', type: 'INCOME',  amount: 5000000, description: 'Gaji Bulanan',   category: 'Gaji',          trx_date: '2026-06-01' },
  { id: '2', type: 'EXPENSE', amount: 350000,  description: 'Belanja Bulanan', category: 'Makanan',       trx_date: '2026-06-02' },
  { id: '3', type: 'EXPENSE', amount: 150000,  description: 'Isi Bensin',      category: 'Transportasi',  trx_date: '2026-06-02' },
  { id: '4', type: 'INCOME',  amount: 1200000, description: 'Dividen Saham',   category: 'Investasi',     trx_date: '2026-06-03' },
];

const CATEGORIES = {
  INCOME:  ['Gaji', 'Investasi', 'Freelance', 'Lain-lain'],
  EXPENSE: ['Makanan', 'Transportasi', 'Hiburan', 'Tagihan', 'Lain-lain'],
};

const formatRupiah = (val) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val);

const getGreeting = () => {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat Pagi';
  if (h < 15) return 'Selamat Siang';
  if (h < 19) return 'Selamat Sore';
  return 'Selamat Malam';
};

// ─── App ─────────────────────────────────────────────────
export default function App() {
  const [transactions, setTransactions] = useState(() => {
    const saved = localStorage.getItem('budget_transactions');
    return saved ? JSON.parse(saved) : DEFAULT_TRANSACTIONS;
  });

  const [type,        setType]        = useState('EXPENSE');
  const [amount,      setAmount]      = useState('');
  const [description, setDescription] = useState('');
  const [category,    setCategory]    = useState('Makanan');
  const [trxDate,     setTrxDate]     = useState(new Date().toISOString().split('T')[0]);
  const [filterType,  setFilterType]  = useState('ALL');
  const [sortBy,      setSortBy]      = useState('DATE_DESC');
  const [budgetLimit, setBudgetLimit] = useState(2000000);
  const [isSupabaseConnected, setIsSupabaseConnected] = useState(false);
  const [supabaseDetails,     setSupabaseDetails]     = useState({ url: '' });

  useEffect(() => {
    localStorage.setItem('budget_transactions', JSON.stringify(transactions));
  }, [transactions]);

  useEffect(() => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const ok  = url && key && !url.includes('your-project-id');
    setIsSupabaseConnected(!!ok);
    setSupabaseDetails({ url: url || 'Belum diatur' });
  }, []);

  // ── Derived values
  const totalIncome  = transactions.filter(t => t.type === 'INCOME' ).reduce((s, t) => s + Number(t.amount), 0);
  const totalExpense = transactions.filter(t => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0);
  const netBalance   = totalIncome - totalExpense;
  const budgetPct    = Math.min((totalExpense / Math.max(budgetLimit, 1)) * 100, 100);

  // ── Handlers
  const handleTypeChange = (t) => { setType(t); setCategory(CATEGORIES[t][0]); };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0 || !description) return;
    setTransactions([
      { id: crypto.randomUUID(), type, amount: Number(amount), description, category, trx_date: trxDate },
      ...transactions,
    ]);
    setAmount(''); setDescription('');
    setTrxDate(new Date().toISOString().split('T')[0]);
  };

  const handleDelete = (id) => setTransactions(transactions.filter(t => t.id !== id));

  const filtered = transactions
    .filter(t => filterType === 'ALL' || t.type === filterType)
    .sort((a, b) => {
      if (sortBy === 'DATE_DESC')   return new Date(b.trx_date) - new Date(a.trx_date);
      if (sortBy === 'DATE_ASC')    return new Date(a.trx_date) - new Date(b.trx_date);
      if (sortBy === 'AMOUNT_DESC') return b.amount - a.amount;
      if (sortBy === 'AMOUNT_ASC')  return a.amount - b.amount;
      return 0;
    });

  // ── Render
  return (
    <div className="app-container">

      {/* ── Header ───────────────────────────────────────── */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon-bg">
            <Wallet className="logo-icon" />
          </div>
          <span className="logo-text">Antigravity Budget</span>
          <span className="tenant-badge">Tenant Workspace</span>
          <span
            className={`connection-pill ${isSupabaseConnected ? 'connected' : 'sandbox'}`}
            title={isSupabaseConnected ? `Cloud: ${supabaseDetails.url}` : 'Mode Sandbox – konfigurasi .env'}
          >
            <span className="connection-dot" />
            {isSupabaseConnected ? 'Live Cloud' : 'Sandbox'}
          </span>
        </div>

        <div className="user-profile">
          <ThemeToggle />
          <div className="user-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div className="user-avatar">
                <User size={13} style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="user-name">SaaS Tenant Admin</p>
                <p className="user-email">admin@budgeting-saas.com</p>
              </div>
            </div>
          </div>
          <button className="btn btn-outline btn-logout" onClick={() => alert('Logout Simulasi')}>
            Keluar
          </button>
        </div>
      </header>

      {/* ── Main ─────────────────────────────────────────── */}
      <main className="app-content">

        {/* Welcome */}
        <div className="welcome-banner fade-up">
          <h1 className="welcome-title">{getGreeting()}, Tenant Admin 👋</h1>
          <p className="welcome-subtitle">
            {isSupabaseConnected
              ? `Dasbor terhubung ke Supabase Cloud (${supabaseDetails.url}). Semua data tersimpan aman.`
              : 'Mode Sandbox aktif — data tersimpan di localStorage. Hubungkan Supabase di berkas .env untuk sinkronisasi awan.'}
          </p>
        </div>

        {/* ── Stat Cards ───────────────────────────────── */}
        <section className="summary-grid">
          <div className="stat-card income fade-up delay-1">
            <div className="stat-header">
              <span className="stat-label">Total Pemasukan</span>
              <div className="stat-icon-wrapper"><TrendingUp size={15} /></div>
            </div>
            <div className="stat-val">{formatRupiah(totalIncome)}</div>
            <div className="stat-footer">
              <TrendingUp size={12} />
              {transactions.filter(t => t.type === 'INCOME').length} transaksi masuk
            </div>
          </div>

          <div className="stat-card expense fade-up delay-2">
            <div className="stat-header">
              <span className="stat-label">Total Pengeluaran</span>
              <div className="stat-icon-wrapper"><TrendingDown size={15} /></div>
            </div>
            <div className="stat-val">{formatRupiah(totalExpense)}</div>
            <div className="stat-footer">
              <TrendingDown size={12} />
              {transactions.filter(t => t.type === 'EXPENSE').length} transaksi keluar
            </div>
          </div>

          <div className="stat-card balance fade-up delay-3">
            <div className="stat-header">
              <span className="stat-label">Saldo Bersih</span>
              <div className="stat-icon-wrapper"><DollarSign size={15} /></div>
            </div>
            <div className="stat-val" style={{ color: netBalance >= 0 ? 'var(--primary)' : 'var(--danger)' }}>
              {formatRupiah(netBalance)}
            </div>
            <div className="stat-footer">
              <Info size={12} />
              {netBalance >= 0 ? 'Surplus bulan ini' : 'Defisit bulan ini'}
            </div>
          </div>
        </section>

        {/* ── Middle Grid ──────────────────────────────── */}
        <div className="middle-grid">

          {/* Budget Progress */}
          <div className="budget-card fade-up delay-2">
            <div className="budget-header">
              <div>
                <div className="budget-title">
                  <Info size={14} style={{ color: 'var(--text-muted)' }} />
                  Batas Anggaran Bulanan
                </div>
              </div>
              <div className="budget-amounts">
                <span className="budget-amount-current">{formatRupiah(totalExpense)}</span>
                <span className="budget-amount-limit">dari {formatRupiah(budgetLimit)}</span>
              </div>
            </div>

            <div className="progress-track">
              <div
                className={`progress-bar ${budgetPct >= 90 ? 'danger' : budgetPct >= 75 ? 'warning' : ''}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>

            <div className="budget-footer">
              <span className="budget-pct">{budgetPct.toFixed(1)}% terpakai</span>
              <div className="budget-limit-input-group">
                <span>Batas:</span>
                <input
                  type="number"
                  className="budget-limit-input"
                  value={budgetLimit}
                  onChange={e => setBudgetLimit(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* SVG Chart */}
          <BudgetChart transactions={transactions} formatRupiah={formatRupiah} />
        </div>

        {/* ── Main Grid ────────────────────────────────── */}
        <div className="main-grid">

          {/* Form */}
          <div className="panel-card fade-up delay-1">
            <div className="panel-header">
              <PlusCircle size={16} className="panel-icon" />
              <h2 className="panel-title">Tambah Transaksi</h2>
            </div>

            <form onSubmit={handleSubmit} className="form-stack">

              {/* Type toggle */}
              <div className="form-group">
                <span className="form-label">Tipe Aliran Dana</span>
                <div className="type-toggle">
                  <input type="radio" id="type-expense" name="trx-type"
                    className="radio-input"
                    checked={type === 'EXPENSE'}
                    onChange={() => handleTypeChange('EXPENSE')} />
                  <label htmlFor="type-expense" className="radio-label expense">
                    <TrendingDown size={13} /> Pengeluaran
                  </label>

                  <input type="radio" id="type-income" name="trx-type"
                    className="radio-input"
                    checked={type === 'INCOME'}
                    onChange={() => handleTypeChange('INCOME')} />
                  <label htmlFor="type-income" className="radio-label income">
                    <TrendingUp size={13} /> Pemasukan
                  </label>
                </div>
              </div>

              {/* Amount */}
              <div className="form-group">
                <label className="form-label" htmlFor="amount-input">Jumlah (IDR)</label>
                <input type="number" id="amount-input" className="form-control"
                  placeholder="Contoh: 150.000"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  required />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label" htmlFor="desc-input">Keterangan</label>
                <input type="text" id="desc-input" className="form-control"
                  placeholder="Detail transaksi"
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  required />
              </div>

              {/* Category */}
              <div className="form-group">
                <label className="form-label" htmlFor="cat-select">Kategori</label>
                <select id="cat-select" className="form-control"
                  value={category}
                  onChange={e => setCategory(e.target.value)}>
                  {CATEGORIES[type].map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Date */}
              <div className="form-group">
                <label className="form-label" htmlFor="date-input">Tanggal</label>
                <input type="date" id="date-input" className="form-control"
                  value={trxDate}
                  onChange={e => setTrxDate(e.target.value)}
                  required />
              </div>

              <button type="submit" className="btn btn-primary btn-submit-full" style={{ marginTop: '0.25rem' }}>
                Simpan Transaksi
              </button>
            </form>
          </div>

          {/* Ledger */}
          <div className="panel-card fade-up delay-2">
            <div className="ledger-header">
              <div className="panel-header" style={{ border: 'none', padding: 0, flex: 1 }}>
                <Layers size={16} className="panel-icon" />
                <h2 className="panel-title">Riwayat Transaksi</h2>
                <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  {filtered.length} entri
                </span>
              </div>
              <div className="ledger-controls">
                <select className="ledger-select" value={filterType} onChange={e => setFilterType(e.target.value)}>
                  <option value="ALL">Semua</option>
                  <option value="INCOME">Pemasukan</option>
                  <option value="EXPENSE">Pengeluaran</option>
                </select>
                <select className="ledger-select" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                  <option value="DATE_DESC">Terbaru</option>
                  <option value="DATE_ASC">Terlama</option>
                  <option value="AMOUNT_DESC">Terbesar</option>
                  <option value="AMOUNT_ASC">Terkecil</option>
                </select>
              </div>
            </div>

            {filtered.length > 0 ? (
              <div className="table-wrapper">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Tanggal</th>
                      <th>Kategori</th>
                      <th>Keterangan</th>
                      <th>Tipe</th>
                      <th>Jumlah</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((trx, idx) => (
                      <tr key={trx.id}
                        className="fade-up"
                        style={{ animationDelay: `${Math.min(idx * 0.03, 0.3)}s`, animationFillMode: 'both' }}>
                        <td>
                          <div className="cell-date">
                            <Calendar size={12} />
                            {trx.trx_date}
                          </div>
                        </td>
                        <td><span className="badge badge-cat">{trx.category}</span></td>
                        <td style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{trx.description}</td>
                        <td>
                          <span className={`badge ${trx.type === 'INCOME' ? 'badge-income' : 'badge-expense'}`}>
                            {trx.type === 'INCOME' ? 'Pemasukan' : 'Pengeluaran'}
                          </span>
                        </td>
                        <td>
                          <span className={trx.type === 'INCOME' ? 'amount-income' : 'amount-expense'}>
                            {trx.type === 'INCOME' ? '+' : '−'} {formatRupiah(trx.amount)}
                          </span>
                        </td>
                        <td>
                          <button
                            className="btn-delete"
                            onClick={() => handleDelete(trx.id)}
                            title="Hapus"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="empty-state">
                <TrendingUp className="empty-icon" />
                <p className="empty-title">Tidak ada transaksi</p>
                <p className="empty-desc">Gunakan formulir di sebelah kiri untuk menambahkan transaksi baru.</p>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
