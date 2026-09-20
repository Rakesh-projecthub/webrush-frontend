import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, BarChart3, CheckCircle2, ChevronDown,
  CircleHelp, Database, Download, Filter, Gauge, Menu, RefreshCw, Search,
  ShieldAlert, SlidersHorizontal, Sparkles, Table2, X
} from "lucide-react";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart,
  ResponsiveContainer, Tooltip, XAxis, YAxis
} from "recharts";
import MetricCard from "./components/MetricCard";
import SectionHeader from "./components/SectionHeader";
import EmptyState from "./components/EmptyState";
import { compact, money, titleCase } from "./lib/format";

const COLORS = ["#6d5dfc", "#17b897", "#f59e0b", "#ef5b67", "#3b82f6", "#a855f7"];

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [fraud, setFraud] = useState("all");
  const [sort, setSort] = useState("date");
  const [sortDir, setSortDir] = useState("desc");
  const [page, setPage] = useState(1);
  const [mobileNav, setMobileNav] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const pageSize = 12;

  useEffect(() => {
    fetch("/data/transactions.json", { cache: "force-cache" })
      .then((r) => { if (!r.ok) throw new Error("Dataset could not be loaded."); return r.json(); })
      .then(setData)
      .catch((e) => setLoadError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { setPage(1); }, [query, category, fraud, tab]);

  const categories = useMemo(
    () => [...new Set(data.map((r) => r.category).filter(Boolean))].sort(),
    [data]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((r) => {
      const matchesQuery = !q || [r.merchant, r.city, r.state, r.job, r.card, String(r.id ?? "")]
        .some((v) => String(v ?? "").toLowerCase().includes(q));
      const matchesCategory = category === "all" || r.category === category;
      const matchesFraud = fraud === "all" || (fraud === "fraud" ? r.fraud === 1 : r.fraud === 0);
      return matchesQuery && matchesCategory && matchesFraud;
    });
  }, [data, query, category, fraud]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => {
    let av = a[sort], bv = b[sort];
    if (sort === "date") { av = new Date(a.date || 0).getTime(); bv = new Date(b.date || 0).getTime(); }
    if (sort === "amount") { av = a.amount || 0; bv = b.amount || 0; }
    if (sort === "fraud") { av = a.fraud ?? -1; bv = b.fraud ?? -1; }
    if (typeof av === "string") return (av.localeCompare(bv || "")) * (sortDir === "asc" ? 1 : -1);
    return ((av || 0) - (bv || 0)) * (sortDir === "asc" ? 1 : -1);
  }), [filtered, sort, sortDir]);

  const visibleRows = sorted.slice((page - 1) * pageSize, page * pageSize);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));

  const stats = useMemo(() => {
    const known = data.filter(r => r.fraud !== null);
    const fraudRows = known.filter(r => r.fraud === 1);
    const legitRows = known.filter(r => r.fraud === 0);
    const totalAmount = data.reduce((s, r) => s + (r.amount || 0), 0);
    const fraudAmount = fraudRows.reduce((s, r) => s + (r.amount || 0), 0);
    return {
      total: data.length, known: known.length, fraud: fraudRows.length,
      legit: legitRows.length, unknown: data.length - known.length,
      amount: totalAmount, fraudAmount,
      fraudRate: known.length ? fraudRows.length / known.length * 100 : 0
    };
  }, [data]);

  const categoryData = useMemo(() => categories.map((c) => {
    const rows = data.filter(r => r.category === c);
    const known = rows.filter(r => r.fraud !== null);
    return {
      name: titleCase(c), count: rows.length,
      fraud: known.filter(r => r.fraud === 1).length,
      amount: rows.reduce((s, r) => s + (r.amount || 0), 0)
    };
  }).sort((a,b) => b.amount-a.amount), [data, categories]);

  const stateData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!r.state) return;
      map[r.state] ??= { state: r.state, transactions: 0, fraud: 0, amount: 0 };
      map[r.state].transactions++;
      map[r.state].amount += r.amount || 0;
      if (r.fraud === 1) map[r.state].fraud++;
    });
    return Object.values(map).sort((a,b) => b.fraud-a.fraud).slice(0, 10);
  }, [data]);

  const timeData = useMemo(() => {
    const map = {};
    data.forEach(r => {
      if (!r.date) return;
      const d = new Date(r.date);
      if (Number.isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
      map[key] ??= { month: key, total: 0, fraud: 0 };
      map[key].total += 1;
      if (r.fraud === 1) map[key].fraud += 1;
    });
    return Object.values(map).sort((a,b) => a.month.localeCompare(b.month));
  }, [data]);

  const clearFilters = () => { setQuery(""); setCategory("all"); setFraud("all"); };
  const toggleSort = (key) => { if (sort === key) setSortDir(d => d === "asc" ? "desc" : "asc"); else { setSort(key); setSortDir("desc"); } };

  const exportCSV = () => {
    const cols = ["id","date","card","merchant","category","amount","gender","city","state","fraud"];
    const csv = [cols.join(","), ...sorted.map(r => cols.map(c => `"${String(r[c] ?? "").replaceAll('"','""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], {type:"text/csv;charset=utf-8"});
    const url = URL.createObjectURL(blob); const a = document.createElement("a");
    a.href=url; a.download="traceguard-filtered-transactions.csv"; a.click(); URL.revokeObjectURL(url);
  };

  if (loading) return <div className="screen-center"><div className="loader"></div><strong>Loading transaction intelligence…</strong><span>Preparing the supplied dataset locally in your browser.</span></div>;
  if (loadError) return <div className="screen-center"><AlertTriangle size={36}/><strong>Dataset load failed</strong><span>{loadError}</span><button className="button primary" onClick={() => location.reload()}><RefreshCw size={16}/> Retry</button></div>;

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNav ? "open" : ""}`}>
        <div className="brand"><div className="brand-mark">TG</div><div><strong>TraceGuard</strong><span>Transaction intelligence</span></div></div>
        <nav aria-label="Primary navigation">
          {[
            ["overview","Overview",Gauge],["fraud","Fraud analysis",ShieldAlert],["transactions","Transactions",Table2],["data","Data quality",Database]
          ].map(([id,label,Icon]) =>
            <button key={id} className={`nav-item ${tab===id ? "active":""}`} onClick={()=>{setTab(id);setMobileNav(false)}}><Icon size={18}/><span>{label}</span></button>
          )}
        </nav>
        <div className="sidebar-note"><Sparkles size={17}/><div><strong>Frontend-only</strong><span>No server, database or API required. Filtering and analysis run in the browser.</span></div></div>
      </aside>

      {mobileNav && <button className="mobile-backdrop" aria-label="Close navigation" onClick={()=>setMobileNav(false)}></button>}

      <main className="main">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={21}/></button>
          <div className="topbar-title"><span className="status-dot"></span><span>Live local analysis</span><span className="divider"></span><span>{data.length.toLocaleString("en-IN")} supplied records</span></div>
          <button className="button outline" onClick={exportCSV}><Download size={16}/> Export filtered CSV</button>
        </header>

        <div className="content">
          <section className="hero">
            <div>
              <p className="eyebrow">WEBRUSH · DATA-DRIVEN FRONTEND</p>
              <h1>See the signal.<br/><em>Act on the pattern.</em></h1>
              <p className="hero-copy">A responsive transaction intelligence workspace for exploring fraud patterns, transaction volume, categories and data quality — built entirely on the supplied dataset.</p>
            </div>
            <div className="hero-badge"><ShieldAlert size={18}/><span><strong>Risk view</strong><small>Fraud labels available for {stats.known.toLocaleString("en-IN")} records</small></span></div>
          </section>

          <div className="metrics-grid">
            <MetricCard label="Transactions" value={stats.total.toLocaleString("en-IN")} detail={`${stats.unknown} without a fraud label`} />
            <MetricCard label="Total value" value={money(stats.amount)} detail="Across all supplied records" tone="violet"/>
            <MetricCard label="Flagged as fraud" value={stats.fraud.toLocaleString("en-IN")} detail={`${stats.fraudRate.toFixed(1)}% of labelled records`} tone="danger"/>
            <MetricCard label="Flagged value" value={money(stats.fraudAmount)} detail={`${((stats.fraudAmount / (stats.amount || 1))*100).toFixed(1)}% of total value`} tone="amber"/>
          </div>

          {tab === "overview" && <Overview timeData={timeData} categoryData={categoryData} stateData={stateData} stats={stats} />}
          {tab === "fraud" && <FraudAnalysis data={data} categoryData={categoryData} stateData={stateData} stats={stats} />}
          {tab === "transactions" && <Transactions
            query={query} setQuery={setQuery} category={category} setCategory={setCategory}
            fraud={fraud} setFraud={setFraud} categories={categories} showFilters={showFilters}
            setShowFilters={setShowFilters} clearFilters={clearFilters} visibleRows={visibleRows}
            sorted={sorted} page={page} setPage={setPage} pageCount={pageCount} toggleSort={toggleSort} sort={sort} sortDir={sortDir}
          />}
          {tab === "data" && <DataQuality data={data} stats={stats} />}
        </div>
        <footer><span>TraceGuard</span><span>Static frontend · supplied dataset · accessible UI</span><span>Built for automated evaluation</span></footer>
      </main>
    </div>
  );
}

function ChartCard({ title, description, children, className="" }) {
  return <article className={`chart-card ${className}`}><div className="chart-head"><div><h3>{title}</h3><p>{description}</p></div></div><div className="chart-body">{children}</div></article>;
}

function Overview({timeData, categoryData, stateData}) {
  return <div className="dashboard-stack">
    <SectionHeader eyebrow="Overview" title="A compact view of transaction risk" description="Use the high-level patterns first, then drill into records with the Transactions workspace." />
    <div className="chart-grid two">
      <ChartCard title="Monthly transaction activity" description="Total records versus records labelled as fraud.">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={timeData}><defs><linearGradient id="areaA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6d5dfc" stopOpacity=".30"/><stop offset="100%" stopColor="#6d5dfc" stopOpacity="0"/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="month" tick={{fontSize:11}} minTickGap={26}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/><Area type="monotone" dataKey="total" name="All transactions" stroke="#6d5dfc" fill="url(#areaA)" strokeWidth={2}/><Area type="monotone" dataKey="fraud" name="Fraud-labelled" stroke="#ef5b67" fill="none" strokeWidth={2}/></AreaChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Value by category" description="Transaction value grouped by the supplied category field.">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={categoryData} layout="vertical" margin={{left:8,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tickFormatter={v=>compact(v)} tick={{fontSize:11}}/><YAxis type="category" dataKey="name" width={115} tick={{fontSize:11}}/><Tooltip formatter={(v)=>money(v)}/><Bar dataKey="amount" name="Value" radius={[0,6,6,0]}>{categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Bar></BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
    <div className="chart-grid two">
      <ChartCard title="Top states by fraud-labelled records" description="Counts only; missing labels are not treated as fraud.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={stateData} layout="vertical" margin={{left:6,right:12}}><CartesianGrid strokeDasharray="3 3" horizontal={false}/><XAxis type="number" tick={{fontSize:11}}/><YAxis type="category" dataKey="state" width={112} tick={{fontSize:10}}/><Tooltip/><Bar dataKey="fraud" name="Fraud-labelled" fill="#ef5b67" radius={[0,6,6,0]}/></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Category mix" description="Share of all supplied transactions.">
        <ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={categoryData} dataKey="count" nameKey="name" cx="50%" cy="50%" outerRadius={100} innerRadius={58} paddingAngle={3}>{categoryData.map((_,i)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}</Pie><Tooltip/><Legend verticalAlign="bottom" height={36}/></PieChart></ResponsiveContainer>
      </ChartCard>
    </div>
  </div>;
}

function FraudAnalysis({data, categoryData, stateData, stats}) {
  const byGender = useMemo(() => ["F","M"].map(g => {
    const rows=data.filter(r=>r.gender===g); const known=rows.filter(r=>r.fraud!==null);
    return {name:g==="F"?"Female":"Male", fraud:known.filter(r=>r.fraud===1).length, legit:known.filter(r=>r.fraud===0).length};
  }),[data]);
  const highValue = [...data].filter(r=>r.amount!=null).sort((a,b)=>b.amount-a.amount).slice(0,8);
  return <div className="dashboard-stack">
    <SectionHeader eyebrow="Fraud analysis" title="Explore the labelled risk signal" description="This view reports patterns present in the supplied data; it does not claim that the labels represent real-world prevalence." />
    <div className="insight-strip">
      <div><ShieldAlert size={20}/><div><strong>{stats.fraudRate.toFixed(1)}% labelled-fraud share</strong><span>among records with a non-missing fraud label</span></div></div>
      <div><Database size={20}/><div><strong>{stats.unknown.toLocaleString("en-IN")} missing labels</strong><span>kept separate rather than guessed</span></div></div>
      <div><CircleHelp size={20}/><div><strong>Data-first interpretation</strong><span>correlation here is not proof of causation</span></div></div>
    </div>
    <div className="chart-grid two">
      <ChartCard title="Fraud versus legitimate by category" description="Counts among records with known labels.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={categoryData}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name" tick={{fontSize:10}}/><YAxis tick={{fontSize:11}}/><Tooltip/><Legend/><Bar dataKey="fraud" name="Fraud-labelled" fill="#ef5b67" radius={[5,5,0,0]}/><Bar dataKey="count" name="All records" fill="#6d5dfc" opacity=".45" radius={[5,5,0,0]}/></BarChart></ResponsiveContainer>
      </ChartCard>
      <ChartCard title="Label distribution by gender" description="Only rows with a known fraud label are counted.">
        <ResponsiveContainer width="100%" height="100%"><BarChart data={byGender}><CartesianGrid strokeDasharray="3 3" vertical={false}/><XAxis dataKey="name"/><YAxis/><Tooltip/><Legend/><Bar dataKey="fraud" name="Fraud-labelled" fill="#ef5b67"/><Bar dataKey="legit" name="Not fraud" fill="#17b897"/></BarChart></ResponsiveContainer>
      </ChartCard>
    </div>
    <ChartCard title="Highest-value supplied transactions" description="Sensitive identifiers are masked. Addresses and full card numbers are never shown.">
      <div className="table-wrap"><table><thead><tr><th>Merchant</th><th>Category</th><th>State</th><th>Value</th><th>Label</th></tr></thead><tbody>{highValue.map((r,i)=><tr key={i}><td>{r.merchant || "Unknown merchant"}</td><td>{titleCase(r.category || "unknown")}</td><td>{r.state || "Unknown"}</td><td className="num">{money(r.amount)}</td><td><StatusBadge value={r.fraud}/></td></tr>)}</tbody></table></div>
    </ChartCard>
  </div>;
}

function Transactions({query,setQuery,category,setCategory,fraud,setFraud,categories,showFilters,setShowFilters,clearFilters,visibleRows,sorted,page,setPage,pageCount,toggleSort,sort,sortDir}) {
  return <div className="dashboard-stack">
    <SectionHeader eyebrow="Transactions" title="Search, filter and inspect" description="Visible text labels make every primary action machine-detectable and usable with keyboard navigation." action={<button className="button outline" onClick={()=>setShowFilters(v=>!v)}><SlidersHorizontal size={16}/>{showFilters?"Hide filters":"Show filters"}</button>} />
    <div className="search-bar"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search merchant, city, state, job or transaction ID…" aria-label="Search transactions"/>{query && <button className="icon-button" aria-label="Clear search" onClick={()=>setQuery("")}><X size={16}/></button>}</div>
    {showFilters && <div className="filters-panel">
      <label>Category<select value={category} onChange={e=>setCategory(e.target.value)}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{titleCase(c)}</option>)}</select></label>
      <label>Fraud label<select value={fraud} onChange={e=>setFraud(e.target.value)}><option value="all">All labels</option><option value="fraud">Fraud-labelled</option><option value="legit">Not fraud</option></select></label>
      <button className="button ghost" onClick={clearFilters}><RefreshCw size={16}/> Reset filters</button>
    </div>}
    <div className="results-line"><span><strong>{sorted.length.toLocaleString("en-IN")}</strong> matching records</span><span>Page {page} of {pageCount}</span></div>
    <div className="table-card">
      <div className="table-wrap">
        <table><thead><tr>
          <SortableTh label="Date" k="date" {...{sort,sortDir,toggleSort}}/><th>Merchant</th><th>Category</th><th>Location</th><SortableTh label="Amount" k="amount" {...{sort,sortDir,toggleSort}}/><SortableTh label="Label" k="fraud" {...{sort,sortDir,toggleSort}}/>
        </tr></thead><tbody>
          {visibleRows.length ? visibleRows.map((r,i)=><tr key={`${r.id}-${i}`}><td className="nowrap">{r.date || "Unknown"}</td><td><strong>{r.merchant || "Unknown merchant"}</strong><small className="cell-sub">{r.card}</small></td><td>{titleCase(r.category || "unknown")}</td><td>{[r.city,r.state].filter(Boolean).join(", ") || "Unknown"}</td><td className="num">{money(r.amount)}</td><td><StatusBadge value={r.fraud}/></td></tr>) : <tr><td colSpan="6"><EmptyState/></td></tr>}
        </tbody></table>
      </div>
      <div className="pagination"><button className="button ghost" disabled={page<=1} onClick={()=>setPage(p=>p-1)}>Previous</button><span>Showing {(page-1)*12+1}-{Math.min(page*12,sorted.length)} of {sorted.length}</span><button className="button ghost" disabled={page>=pageCount} onClick={()=>setPage(p=>p+1)}>Next</button></div>
    </div>
  </div>;
}

function SortableTh({label,k,sort,sortDir,toggleSort}) {
  return <th><button className="sort-button" onClick={()=>toggleSort(k)}>{label}{sort===k ? (sortDir==="asc"?<ArrowUp size={13}/>:<ArrowDown size={13}/>):<ChevronDown size={13}/>}</button></th>;
}
function StatusBadge({value}) {
  if(value===1) return <span className="badge danger"><ShieldAlert size={13}/> Fraud-labelled</span>;
  if(value===0) return <span className="badge success"><CheckCircle2 size={13}/> Not fraud</span>;
  return <span className="badge neutral">Unknown</span>;
}

function DataQuality({data,stats}) {
  const fields=["date","merchant","category","amount","gender","city","state","job","fraud"];
  const quality=fields.map(f=>{const missing=data.filter(r=>r[f]===null||r[f]==="").length; return {field:titleCase(f),missing,complete:data.length-missing,pct:(1-missing/data.length)*100};});
  const totalCells=data.length*fields.length; const missingCells=quality.reduce((s,r)=>s+r.missing,0);
  return <div className="dashboard-stack">
    <SectionHeader eyebrow="Data quality" title="Know what the dataset contains" description="Missing values are surfaced explicitly so the interface does not silently invent information." />
    <div className="quality-summary"><div className="quality-score"><span>Completeness</span><strong>{((1-missingCells/totalCells)*100).toFixed(1)}%</strong><small>Across dashboard fields</small></div><div className="quality-list"><div><strong>{stats.total.toLocaleString("en-IN")}</strong><span>records supplied</span></div><div><strong>{stats.unknown.toLocaleString("en-IN")}</strong><span>unknown fraud labels</span></div><div><strong>0</strong><span>full card numbers displayed</span></div></div></div>
    <ChartCard title="Field completeness" description="Percentage of records containing a usable value for each field.">
      <div className="quality-bars">{quality.map(q=><div className="quality-row" key={q.field}><div><span>{q.field}</span><strong>{q.pct.toFixed(1)}%</strong></div><div className="progress"><i style={{width:`${q.pct}%`}}/></div><small>{q.missing.toLocaleString("en-IN")} missing</small></div>)}</div>
    </ChartCard>
    <div className="method-card"><div><Sparkles size={19}/><h3>Implementation notes</h3></div><ul><li>All analysis runs client-side from a static JSON export derived from the supplied CSV.</li><li>Fraud rate excludes records where the supplied label is missing.</li><li>Card identifiers are masked; street-level address fields are not rendered.</li><li>Charts use responsive containers and tables use horizontal overflow rather than breaking the page at narrow widths.</li></ul></div>
  </div>;
}

export default App;
