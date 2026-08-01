import { useState } from 'react';
import OrderDataTable from './OrderDataTable';
import KotLogTable from './KotLogTable';
import DayEndSummary from './DayEndSummary';
import CancellationLogsTab from './CancellationLogsTab';

export default function LogsContainer() {
  const [activeTab, setActiveTab] = useState('orders');

  return (
    <div className="flex flex-col h-[80vh] min-h-[600px] w-full bg-surface-900/50 backdrop-blur-md rounded-2xl shadow-sm border border-surface-700 overflow-hidden">
       <div className="flex space-x-6 border-b border-surface-700 bg-surface-900/80 px-6 pt-4 shrink-0 overflow-x-auto custom-scrollbar">
         <button 
           onClick={() => setActiveTab('orders')}
           className={`pb-4 text-sm font-bold border-b-4 transition-all duration-300 shrink-0 ${activeTab === 'orders' ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-100'}`}
         >
           Order
         </button>
         <button 
           onClick={() => setActiveTab('advance')}
           className={`pb-4 text-sm font-bold border-b-4 transition-all duration-300 shrink-0 ${activeTab === 'advance' ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-100'}`}
         >
           Advance Order
         </button>
         <button 
           onClick={() => setActiveTab('kot')}
           className={`pb-4 text-sm font-bold border-b-4 transition-all duration-300 shrink-0 ${activeTab === 'kot' ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-100'}`}
         >
           KOT
         </button>
         <button 
           onClick={() => setActiveTab('cancellation')}
           className={`pb-4 text-sm font-bold border-b-4 transition-all duration-300 shrink-0 ${activeTab === 'cancellation' ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-100'}`}
         >
           Cancellation Logs
         </button>
          <button 
           onClick={() => setActiveTab('dayend')}
           className={`pb-4 text-sm font-bold border-b-4 transition-all duration-300 shrink-0 ${activeTab === 'dayend' ? 'border-brand-600 text-brand-700' : 'border-transparent text-surface-500 hover:text-surface-100'}`}
         >
           Day End Summary
         </button>
       </div>

       <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-6 bg-transparent">
          {activeTab === 'orders' && <OrderDataTable />}
          {activeTab === 'advance' && <div className="text-surface-500 flex justify-center p-12 bg-surface-900 rounded-2xl shadow-glass border border-surface-700 font-medium shrink-0">Advance Orders (Coming Soon)</div>}
          {activeTab === 'kot' && <KotLogTable />}
          {activeTab === 'cancellation' && <CancellationLogsTab />}
          {activeTab === 'dayend' && <DayEndSummary />}
       </div>
    </div>
  );
}
