import React, { useState, useEffect, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Ship, BarChart3, Landmark, Users, Check, AlertTriangle, Droplets, Zap, Anchor } from 'lucide-react';

// ==========================================
// TYPES & CONSTANTS
// ==========================================

interface Route {
  id: number;
  routeId: string;
  vesselType: string;
  fuelType: string;
  year: number;
  ghgIntensity: number;
  fuelConsumption: number;
  distance: number;
  totalEmissions: number;
  isBaseline: boolean;
}

interface ComplianceResult {
  cb: number;
  banked: number;
  adjustedCB: number;
}

const CONSTANTS = {
  GHG_TARGET_2025: 89.3368,
  LCV: 41000,
};

const Header = ({ totalRoutes, compliantCount }: { totalRoutes: number, compliantCount: number }) => (
  <header className="bg-white border-b border-gray-200 pb-6 pt-6 px-6 shadow-sm">
    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Droplets className="text-teal-600" />
          FuelEU Maritime Compliance
        </h1>
        <p className="text-slate-500 text-sm mt-1">Regulation (EU) 2023/1805 Tracking System</p>
      </div>
      <div className="flex gap-4">
        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <span className="block text-xs text-slate-500 uppercase tracking-wider">Routes</span>
          <span className="text-xl font-bold text-slate-800">{totalRoutes}</span>
        </div>
        <div className="bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
          <span className="block text-xs text-slate-500 uppercase tracking-wider">Compliance</span>
          <span className="text-xl font-bold text-teal-600">
            {totalRoutes > 0 ? Math.round((compliantCount / totalRoutes) * 100) : 0}%
          </span>
        </div>
      </div>
    </div>
  </header>
);

