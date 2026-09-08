/** @jest-environment jsdom */

describe('DashboardCharts mock data', () => {
  beforeEach(() => {
    require('../js/charts.js');
  });

  test('returns structured mock data for the dashboard widgets', () => {
    const statusCounts = window.DashboardCharts.getMockStatusCounts();
    expect(statusCounts.length).toBeGreaterThan(0);
    expect(statusCounts[0]).toEqual(expect.objectContaining({
      label: expect.any(String),
      value: expect.any(Number)
    }));

    const timeSeries = window.DashboardCharts.getMockTimeSeries();
    expect(timeSeries).toHaveLength(14);
    expect(timeSeries[0]).toEqual(expect.objectContaining({
      label: expect.any(String),
      value: expect.any(Number)
    }));

    const slaStats = window.DashboardCharts.getMockSlaStats();
    expect(slaStats).toEqual(expect.objectContaining({
      met: expect.any(Number),
      breached: expect.any(Number),
      percentage: expect.any(Number)
    }));

    const topTechnicians = window.DashboardCharts.getMockTopTechnicians();
    expect(topTechnicians).toHaveLength(5);
    expect(topTechnicians[0]).toEqual(expect.objectContaining({
      name: expect.any(String),
      unit: expect.any(String),
      count: expect.any(Number)
    }));
  });
});
