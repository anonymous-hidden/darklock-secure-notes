/**
 * Darklock Secure Notes — Charts Page
 *
 * Simple chart builder: create bar, line, pie, doughnut, area, and scatter
 * charts with manual data entry. Charts are stored per-note or standalone.
 * Pure SVG/CSS — no external charting library needed.
 */

import React, { useState, useMemo } from 'react';
import { useAppStore, ChartType, ChartData } from '../stores/appStore';
import { Button, Input, Modal, Badge } from '@darklock/ui';
import { TopBar } from '../components/TopBar';

/* ── SVG Icons ────────────────────────────────────────────────── */
const BarIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="8" width="3" height="6" rx="0.5" fill="currentColor" opacity="0.5" /><rect x="5.5" y="4" width="3" height="10" rx="0.5" fill="currentColor" opacity="0.7" /><rect x="10" y="6" width="3" height="8" rx="0.5" fill="currentColor" /></svg>);
const LineIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,6 9,9 14,3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>);
const PieIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" /><path d="M8 2V8H14" stroke="currentColor" strokeWidth="1.2" /></svg>);
const DoughnutIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.2" /><circle cx="8" cy="8" r="3" stroke="currentColor" strokeWidth="1.2" /><path d="M8 2V5" stroke="currentColor" strokeWidth="1.2" /></svg>);
const AreaIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 14L5 7L9 10L14 3V14H1Z" fill="currentColor" opacity="0.2" stroke="currentColor" strokeWidth="1" /></svg>);
const ScatterIcon = () => (<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="11" r="1.5" fill="currentColor" /><circle cx="6" cy="5" r="1.5" fill="currentColor" /><circle cx="10" cy="8" r="1.5" fill="currentColor" /><circle cx="13" cy="3" r="1.5" fill="currentColor" /></svg>);
const PlusIcon = () => (<svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>);
const TrashSmIcon = () => (<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M2 3h9M4.5 3V2a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1M3 3l.5 7.5a1.5 1.5 0 0 0 1.5 1.5h3a1.5 1.5 0 0 0 1.5-1.5L10 3" stroke="currentColor" strokeWidth="1" strokeLinecap="round" /></svg>);
const EditIcon = () => (<svg width="13" height="13" viewBox="0 0 13 13" fill="none"><path d="M8.5 1.5l3 3L4 12H1v-3z" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" /></svg>);

/* Chart type metadata */
const CHART_TYPES: { type: ChartType; label: string; icon: React.ReactNode; desc: string }[] = [
  { type: 'bar', label: 'Bar', icon: <BarIcon />, desc: 'Compare values across categories' },
  { type: 'line', label: 'Line', icon: <LineIcon />, desc: 'Show trends over time' },
  { type: 'pie', label: 'Pie', icon: <PieIcon />, desc: 'Show proportions of a whole' },
  { type: 'doughnut', label: 'Doughnut', icon: <DoughnutIcon />, desc: 'Pie variant with center hole' },
  { type: 'area', label: 'Area', icon: <AreaIcon />, desc: 'Filled line for volume trends' },
  { type: 'scatter', label: 'Scatter', icon: <ScatterIcon />, desc: 'Plot data points on x/y axes' },
];

const CHART_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899', '#8b5cf6', '#14b8a6'];

/* ── Pure-CSS/SVG Chart Renderer ─────────────────────────────── */
const ChartPreview: React.FC<{ chart: ChartData }> = ({ chart }) => {
  const { type, labels, datasets } = chart;
  if (!datasets.length || !datasets[0].data.length) {
    return <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)', textAlign: 'center', padding: '40px 0' }}>No data yet</div>;
  }

  const data = datasets[0].data;
  const max = Math.max(...data, 1);
  const w = 340; const h = 180; const pad = 30;
  const usableW = w - pad * 2;
  const usableH = h - pad * 2;

  if (type === 'bar') {
    const barW = Math.min(40, usableW / data.length - 6);
    const gap = (usableW - barW * data.length) / (data.length + 1);
    return (
      <svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
        {/* axes */}
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        {data.map((v, i) => {
          const x = pad + gap + i * (barW + gap);
          const barH = (v / max) * usableH;
          const y = h - pad - barH;
          const color = datasets[0].color || CHART_COLORS[i % CHART_COLORS.length];
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={barH} rx={3} fill={color} opacity={0.85}>
                <animate attributeName="height" from="0" to={barH} dur="0.5s" fill="freeze" />
                <animate attributeName="y" from={h - pad} to={y} dur="0.5s" fill="freeze" />
              </rect>
              <text x={x + barW / 2} y={h - pad + 14} textAnchor="middle" fontSize="9" fill="var(--dl-text-muted)">{labels[i] || i}</text>
              <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize="9" fill="var(--dl-text-muted)">{v}</text>
            </g>
          );
        })}
      </svg>
    );
  }

  if (type === 'line' || type === 'area') {
    const stepX = usableW / (data.length - 1 || 1);
    const points = data.map((v, i) => ({ x: pad + i * stepX, y: h - pad - (v / max) * usableH }));
    const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const fillD = type === 'area' ? `${pathD} L${points[points.length - 1].x},${h - pad} L${pad},${h - pad} Z` : '';
    return (
      <svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        {type === 'area' && <path d={fillD} fill={CHART_COLORS[0]} opacity={0.15} />}
        <path d={pathD} fill="none" stroke={CHART_COLORS[0]} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r="3.5" fill={CHART_COLORS[0]} stroke="var(--dl-bg-primary)" strokeWidth="2" />
            <text x={p.x} y={h - pad + 14} textAnchor="middle" fontSize="9" fill="var(--dl-text-muted)">{labels[i] || i}</text>
          </g>
        ))}
      </svg>
    );
  }

  if (type === 'pie' || type === 'doughnut') {
    const total = data.reduce((a, b) => a + b, 0) || 1;
    const cx = w / 2; const cy = h / 2; const r = 65;
    const innerR = type === 'doughnut' ? 35 : 0;
    let cum = 0;
    const arcs = data.map((v, i) => {
      const start = cum;
      const frac = v / total;
      cum += frac;
      const a1 = start * 2 * Math.PI - Math.PI / 2;
      const a2 = (start + frac) * 2 * Math.PI - Math.PI / 2;
      const large = frac > 0.5 ? 1 : 0;
      return {
        d: [
          `M${cx + innerR * Math.cos(a1)},${cy + innerR * Math.sin(a1)}`,
          `L${cx + r * Math.cos(a1)},${cy + r * Math.sin(a1)}`,
          `A${r},${r} 0 ${large} 1 ${cx + r * Math.cos(a2)},${cy + r * Math.sin(a2)}`,
          `L${cx + innerR * Math.cos(a2)},${cy + innerR * Math.sin(a2)}`,
          innerR > 0 ? `A${innerR},${innerR} 0 ${large} 0 ${cx + innerR * Math.cos(a1)},${cy + innerR * Math.sin(a1)}` : `L${cx},${cy}`,
          'Z',
        ].join(' '),
        color: CHART_COLORS[i % CHART_COLORS.length],
        label: labels[i] || `${i}`,
        pct: Math.round(frac * 100),
      };
    });
    return (
      <svg width={w} height={h + 30} viewBox={`0 0 ${w} ${h + 30}`}>
        {arcs.map((a, i) => <path key={i} d={a.d} fill={a.color} opacity={0.85} stroke="var(--dl-bg-primary)" strokeWidth="1.5" />)}
        {arcs.map((a, i) => (
          <text key={`lbl-${i}`} x={pad + i * 60} y={h + 15} fontSize="9" fill="var(--dl-text-muted)">
            <tspan fill={a.color}>●</tspan> {a.label} ({a.pct}%)
          </text>
        ))}
      </svg>
    );
  }

  if (type === 'scatter') {
    return (
      <svg width={w} height={h + 20} viewBox={`0 0 ${w} ${h + 20}`}>
        <line x1={pad} y1={pad} x2={pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--dl-border)" strokeWidth="1" />
        {data.map((v, i) => {
          const x = pad + (i / (data.length - 1 || 1)) * usableW;
          const y = h - pad - (v / max) * usableH;
          return <circle key={i} cx={x} cy={y} r="5" fill={CHART_COLORS[i % CHART_COLORS.length]} opacity={0.7} />;
        })}
      </svg>
    );
  }

  return null;
};