const RouteRow = ({ route, onSetBaseline }: { route: Route, onSetBaseline: (id: number) => void }) => {
  const isCompliant = route.ghgIntensity <= CONSTANTS.GHG_TARGET_2025;
  
  return (
    <tr className="hover:bg-slate-50 transition-colors">
      <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{route.routeId}</td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{route.vesselType}</td>
      <td className="px-6 py-4 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
          route.fuelType === 'LNG' ? 'bg-green-100 text-green-800' : 
          route.fuelType === 'HFO' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {route.fuelType}
        </span>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-slate-600">{route.year}</td>
      <td className="px-6 py-4 whitespace-nowrap font-mono text-slate-700">{route.ghgIntensity.toFixed(2)}</td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-slate-600">{route.fuelConsumption.toLocaleString()}</td>
      <td className="px-6 py-4 whitespace-nowrap text-center">
        {isCompliant ? <Check className="w-5 h-5 text-teal-500 inline" /> : <AlertTriangle className="w-5 h-5 text-orange-500 inline" />}
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right">
        <button 
          onClick={() => onSetBaseline(route.id)}
          disabled={route.isBaseline}
          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
            route.isBaseline 
              ? 'bg-teal-100 text-teal-800 cursor-default'
              : 'bg-slate-100 text-slate-600 hover:bg-teal-600 hover:text-white'
          }`}
        >
          {route.isBaseline ? 'Current Baseline' : 'Set as Baseline'}
        </button>
      </td>
    </tr>
  );
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'routes' | 'compare' | 'banking' | 'pooling'>('routes');
  const [routes, setRoutes] = useState<Route[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Banking State
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [complianceData, setComplianceData] = useState<ComplianceResult | null>(null);
  const [bankingMsg, setBankingMsg] = useState('');

  // Pooling State
  const [poolSelection, setPoolSelection] = useState<number[]>([]);
  const [poolResult, setPoolResult] = useState<any>(null);

  useEffect(() => {
    fetchRoutes();
  }, []);

  const fetchRoutes = async () => {
    setLoading(true);
    try {
      const data = await api.getRoutes();
      setRoutes(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSetBaseline = async (id: number) => {
    await api.setBaseline(id);
    fetchRoutes();
  };

  // Banking Logic
  const handleComputeCompliance = async () => {
    if (!selectedRouteId) return;
    try {
      const data = await api.getCompliance(selectedRouteId);
      setComplianceData(data);
      setBankingMsg('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleBankSurplus = async () => {
    if (!selectedRouteId || !complianceData) return;
    if (complianceData.cb <= 0) {
      setBankingMsg('Error: Cannot bank negative balance.');
      return;
    }
    await api.bankSurplus(selectedRouteId, complianceData.cb);
    setBankingMsg(`Successfully banked ${complianceData.cb.toFixed(2)} gCO2e.`);
    handleComputeCompliance(); // Refresh
  };

  // Pooling Logic
  const togglePoolMember = (id: number) => {
    setPoolSelection(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleCreatePool = async () => {
    // Calculate Mock Pool Logic directly here for visualization
    const selectedRoutes = routes.filter(r => poolSelection.includes(r.id));
    const members = await Promise.all(selectedRoutes.map(async r => {
      const comp = await api.getCompliance(r.routeId);
      return { ...r, ...comp };
    }));

    const totalCB = members.reduce((acc, cur) => acc + cur.adjustedCB, 0);
    
    // Greedy allocation for demo
    const sorted = [...members].sort((a, b) => b.adjustedCB - a.adjustedCB); // Surplus first
    
    // Simplified result structure for UI
    const results = sorted.map(m => ({
      id: m.routeId,
      before: m.adjustedCB,
      after: totalCB >= 0 ? (m.adjustedCB < 0 ? 0 : m.adjustedCB) : m.adjustedCB // simplistic logic
    }));

    setPoolResult({ totalCB, results, valid: totalCB >= 0 });
  };

  const baselineRoute = routes.find(r => r.isBaseline);
  const comparisonData = useMemo(() => {
    if (!baselineRoute) return [];
    return routes.filter(r => r.id !== baselineRoute.id).map(r => ({
      name: r.routeId,
      ghg: r.ghgIntensity,
      baseline: baselineRoute.ghgIntensity,
      target: CONSTANTS.GHG_TARGET_2025
    }));
  }, [routes, baselineRoute]);

  if (loading && routes.length === 0) return <div className="flex h-screen items-center justify-center text-slate-500">Loading FuelEU Platform...</div>;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <Header totalRoutes={routes.length} compliantCount={routes.filter(r => r.ghgIntensity <= CONSTANTS.GHG_TARGET_2025).length} />

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 bg-slate-200 p-1 rounded-xl mb-8 w-fit">
          {[
            { id: 'routes', icon: Ship, label: 'Routes' },
            { id: 'compare', icon: BarChart3, label: 'Compare' },
            { id: 'banking', icon: Landmark, label: 'Banking' },
            { id: 'pooling', icon: Users, label: 'Pooling' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${activeTab === tab.id 
                  ? 'bg-white text-teal-700 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'}
              `}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* ROUTES TAB */}
        {activeTab === 'routes' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Route Management</h2>
                <p className="text-slate-500 text-sm">Manage vessel routes and set baselines.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-3">ID</th>
                    <th className="px-6 py-3">Vessel</th>
                    <th className="px-6 py-3">Fuel</th>
                    <th className="px-6 py-3">Year</th>
                    <th className="px-6 py-3">GHG Intensity</th>
                    <th className="px-6 py-3 text-right">Fuel (t)</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {routes.map(route => (
                    <RouteRow key={route.id} route={route} onSetBaseline={handleSetBaseline} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* COMPARE TAB */}
        {activeTab === 'compare' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-6">GHG Intensity vs Baseline</h2>
              {!baselineRoute ? (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg">Select a baseline in the Routes tab first.</div>
              ) : (
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={comparisonData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <ReferenceLine y={CONSTANTS.GHG_TARGET_2025} label="Target" stroke="#F59E0B" strokeDasharray="3 3" />
                      <Bar dataKey="ghg" fill="#0F766E" name="Route Intensity" />
                      <Bar dataKey="baseline" fill="#94A3B8" name="Baseline" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">Baseline Stats</h2>
              {baselineRoute ? (
                <div className="space-y-4">
                  <div className="p-4 bg-teal-50 rounded-lg border border-teal-100">
                    <div className="text-sm text-teal-600 mb-1">Baseline Route</div>
                    <div className="text-2xl font-bold text-teal-900">{baselineRoute.routeId}</div>
                    <div className="text-teal-700">{baselineRoute.vesselType}</div>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Intensity</span>
                    <span className="font-mono font-medium">{baselineRoute.ghgIntensity}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b">
                    <span className="text-slate-500">Target (2025)</span>
                    <span className="font-mono font-medium text-orange-600">{CONSTANTS.GHG_TARGET_2025}</span>
                  </div>
                </div>
              ) : (
                <p className="text-slate-500">No baseline selected.</p>
              )}
            </div>
          </div>
        )}

        {/* BANKING TAB */}
        {activeTab === 'banking' && (
          <div className="max-w-3xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-8">
            <h2 className="text-lg font-bold mb-2">Banking Mechanism</h2>
            <p className="text-slate-500 mb-8">Article 20 - Bank surplus compliance balance for future use.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-medium text-slate-700">Select Ship / Route</label>
                <select 
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 outline-none"
                  value={selectedRouteId}
                  onChange={(e) => setSelectedRouteId(e.target.value)}
                >
                  <option value="">-- Select Route --</option>
                  {routes.map(r => <option key={r.id} value={r.routeId}>{r.routeId} ({r.vesselType})</option>)}
                </select>
                
                <button 
                  onClick={handleComputeCompliance}
                  className="w-full bg-slate-900 text-white py-2.5 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  Compute Compliance Balance
                </button>
              </div>

              {complianceData && (
                <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                  <div className="mb-4">
                    <span className="text-sm text-slate-500">Current Balance</span>
                    <div className={`text-3xl font-bold ${complianceData.cb >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                      {Math.round(complianceData.cb).toLocaleString()} <span className="text-sm font-normal text-slate-400">gCO₂e</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-6">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Banked Available</span>
                      <span>{Math.round(complianceData.banked).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium pt-2 border-t">
                      <span>Adjusted Total</span>
                      <span>{Math.round(complianceData.adjustedCB).toLocaleString()}</span>
                    </div>
                  </div>

                  <button 
                    onClick={handleBankSurplus}
                    disabled={complianceData.cb <= 0}
                    className="w-full bg-teal-600 text-white py-2 rounded-lg hover:bg-teal-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors"
                  >
                    Bank Surplus
                  </button>
                  {bankingMsg && <p className="mt-3 text-sm text-center text-teal-700">{bankingMsg}</p>}
                </div>
              )}
            </div>
          </div>
        )}

        {/* POOLING TAB */}
        {activeTab === 'pooling' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-6">Create Compliance Pool</h2>
              <div className="grid grid-cols-1 gap-3 mb-6">
                {routes.map(route => {
                  const energyInScope = route.fuelConsumption * CONSTANTS.LCV;
                  const cb = (CONSTANTS.GHG_TARGET_2025 - route.ghgIntensity) * energyInScope;
                  return (
                    <div 
                      key={route.id}
                      onClick={() => togglePoolMember(route.id)}
                      className={`
                        flex justify-between items-center p-4 rounded-lg border cursor-pointer transition-all
                        ${poolSelection.includes(route.id) ? 'border-teal-500 bg-teal-50' : 'border-gray-200 hover:border-teal-200'}
                      `}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center ${poolSelection.includes(route.id) ? 'bg-teal-600 border-teal-600' : 'border-gray-300'}`}>
                          {poolSelection.includes(route.id) && <Check className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <div className="font-medium text-slate-900">{route.routeId}</div>
                          <div className="text-xs text-slate-500">{route.vesselType}</div>
                        </div>
                      </div>
                      <div className={`text-sm font-mono ${cb >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        {cb > 0 ? '+' : ''}{Math.round(cb/1000)}k
                      </div>
                    </div>
                  );
                })}
              </div>
              <button 
                onClick={handleCreatePool}
                disabled={poolSelection.length < 2}
                className="bg-slate-900 text-white px-6 py-2 rounded-lg disabled:opacity-50"
              >
                Verify & Create Pool
              </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-bold mb-4">Validation Results</h2>
              {poolResult ? (
                <div className="space-y-4">
                  <div className={`p-4 rounded-lg border ${poolResult.valid ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-sm opacity-75 mb-1">Total Pool Balance</div>
                    <div className={`text-2xl font-bold ${poolResult.valid ? 'text-green-800' : 'text-red-800'}`}>
                      {Math.round(poolResult.totalCB).toLocaleString()}
                    </div>
                    <div className="text-sm mt-2 font-medium flex items-center gap-2">
                      {poolResult.valid ? <Check className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                      {poolResult.valid ? 'Pool Valid' : 'Insufficient Balance'}
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-slate-700">Allocations:</p>
                    {poolResult.results.map((r: any) => (
                      <div key={r.id} className="flex justify-between text-sm py-1 border-b border-dashed">
                        <span>{r.id}</span>
                        <span className="text-slate-500">{Math.round(r.before/1000)}k → <span className="text-slate-900">{Math.round(r.after/1000)}k</span></span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-slate-500 text-sm text-center py-8">
                  Select at least two ships to calculate pool metrics.
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}