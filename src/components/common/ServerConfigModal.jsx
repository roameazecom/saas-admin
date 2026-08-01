import { useState } from 'react';
import { usePosStore } from '../../store/posStore';
import { discoverLocalServer } from '../../utils/networkScanner';
import { Settings, RefreshCw, X, Check, AlertCircle } from 'lucide-react';

export default function ServerConfigModal({ isOpen, onClose }) {
  const { getServerUrl, setServerUrl } = usePosStore();
  const [url, setUrl] = useState(getServerUrl());
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [scanError, setScanError] = useState('');

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    setServerUrl(url);
    onClose();
  };

  const handleAutoDiscover = async () => {
    setIsScanning(true);
    setScanError('');
    setScanStatus('Initializing scan...');
    try {
      const discoveredUrl = await discoverLocalServer((status) => {
        setScanStatus(status);
      });
      
      if (discoveredUrl) {
        setScanStatus(`Billing PC Found! IP: ${discoveredUrl}`);
        setUrl(discoveredUrl);
        // Automatically save and reload
        setTimeout(() => {
          setServerUrl(discoveredUrl);
          onClose();
        }, 1500);
      } else {
        setScanError('Billing PC not found. Make sure the server is running on your PC and both devices are on the same Wi-Fi.');
        setIsScanning(false);
      }
    } catch (err) {
      setScanError('Scan failed. Please configure manually.');
      setIsScanning(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-surface-900 rounded-3xl border border-surface-700 shadow-glass w-full max-w-md overflow-hidden animate-scale-up">
        
        {/* Header */}
        <div className="p-5 border-b border-surface-800 flex justify-between items-center bg-surface-900">
          <h3 className="font-black text-surface-100 flex items-center gap-2 text-base">
            <Settings className="w-5 h-5 text-brand-500 animate-spin-slow" /> Server Settings
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-surface-200 hover:bg-surface-800 transition">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Quick Preset Toggles */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <button
              type="button"
              onClick={() => setUrl('https://apn.happypiecafe.in')}
              className={`py-2.5 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${url === 'https://apn.happypiecafe.in' ? 'bg-emerald-600/15 border-emerald-500/35 text-emerald-400' : 'bg-surface-950/20 border-surface-800 hover:bg-surface-800/40 text-slate-400'}`}
            >
              ☁️ Cloud Server
            </button>
            <button
              type="button"
              onClick={() => setUrl('http://localhost:5000')}
              className={`py-2.5 px-3 border rounded-xl text-[10px] font-black uppercase tracking-wider transition-all duration-200 active:scale-95 ${url === 'http://localhost:5000' ? 'bg-emerald-600/15 border-emerald-500/35 text-emerald-400' : 'bg-surface-950/20 border-surface-800 hover:bg-surface-800/40 text-slate-400'}`}
            >
              💻 Local Server
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-surface-400 mb-2">
                Server IP / URL
              </label>
              <input 
                type="text" 
                value={url} 
                onChange={(e) => setUrl(e.target.value)}
                required
                className="glass-input w-full px-4 py-3 rounded-xl text-sm font-medium"
                placeholder="e.g. http://192.168.1.150:5000"
              />
            </div>
            
            <div className="flex gap-2">
              <button 
                type="button" 
                onClick={() => setUrl('')}
                className="flex-1 py-2 px-3 border border-surface-700 hover:bg-surface-800 rounded-xl text-xs font-black text-surface-300 transition"
              >
                Reset to Cloud
              </button>
              <button 
                type="submit"
                className="flex-1 py-2 px-3 bg-brand-600 hover:bg-brand-500 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" /> Save & Connect
              </button>
            </div>
          </form>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-surface-800"></div>
            <span className="flex-shrink mx-4 text-slate-500 text-[10px] font-bold uppercase tracking-widest">Or</span>
            <div className="flex-grow border-t border-surface-800"></div>
          </div>

          {/* Auto Discovery Panel */}
          <div className="bg-surface-950/40 border border-surface-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-black text-surface-200">WiFi Auto-Detect</h4>
                <p className="text-[10px] text-surface-400 font-bold mt-0.5">Let TV automatically find the billing PC</p>
              </div>
              <button
                type="button"
                disabled={isScanning}
                onClick={handleAutoDiscover}
                className="flex items-center gap-1.5 px-3 py-2 bg-rose-500 hover:bg-rose-600 disabled:bg-rose-500/20 disabled:text-rose-500/50 text-white text-xs font-black rounded-xl transition shadow shadow-rose-500/10"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                {isScanning ? 'Scanning...' : 'Scan WiFi'}
              </button>
            </div>

            {/* Scan States */}
            {isScanning && (
              <div className="p-3 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-center gap-2.5 text-xs text-blue-400 font-medium animate-pulse">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-ping" />
                <span>{scanStatus}</span>
              </div>
            )}

            {scanError && (
              <div className="p-3 bg-rose-500/5 border border-rose-500/15 rounded-xl flex items-start gap-2.5 text-xs text-rose-500 font-medium animate-fade-in">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                <span>{scanError}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
