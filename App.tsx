
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchLatestBrkData, performBacktestAnalysis } from './services/geminiService';
import { BrkFinancialData, BacktestResult } from './types';
import { InfoCard } from './components/InfoCard';
import { 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area, Legend 
} from 'recharts';

const App: React.FC = () => {
  const [data, setData] = useState<BrkFinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [backtestLoading, setBacktestLoading] = useState<boolean>(false);
  const [backtestData, setBacktestData] = useState<BacktestResult | null>(null);
  const [initialCapital, setInitialCapital] = useState<number>(10000);
  const [error, setError] = useState<string | null>(null);
  const [customPbr, setCustomPbr] = useState<number>(1.2);
  const [activeTab, setActiveTab] = useState<'calc' | 'backtest'>('calc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLatestBrkData();
      setData(result);
    } catch (err) {
      setError("無法獲取最新財報數據。");
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
    const multipliers = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7];
    const targets = multipliers.map(m => ({ multiplier: m, price: bookValuePerB * m }));
    return { bookValuePerA, bookValuePerB, targets };
  }, [data]);

  const chartData = useMemo(() => {
    if (!valuation) return [];
    return valuation.targets.map(t => ({ pbr: t.multiplier.toFixed(1), price: Number(t.price.toFixed(2)) }));
  }, [valuation]);

  const backtestChartData = useMemo(() => {
    if (!backtestData) return [];
    return backtestData.labels.map((year, i) => ({
      year,
      Hold: backtestData.holdValues[i],
      Strategy: backtestData.strategyValues[i]
    }));
  }, [backtestData]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse text-center px-4">正在從公開資訊抓取最新 BRK.B 財報數據...</p>
      </div>
    );
  }

  const currentPbr = data && valuation ? (data.currentPrice / valuation.bookValuePerB).toFixed(2) : "N/A";
  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-8 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BRK.B 價值評估與 QQQ 切換回測</h1>
            <div className="flex gap-4 mt-4">
              <button 
                onClick={() => setActiveTab('calc')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'calc' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                估值計算
              </button>
              <button 
                onClick={() => setActiveTab('backtest')}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${activeTab === 'backtest' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-600 hover:bg-slate-100'}`}
              >
                5年回歸分析 (QQQ Switch)
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
              <InfoCard label="Class A 總股數" value={data!.totalAShares.toLocaleString()} subValue="最新發行股數" />
              <InfoCard label="B股 每股帳面價值 (BVPS)" value={`$${valuation!.bookValuePerB.toFixed(2)}`} subValue="Equity / A股數 / 1500" color="bg-emerald-50" />
              <InfoCard label="目前 BRK.B 股價" value={`$${data!.currentPrice.toFixed(2)}`} subValue={`目前 PBR: ${currentPbr}`} color="bg-blue-50" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                    <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                    買入價位計算器
                  </h2>
                  <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">設定目標 PBR 倍數</label>
                    <div className="flex items-center gap-4">
                      <input type="range" min="1.0" max="2.0" step="0.05" value={customPbr} onChange={(e) => setCustomPbr(parseFloat(e.target.value))} className="flex-grow h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                      <span className="text-2xl font-bold text-blue-600 min-w-[3rem] text-center">{customPbr.toFixed(2)}x</span>
                    </div>
                    <div className="mt-6 flex flex-col items-center justify-center border-t border-slate-200 pt-6">
                      <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-bold">目標買入價位</p>
                      <div className="text-5xl font-black text-slate-900">${targetPrice}</div>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-slate-500 text-sm border-b border-slate-100">
                          <th className="pb-4 font-semibold">PBR 倍數</th>
                          <th className="pb-4 font-semibold">目標價位 (BRK.B)</th>
                          <th className="pb-4 font-semibold text-right">狀態</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {valuation?.targets.map((t) => (
                          <tr key={t.multiplier} className={`hover:bg-slate-50 ${t.multiplier === 1.2 ? 'bg-blue-50/50' : ''}`}>
                            <td className="py-4 font-bold text-slate-700">{t.multiplier.toFixed(1)}x</td>
                            <td className="py-4 font-mono font-semibold">${t.price.toFixed(2)}</td>
                            <td className="py-4 text-right">
                              <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.price >= data!.currentPrice ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                {t.price >= data!.currentPrice ? '合理價位' : '溢價'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              </div>
              <div className="space-y-8">
                <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2">價格與 PBR 關係圖</h2>
                  <div className="h-[250px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartData}>
                        <XAxis dataKey="pbr" />
                        <YAxis hide />
                        <Tooltip />
                        <Area type="monotone" dataKey="price" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} />
                        <ReferenceLine y={data!.currentPrice} stroke="#f43f5e" label="市價" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </section>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-4">回測參數設定</h2>
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
                    運行 5 年 QQQ 切換回測
                  </button>
                </div>
              </div>
            </section>

            {backtestLoading ? (
              <div className="bg-white p-20 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Gemini 正在調取 5 年歷史 PBR 與 QQQ 走勢數據...</p>
              </div>
            ) : backtestData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold">策略對比：長期持有 vs PBR/QQQ 切換</h2>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div><span className="text-xs font-bold">PBR切換策略</span></div>
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
                          <Area type="monotone" name="長期持有 BRK.B" dataKey="Hold" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" />
                          <Area type="monotone" name="PBR < 1.5 (BRK.B) / > 1.6 (QQQ)" dataKey="Strategy" stroke="#4f46e5" strokeWidth={3} fill="#eef2ff" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 mb-2">Gemini 策略透視：為何切換到 QQQ？</h3>
                    <p className="text-indigo-800 text-sm leading-relaxed">{backtestData.description}</p>
                  </section>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-4">5年回測數據綜述</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">切換次數 (BRK.B ⇄ QQQ)</span>
                        <span className="font-bold text-lg">{backtestData.numTrades} 次</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">單純持有總報酬</span>
                        <span className="font-bold text-lg text-slate-900">+{backtestData.holdRoi}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-4">
                        <span className="text-sm text-slate-600">切換策略總報酬</span>
                        <span className={`font-bold text-lg ${backtestData.strategyRoi > backtestData.holdRoi ? 'text-emerald-600' : 'text-amber-600'}`}>
                          +{backtestData.strategyRoi}%
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-emerald-600 p-6 rounded-2xl text-white shadow-lg">
                    <h3 className="font-bold mb-2 flex items-center gap-2">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                      AI 發現的最佳 PBR 數值
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                        <p className="text-[10px] uppercase opacity-80">最佳買入 PBR</p>
                        <p className="text-2xl font-black">{backtestData.optimalBuyPbr}x</p>
                      </div>
                      <div className="bg-white/10 p-3 rounded-xl border border-white/20">
                        <p className="text-[10px] uppercase opacity-80">最佳賣出 PBR</p>
                        <p className="text-2xl font-black">{backtestData.optimalSellPbr}x</p>
                      </div>
                    </div>
                    <p className="mt-4 text-[11px] opacity-80 italic">註：此數值為分析過去 5 年數據後得出能產生最大超額報酬 (Alpha) 的區間。</p>
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
