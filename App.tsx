
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
      const result = await performBacktestAnalysis(1.5, 1.6);
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
  }, [activeTab, backtestData]);

  const valuation = useMemo(() => {
    if (!data) return null;
    const bookValuePerA = (data.totalEquity * 1000000) / data.totalAShares;
    const bookValuePerB = bookValuePerA / 1500;
    const multipliers = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
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
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BRK.B 價值評估與回歸分析</h1>
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
                策略回歸分析
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
                <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-xl">
                  <h3 className="font-bold mb-2">投資策略建議</h3>
                  <p className="text-sm text-slate-400 leading-relaxed">巴菲特曾指出當股價低於帳面價值 1.2 倍時是理想的買入時機。目前市場環境下，BRK.B 的 PBR 若接近 1.3x 以下通常具有較強支撐。</p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-500">
            {backtestLoading ? (
              <div className="bg-white p-20 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="text-slate-500 font-medium">Gemini 正在分析 10 年歷史數據與 PBR 波段趨勢...</p>
              </div>
            ) : backtestData ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-xl font-bold">歷史回歸：1.5x 買入 vs 1.6x 賣出 vs 持有</h2>
                      <div className="flex gap-4">
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-indigo-600"></div><span className="text-xs font-bold">策略交易</span></div>
                        <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full bg-slate-300"></div><span className="text-xs font-bold">長期持有</span></div>
                      </div>
                    </div>
                    <div className="h-[400px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={backtestChartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="year" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} tickFormatter={(val) => `$${val/1000}k`} />
                          <Tooltip formatter={(value: number) => `$${value.toLocaleString()}`} />
                          <Legend verticalAlign="top" height={36}/>
                          <Area type="monotone" name="長期持有 (Buy & Hold)" dataKey="Hold" stroke="#cbd5e1" strokeWidth={2} fill="#f8fafc" />
                          <Area type="monotone" name="1.5x買/1.6x賣 策略" dataKey="Strategy" stroke="#4f46e5" strokeWidth={3} fill="#eef2ff" fillOpacity={0.6} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </section>
                  <section className="bg-indigo-50 p-6 rounded-2xl border border-indigo-100">
                    <h3 className="font-bold text-indigo-900 mb-2">Gemini 策略透視</h3>
                    <p className="text-indigo-800 text-sm leading-relaxed">{backtestData.description}</p>
                  </section>
                </div>
                <div className="space-y-6">
                  <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-500 text-xs uppercase tracking-wider mb-4">回歸分析數據 (10年)</h3>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">策略總交易次數</span>
                        <span className="font-bold text-lg">{backtestData.numTrades} 次</span>
                      </div>
                      <div className="flex justify-between items-center pb-4 border-b border-slate-50">
                        <span className="text-sm text-slate-600">長期持有總報酬</span>
                        <span className="font-bold text-lg text-slate-900">+{backtestData.holdRoi}%</span>
                      </div>
                      <div className="flex justify-between items-center pb-4">
                        <span className="text-sm text-slate-600">PBR策略總報酬</span>
                        <span className={`font-bold text-lg ${backtestData.strategyRoi > backtestData.holdRoi ? 'text-emerald-600' : 'text-amber-600'}`}>
                          +{backtestData.strategyRoi}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 rounded-2xl text-white">
                    <h3 className="font-bold mb-4">為什麼持有通常較佳？</h3>
                    <p className="text-xs text-indigo-100 leading-loose opacity-90">
                      根據歷史數據，BRK.B 的價值增長主要來自其內在價值的長期複利增長。PBR 的波動區間窄（1.3-1.55x），若強硬設定 1.6x 賣出，往往會在市場主升段被迫空手。
                    </p>
                    <button onClick={runBacktest} className="mt-6 w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl font-bold transition-all border border-white/20 text-sm">
                      重新運行模擬
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white p-20 rounded-2xl border border-slate-200 flex flex-col items-center justify-center">
                 <button onClick={runBacktest} className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-bold shadow-lg hover:bg-indigo-700">
                   開始歷史回歸分析
                 </button>
                 <p className="text-slate-400 text-xs mt-4">分析過去 10 年 PBR 1.5x/1.6x 交易循環</p>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between shadow-2xl z-50">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold">目前模式</p>
          <p className="text-sm font-black text-blue-600">{activeTab === 'calc' ? '估值計算' : '回歸分析'}</p>
        </div>
        <div className="flex gap-2">
           <button onClick={() => setActiveTab('calc')} className={`p-2 rounded ${activeTab === 'calc' ? 'text-blue-600' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
           </button>
           <button onClick={() => setActiveTab('backtest')} className={`p-2 rounded ${activeTab === 'backtest' ? 'text-indigo-600' : 'text-slate-400'}`}>
             <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/></svg>
           </button>
        </div>
      </div>
    </div>
  );
};

export default App;
