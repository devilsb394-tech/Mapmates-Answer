import React, { useState, useEffect } from 'react';
import { RefreshCw, ArrowRightLeft } from 'lucide-react';

const COMMON_CURRENCIES = [
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'PKR', name: 'Pakistani Rupee', symbol: 'Rs' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'SAR', name: 'Saudi Riyal', symbol: 'SR' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'DH' }
];

const UnitConverter: React.FC = () => {
  const [activeType, setActiveType] = useState<'currency' | 'weight' | 'length'>('currency');
  const [fromUnit, setFromUnit] = useState('USD');
  const [toUnit, setToUnit] = useState('PKR');
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    if (activeType === 'currency') {
      fetchRates();
    }
  }, [fromUnit, activeType]);

  const fetchRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`https://open.er-api.com/v6/latest/${fromUnit}`);
      const data = await res.json();
      if (data.rates) {
        setRates(data.rates);
        const rate = data.rates[toUnit];
        if (rate) setResult(parseFloat(amount) * rate);
      }
    } catch (err) {
      console.error('Failed to fetch rates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeType === 'currency' && rates[toUnit]) {
      setResult(parseFloat(amount) * rates[toUnit]);
    } else if (activeType === 'weight') {
      // Simple logic: kg to lbs etc
      if (fromUnit === 'KG' && toUnit === 'LBS') setResult(parseFloat(amount) * 2.20462);
      else if (fromUnit === 'LBS' && toUnit === 'KG') setResult(parseFloat(amount) / 2.20462);
      else setResult(parseFloat(amount));
    } else if (activeType === 'length') {
      if (fromUnit === 'M' && toUnit === 'FT') setResult(parseFloat(amount) * 3.28084);
      else if (fromUnit === 'FT' && toUnit === 'M') setResult(parseFloat(amount) / 3.28084);
      else setResult(parseFloat(amount));
    }
  }, [amount, toUnit, fromUnit, activeType]);

  const swap = () => {
    const temp = fromUnit;
    setFromUnit(toUnit);
    setToUnit(temp);
  };

  return (
    <div className="flex flex-col gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
      <div className="flex gap-2 mb-2 p-1 bg-white/5 rounded-lg border border-white/5">
        {(['currency', 'weight', 'length'] as const).map(type => (
          <button
            key={type}
            onClick={() => {
              setActiveType(type);
              if (type === 'weight') { setFromUnit('KG'); setToUnit('LBS'); }
              if (type === 'length') { setFromUnit('M'); setToUnit('FT'); }
              if (type === 'currency') { setFromUnit('USD'); setToUnit('PKR'); }
            }}
            className={`flex-1 py-1.5 rounded-md text-[10px] font-black uppercase tracking-widest transition-all ${activeType === type ? 'bg-neon-blue text-black' : 'text-white/40 hover:text-white'}`}
          >
            {type}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        <div className="relative">
          <label className="text-[10px] font-mono text-white/30 uppercase mb-1 block">Amount</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue transition-all"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1">
            <label className="text-[10px] font-mono text-white/30 uppercase mb-1 block">From</label>
            <select
              value={fromUnit}
              onChange={(e) => setFromUnit(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue transition-all appearance-none"
            >
              {activeType === 'currency' ? COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.code} - {c.name}</option>) : (
                activeType === 'weight' ? ['KG', 'LBS'].map(u => <option key={u} value={u} className="bg-neutral-900">{u}</option>) :
                ['M', 'FT', 'IN', 'CM', 'KM', 'MI'].map(u => <option key={u} value={u} className="bg-neutral-900">{u}</option>)
              )}
            </select>
          </div>

          <button onClick={swap} className="mt-5 p-3 rounded-full hover:bg-white/10 text-neon-blue transition-all">
            <ArrowRightLeft className="w-4 h-4" />
          </button>

          <div className="flex-1">
            <label className="text-[10px] font-mono text-white/30 uppercase mb-1 block">To</label>
            <select
              value={toUnit}
              onChange={(e) => setToUnit(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:border-neon-blue transition-all appearance-none"
            >
              {activeType === 'currency' ? COMMON_CURRENCIES.map(c => <option key={c.code} value={c.code} className="bg-neutral-900">{c.code} - {c.name}</option>) : (
                activeType === 'weight' ? ['KG', 'LBS'].map(u => <option key={u} value={u} className="bg-neutral-900">{u}</option>) :
                ['M', 'FT', 'IN', 'CM', 'KM', 'MI'].map(u => <option key={u} value={u} className="bg-neutral-900">{u}</option>)
              )}
            </select>
          </div>
        </div>

        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-2xl p-6 text-center animate-in zoom-in-95 duration-300">
          <div className="text-[10px] font-mono text-neon-blue/50 uppercase tracking-[4px] mb-2 font-black">Conversion Result</div>
          <div className="text-3xl font-black text-white flex items-center justify-center gap-2">
            {loading ? <RefreshCw className="w-8 h-8 animate-spin text-neon-blue" /> : (
              <>
                <span>{result?.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
                <span className="text-sm font-mono text-white/30">{toUnit}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitConverter;
