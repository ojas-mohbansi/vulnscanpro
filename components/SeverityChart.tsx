import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ChartDataPoint, CHART_OPTIONS_DARK } from '../utils/charts';
import { 
  Chart as ChartJS, 
  ArcElement, 
  Tooltip, 
  Legend, 
  CategoryScale, 
  LinearScale, 
  BarElement,
  Title
} from 'chart.js';
import { Pie, Bar } from 'react-chartjs-2';
import { PieChart, Pie as RePie, Cell, Tooltip as ReTooltip, Legend as ReLegend, ResponsiveContainer, BarChart, Bar as ReBar, XAxis, YAxis, CartesianGrid } from 'recharts';

// Register Chart.js components
try {
  ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title);
} catch (e) {
  console.warn("Failed to register Chart.js components", e);
}

interface Props {
  data: ChartDataPoint[];
  type?: 'pie' | 'bar';
}

interface ErrorBoundaryProps {
  children?: ReactNode;
  fallback: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

// Internal Error Boundary to catch Chart.js rendering errors
class ChartErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(_: Error): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Chart.js failed to render:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

const RechartsFallback: React.FC<Props> = ({ data, type }) => {
  if (data.length === 0) {
    return <div className="h-full flex items-center justify-center text-slate-500">No data</div>;
  }

  if (type === 'bar') {
    return (
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis dataKey="name" stroke="#64748b" fontSize={10} />
          <YAxis stroke="#64748b" fontSize={10} />
          <ReTooltip 
            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
            cursor={{ fill: '#1e293b' }}
          />
          <ReBar dataKey="value" radius={[4, 4, 0, 0]}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
            ))}
          </ReBar>
        </BarChart>
      </ResponsiveContainer>
    );
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={80}
          paddingAngle={5}
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} stroke="none" />
          ))}
        </Pie>
        <ReTooltip 
           contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc' }}
        />
        <ReLegend verticalAlign="bottom" height={36} iconType="circle" />
      </PieChart>
    </ResponsiveContainer>
  );
};

const SeverityChart: React.FC<Props> = ({ data, type = 'pie' }) => {
  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-500 bg-slate-900/50 rounded-lg">
        No data to display
      </div>
    );
  }

  const primaryChart = type === 'bar' ? (
    <Bar 
      data={{
        labels: data.map(d => d.name),
        datasets: [{
          label: 'Count',
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color || '#3b82f6'),
          borderRadius: 4,
          barThickness: 40,
        }]
      }}
      options={{
        ...CHART_OPTIONS_DARK,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } }
      }}
    />
  ) : (
    <Pie 
      data={{
        labels: data.map(d => d.name),
        datasets: [{
          data: data.map(d => d.value),
          backgroundColor: data.map(d => d.color || '#3b82f6'),
          borderWidth: 0,
          hoverOffset: 4
        }]
      }}
      options={{
        ...CHART_OPTIONS_DARK,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          ...CHART_OPTIONS_DARK.plugins,
          legend: {
            position: 'bottom',
            labels: { ...CHART_OPTIONS_DARK.plugins.legend.labels, padding: 20 }
          }
        }
      }}
    />
  );

  return (
    <div className="h-64 w-full relative">
      <ChartErrorBoundary fallback={<RechartsFallback data={data} type={type} />}>
        {primaryChart}
      </ChartErrorBoundary>
    </div>
  );
};

export default SeverityChart;