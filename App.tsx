import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchLatestBrkData, performBacktestAnalysis, fetchPbrDistribution } from './services/geminiService';
import { BrkFinancialData, BacktestResult, PbrDistribution } from './types';
import { InfoCard } from './components/InfoCard';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell
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
      setError("回測執行失敗，請重試。");
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
    if (pbr <= 1.45) return { label: '超值買入點', color: 'bg-emerald-600 text-white', border: 'border-emerald-700' };
    if (pbr <= 1.51) return { label: '穩健持股中', color: 'bg-slate-100 text-slate-700', border: 'border-slate-200' };
    if (pbr <= 1.53) return { label: '策略買回區 (1.52)', color: 'bg-indigo-600 text-white', border: 'border-indigo-700' };
    if (pbr <= 1.56) return { label: '高位警戒區', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' };
    if (pbr <= 1.58) return { label: '策略賣出區 (1.57)', color: 'bg-rose-600 text-white', border: 'border-rose-700' };
    return { label: '歷史高估值', color: 'bg-slate-900 text-white', border: 'border-slate-800' };
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
        <div className="w-16 h-16 border-4 border-rose-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse text-center px-4 tracking-widest uppercase text-xs">Synchronizing Market Data...</p>
      </div>
    );
  }

  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 p-4 md:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-black rounded uppercase tracking-tighter">Premium Tool</span>
              <span className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">v2.1 Rotation Logic</span>
            </div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900 leading-none">BRK.B 1.52/1.57 <span className="text-rose-600">Rotation</span></h1>
            <p className="text-slate-500 text-sm mt-3 font-medium max-w-md leading-relaxed">專為波段交易者設計的高階回測工具，精確鎖定伯克希爾 1.52x 與 1.57x PBR 關鍵輪動區間。</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setActiveTab('calc')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'calc' ? 'bg-slate-900 text-white shadow-xl' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              實時估值
            </button>
            <button 
              onClick={() => setActiveTab('backtest')}
              className={`px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${activeTab === 'backtest' ? 'bg-rose-600 text-white shadow-xl shadow-rose-200' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
            >
              策略回測
            </button>
          </div>
        </header>

        {activeTab === 'calc' ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <InfoCard label="B股帳面淨值 (BVPS)" value={`$${valuation!.bookValuePerB.toFixed(2)}`} subValue="Based on latest Equity" color="bg-white" />
              <InfoCard label="當前 PBR" value={currentPbrValue.toFixed(3)} subValue={`Market Price: $${data!.currentPrice}`} color="bg-white" />
              <InfoCard label="策略目標距離" value={`${Math.abs(1.57 - currentPbrValue).toFixed(3)}x`} subValue="距離核心切換點" color="bg-white" />
              <div className={`${currentStatusInfo.color} p-6 rounded-2xl shadow-xl border ${currentStatusInfo.border} flex flex-col justify-center transition-all transform hover:scale-[1.02]`}>
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80 mb-1">即時信號訊號</span>
                <div className="text-xl font-black leading-none">{currentStatusInfo.label}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-rose-600 rounded-full"></div>
                      高階 PBR 分段目標
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interval Analysis</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-400 text-[10px] border-b border-slate-100 uppercase tracking-[0.2em]">
                          <th className="pb-5 font-black">Multipliers</th>
                          <th className="pb-5 font-black">Target Price</th>
                          <th className="pb-5 font-black text-right">Zone Strategy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {valuation?.targets.map((t) => {
                          const isKey = [1.52, 1.57].includes(Number(t.multiplier.toFixed(2)));
                          let zoneLabel = '';
                          let zoneColor = '';
                          if (t.multiplier <= 1.45) { zoneLabel = '價值區'; zoneColor = 'text-emerald-600 bg-emerald-50'; }
                          else if (t.multiplier <= 1.52) { zoneLabel = '買回區'; zoneColor = 'text-indigo-600 bg-indigo-50'; }
                          else if (t.multiplier <= 1.56) { zoneLabel = '警戒區'; zoneColor = 'text-amber-600 bg-amber-50'; }
                          else { zoneLabel = '輪動區'; zoneColor = 'text-rose-600 bg-rose-50'; }

                          return (
                            <tr key={t.multiplier} className={`hover:bg-slate-50/80 transition-all ${isKey ? 'bg-rose-50/40' : ''}`}>
                              <td className="py-4">
                                <span className={`font-mono text-sm ${isKey ? 'text-rose-600 font-black scale-110 inline-block' : 'text-slate-600 font-medium'}`}>
                                  {t.multiplier.toFixed(2)}x
                                </span>
                              </td>
                              <td className="py-4 font-mono font-black text-slate-900">${t.price.toFixed(2)}</td>
                              <td className="py-4 text-right">
                                <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-tighter ${zoneColor}`}>
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

                <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
                  <div className="flex items-center justify-between mb-8">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                      <div className="w-1.5 h-6 bg-rose-600 rounded-full"></div>
                      歷史 PBR 分佈 (10年)
                    </h2>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Historical Statistics</span>
                  </div>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="range" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} 
                          tickFormatter={(val) => `${val}%`} 
                        />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.05)', padding: '12px'}} 
                          formatter={(value: number) => [`${value}%`, '時間佔比']}
                        />
                        <Bar dataKey="percentage" radius={[6, 6, 0, 0]}>
                          {distributionData.map((entry, index) => {
                            const isHigh = entry.range.includes('1.5') || entry.range.includes('1.6') || entry.range.includes('>');
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={isHigh ? '#e11d48' : '#cbd5e1'} 
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-4 text-[10px] text-slate-400 font-medium leading-relaxed">
                    註：紅色區塊表示 BRK.B 處於歷史相對高位或策略輪動區間（PBR > 1.5x）。
                  </p>
                </section>
              </div>

              <div className="space-y-6">
                <section className="bg-slate-900 text-white p-8 rounded-3xl shadow-2xl border border-slate-800">
                  <h2 className="text-lg font-black mb-6 tracking-tight text-rose-400 uppercase">精密模擬器</h2>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-[10px] font-black text-slate-500 mb-4 uppercase tracking-[0.2em]">調整策略 PBR</label>
                      <input type="range" min="1.45" max="1.65" step="0.001" value={customPbr} onChange={(e) => setCustomPbr(parseFloat(e.target.value))} className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500" />
                      <div className="flex justify-between mt-3">
                        <span className="text-[10px] font-bold text-slate-600">1.45x</span>
                        <span className="text-sm font-black text-rose-500 font-mono">{customPbr.toFixed(3)}x</span>
                        <span className="text-[10px] font-bold text-slate-600">1.65x</span>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-slate-800">
                      <p className="text-[10px] text-slate-500 uppercase font-black mb-2 tracking-widest">對應成交價 (BRK.B)</p>
                      <p className="text-5xl font-black text-white font-mono tracking-tighter">${targetPrice}</p>
                    </div>
                  </div>
                </section>

                <div className="bg-white p-6 rounded-2xl border border-slate-200">
                  <h3 className="font-black text-slate-900 mb-3 text-xs uppercase flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-rose-600"></div>
                    1.52 / 1.57 切換邏輯
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium">
                    歷史數據顯示，當 BRK.B PBR 超過 1.57x 時，上行空間相對有限，此時切換至高 Beta 的 QQQ 能捕捉指數動能。回落至 1.52x 時則觸發價值回歸買入信號。
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-12">
                <div className="flex-1">
                  <h2 className="text-2xl font-black tracking-tighter mb-2">深度績效回測 <span className="text-rose-600">(1.52 / 1.57)</span></h2>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Backtesting Period: 2020 - 2025</p>
                </div>

                {/* Enhanced Capital Input Section */}
                <div className="flex-1 max-w-md bg-slate-50 p-6 rounded-2xl border border-slate-200 shadow-inner">
                  <div className="flex items-center justify-between mb-4">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">初始投資資金 (USD)</label>
                    <span className="text-xs font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded">${initialCapital.toLocaleString()}</span>
                  </div>
                  
                  <div className="space-y-6">
                    {/* Quick Presets */}
                    <div className="flex gap-2">
                      {[10000, 50000, 100000].map((val) => (
                        <button
                          key={val}
                          onClick={() => setInitialCapital(val)}
                          className={`flex-1 py-1.5 rounded-lg text-[10px] font-black transition-all border ${
                            initialCapital === val 
                            ? 'bg-rose-600 text-white border-rose-600 shadow-lg shadow-rose-100' 
                            : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          ${(val/1000)}k
                        </button>
                      ))}
                    </div>

                    {/* Numeric Input & Slider */}
                    <div className="space-y-4">
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-black text-sm">$</span>
                        <input 
                          type="number" 
                          value={initialCapital} 
                          onChange={(e) => setInitialCapital(Number(e.target.value))}
                          className="w-full pl-8 pr-4 py-3 text-xl font-black text-slate-900 bg-white border-2 border-slate-200 rounded-xl focus:border-rose-500 focus:outline-none transition-all"
                        />
                      </div>
                      <input 
                        type="range" 
                        min="1000" 
                        max="500000" 
                        step="1000" 
                        value={initialCapital} 
                        onChange={(e) => setInitialCapital(Number(e.target.value))} 
                        className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600" 
                      />
                    </div>

                    <button 
                      onClick={runBacktest} 
                      disabled={backtestLoading}
                      className="w-full py-4 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-slate-800 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {backtestLoading ? (
                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                      ) : null}
                      {backtestLoading ? '計算中...' : '重新執行模擬分析'}
                    </button>
                  </div>
                </div>
              </div>

              {backtestLoading ? (
                <div className="p-32 flex flex-col items-center justify-center bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
                  <div className="w-12 h-12 border-4 border-rose-500 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="text-slate-400 font-black tracking-[0.3em] text-[10px] uppercase animate-pulse">Running High-Band Simulations...</p>
                </div>
              ) : backtestData ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-8">
                    <div className="bg-white p-4 rounded-3xl">
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
                        <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">累積資產對比</h3>
                        <div className="flex flex-wrap gap-4">
                          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-600"></div><span className="text-[10px] font-black text-slate-500">1.52/1.57 策略</span></div>
                          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-amber-400"></div><span className="text-[10px] font-black text-slate-500">QQQ Hold</span></div>
                          <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-slate-300"></div><span className="text-[10px] font-black text-slate-500">BRK.B Hold</span></div>
                        </div>
                      </div>
                      <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={backtestChartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 'bold'}} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                            <Tooltip 
                              contentStyle={{borderRadius: '24px', border: 'none', boxShadow: '0 20px 50px rgba(0,0,0,0.1)', padding: '16px'}} 
                              formatter={(value: number) => [`$${Math.round(value).toLocaleString()}`, 'Value']}
                            />
                            <Area type="step" name="Strategy" dataKey="Strategy" stroke="#e11d48" strokeWidth={4} fill="#fff1f2" fillOpacity={0.8} />
                            <Area type="monotone" name="QQQ" dataKey="QQQHold" stroke="#f59e0b" strokeWidth={2} fill="#fff7ed" fillOpacity={0.2} />
                            <Area type="monotone" name="BRK.B" dataKey="BRKHold" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" fillOpacity={0.1} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>

                    <div className="bg-slate-50 p-8 rounded-3xl border border-slate-100">
                      <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-6">資產配置時間軸</h3>
                      <div className="relative w-full overflow-hidden rounded-2xl bg-white flex h-20 shadow-inner border border-slate-200">
                        {backtestData.holdingTimeline.map((item, idx) => {
                          const widthPercent = (1 / backtestData.holdingTimeline.length) * 100;
                          const isBrk = item.asset === 'BRK.B';
                          return (
                            <div 
                              key={idx} 
                              className={`h-full flex flex-col items-center justify-center transition-all hover:brightness-95 relative group cursor-pointer`}
                              style={{ 
                                width: `${widthPercent}%`, 
                                backgroundColor: isBrk ? '#f8fafc' : '#fffbeb',
                                borderRight: '1px solid rgba(0,0,0,0.05)'
                              }}
                            >
                              <div className={`w-2 h-2 rounded-full mb-1 ${isBrk ? 'bg-slate-300' : 'bg-amber-400'}`}></div>
                              <span className={`text-[8px] font-black uppercase ${isBrk ? 'text-slate-400' : 'text-amber-600'}`}>{item.asset}</span>
                              <div className="absolute bottom-full mb-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-2 rounded-xl text-[10px] font-black opacity-0 group-hover:opacity-100 transition-all scale-90 group-hover:scale-100 z-10 pointer-events-none shadow-2xl whitespace-nowrap">
                                <span className="text-rose-400 mr-2">{item.label}</span>
                                <span>{item.asset}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
                      <h3 className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em] mb-8">Performance Summary</h3>
                      <div className="space-y-8">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">策略總報酬 (ROI)</span>
                          <div className="text-4xl font-black text-emerald-600">+{backtestData.strategyRoi}%</div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-slate-50 rounded-2xl">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">QQQ Hold</span>
                            <div className="text-lg font-black text-amber-600">+{backtestData.qqqRoi}%</div>
                          </div>
                          <div className="p-4 bg-slate-50 rounded-2xl">
                            <span className="text-[9px] font-bold text-slate-400 uppercase block mb-1">BRK.B Hold</span>
                            <div className="text-lg font-black text-slate-500">+{backtestData.holdRoi}%</div>
                          </div>
                        </div>
                        <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase">總操作次數</span>
                          <span className="text-xl font-black text-slate-900">{backtestData.numTrades} 次</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-rose-600 text-white p-8 rounded-3xl shadow-2xl shadow-rose-200">
                      <h3 className="text-rose-200 font-black text-xs uppercase tracking-widest mb-4">1.52 / 1.57 深度洞察</h3>
                      <p className="text-sm font-medium leading-relaxed opacity-90">
                        {backtestData.description}
                      </p>
                      <div className="mt-8 flex items-center justify-between p-4 bg-white/10 rounded-2xl border border-white/10">
                        <div>
                          <span className="block text-[9px] font-black text-rose-200 uppercase tracking-widest mb-1">Entry Trigger</span>
                          <span className="text-lg font-black font-mono">1.52x</span>
                        </div>
                        <div className="text-right">
                          <span className="block text-[9px] font-black text-rose-200 uppercase tracking-widest mb-1">Exit Trigger</span>
                          <span className="text-lg font-black font-mono">1.57x</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;