/* ── Main Component ──────────────────────────────────────────── */
export const Charts: React.FC = () => {
  const charts = useAppStore((s) => s.charts);
  const addChart = useAppStore((s) => s.addChart);
  const removeChart = useAppStore((s) => s.removeChart);
  const updateChart = useAppStore((s) => s.updateChart);
  const [showCreate, setShowCreate] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  /* Create form state */
  const [newType, setNewType] = useState<ChartType>('bar');
  const [newTitle, setNewTitle] = useState('');
  const [newLabels, setNewLabels] = useState('');
  const [newValues, setNewValues] = useState('');
  const [newDatasetLabel, setNewDatasetLabel] = useState('Dataset 1');

  const resetForm = () => {
    setNewTitle(''); setNewLabels(''); setNewValues(''); setNewDatasetLabel('Dataset 1'); setNewType('bar');
  };

  const handleCreate = () => {
    const labelsArr = newLabels.split(',').map((l) => l.trim()).filter(Boolean);
    const valuesArr = newValues.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v));
    if (!newTitle.trim() || !labelsArr.length || !valuesArr.length) return;

    const chart: ChartData = {
      id: `chart-${Date.now()}`,
      noteId: '',
      type: newType,
      title: newTitle.trim(),
      labels: labelsArr,
      datasets: [{ label: newDatasetLabel, data: valuesArr }],
      createdAt: new Date().toISOString(),
    };
    addChart(chart);
    resetForm();
    setShowCreate(false);
  };

  const filteredCharts = useMemo(
    () => charts.filter((c) => c.title.toLowerCase().includes(search.toLowerCase())),
    [charts, search],
  );

  const editingChart = editId ? charts.find((c) => c.id === editId) : null;

  return (
    <div className="charts-screen">
      <TopBar />
      <div className="charts-body">
        {/* Header */}
        <div className="charts-header">
          <div>
            <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 600 }}>Charts</h2>
            <p style={{ margin: 0, fontSize: '13px', color: 'var(--dl-text-muted)' }}>
              Create simple charts to visualize data in your notes.
            </p>
          </div>
          <Button variant="primary" size="sm" onClick={() => setShowCreate(true)}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}><PlusIcon /> New Chart</span>
          </Button>
        </div>

        {/* Search */}
        {charts.length > 3 && (
          <div style={{ margin: '0 0 20px' }}>
            <Input placeholder="Search charts..." value={search} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)} />
          </div>
        )}

        {/* How Charts Work — quick info */}
        <div style={{ padding: '14px 18px', borderRadius: '10px', background: 'var(--dl-bg-surface)', border: '1px solid var(--dl-border)', marginBottom: '24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)', marginBottom: '6px' }}>How Charts Work</div>
          <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: 'var(--dl-text-secondary)', lineHeight: 1.8 }}>
            <li>Click <strong>New Chart</strong> and pick a chart type (bar, line, pie, etc.)</li>
            <li>Enter <strong>comma-separated</strong> labels (e.g. Jan, Feb, Mar)</li>
            <li>Enter <strong>comma-separated</strong> values (e.g. 10, 25, 18)</li>
            <li>Give it a title and click <strong>Create</strong> — that&rsquo;s it!</li>
          </ol>
        </div>

        {/* Chart Cards */}
        {filteredCharts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div style={{ fontSize: '42px', marginBottom: '12px', opacity: 0.4 }}>📊</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dl-text-secondary)', marginBottom: '6px' }}>No charts yet</div>
            <div style={{ fontSize: '12px', color: 'var(--dl-text-muted)' }}>Create your first chart to visualize data.</div>
          </div>
        ) : (
          <div className="charts-grid">
            {filteredCharts.map((chart) => (
              <div key={chart.id} className="chart-card">
                <div className="chart-card-header">
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--dl-text)' }}>{chart.title}</div>
                    <Badge variant="info" size="sm">{chart.type}</Badge>
                  </div>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button className="chart-action-btn" onClick={() => setEditId(chart.id)} title="Edit"><EditIcon /></button>
                    <button className="chart-action-btn danger" onClick={() => removeChart(chart.id)} title="Delete"><TrashSmIcon /></button>
                  </div>
                </div>
                <div className="chart-card-body">
                  <ChartPreview chart={chart} />
                </div>
                <div className="chart-card-footer">
                  <span style={{ fontSize: '11px', color: 'var(--dl-text-muted)' }}>
                    {chart.datasets[0]?.data.length || 0} data points &middot; {new Date(chart.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Create Modal ─────────────────────────────────────────── */}
      {showCreate && (
        <Modal isOpen={true} title="Create Chart" onClose={() => { resetForm(); setShowCreate(false); }} size="md">
          <div style={{ padding: '8px 0' }}>
            {/* Chart type picker */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)', marginBottom: '8px' }}>Chart Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                {CHART_TYPES.map((ct) => (
                  <button key={ct.type} onClick={() => setNewType(ct.type)}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', padding: '12px 8px',
                      borderRadius: '10px', border: `1.5px solid ${newType === ct.type ? 'var(--dl-accent)' : 'var(--dl-border)'}`,
                      background: newType === ct.type ? 'rgba(99,102,241,0.08)' : 'var(--dl-bg-surface)', cursor: 'pointer',
                      color: newType === ct.type ? 'var(--dl-accent)' : 'var(--dl-text-secondary)', transition: 'all 0.15s',
                    }}>
                    {ct.icon}
                    <span style={{ fontSize: '12px', fontWeight: 500 }}>{ct.label}</span>
                    <span style={{ fontSize: '10px', color: 'var(--dl-text-muted)', textAlign: 'center' }}>{ct.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Fields */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <Input label="Chart Title" value={newTitle} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewTitle(e.target.value)} placeholder="e.g. Monthly Revenue" />
              <Input label="Dataset Label" value={newDatasetLabel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewDatasetLabel(e.target.value)} placeholder="e.g. Revenue" />
              <Input label="Labels (comma-separated)" value={newLabels} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewLabels(e.target.value)} placeholder="e.g. Jan, Feb, Mar, Apr, May" />
              <Input label="Values (comma-separated)" value={newValues} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewValues(e.target.value)} placeholder="e.g. 10, 25, 18, 32, 28" />
            </div>

            {/* Preview */}
            {newLabels && newValues && (
              <div style={{ marginTop: '20px', padding: '12px', borderRadius: '10px', border: '1px solid var(--dl-border)', background: 'var(--dl-bg-primary)' }}>
                <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--dl-text-muted)', marginBottom: '8px' }}>Preview</div>
                <ChartPreview chart={{
                  id: 'preview', noteId: '', type: newType, title: newTitle, createdAt: '',
                  labels: newLabels.split(',').map((l) => l.trim()).filter(Boolean),
                  datasets: [{ label: newDatasetLabel, data: newValues.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v)) }],
                }} />
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <Button variant="ghost" onClick={() => { resetForm(); setShowCreate(false); }}>Cancel</Button>
              <Button variant="primary" onClick={handleCreate} disabled={!newTitle.trim() || !newLabels.trim() || !newValues.trim()}>Create Chart</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Edit Modal ───────────────────────────────────────────── */}
      {editingChart && (
        <Modal isOpen={true} title={`Edit: ${editingChart.title}`} onClose={() => setEditId(null)} size="md">
          <EditChartForm chart={editingChart} onSave={(updates) => { updateChart(editingChart.id, updates); setEditId(null); }} onClose={() => setEditId(null)} />
        </Modal>
      )}
    </div>
  );
};

