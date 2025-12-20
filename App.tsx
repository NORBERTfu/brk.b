
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchLatestBrkData } from './services/geminiService';
import { BrkFinancialData, CalculationResult } from './types';
import { InfoCard } from './components/InfoCard';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, AreaChart, Area 
} from 'recharts';

const App: React.FC = () => {
  const [data, setData] = useState<BrkFinancialData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [customPbr, setCustomPbr] = useState<number>(1.2);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchLatestBrkData();
      setData(result);
    } catch (err) {
      setError("無法獲取最新財報數據，請稍後再試。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const valuation = useMemo(() => {
    if (!data) return null;
    const bookValuePerA = (data.totalEquity * 1000000) / data.totalAShares;
    const bookValuePerB = bookValuePerA / 1500;
    
    const multipliers = [1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
    const targets = multipliers.map(m => ({
      multiplier: m,
      price: bookValuePerB * m
    }));

    return {
      bookValuePerA,
      bookValuePerB,
      targets
    };
  }, [data]);

  const chartData = useMemo(() => {
    if (!valuation) return [];
    return valuation.targets.map(t => ({
      pbr: t.multiplier.toFixed(1),
      price: Number(t.price.toFixed(2))
    }));
  }, [valuation]);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium animate-pulse">正在從公開資訊抓取最新 BRK.B 財報數據...</p>
      </div>
    );
  }

  const currentPbr = data && valuation ? (data.currentPrice / valuation.bookValuePerB).toFixed(2) : "N/A";
  const targetPrice = valuation ? (valuation.bookValuePerB * customPbr).toFixed(2) : "0";

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">BRK.B 價值評估工具</h1>
            <p className="text-slate-500 mt-1">基於最新財報 PBR 倍數決定買入價位</p>
          </div>
          <button 
            onClick={fetchData}
            className="px-6 py-2 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
            更新數據
          </button>
        </header>

        {data && valuation && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <InfoCard 
              label="最新股東權益 (Equity)" 
              value={`$${(data.totalEquity / 1000).toFixed(2)}B`} 
              subValue="百萬美元 (Millions)"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <InfoCard 
              label="Class A 總股數" 
              value={data.totalAShares.toLocaleString()} 
              subValue="最新發行股數"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <InfoCard 
              label="B股 每股帳面價值 (BVPS)" 
              value={`$${valuation.bookValuePerB.toFixed(2)}`} 
              subValue="Equity / A股數 / 1500"
              color="bg-emerald-50"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <InfoCard 
              label="目前 BRK.B 股價" 
              value={`$${data.currentPrice.toFixed(2)}`} 
              subValue={`目前 PBR: ${currentPbr}`}
              color="bg-blue-50"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Controls & Table */}
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-blue-600 rounded-full"></span>
                買入價位計算器
              </h2>
              
              <div className="mb-8 p-6 bg-slate-50 rounded-xl border border-slate-100">
                <label className="block text-sm font-semibold text-slate-700 mb-2">設定目標 PBR 倍數</label>
                <div className="flex items-center gap-4">
                  <input 
                    type="range" 
                    min="1.0" 
                    max="2.0" 
                    step="0.05" 
                    value={customPbr}
                    onChange={(e) => setCustomPbr(parseFloat(e.target.value))}
                    className="flex-grow h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                  <span className="text-2xl font-bold text-blue-600 min-w-[3rem] text-center">{customPbr.toFixed(2)}x</span>
                </div>
                <div className="mt-6 flex flex-col items-center justify-center border-t border-slate-200 pt-6">
                  <p className="text-slate-500 text-sm mb-1 uppercase tracking-wider font-bold">目標買入價位</p>
                  <div className="text-5xl font-black text-slate-900">${targetPrice}</div>
                  <div className={`mt-3 px-4 py-1 rounded-full text-sm font-bold ${Number(data?.currentPrice) <= Number(targetPrice) ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                    {Number(data?.currentPrice) <= Number(targetPrice) ? '✓ 目前股價低於目標 - 建議買入' : '⚠ 目前股價高於目標 - 建議觀望'}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-slate-500 text-sm border-b border-slate-100">
                      <th className="pb-4 font-semibold">PBR 倍數</th>
                      <th className="pb-4 font-semibold">目標價位 (BRK.B)</th>
                      <th className="pb-4 font-semibold">價差 (vs 市價)</th>
                      <th className="pb-4 font-semibold text-right">狀態</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {valuation?.targets.map((t) => {
                      const diff = data ? ((t.price - data.currentPrice) / data.currentPrice * 100).toFixed(1) : "0";
                      const isTarget = t.price >= (data?.currentPrice || 0);
                      return (
                        <tr key={t.multiplier} className={`hover:bg-slate-50 transition-colors ${t.multiplier === 1.2 ? 'bg-blue-50/50' : ''}`}>
                          <td className="py-4 font-bold text-slate-700">{t.multiplier.toFixed(1)}x</td>
                          <td className="py-4 font-mono font-semibold">${t.price.toFixed(2)}</td>
                          <td className={`py-4 font-medium ${Number(diff) > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {Number(diff) > 0 ? `+${diff}%` : `${diff}%`}
                          </td>
                          <td className="py-4 text-right">
                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${isTarget ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                              {isTarget ? '合理價位' : '溢價'}
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

          {/* Side Visualization */}
          <div className="space-y-8">
            <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <span className="w-2 h-6 bg-emerald-500 rounded-full"></span>
                PBR 價格趨勢圖
              </h2>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="pbr" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8', fontSize: 12}}
                      label={{ value: 'PBR Multiple', position: 'insideBottom', offset: -5, fontSize: 10 }}
                    />
                    <YAxis 
                      hide={true}
                    />
                    <Tooltip 
                      contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                    />
                    <Area type="monotone" dataKey="price" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPrice)" />
                    {data && (
                      <ReferenceLine y={data.currentPrice} stroke="#f43f5e" strokeDasharray="3 3" label={{ position: 'right', value: '市價', fill: '#f43f5e', fontSize: 10 }} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <p className="text-xs text-slate-400 mt-4 text-center">
                紅色虛線代表目前市場交易價格
              </p>
            </section>

            <section className="bg-gradient-to-br from-slate-800 to-slate-900 p-6 rounded-2xl text-white shadow-xl">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <svg className="w-5 h-5 text-amber-400" fill="currentColor" viewBox="0 0 20 20"><path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1a1 1 0 112 0v1a1 1 0 11-2 0zM13.657 15.657a1 1 0 001.414-1.414l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM16 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1z" /></svg>
                投資邏輯說明
              </h3>
              <ul className="space-y-3 text-sm text-slate-300">
                <li className="flex gap-2">
                  <span className="text-amber-400 font-bold">1.</span>
                  計算 A 股每股淨值：總權益 / A 股數。
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 font-bold">2.</span>
                  換算 B 股每股淨值：A 股淨值 / 1500。
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 font-bold">3.</span>
                  PBR = 1.2x 通常被視為巴菲特回購股票的基準價位（安全邊際）。
                </li>
                <li className="flex gap-2">
                  <span className="text-amber-400 font-bold">4.</span>
                  當 PBR &lt; 1.2x 時，價值投資者通常會考慮加碼。
                </li>
              </ul>
              <div className="mt-6 pt-6 border-t border-slate-700 text-[10px] text-slate-500 italic">
                數據更新於: {data?.lastUpdated} <br/>
                來源: {data?.sourceUrl ? <a href={data.sourceUrl} target="_blank" className="underline text-blue-400 truncate block">SEC Filing / Yahoo Finance</a> : "SEC 公開財報"}
              </div>
            </section>
          </div>
        </div>
      </div>
      
      {/* Fixed Mobile Summary */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 flex items-center justify-between shadow-2xl z-50">
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold">目標價 ({customPbr}x)</p>
          <p className="text-xl font-black text-blue-600">${targetPrice}</p>
        </div>
        <div>
          <p className="text-[10px] text-slate-500 uppercase font-bold text-right">目前市價</p>
          <p className="text-xl font-black text-slate-900 text-right">${data?.currentPrice.toFixed(2)}</p>
        </div>
      </div>
      <div className="h-20 lg:hidden"></div> {/* Spacer for mobile bar */}
    </div>
  );
};

export default App;
