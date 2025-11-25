import React from 'react';
import { RoomAnalysis, ActionItem } from '../types';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, ShoppingBag, ArrowRight, Trash2, Library, ShoppingCart } from 'lucide-react';

interface AnalysisDashboardProps {
  analysis: RoomAnalysis;
}

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#6366f1'];

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis }) => {
  
  // Группировка задач по категориям для раздельного отображения
  const discardItems = analysis.actionItems.filter(i => i.category === 'Discard');
  const organizeItems = analysis.actionItems.filter(i => i.category === 'Organize');
  const buyItems = analysis.actionItems.filter(i => i.category === 'Buy');

  // Вспомогательная функция для рендера колонки с задачами
  const renderActionGroup = (title: string, items: ActionItem[], icon: React.ReactNode, bgColor: string, borderColor: string) => {
    if (items.length === 0) return null;
    return (
      <div className={`rounded-xl border ${borderColor} bg-white overflow-hidden flex flex-col h-full`}>
        <div className={`${bgColor} px-4 py-3 flex items-center font-semibold text-slate-800 border-b ${borderColor}`}>
          {icon}
          <span className="ml-2">{title}</span>
          <span className="ml-auto text-xs font-normal bg-white/50 px-2 py-0.5 rounded-full">{items.length}</span>
        </div>
        <div className="p-4 space-y-3 flex-1">
          {items.map((item) => (
            <div key={item.id} className="pb-3 border-b border-slate-50 last:border-0 last:pb-0">
              <h4 className="font-medium text-slate-800 text-sm mb-1">{item.title}</h4>
              <p className="text-xs text-slate-500 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      
      {/* Секция Резюме (Summary) */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 mb-2">Анализ: {analysis.roomType}</h2>
            <p className="text-slate-600 leading-relaxed">{analysis.summary}</p>
          </div>
          {/* Индикатор уровня захламленности */}
          <div className="flex flex-col items-center ml-4 min-w-[100px]">
            <div className="relative w-20 h-20 flex items-center justify-center">
               <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-100"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
                <path
                  className={`${analysis.clutterLevel > 70 ? 'text-red-500' : analysis.clutterLevel > 40 ? 'text-orange-500' : 'text-emerald-500'} transition-all duration-1000 ease-out`}
                  strokeDasharray={`${analysis.clutterLevel}, 100`}
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                />
              </svg>
              <span className="absolute text-sm font-bold text-slate-700">{analysis.clutterLevel}%</span>
            </div>
            <span className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Захламленность</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Колонки с планом действий */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-4">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
            План действий
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
            {renderActionGroup(
              'Убрать / Выбросить', 
              discardItems, 
              <Trash2 className="w-4 h-4 text-red-600" />,
              'bg-red-50',
              'border-red-100'
            )}
            {renderActionGroup(
              'Организовать', 
              organizeItems, 
              <Library className="w-4 h-4 text-indigo-600" />,
              'bg-indigo-50',
              'border-indigo-100'
            )}
            {renderActionGroup(
              'Купить / Добавить', 
              buyItems, 
              <ShoppingCart className="w-4 h-4 text-amber-600" />,
              'bg-amber-50',
              'border-amber-100'
            )}
            {discardItems.length === 0 && organizeItems.length === 0 && buyItems.length === 0 && (
              <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Идеальный порядок! Действий не требуется.
              </div>
            )}
          </div>
        </div>

        {/* Колонка статистики и эстетики */}
        <div className="space-y-6">
          {/* График использования пространства */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">Использование пространства</h3>
            
            {/* 
                ВАЖНО: Recharts иногда выдает ошибку "width(-1)", если контейнер не имеет явных размеров при инициализации.
                Использование style={{ width: '100%' }} и ResponsiveContainer с width="99%" помогает избежать проблем с округлением пикселей.
            */}
            <div style={{ width: '100%', height: 250, position: 'relative' }}>
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={analysis.spaceUtilization}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {analysis.spaceUtilization.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className="flex flex-wrap justify-center gap-2 mt-2">
               {analysis.spaceUtilization.map((entry, index) => (
                 <div key={index} className="flex items-center text-xs text-slate-500">
                    <div className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                    {entry.name}
                 </div>
               ))}
            </div>
          </div>

          {/* Советы по стилю (Aesthetic Tips) */}
          <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
            <h3 className="text-emerald-900 font-semibold mb-3 flex items-center">
              <ShoppingBag className="w-4 h-4 mr-2" />
              Стиль и атмосфера
            </h3>
            <ul className="space-y-3">
              {analysis.aestheticSuggestions.map((tip, idx) => (
                <li key={idx} className="flex items-start text-sm text-emerald-800">
                  <ArrowRight className="w-3 h-3 mr-2 mt-1 flex-shrink-0 opacity-50" />
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalysisDashboard;