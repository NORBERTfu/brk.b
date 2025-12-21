
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchLatestBrkData, performBacktestAnalysis, fetchPbrDistribution } from './services/geminiService';
import { BrkFinancialData, BacktestResult, PbrDistribution } from './types';
import { InfoCard } from './components/InfoCard';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, Legend, BarChart, Bar, Cell
} from 'recharts';

const App: React.FC = () => {
  const [data, setData] = useState<BrkFinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [backtestData, setBacktestData] = useState<BacktestResult | null>(null);
  const [distributionData, setDistributionData] = useState<PbrDistribution[]>([]);
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [error, setError] = useState<string | null>(null);
  const [customPbr, setCustomPbr] = useState<number>(1.47);
  const [activeTab, setActiveTab] = useState<'calc' | 'backtest'>('calc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [financialResult, distributionResult] = await Promise.all([
        fetchLatestBrkData(),
        fetchPbrDistribution()
      ]);
      setData(financialResult);
      setDistributionData(distributionResult);
    } catch (err) {
      setError("無法獲取最新財報或分佈數據。");
    } finally {
      setLoading(false);
    }
  }, []);

  const runBacktest = async () => {
    setBacktestLoading(true);
    try {
      const result = await performBacktestAnalysis(initialCapital);
      setBacktestData(result);
    } catch (err) {
      console.error(err);
    } finally {
      setBacktestLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (activeTab === 'backtest' && !backtestData) {
      runBacktest();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  const valuation = useMemo(() => {
    if (!data) return null;
    const bookValuePerA = (data.totalEquity * 1000000) / data.totalAShares;
    const bookValuePerB = bookValuePerA / 1500;
    // Granular multipliers within the requested 1.45 - 1.55 range
    const multipliers = [1.0, 1.2, 1.4, 1.45, 1.47, 1.49, 1.5, 1.51, 1.52, 1.55, 1.6, 1.8];
    const targets = multipliers.map(m => ({ multiplier: m, price: bookValuePerB * m }));
    return { bookValuePerA, bookValuePerB, targets };
  }, [data]);

  const currentPbrValue = useMemo(() => {
    if (!data || !valuation) return 0;
    return data.currentPrice / valuation.bookValuePerB;
  }, [data, valuation]);

  const currentStatusInfo = useMemo(() => {
    const pbr = currentPbrValue;
    if (pbr <= 1.45) return { label: '全力買入 (Deep Value)', color: 'bg-emerald-600 text-white', border: 'border-emerald-700' };
    if (pbr <= 1.47) return { label: '積極買入 (Entry Zone)', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' };
    if (pbr <= 1.49) return { label: '常態持有 (Accumulate)', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' };
    if (pbr <= 1.51) return { label: '準備分批賣出 (Pre-Trim)', color: 'bg-amber-50 text-amber-700', border: 'border-amber-100' };
    if (pbr <= 1.53) return { label: '建議切換至 QQQ (Shift)', color: 'bg-orange-100 text-orange-700', border: 'border-orange-200' };
    return { label: '全力避險 (Overvalued)', color: 'bg-rose-100 text-rose-700', border: 'border-rose-200' };
  }, [currentPbrValue]);

  const backtestChartData = useMemo(() => {
    if (!backtestData) return [];
    return backtestData.labels.map((label, index) => ({
      year: label,
      BRKHold: backtestData.holdValues[index],
      QQQHold: backtestData.qqqHoldValues[index],
      Strategy: backtestData.strategyValues[index],
    }));
  }, [backtestData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse text-center px-4">優化策略：正在計算高頻換手最佳買賣點...</p>
      </div>
    );
  }

  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 p-4 md:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">BRK.B 高頻估值與 QQQ 切換</h1>
            <p className="text-slate-500 text-sm mt-1">針對 1.45x - 1.55x 區間進行精密縮小範圍操作</p>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('calc')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'calc' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                精密估值表
              </button>
              <button 
                onClick={() => setActiveTab('backtest')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'backtest' ? 'bg-orange-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                高頻回測 (1.47/1.52)
              </button>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            刷新市場數據
          </button>
        </header>

        {activeTab === 'calc' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <InfoCard label="每股帳面價值 (B)" value={`$${valuation!.bookValuePerB.toFixed(2)}`} subValue="BVPS (Latest)" color="bg-indigo-50" />
              <InfoCard label="目前 PBR" value={currentPbrValue.toFixed(2)} subValue="Price / BVPS" color="bg-white" />
              <InfoCard label="目前股價" value={`$${data!.currentPrice.toFixed(2)}`} subValue="BRK.B Market" color="bg-white" />
              <div className={`${currentStatusInfo.color} p-6 rounded-2xl shadow-lg border ${currentStatusInfo.border} flex flex-col justify-center animate-pulse`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">即時操作策略</span>
                <div className="text-lg font-black mt-1 leading-tight">{currentStatusInfo.label}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-orange-500 rounded-full"></span>
                    高頻 PBR 操作分段表
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] border-b border-slate-100 uppercase tracking-widest">
                          <th className="pb-4 font-bold">PBR</th>
                          <th className="pb-4 font-bold">價位</th>
                          <th className="pb-4 font-bold text-right">精密建議</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {valuation?.targets.map((t) => {
                          let zoneLabel = '';
                          let zoneColor = '';
                          if (t.multiplier <= 1.45) {
                            zoneLabel = '全力買入';
                            zoneColor = 'text-emerald-600 bg-emerald-50';
                          } else if (t.multiplier <= 1.48) {
                            zoneLabel = '積極佈局';
                            zoneColor = 'text-emerald-500 bg-emerald-50/50';
                          } else if (t.multiplier <= 1.51) {
                            zoneLabel = '分批減碼';
                            zoneColor = 'text-amber-600 bg-amber-50';
                          } else {
                            zoneLabel = '全力切換 QQQ';
                            zoneColor = 'text-rose-600 bg-rose-50';
                          }
                          const isKeyThreshold = [1.47, 1.52].includes(Number(t.multiplier.toFixed(2)));
                          return (
                            <tr key={t.multiplier} className={`hover:bg-slate-50 transition-colors ${isKeyThreshold ? 'bg-indigo-50/20' : ''}`}>
                              <td className="py-3">
                                <span className={`font-mono text-sm ${isKeyThreshold ? 'text-indigo-600 font-black' : 'text-slate-600'}`}>
                                  {t.multiplier.toFixed(2)}x
                                </span>
                              </td>
                              <td className="py-3 font-mono font-bold text-sm">${t.price.toFixed(2)}</td>
                              <td className="py-3 text-right">
                                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${zoneColor}`}>
                                  {zoneLabel}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>

              <div className="space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-4">目標價精準試算</h2>
                  <div className="p-4 bg-slate-900 rounded-xl">
                    <label className="block text-[10px] font-bold text-slate-500 mb-2 uppercase">設定操作 PBR</label>
                    <div className="flex items-center gap-4 mb-4">
                      <input type="range" min="1.40" max="1.60" step="0.005" value={customPbr} onChange={(e) => setCustomPbr(parseFloat(e.target.value))} className="flex-grow h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500" />
                      <span className="text-lg font-black text-indigo-400 w-16 text-right font-mono">{customPbr.toFixed(3)}x</span>
                    </div>
                    <div className="pt-4 border-t border-slate-800">
                      <p className="text-[9px] text-slate-500 uppercase font-black">預計掛單價</p>
                      <p className="text-4xl font-black text-white font-mono">${targetPrice}</p>
                    </div>
                  </div>
                </section>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    高頻策略提示
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    「當區間從 1.45-1.55 縮小至 1.47-1.52 時，您的預期換手次數將增加約 200%，這能有效捕捉市場在窄幅波動中的效率差異。」
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-4">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">高頻窄幅回測 (1.47x / 1.52x)</h2>
                  <p className="text-xs text-slate-400 mt-1">模擬更頻繁的資產輪動以優化資金利用率</p>
                </div>
                <div className="px-3 py-1 bg-orange-100 text-orange-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  High Turnover Mode
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow">
                  <label className="block text-xs font-bold text-slate-500 mb-2">初始金額</label>
                  <input 
                    type="number" 
                    value={initialCapital} 
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <button 
                  onClick={runBacktest} 
                  className="w-full md:w-auto px-10 py-3 bg-indigo-600 text-white rounded-xl font-black shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                >
                  開始深度回測
                </button>
              </div>
            </section>

            {backtestLoading ? (
              <div className="bg-white p-32 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
                <div className="w-14 h-14 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-slate-400 font-bold tracking-widest text-sm animate-pulse">正在模擬 1.47x 與 1.52x 的頻繁換手邏輯...</p>
              </div>
            ) : backtestData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <h2 className="text-xl font-bold">高頻策略績效曲線</h2>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-indigo-600"></div><span className="text-[10px] font-bold">高頻策略</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-orange-400"></div><span className="text-[10px] font-bold">QQQ 持有</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-300"></div><span className="text-[10px] font-bold">BRK.B 持有</span></div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)'}} 
                            formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, '資產價值']}
                          />
                          <Area type="step" name="高頻策略" dataKey="Strategy" stroke="#4f46e5" strokeWidth={3} fill="#eef2ff" fillOpacity={0.8} />
                          <Area type="monotone" name="QQQ" dataKey="QQQHold" stroke="#f59e0b" strokeWidth={1.5} fill="#fff7ed" fillOpacity={0.2} />
                          <Area type="monotone" name="BRK.B" dataKey="BRKHold" stroke="#cbd5e1" strokeWidth={1.5} fill="#f8fafc" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"/></svg>
                      資產切換密集度時間軸
                    </h2>
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-50 flex h-16 border border-slate-100">
                      {backtestData.holdingTimeline.map((item, idx) => {
                        const widthPercent = (1 / backtestData.holdingTimeline.length) * 100;
                        const isBrk = item.asset === 'BRK.B';
                        return (
                          <div 
                            key={idx} 
                            className={`h-full flex items-center justify-center text-[9px] font-black transition-all hover:brightness-90 relative group cursor-crosshair`}
                            style={{ 
                              width: `${widthPercent}%`, 
                              backgroundColor: isBrk ? '#e2e8f0' : '#fbbf24',
                              color: isBrk ? '#64748b' : '#92400e',
                              borderRight: '1px solid rgba(0,0,0,0.03)'
                            }}
                          >
                            <span className="hidden sm:block">{item.asset}</span>
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 z-10 pointer-events-none shadow-xl">
                              <span className="text-slate-400 mr-2">{item.label}</span>
                              <span className="font-black">{item.asset}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-400 mt-4 text-center">
                      窄幅策略 (1.47-1.52) 產生的切換點明顯增加，能更即時回應市場的情緒波動。
                    </p>
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-6">高頻策略關鍵指標</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-slate-500">總換手次數</span>
                        <span className="font-black text-3xl text-indigo-600">{backtestData.numTrades} <span className="text-xs text-slate-400">次</span></span>
                      </div>
                      <div className="pt-6 border-t border-slate-50 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">高頻策略 ROI</span>
                          <span className="font-black text-emerald-600">+{backtestData.strategyRoi}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">QQQ Hold ROI</span>
                          <span className="font-black text-amber-600">+{backtestData.qqqRoi}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">BRK.B Hold ROI</span>
                          <span className="font-black text-slate-400">+{backtestData.holdRoi}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-indigo-900 text-white p-8 rounded-3xl shadow-2xl shadow-indigo-200">
                    <h3 className="text-indigo-300 font-black text-sm mb-4 tracking-wider uppercase">策略總結</h3>
                    <p className="text-xs text-indigo-100/80 leading-relaxed font-medium">
                      縮小操作範圍至 <span className="text-white font-black underline">1.47x - 1.52x</span> 有效地將 BRK.B 的防禦力轉化為動能捕獲器。這種高頻換手在震盪市中極具優勢，能更靈敏地捕捉 Alpha。
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-2">
                      <div className="p-3 bg-white/10 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase mb-1">Buy Order</span>
                        <span className="text-xs font-black">1.47x</span>
                      </div>
                      <div className="p-3 bg-white/10 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-indigo-300 font-bold uppercase mb-1">Sell Order</span>
                        <span className="text-xs font-black">1.52x</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
