
export type ChartType = 'pie' | 'bar';

export interface ChartDataPoint {
  name: string;
  value: number;
  color?: string;
}

export const CHART_COLORS = {
  critical: '#ef4444',
  high: '#f97316',
  medium: '#eab308',
  low: '#3b82f6',
  slate: '#64748b'
};

export const CHART_OPTIONS_DARK = {
  plugins: {
    legend: {
      labels: {
        color: '#94a3b8',
        font: {
          family: "'Inter', sans-serif",
          size: 11
        },
        usePointStyle: true,
        boxWidth: 8
      }
    },
    tooltip: {
      backgroundColor: '#0f172a',
      titleColor: '#f8fafc',
      bodyColor: '#cbd5e1',
      borderColor: '#334155',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 8,
      displayColors: true
    }
  },
  scales: {
    x: {
      grid: {
        color: '#1e293b',
        drawBorder: false
      },
      ticks: {
        color: '#64748b',
        font: {
          family: "'Inter', sans-serif",
          size: 10
        }
      }
    },
    y: {
      grid: {
        color: '#1e293b',
        drawBorder: false
      },
      ticks: {
        color: '#64748b',
        font: {
          family: "'Inter', sans-serif",
          size: 10
        }
      }
    }
  }
};
