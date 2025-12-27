
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
  const [customPbr, setCustomPbr] = useState<number>(1.52);
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
    // Granular multipliers focused around the 1.52 - 1.57 range
    const multipliers = [1.3, 1.4, 1.45, 1.5, 1.52, 1.54, 1.55, 1.56, 1.57, 1.59, 1.6, 1.7];
    const targets = multipliers.map(m => ({ multiplier: m, price: bookValuePerB * m }));
    return { bookValuePerA, bookValuePerB, targets };
  }, [data]);

  const currentPbrValue = useMemo(() => {
    if (!data || !valuation) return 0;
    return data.currentPrice / valuation.bookValuePerB;
  }, [data, valuation]);

  const currentStatusInfo = useMemo(() => {
    const pbr = currentPbrValue;
    if (pbr <= 1.45) return { label: '安全買入區 (Safety)', color: 'bg-emerald-600 text-white', border: 'border-emerald-700' };
    if (pbr <= 1.51) return { label: '持有觀望 (Hold)', color: 'bg-blue-50 text-blue-700', border: 'border-blue-100' };
    if (pbr <= 1.53) return { label: '策略買入點 (1.52 Entry)', color: 'bg-indigo-600 text-white', border: 'border-indigo-700' };
    if (pbr <= 1.56) return { label: '接近減碼區 (Warning)', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' };
    if (pbr <= 1.58) return { label: '策略切換 QQQ (1.57 Exit)', color: 'bg-rose-600 text-white', border: 'border-rose-700' };
    return { label: '極度高估 (Overvalued)', color: 'bg-slate-900 text-white', border: 'border-slate-800' };
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
        <p className="text-slate-500 font-medium animate-pulse text-center px-4">正在分析 1.52x - 1.57x 波動套利空間...</p>
      </div>
    );
  }

  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 p-4 md:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">BRK.B 動態波段輪動 (1.52/1.57)</h1>
            <p className="text-slate-500 text-sm mt-1">針對 PBR 1.52x - 1.57x 極端區間的優化策略</p>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('calc')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'calc' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                高位估值表
              </button>
              <button 
                onClick={() => setActiveTab('backtest')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'backtest' ? 'bg-rose-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                1.52/1.57 深度回測
              </button>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            同步最新市價
          </button>
        </header>

        {activeTab === 'calc' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <InfoCard label="B股帳面價值" value={`$${valuation!.bookValuePerB.toFixed(2)}`} subValue="BVPS (Quarterly)" color="bg-indigo-50" />
              <InfoCard label="目前 PBR" value={currentPbrValue.toFixed(3)} subValue={`股價: $${data!.currentPrice}`} color="bg-white" />
              <InfoCard label="離切換點距離" value={`${Math.abs(1.57 - currentPbrValue).toFixed(3)}x`} subValue="距離 1.57x 賣點" color="bg-white" />
              <div className={`${currentStatusInfo.color} p-6 rounded-2xl shadow-xl border ${currentStatusInfo.border} flex flex-col justify-center`}>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">策略導航</span>
                <div className="text-lg font-black mt-1 leading-tight">{currentStatusInfo.label}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-rose-600 rounded-full"></span>
                    極端估值操作表
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] border-b border-slate-100 uppercase tracking-widest">
                          <th className="pb-4 font-bold">PBR 倍數</th>
                          <th className="pb-4 font-bold">BRK.B 價位</th>
                          <th className="pb-4 font-bold text-right">策略分區</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {valuation?.targets.map((t) => {
                          let zoneLabel = '';
                          let zoneColor = '';
                          if (t.multiplier <= 1.51) {
                            zoneLabel = '相對安全區';
                            zoneColor = 'text-emerald-600 bg-emerald-50';
                          } else if (t.multiplier <= 1.53) {
                            zoneLabel = '1.52 關鍵買入';
                            zoneColor = 'text-indigo-600 bg-indigo-50';
                          } else if (t.multiplier <= 1.56) {
                            zoneLabel = '高位持有';
                            zoneColor = 'text-amber-600 bg-amber-50';
                          } else {
                            zoneLabel = '1.57 切換 QQQ';
                            zoneColor = 'text-rose-600 bg-rose-50';
                          }
                          const isKey = [1.52, 1.57].includes(Number(t.multiplier.toFixed(2)));
                          return (
                            <tr key={t.multiplier} className={`hover:bg-slate-50 transition-colors ${isKey ? 'bg-indigo-50/30 ring-1 ring-inset ring-indigo-200/50' : ''}`}>
                              <td className="py-3">
                                <span className={`font-mono text-sm ${isKey ? 'text-indigo-700 font-black' : 'text-slate-600'}`}>
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
                  <h2 className="text-xl font-bold mb-4">精確價位計算器</h2>
                  <div className="p-5 bg-slate-900 rounded-2xl">
                    <label className="block text-[10px] font-bold text-slate-500 mb-3 uppercase tracking-wider">自定義 PBR 操作點</label>
                    <div className="flex items-center gap-4 mb-5">
                      <input type="range" min="1.45" max="1.65" step="0.005" value={customPbr} onChange={(e) => setCustomPbr(parseFloat(e.target.value))} className="flex-grow h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                      <span className="text-xl font-black text-rose-400 w-16 text-right font-mono">{customPbr.toFixed(3)}x</span>
                    </div>
                    <div className="pt-5 border-t border-slate-800">
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-1">目標買賣價</p>
                      <p className="text-4xl font-black text-white font-mono">${targetPrice}</p>
                    </div>
                  </div>
                </section>

                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
                    1.52/1.57 邏輯
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed italic">
                    「當 PBR 突破 1.57x 時，BRK.B 往往進入短期情緒頂峰，切換至 QQQ 可捕捉科技股反彈；當回測 1.52x 時，回歸價值投資的穩定防禦。」
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-700 slide-in-from-bottom-6">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                  <h2 className="text-xl font-bold">1.52x (買回) / 1.57x (切換 QQQ) 績效回測</h2>
                  <p className="text-xs text-slate-400 mt-1">針對歷史高估值區間的資金輪動效率分析</p>
                </div>
                <div className="px-3 py-1 bg-rose-100 text-rose-700 rounded-full text-[10px] font-black uppercase tracking-widest">
                  High-Band Rotation
                </div>
              </div>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-grow">
                  <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">模擬初始資金</label>
                  <input 
                    type="number" 
                    value={initialCapital} 
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-black focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                </div>
                <button 
                  onClick={runBacktest} 
                  className="w-full md:w-auto px-10 py-3 bg-rose-600 text-white rounded-xl font-black shadow-lg shadow-rose-100 hover:bg-rose-700 transition-all active:scale-95"
                >
                  啟動回測分析
                </button>
              </div>
            </section>

            {backtestLoading ? (
              <div className="bg-white p-32 rounded-3xl border border-slate-200 flex flex-col items-center justify-center">
                <div className="w-14 h-14 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                <p className="text-slate-400 font-bold tracking-widest text-sm animate-pulse">正在精算 1.52x 與 1.57x 的高位輪動回報...</p>
              </div>
            ) : backtestData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                      <h2 className="text-xl font-bold">策略資產增長曲線 (1.52/1.57)</h2>
                      <div className="flex flex-wrap gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-rose-600"></div><span className="text-[10px] font-bold text-slate-600">輪動策略</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-amber-400"></div><span className="text-[10px] font-bold text-slate-600">QQQ</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-sm bg-slate-300"></div><span className="text-[10px] font-bold text-slate-600">BRK.B</span></div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip 
                            contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 40px rgba(0,0,0,0.08)'}} 
                            formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, '資產價值']}
                          />
                          <Area type="step" name="1.52/1.57 策略" dataKey="Strategy" stroke="#e11d48" strokeWidth={3} fill="#fff1f2" fillOpacity={0.8} />
                          <Area type="monotone" name="QQQ" dataKey="QQQHold" stroke="#f59e0b" strokeWidth={1.5} fill="#fff7ed" fillOpacity={0.2} />
                          <Area type="monotone" name="BRK.B" dataKey="BRKHold" stroke="#cbd5e1" strokeWidth={1.5} fill="#f8fafc" fillOpacity={0.1} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>

                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                      <svg className="w-5 h-5 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                      資產持有時間分布 (1.52/1.57)
                    </h2>
                    <div className="relative w-full overflow-hidden rounded-2xl bg-slate-50 flex h-16 border border-slate-100">
                      {backtestData.holdingTimeline.map((item, idx) => {
                        const widthPercent = (1 / backtestData.holdingTimeline.length) * 100;
                        const isBrk = item.asset === 'BRK.B';
                        return (
                          <div 
                            key={idx} 
                            className={`h-full flex items-center justify-center text-[9px] font-black transition-all hover:brightness-90 relative group cursor-help`}
                            style={{ 
                              width: `${widthPercent}%`, 
                              backgroundColor: isBrk ? '#f1f5f9' : '#fef3c7',
                              color: isBrk ? '#64748b' : '#92400e',
                              borderRight: '1px solid rgba(0,0,0,0.02)'
                            }}
                          >
                            <span className="hidden sm:block">{item.asset}</span>
                            <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-lg text-[10px] opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10 pointer-events-none shadow-2xl">
                              <span className="text-slate-400 mr-2">{item.label}</span>
                              <span className="font-black">{item.asset}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                </div>

                <div className="space-y-6">
                  <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl shadow-slate-100/50">
                    <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.2em] mb-6">高位輪動關鍵指標</h3>
                    <div className="space-y-6">
                      <div className="flex justify-between items-end">
                        <span className="text-sm font-medium text-slate-500">資產切換頻率</span>
                        <span className="font-black text-3xl text-rose-600">{backtestData.numTrades} <span className="text-xs text-slate-400">次</span></span>
                      </div>
                      <div className="pt-6 border-t border-slate-50 space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">1.52/1.57 策略 ROI</span>
                          <span className="font-black text-emerald-600">+{backtestData.strategyRoi}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">QQQ 長期持有</span>
                          <span className="font-black text-amber-600">+{backtestData.qqqRoi}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-slate-500">BRK.B 長期持有</span>
                          <span className="font-black text-slate-400">+{backtestData.holdRoi}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-800">
                    <h3 className="text-rose-400 font-black text-sm mb-4 tracking-wider uppercase">高位策略洞察</h3>
                    <p className="text-xs text-slate-400 leading-relaxed font-medium">
                      此策略設定在 <span className="text-white font-black">1.57x</span> 歷史極端高位時，將資金從保守的價值股轉向具備更高 Beta 的 QQQ。這確保了在 BRK.B 失去估值擴張動能時，資金仍能維持高效率運作。
                    </p>
                    <div className="mt-8 grid grid-cols-2 gap-2">
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">買回點</span>
                        <span className="text-xs font-black">1.52x</span>
                      </div>
                      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
                        <span className="block text-[9px] text-slate-500 font-bold uppercase mb-1">切換點</span>
                        <span className="text-xs font-black">1.57x</span>
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
