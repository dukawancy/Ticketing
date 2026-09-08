(function () {
  const cssVar = (name, fallback = '') => {
    const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return value || fallback;
  };

  const getDateLabel = (date) => {
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
  };

  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  const DashboardCharts = {
    getMockStatusCounts: () => [
      { label: 'Open', value: 34, color: 'status-open' },
      { label: 'In Progress', value: 22, color: 'status-progress' },
      { label: 'Resolved', value: 41, color: 'status-resolved' },
      { label: 'Closed', value: 18, color: 'status-closed' },
      { label: 'Overdue', value: 9, color: 'status-overdue' }
    ],

    getMockTimeSeries: () => {
      const today = new Date();
      const data = [
        14, 18, 12, 24, 19, 27, 21,
        34, 29, 32, 28, 24, 37, 31
      ];

      return data.map((value, index) => {
        const date = new Date(today);
        date.setDate(today.getDate() - (13 - index));
        return {
          label: getDateLabel(date),
          value: value
        };
      });
    },

    getMockSlaStats: () => {
      const met = 84;
      const breached = 16;
      const percentage = 84;

      return { met, breached, percentage };
    },

    getMockTopTechnicians: () => [
      { name: 'Musa Ibrahim', unit: 'Network', count: 26 },
      { name: 'Aisha Bello', unit: 'Hardware', count: 21 },
      { name: 'Tunde Okafor', unit: 'Software', count: 19 },
      { name: 'Chinelo James', unit: 'Access', count: 17 },
      { name: 'Samson Dike', unit: 'Support', count: 14 }
    ],

    getStatusColorMap: () => ({
      open: cssVar('--warning', '#fbbf24'),
      'in-progress': cssVar('--info', '#38bdf8'),
      resolved: cssVar('--success', '#22c55e'),
      closed: cssVar('--text-dim', '#7d8ea8'),
      overdue: cssVar('--danger', '#ef4444')
    }),

    getThemeColors: () => ({
      background: cssVar('--surface3', '#1d2c42'),
      text: cssVar('--text', '#edf4ff'),
      textMuted: cssVar('--text-muted', '#a3b4cf'),
      border: cssVar('--border', 'rgba(148, 163, 184, 0.14)'),
      accent: cssVar('--accent', '#4f8ef7'),
      accent2: cssVar('--accent2', '#7c5cff'),
      success: cssVar('--success', '#22c55e'),
      warning: cssVar('--warning', '#fbbf24'),
      danger: cssVar('--danger', '#ef4444'),
      info: cssVar('--info', '#38bdf8')
    }),

    buildLegend: (items, containerId) => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const colorMap = DashboardCharts.getStatusColorMap();
      container.innerHTML = items.map((item) => {
        const color = item.color && colorMap[item.color.replace('status-', '')] ? colorMap[item.color.replace('status-', '')] : colorMap[item.label?.toLowerCase?.() || 'open'];
        return `
          <div class="chart-legend-item">
            <span class="chart-legend-dot" style="background:${color};"></span>
            <span>${item.label} (${item.value})</span>
          </div>
        `;
      }).join('');
    },

    getStatusData: () => {
      const raw = DashboardCharts.getMockStatusCounts();
      const colorMap = DashboardCharts.getStatusColorMap();
      return raw.map((item) => ({
        ...item,
        color: colorMap[item.label.toLowerCase().replace(/\s+/g, '-')] || colorMap[item.label.toLowerCase()] || colorMap.open
      }));
    },

    renderStatusDoughnut: () => {
      const canvas = document.getElementById('statusChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const statusData = DashboardCharts.getStatusData();
      const total = statusData.reduce((sum, item) => sum + item.value, 0);
      const styles = DashboardCharts.getThemeColors();
      const size = 160;
      const cx = size / 2;
      const cy = size / 2;
      const outerRadius = Math.min(cx, cy) - 8;
      const innerRadius = outerRadius * 0.62;
      let start = -Math.PI / 2;

      ctx.clearRect(0, 0, size, size);

      statusData.forEach((item) => {
        const sweep = (item.value / total) * Math.PI * 2;
        if (!item.value) return;

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, outerRadius, start, start + sweep);
        ctx.closePath();
        ctx.fillStyle = item.color;
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, innerRadius, start + sweep, start, true);
        ctx.closePath();
        ctx.fillStyle = styles.background;
        ctx.fill();

        start += sweep;
      });

      const innerCut = ctx.createRadialGradient(cx, cy, innerRadius * 0.2, cx, cy, innerRadius * 1.2);
      innerCut.addColorStop(0, 'rgba(255,255,255,0.06)');
      innerCut.addColorStop(1, styles.background);
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fillStyle = innerCut;
      ctx.fill();

      ctx.fillStyle = styles.text;
      ctx.font = '700 20px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(total), cx, cy);

      DashboardCharts.buildLegend(statusData, 'statusLegend');
    },

    renderTrendLine: () => {
      const canvas = document.getElementById('trendChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const points = DashboardCharts.getMockTimeSeries();
      const styles = DashboardCharts.getThemeColors();
      const width = 340;
      const height = 180;
      const padding = { top: 18, right: 12, bottom: 24, left: 12 };
      const chartWidth = width - padding.left - padding.right;
      const chartHeight = height - padding.top - padding.bottom;
      const maxValue = Math.max(...points.map((p) => p.value), 1) * 1.15;
      const minValue = Math.min(...points.map((p) => p.value), 0) * 0.85;

      ctx.clearRect(0, 0, width, height);

      const lineGradient = ctx.createLinearGradient(0, padding.top, 0, height);
      lineGradient.addColorStop(0, 'rgba(79,142,247,0.45)');
      lineGradient.addColorStop(1, 'rgba(79,142,247,0.02)');

      const mapX = (index) => padding.left + (index / (points.length - 1)) * chartWidth;
      const mapY = (value) => padding.top + ((maxValue - value) / (maxValue - minValue || 1)) * chartHeight;

      const path = points.map((point, index) => ({
        x: mapX(index),
        y: mapY(point.value)
      }));

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i += 1) {
        const prev = path[i - 1];
        const curr = path[i];
        const midpointX = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midpointX, (prev.y + curr.y) / 2);
      }
      const last = path[path.length - 1];
      ctx.lineTo(last.x, last.y);

      const fillPath = new Path2D(ctx.getLineDash ? ctx.getLineDash() : '');
      ctx.beginPath();
      ctx.moveTo(path[0].x, height - padding.bottom);
      for (let i = 0; i < path.length; i += 1) {
        ctx.lineTo(path[i].x, path[i].y);
      }
      ctx.lineTo(path[path.length - 1].x, height - padding.bottom);
      ctx.closePath();
      ctx.fillStyle = lineGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
      for (let i = 1; i < path.length; i += 1) {
        const prev = path[i - 1];
        const curr = path[i];
        const midpointX = (prev.x + curr.x) / 2;
        ctx.quadraticCurveTo(prev.x, prev.y, midpointX, (prev.y + curr.y) / 2);
      }
      const final = path[path.length - 1];
      ctx.lineTo(final.x, final.y);
      ctx.strokeStyle = styles.accent;
      ctx.lineWidth = 3;
      ctx.stroke();

      points.forEach((point, index) => {
        const x = mapX(index);
        const y = mapY(point.value);
        ctx.beginPath();
        ctx.arc(x, y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = styles.accent;
        ctx.fill();
      });

      ctx.fillStyle = styles.textMuted;
      ctx.font = '11px "Plus Jakarta Sans", sans-serif';
      ctx.textAlign = 'center';
      points.forEach((point, index) => {
        if (index % 3 !== 0 && index !== points.length - 1) return;
        const x = mapX(index);
        const y = height - 8;
        ctx.fillText(point.label, x, y);
      });
    },

    renderSlaDoughnut: () => {
      const canvas = document.getElementById('slaChart');
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      const stats = DashboardCharts.getMockSlaStats();
      const styles = DashboardCharts.getThemeColors();
      const center = 70;
      const radius = 52;
      const thickness = 12;
      const total = stats.met + stats.breached;
      const ratio = (stats.percentage || 0) / 100;

      ctx.clearRect(0, 0, 140, 140);
      ctx.beginPath();
      ctx.arc(center, center, radius, 0, Math.PI * 2);
      ctx.lineWidth = thickness;
      ctx.strokeStyle = 'rgba(255,255,255,0.07)';
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(center, center, radius, -Math.PI / 2, -Math.PI / 2 + (ratio * Math.PI * 2));
      ctx.lineWidth = thickness;
      ctx.strokeStyle = stats.percentage >= 80 ? styles.success : stats.percentage >= 60 ? styles.warning : styles.danger;
      ctx.lineCap = 'round';
      ctx.stroke();

      const pctEl = document.getElementById('slaPct');
      if (pctEl) {
        pctEl.textContent = `${stats.percentage}%`;
      }

      const legend = document.getElementById('slaLegend');
      if (legend) {
        legend.innerHTML = `
          <div class="chart-legend-item">
            <span class="chart-legend-dot" style="background:${styles.success};"></span>
            <span>Met (${stats.met}%)</span>
          </div>
          <div class="chart-legend-item">
            <span class="chart-legend-dot" style="background:${styles.danger};"></span>
            <span>Breached (${stats.breached}%)</span>
          </div>
        `;
      }
    },

    renderTopTechnicians: () => {
      const list = document.getElementById('topTechList');
      if (!list) return;

      const users = DashboardCharts.getMockTopTechnicians();
      list.innerHTML = users.map((user, index) => `
        <div class="top-tech-item">
          <div class="top-tech-rank">#${index + 1}</div>
          <div class="top-tech-avatar">${user.name.split(' ').map(part => part[0]).slice(0, 2).join('').toUpperCase()}</div>
          <div class="flex-1">
            <div class="top-tech-name">${user.name}</div>
            <div class="top-tech-unit">${user.unit}</div>
          </div>
          <div class="top-tech-count">${user.count}</div>
        </div>
      `).join('');
    },

    initDashboardCharts: () => {
      const statusChart = document.getElementById('statusChart');
      if (statusChart) {
        DashboardCharts.renderStatusDoughnut();
      }

      const trendCanvas = document.getElementById('trendChart');
      if (trendCanvas) {
        DashboardCharts.renderTrendLine();
      }

      const slaChart = document.getElementById('slaChart');
      if (slaChart) {
        DashboardCharts.renderSlaDoughnut();
      }

      const topTechList = document.getElementById('topTechList');
      if (topTechList) {
        DashboardCharts.renderTopTechnicians();
      }
    }
  };

  window.DashboardCharts = DashboardCharts;

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => DashboardCharts.initDashboardCharts(), 120);
  }, { once: true });
})();
