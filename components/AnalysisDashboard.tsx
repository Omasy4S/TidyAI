import React, { useMemo } from "react";
import { RoomAnalysis, ActionItem } from "../types";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  CheckCircle2,
  ShoppingBag,
  ArrowRight,
  Trash2,
  Library,
  ShoppingCart,
} from "lucide-react";

// ============================================================================
// ТИПЫ
// ============================================================================

interface AnalysisDashboardProps {
  analysis: RoomAnalysis;
}

/** Конфигурация группы действий */
interface ActionGroupConfig {
  title: string;
  icon: React.ReactNode;
  bgColor: string;
  borderColor: string;
}

// ============================================================================
// КОНСТАНТЫ
// ============================================================================

/** Цвета для круговой диаграммы */
const CHART_COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1"] as const;

/** Конфигурация групп действий по категориям */
const ACTION_GROUP_CONFIG: Record<ActionItem["category"], ActionGroupConfig> = {
  Discard: {
    title: "Убрать / Выбросить",
    icon: <Trash2 className="w-4 h-4 text-red-600" />,
    bgColor: "bg-red-50",
    borderColor: "border-red-100",
  },
  Organize: {
    title: "Организовать",
    icon: <Library className="w-4 h-4 text-indigo-600" />,
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-100",
  },
  Buy: {
    title: "Купить / Добавить",
    icon: <ShoppingCart className="w-4 h-4 text-amber-600" />,
    bgColor: "bg-amber-50",
    borderColor: "border-amber-100",
  },
};

// ============================================================================
// КОМПОНЕНТ
// ============================================================================

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({ analysis }) => {
  // Группировка задач по категориям (мемоизировано)
  const groupedItems = useMemo(() => {
    return {
      discard: analysis.actionItems.filter((item) => item.category === "Discard"),
      organize: analysis.actionItems.filter((item) => item.category === "Organize"),
      buy: analysis.actionItems.filter((item) => item.category === "Buy"),
    };
  }, [analysis.actionItems]);

  // Проверка наличия задач
  const hasNoItems =
    groupedItems.discard.length === 0 &&
    groupedItems.organize.length === 0 &&
    groupedItems.buy.length === 0;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Секция резюме */}
      <SummaryCard
        roomType={analysis.roomType}
        summary={analysis.summary}
        clutterLevel={analysis.clutterLevel}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Колонки с планом действий */}
        <div className="lg:col-span-2">
          <h3 className="text-lg font-semibold text-slate-800 flex items-center mb-4">
            <CheckCircle2 className="w-5 h-5 mr-2 text-emerald-500" />
            План действий
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 auto-rows-fr">
            <ActionGroup category="Discard" items={groupedItems.discard} />
            <ActionGroup category="Organize" items={groupedItems.organize} />
            <ActionGroup category="Buy" items={groupedItems.buy} />

            {/* Сообщение об отсутствии задач */}
            {hasNoItems && (
              <div className="col-span-2 p-8 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                Идеальный порядок! Действий не требуется.
              </div>
            )}
          </div>
        </div>

        {/* Колонка статистики и эстетики */}
        <div className="space-y-6">
          <SpaceUtilizationChart data={analysis.spaceUtilization} />
          <AestheticTips tips={analysis.aestheticSuggestions} />
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// ВСПОМОГАТЕЛЬНЫЕ КОМПОНЕНТЫ
// ============================================================================

/**
 * Карточка с резюме анализа
 */
interface SummaryCardProps {
  roomType: string;
  summary: string;
  clutterLevel: number;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ roomType, summary, clutterLevel }) => {
  // Определяем цвет индикатора в зависимости от уровня захламленности
  const clutterColor = useMemo(() => {
    if (clutterLevel > 70) return "text-red-500";
    if (clutterLevel > 40) return "text-orange-500";
    return "text-emerald-500";
  }, [clutterLevel]);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Анализ: {roomType}</h2>
          <p className="text-slate-600 leading-relaxed">{summary}</p>
        </div>

        {/* Индикатор уровня захламленности */}
        <div className="flex flex-col items-center ml-4 min-w-[100px]">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              {/* Фоновый круг */}
              <path
                className="text-slate-100"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
              {/* Круг прогресса */}
              <path
                className={`${clutterColor} transition-all duration-1000 ease-out`}
                strokeDasharray={`${clutterLevel}, 100`}
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
              />
            </svg>
            <span className="absolute text-sm font-bold text-slate-700">{clutterLevel}%</span>
          </div>
          <span className="text-xs text-slate-500 mt-1 uppercase tracking-wide">Захламленность</span>
        </div>
      </div>
    </div>
  );
};

/**
 * Группа действий по категории
 */
interface ActionGroupProps {
  category: ActionItem["category"];
  items: ActionItem[];
}

const ActionGroup: React.FC<ActionGroupProps> = ({ category, items }) => {
  if (items.length === 0) return null;

  const config = ACTION_GROUP_CONFIG[category];

  return (
    <div
      className={`rounded-xl border ${config.borderColor} bg-white overflow-hidden flex flex-col h-full`}
    >
      {/* Заголовок группы */}
      <div
        className={`${config.bgColor} px-4 py-3 flex items-center font-semibold text-slate-800 border-b ${config.borderColor}`}
      >
        {config.icon}
        <span className="ml-2">{config.title}</span>
        <span className="ml-auto text-xs font-normal bg-white/50 px-2 py-0.5 rounded-full">
          {items.length}
        </span>
      </div>

      {/* Список задач */}
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

/**
 * Диаграмма использования пространства
 */
interface SpaceUtilizationChartProps {
  data: RoomAnalysis["spaceUtilization"];
}

const SpaceUtilizationChart: React.FC<SpaceUtilizationChartProps> = ({ data }) => (
  <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100">
    <h3 className="text-sm font-semibold text-slate-700 mb-4">Использование пространства</h3>

    {/* 
      ВАЖНО: Recharts иногда выдает ошибку "width(-1)", если контейнер не имеет явных размеров.
      Использование width="99%" помогает избежать проблем с округлением пикселей.
    */}
    <div style={{ width: "100%", height: 250, position: "relative" }}>
      <ResponsiveContainer width="99%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={5}
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={{
              borderRadius: "8px",
              border: "none",
              boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
            }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>

    {/* Легенда */}
    <div className="flex flex-wrap justify-center gap-2 mt-2">
      {data.map((entry, index) => (
        <div key={index} className="flex items-center text-xs text-slate-500">
          <div
            className="w-2 h-2 rounded-full mr-1"
            style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
          />
          {entry.name}
        </div>
      ))}
    </div>
  </div>
);

/**
 * Советы по эстетике
 */
interface AestheticTipsProps {
  tips: string[];
}

const AestheticTips: React.FC<AestheticTipsProps> = ({ tips }) => (
  <div className="bg-emerald-50 p-5 rounded-xl border border-emerald-100">
    <h3 className="text-emerald-900 font-semibold mb-3 flex items-center">
      <ShoppingBag className="w-4 h-4 mr-2" />
      Стиль и атмосфера
    </h3>
    <ul className="space-y-3">
      {tips.map((tip, index) => (
        <li key={index} className="flex items-start text-sm text-emerald-800">
          <ArrowRight className="w-3 h-3 mr-2 mt-1 flex-shrink-0 opacity-50" />
          <span>{tip}</span>
        </li>
      ))}
    </ul>
  </div>
);

export default AnalysisDashboard;
