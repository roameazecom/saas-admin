import { useState, useEffect } from 'react';
import axios from 'axios';
import StatCards from './StatCards';
import SalesChart from './SalesChart';
import FinancialCharts from './FinancialCharts';
import RunningStatusViews from './RunningStatusViews';

export default function AdminDashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }));
  const [serverIp, setServerIp] = useState('Loading...');
  const [serverPort, setServerPort] = useState('5000');

  useEffect(() => {
    axios.get('/api/config/server-ip')
      .then(res => {
        setServerIp(res.data.ip);
        setServerPort(res.data.port);
      })
      .catch(err => {
        console.error('Failed to get server IP:', err);
        setServerIp('localhost');
      });
  }, []);

  return (
    <div className="flex flex-col space-y-6 overflow-y-auto pb-8 p-4 lg:p-6 bg-surface-950">
      
      {/* Local Server IP Connection Info Banner */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <span className="text-lg">📶</span>
          </div>
          <div>
            <h3 className="text-sm font-bold text-blue-800">LOCAL SERVER WI-FI CONNECTION IP</h3>
            <p className="text-xs text-blue-700 font-bold mt-0.5">
              Connect Waiters' Phones & TVs to: <span className="underline select-all text-sm bg-blue-200 px-1.5 py-0.5 rounded text-blue-900">http://{serverIp}:{serverPort}</span>
            </p>
            <p className="text-[10px] text-blue-500 mt-1">
              * Note: Make sure all devices are connected to the same Wi-Fi router.
            </p>
          </div>
        </div>
      </div>
      {/* Policy Banner */}
      <div className="bg-orange-50 border-l-4 border-orange-500 rounded-xl p-4 shadow-sm animate-fade-in">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-bold text-orange-800">DATA RETENTION POLICY UPDATE</h3>
            <div className="mt-1 text-sm text-orange-700 font-medium">
              <p>
                From 25/04/2026, AppThat POS will retain your data for last 730 days (2 years) only. Data older than 2 years will be permanently deleted.
              </p>
              <p className="mt-1 font-bold underline cursor-pointer text-brand-600 hover:text-brand-700">Click here to download the data.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between px-2 bg-surface-900 p-3 rounded-2xl shadow-sm border border-surface-750">
        <span className="text-sm font-bold text-surface-500 ml-2">
          Viewing Data For: <span className="text-surface-100">{new Date(selectedDate).toLocaleDateString()}</span>
        </span>
        <input 
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-surface-700 rounded-xl text-sm p-2 px-3 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 bg-surface-950 hover:bg-surface-900 transition-all font-bold text-surface-100 cursor-pointer"
        />
      </div>

      <StatCards date={selectedDate} />
      
      <SalesChart date={selectedDate} />
      
      <RunningStatusViews date={selectedDate} />

      <FinancialCharts date={selectedDate} />
      
    </div>
  );
}
