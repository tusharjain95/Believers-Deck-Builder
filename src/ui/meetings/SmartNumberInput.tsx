import React, { useState, useEffect, useRef } from 'react';
import { parseIndianNumber, formatIndianGrouping, formatInr } from '../../utils/indianNumberFormat';

interface SmartNumberInputProps {
  value: string | number | undefined;
  onChange: (val: number | string) => void;
  format?: string;
  placeholder?: string;
  required?: boolean;
}

export const SmartNumberInput: React.FC<SmartNumberInputProps> = ({
  value,
  onChange,
  format = 'num',
  placeholder = 'e.g. 7.34L, 1.2 Cr, or 50,000',
  required = false,
}) => {
  const [textInput, setTextInput] = useState<string>(
    value !== undefined && value !== null ? String(value) : ''
  );
  const lastSentValRef = useRef<any>(value);

  // Synchronize when external value changes (e.g. switching meetings or reset)
  useEffect(() => {
    if (value !== lastSentValRef.current) {
      lastSentValRef.current = value;
      setTextInput(value !== undefined && value !== null ? String(value) : '');
    }
  }, [value]);

  const parsed = parseIndianNumber(textInput);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setTextInput(val);

    const parsedNum = parseIndianNumber(val);
    const newVal = parsedNum !== null ? parsedNum : val;
    lastSentValRef.current = newVal;
    onChange(newVal);
  };

  const isCurrency = format === 'inr' || format === 'inr_lakh' || format === 'inr_cr';
  const isPct = format === 'pct';

  return (
    <div className="space-y-1">
      <div className="relative">
        <input
          type="text"
          value={textInput}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:outline-none font-mono bg-white"
        />
      </div>

      {parsed !== null && textInput.trim() !== '' && (
        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500">
          <span className="text-slate-400">Preview:</span>
          <span className="font-mono font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
            {isCurrency
              ? formatInr(parsed)
              : isPct
              ? `${parsed}%`
              : formatIndianGrouping(parsed)}
          </span>
        </div>
      )}
    </div>
  );
};
