import React, { useState } from 'react';
import { CalcLanguage } from './types';
import { Trash2, Delete, Equal } from 'lucide-react';

const translations: Record<CalcLanguage, Record<string, string>> = {
  English: { clear: 'AC', delete: 'DEL', calculate: '=', title: 'Modern Calculator' },
  Sindhi: { clear: 'سڀ ختم', delete: 'پوئتي', calculate: '=', title: 'سنڌي ڪيلڪوليٽر' },
  Balochi: { clear: 'پاک', delete: 'پاک سُت', calculate: '=', title: 'بلوچی کیلکولیٹر' },
  Urdu: { clear: 'صفائی', delete: 'حذف', calculate: '=', title: 'اردو کیلکولیٹر' },
  Punjabi: { clear: 'ਸਭ ਸਾਫ਼', delete: 'ਹਟਾਓ', calculate: '=', title: 'ਪੰਜਾਬੀ ਕੈਲਕੁਲੇਟਰ' },
  Hindi: { clear: 'साफ', delete: 'हटाएं', calculate: '=', title: 'हिंदी कैलकुलेटर' },
  Spanish: { clear: 'C', delete: 'DEL', calculate: '=', title: 'Calculadora' },
  Italian: { clear: 'C', delete: 'CANC', calculate: '=', title: 'Calcolatrice' }
};

const digitMaps: Record<CalcLanguage, string[]> = {
  English: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  Spanish: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  Italian: ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'],
  Sindhi: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  Balochi: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  Urdu: ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'],
  Punjabi: ['੦', '੧', '੨', '੩', '੪', '੫', '੬', '੭', '੮', '੯'],
  Hindi: ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९']
};

const Calculator: React.FC = () => {
  const [display, setDisplay] = useState('0');
  const [lang, setLang] = useState<CalcLanguage>('English');

  const localize = (str: string) => {
    const map = digitMaps[lang];
    return str.split('').map(char => {
      const idx = parseInt(char);
      if (!isNaN(idx) && idx >= 0 && idx <= 9) return map[idx];
      return char;
    }).join('');
  };

  const handleDigit = (digit: string) => {
    setDisplay(prev => prev === '0' ? digit : prev + digit);
  };

  const handleOperator = (op: string) => {
    setDisplay(prev => {
      const lastChar = prev.slice(-1);
      if (['+', '-', '*', '/'].includes(lastChar)) {
        return prev.slice(0, -1) + op;
      }
      return prev + op;
    });
  };

  const calculate = () => {
    try {
      // Basic Eval-safe for simple calculator
      // eslint-disable-next-line no-eval
      const result = eval(display.replace(/×/g, '*').replace(/÷/g, '/'));
      setDisplay(String(result));
    } catch {
      setDisplay('Error');
    }
  };

  const clear = () => setDisplay('0');
  const del = () => setDisplay(prev => prev.length > 1 ? prev.slice(0, -1) : '0');

  const t = translations[lang];
  const digits = digitMaps[lang];

  return (
    <div className="flex flex-col gap-4 p-4 bg-black/40 rounded-2xl border border-white/5">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-black uppercase tracking-widest text-white/40">{t.title}</h3>
        <select 
          value={lang} 
          onChange={(e) => setLang(e.target.value as CalcLanguage)}
          className="bg-white/5 border border-white/10 rounded px-2 py-1 text-[10px] text-white/70 outline-none hover:border-neon-blue/50 transition-colors"
        >
          {Object.keys(translations).map(l => <option key={l} value={l} className="bg-neutral-900">{l}</option>)}
        </select>
      </div>

      <div className="bg-neutral-900/50 p-4 rounded-xl border border-white/5 text-right mb-2">
        <div className="text-[10px] font-mono text-white/30 truncate mb-1">Local Processing</div>
        <div className="text-2xl font-mono text-neon-blue font-bold truncate">{localize(display)}</div>
      </div>

      <div className="grid grid-cols-4 gap-2">
        <button onClick={clear} className="col-span-2 p-3 bg-neon-red/10 border border-neon-red/20 text-neon-red rounded-lg font-bold text-xs hover:bg-neon-red/20 transition-all uppercase tracking-tighter flex items-center justify-center gap-2">
          <Trash2 className="w-3.5 h-3.5" /> {t.clear}
        </button>
        <button onClick={del} className="p-3 bg-white/5 border border-white/10 text-white/70 rounded-lg font-bold text-xs hover:bg-white/10 transition-all flex items-center justify-center">
          <Delete className="w-4 h-4" />
        </button>
        <button onClick={() => handleOperator('/')} className="p-3 bg-white/5 border border-white/10 text-neon-purple rounded-lg font-bold text-lg hover:bg-white/10 transition-all">÷</button>

        {[digits[7], digits[8], digits[9]].map((label, i) => <button key={i} onClick={() => handleDigit(['7', '8', '9'][i])} className="p-3 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all">{label}</button>)}
        <button onClick={() => handleOperator('*')} className="p-3 bg-white/5 border border-white/10 text-neon-purple rounded-lg font-bold text-lg hover:bg-white/10 transition-all">×</button>

        {[digits[4], digits[5], digits[6]].map((label, i) => <button key={i} onClick={() => handleDigit(['4', '5', '6'][i])} className="p-3 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all">{label}</button>)}
        <button onClick={() => handleOperator('-')} className="p-3 bg-white/5 border border-white/10 text-neon-purple rounded-lg font-bold text-lg hover:bg-white/10 transition-all">−</button>

        {[digits[1], digits[2], digits[3]].map((label, i) => <button key={i} onClick={() => handleDigit(['1', '2', '3'][i])} className="p-3 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all">{label}</button>)}
        <button onClick={() => handleOperator('+')} className="p-3 bg-white/5 border border-white/10 text-neon-purple rounded-lg font-bold text-lg hover:bg-white/10 transition-all">+</button>

        <button onClick={() => handleDigit('0')} className="col-span-2 p-3 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all">{digits[0]}</button>
        <button onClick={() => handleDigit('.')} className="p-3 bg-white/5 border border-white/10 text-white rounded-lg font-bold text-lg hover:bg-white/10 transition-all">.</button>
        <button onClick={calculate} className="p-3 bg-neon-blue text-black rounded-lg font-black text-xl hover:opacity-90 transition-all flex items-center justify-center">
          <Equal className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};

export default Calculator;
