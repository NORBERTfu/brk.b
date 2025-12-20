
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
  const [customPbr, setCustomPbr] = useState<number>(1.45);
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
    const multipliers = [1.0, 1.2, 1.3, 1.4, 1.45, 1.5, 1.55, 1.6, 1.7, 1.8];
    const targets = multipliers.map(m => ({ multiplier: m, price: bookValuePerB * m }));
    return { bookValuePerA, bookValuePerB, targets };
  }, [data]);

  const currentPbrValue = useMemo(() => {
    if (!data || !valuation) return 0;
    return data.currentPrice / valuation.bookValuePerB;
  }, [data, valuation]);

  const currentStatusInfo = useMemo(() => {
    const pbr = currentPbrValue;
    if (pbr <= 1.45) return { label: '建議買入', color: 'bg-emerald-100 text-emerald-700', border: 'border-emerald-200' };
    if (pbr < 1.55) return { label: '保持不動', color: 'bg-amber-100 text-amber-700', border: 'border-amber-200' };
    return { label: '建議賣出 (換 QQQ)', color: 'bg-rose-100 text-rose-700', border: 'border-rose-200' };
  }, [currentPbrValue]);

  // Fix: Added backtestChartData to format backtest results for Recharts
  const backtestChartData = useMemo(() => {
    if (!backtestData) return [];
    return backtestData.labels.map((label, index) => ({
      year: label,
      Hold: backtestData.holdValues[index],
      Strategy: backtestData.strategyValues[index],
    }));
  }, [backtestData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse text-center px-4">正在抓取最新 BRK.B 財報及 10 年歷史分佈數據...</p>
      </div>
    );
  }

  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 p-4 md:p-8 text-slate-900">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">BRK.B 價值評估與 QQQ 切換工具</h1>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('calc')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                估值與分佈
              </button>
              <button 
                onClick={() => setActiveTab('backtest')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'backtest' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                策略回測 (1.45/1.55)
              </button>
            </div>
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-white text-slate-700 border border-slate-200 rounded-full font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            刷新數據
          </button>
        </header>

        {activeTab === 'calc' ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <InfoCard label="最新股東權益 (Equity)" value={`$${(data!.totalEquity / 1000).toFixed(2)}B`} subValue="百萬美元 (Millions)" />
              <InfoCard label="B股 每股帳面價值 (BVPS)" value={`$${valuation!.bookValuePerB.toFixed(2)}`} subValue="Equity / (A股/1500)" color="bg-emerald-50" />
              <InfoCard label="目前 BRK.B 股價" value={`$${data!.currentPrice.toFixed(2)}`} subValue={`目前 PBR: ${currentPbrValue.toFixed(2)}`} color="bg-blue-50" />
              <div className={`${currentStatusInfo.color} p-6 rounded-2xl shadow-sm border ${currentStatusInfo.border} flex flex-col justify-center`}>
                <span className="text-xs font-bold uppercase tracking-wider opacity-70">目前建議</span>
                <div className="text-xl font-black mt-1">{currentStatusInfo.label}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-slate-800">
                    <span className="w-2 h-6 bg-indigo-600 rounded-full"></span>
                    過去 10 年 PBR 歷史分佈
                  </h2>
                  <div className="h-[350px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="range" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(val) => `${val}%`} />
                        <Tooltip 
                          cursor={{fill: '#f8fafc'}}
                          contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                          formatter={(value) => [`${value}%`, '時間佔比']}
                        />
                        <Bar dataKey="percentage" radius={[8, 8, 0, 0]}>
                          {distributionData.map((entry, index) => {
                            let color = '#94a3b8';
                            if (entry.range.includes('1.4') || entry.range.includes('1.5')) color = '#4f46e5';
                            if (entry.range.includes('< 1.2')) color = '#10b981';
                            if (entry.range.includes('> 1.6')) color = '#f43f5e';
                            return <Cell key={`cell-${index}`} fill={color} />;
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <p className="mt-4 text-xs text-slate-400 text-center leading-relaxed">
                    圖表顯示過去 10 年 BRK.B 交易價格處於各 PBR 區間的時間百分比。可以看出 1.3 - 1.4x 是最常出現的「平衡區間」。
                  </p>
                </section>

                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                    PBR 分段估值表
                  </h2>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 text-sm border-b border-slate-100">
                          <th className="pb-4 font-semibold">PBR 倍數</th>
                          <th className="pb-4 font-semibold">對應股價 (BRK.B)</th>
                          <th className="pb-4 font-semibold text-right">策略分區</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {valuation?.targets.map((t) => {
                          let zoneLabel = '';
                          let zoneColor = '';
                          if (t.multiplier <= 1.45) {
                            zoneLabel = '買入 (Buy)';
                            zoneColor = 'text-emerald-600 bg-emerald-50';
                          } else if (t.multiplier < 1.55) {
                            zoneLabel = '持有 (Hold)';
                            zoneColor = 'text-amber-600 bg-amber-50';
                          } else {
                            zoneLabel = '賣出 (Sell)';
                            zoneColor = 'text-rose-600 bg-rose-50';
                          }
                          return (
                            <tr key={t.multiplier} className="hover:bg-slate-50 transition-colors">
                              <td className="py-4">
                                <span className={`font-bold ${t.multiplier === 1.45 || t.multiplier === 1.55 ? 'text-blue-600 underline decoration-2' : 'text-slate-700'}`}>
                                  {t.multiplier.toFixed(2)}x
                                </span>
                              </td>
                              <td className="py-4 font-mono font-semibold">${t.price.toFixed(2)}</td>
                              <td className="py-4 text-right">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight ${zoneColor}`}>
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
                  <h2 className="text-xl font-bold mb-4">PBR 區間試算</h2>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">試算 PBR 倍數</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1.0" max="2.0" step="0.01" value={customPbr} onChange={(e) => setCustomPbr(parseFloat(e.target.value))} className="flex-grow h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-xl font-bold text-blue-600 w-16 text-right">{customPbr.toFixed(2)}x</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200">
                      <p className="text-[10px] text-slate-400 uppercase font-bold">預計成交價</p>
                      <p className="text-3xl font-black text-slate-900">${targetPrice}</p>
                    </div>
                  </div>
                </section>

                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl border border-slate-800">
                  <h3 className="font-bold mb-4 flex items-center gap-2 text-blue-400">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    回歸與策略核心
                  </h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-xs font-bold shrink-0">1</div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-emerald-400 font-bold">≤ 1.45:</span> 根據歷史分佈，此時處於低估區（約佔歷史時間 20-30%），是理想的長線買入點。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">2</div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-amber-400 font-bold">1.45 ~ 1.55:</span> 常態交易區間，建議持有不做頻繁操作，等待波段。
                      </p>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xs font-bold shrink-0">3</div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        <span className="text-rose-400 font-bold">≥ 1.55:</span> 歷史高估警戒區。建議換入 QQQ 以獲取更高的資金利用效率。
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-bold">5年回測：1.45x 買入 / 1.55x 賣出 QQQ</h2>
                <div className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold uppercase tracking-widest">
                  Alpha Strategy
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">初始投資金額 (USD)</label>
                  <input 
                    type="number" 
                    value={initialCapital} 
                    onChange={(e) => setInitialCapital(Number(e.target.value))}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="md:col-span-2">
                  <button 
                    onClick={runBacktest} 
                    className="px-8 py-2 bg-indigo-600 text-white rounded-lg font-bold shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                    運行 5 年模擬分析
                  </button>
                </div>
              </div>
            </section>

            {backtestLoading ? (
              <div className="bg-white p-20 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium text-center">正在調取歷史行情並模擬波段切換策略績效...</p>
              </div>
            ) : backtestData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold">累積資產對比 (5年)</h2>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div><span className="text-xs font-bold">1.45/1.55 切換</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300"></div><span className="text-xs font-bold">單純持有</span></div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `$${(val/1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => `$${Math.round(value).toLocaleString()}`} />
                          <Legend />
                          <Area type="monotone" name="單純持有 BRK.B" dataKey="Hold" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" />
                          <Area type="monotone" name="1.45/1.55 策略 (換QQQ)" dataKey="Strategy" stroke="#4f46e5" strokeWidth={3} fill="#eef2ff" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 mb-2">回測解讀</h3>
                    <p className="text-indigo-800 text-sm leading-relaxed">{backtestData.description}</p>
                  </section>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-4">績效關鍵數據</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">總交易/切換次數</span>
                        <span className="font-bold text-lg">{backtestData.numTrades} 次</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">單純持有報酬率</span>
                        <span className="font-bold text-lg text-slate-900">+{backtestData.holdRoi}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-4">
                        <span className="text-sm text-slate-600">策略總報酬率</span>
                        <span className={`font-bold text-lg ${backtestData.strategyRoi > backtestData.holdRoi ? 'text-emerald-600' : 'text-amber-600'}`}>
                          +{backtestData.strategyRoi}%
                        </span>
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