/* ── Edit Form Sub-Component ─────────────────────────────────── */
const EditChartForm: React.FC<{
  chart: ChartData;
  onSave: (updates: Partial<ChartData>) => void;
  onClose: () => void;
}> = ({ chart, onSave, onClose }) => {
  const [title, setTitle] = useState(chart.title);
  const [type, setType] = useState<ChartType>(chart.type);
  const [labels, setLabels] = useState(chart.labels.join(', '));
  const [values, setValues] = useState(chart.datasets[0]?.data.join(', ') || '');
  const [dsLabel, setDsLabel] = useState(chart.datasets[0]?.label || 'Dataset 1');

  const handleSave = () => {
    onSave({
      title,
      type,
      labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
      datasets: [{ label: dsLabel, data: values.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v)) }],
    });
  };

  return (
    <div style={{ padding: '8px 0' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div style={{ marginBottom: '8px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: 'var(--dl-text)', marginBottom: '8px' }}>Chart Type</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {CHART_TYPES.map((ct) => (
              <button key={ct.type} onClick={() => setType(ct.type)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 12px', borderRadius: '8px',
                  border: `1.5px solid ${type === ct.type ? 'var(--dl-accent)' : 'var(--dl-border)'}`,
                  background: type === ct.type ? 'rgba(99,102,241,0.08)' : 'transparent', cursor: 'pointer',
                  color: type === ct.type ? 'var(--dl-accent)' : 'var(--dl-text-secondary)', fontSize: '12px', fontWeight: 500,
                }}>
                {ct.icon} {ct.label}
              </button>
            ))}
          </div>
        </div>
        <Input label="Chart Title" value={title} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)} />
        <Input label="Dataset Label" value={dsLabel} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDsLabel(e.target.value)} />
        <Input label="Labels (comma-separated)" value={labels} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLabels(e.target.value)} />
        <Input label="Values (comma-separated)" value={values} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setValues(e.target.value)} />
      </div>

      {/* Live preview */}
      <div style={{ marginTop: '20px', padding: '12px', borderRadius: '10px', border: '1px solid var(--dl-border)', background: 'var(--dl-bg-primary)' }}>
        <div style={{ fontSize: '11px', fontWeight: 500, color: 'var(--dl-text-muted)', marginBottom: '8px' }}>Preview</div>
        <ChartPreview chart={{
          ...chart, title, type,
          labels: labels.split(',').map((l) => l.trim()).filter(Boolean),
          datasets: [{ label: dsLabel, data: values.split(',').map((v) => parseFloat(v.trim())).filter((v) => !isNaN(v)) }],
        }} />
      </div>

      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
        <Button variant="ghost" onClick={onClose}>Cancel</Button>
        <Button variant="primary" onClick={handleSave}>Save Changes</Button>
      </div>
    </div>
  );
};
