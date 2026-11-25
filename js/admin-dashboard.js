(() => {
  const dashboardData = {
    activeMembers: 1280,
    checkInsToday: 248,
    floorCapacity: 345,
    monthlyCollections: 482000,
    expiringRenewals: 34,
    monthlyRevenue: [340000, 380000, 410000, 460000, 440000, 482000],
    dailyRevenueWeights: [
      13, 14, 15, 16, 14, 18, 19, 17, 15, 16,
      14, 18, 20, 17, 16, 15, 19, 18, 17, 16,
      15, 20, 18, 17, 19, 16, 18, 21, 20, 23
    ]
  };

  const numberFormat = new Intl.NumberFormat('en-IN');
  const currencyFormat = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  });
  const shortCurrencyFormat = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    notation: 'compact',
    maximumFractionDigits: 2
  });
  const monthFormat = new Intl.DateTimeFormat('en-IN', { month: 'short' });
  const dayFormat = new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' });
  const dateTimeFormat = new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  const timeFormat = new Intl.DateTimeFormat('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const clock = document.getElementById('system-clock');
  const rangeSelect = document.getElementById('revenue-range');
  const chart = document.getElementById('revenue-chart');
  const description = document.getElementById('revenue-description');
  const periodSummary = document.getElementById('revenue-period-summary');
  const updatedStatus = document.getElementById('dashboard-updated');
  const refreshButton = document.getElementById('refresh-dashboard');
  let refreshTimeout;

  function formatLakhs(amount) {
    return `\u20B9${(amount / 100000).toFixed(2)}L`;
  }

  function updateClock() {
    const now = new Date();
    const hour = now.getHours();
    const shift = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
    clock.textContent = `${timeFormat.format(now)} | ${shift} Lead`;
    clock.dateTime = now.toISOString();
  }

  function getMonthlyPoints(now) {
    return dashboardData.monthlyRevenue.map((value, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      return { label: monthFormat.format(month), value };
    });
  }

  function getDailyRevenue() {
    const totalWeight = dashboardData.dailyRevenueWeights.reduce((sum, weight) => sum + weight, 0);
    const dailyValues = dashboardData.dailyRevenueWeights.map((weight) =>
      Math.round(dashboardData.monthlyCollections * weight / totalWeight)
    );
    dailyValues[dailyValues.length - 1] +=
      dashboardData.monthlyCollections - dailyValues.reduce((sum, value) => sum + value, 0);
    return dailyValues;
  }

  function getDailyPoints(now, days) {
    const values = getDailyRevenue().slice(-days);
    return values.map((value, index) => {
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days + index + 1);
      return { label: dayFormat.format(date), value };
    });
  }

  function getThirtyDayPoints(now) {
    const dailyValues = getDailyRevenue();
    return Array.from({ length: 5 }, (_, index) => {
      const start = index * 6;
      const value = dailyValues.slice(start, start + 6).reduce((sum, amount) => sum + amount, 0);
      const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29 + start);
      const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 24 + start);
      return {
        label: `${dayFormat.format(startDate)} - ${dayFormat.format(endDate)}`,
        value
      };
    });
  }

  function getChartView(now) {
    switch (rangeSelect.value) {
      case 'days7':
        return {
          points: getDailyPoints(now, 7),
          description: 'Daily fee collections over the last 7 days.',
          summary: 'Total collected in 7 days: '
        };
      case 'days30':
        return {
          points: getThirtyDayPoints(now),
          description: 'Fee collections grouped by 6-day periods over the last 30 days.',
          summary: 'Total collected in 30 days: '
        };
      default:
        return {
          points: getMonthlyPoints(now),
          description: 'Consolidated fee collections over the last 6 months.',
          summary: 'Total collected in 6 months: '
        };
    }
  }

  function renderChart(now) {
    const view = getChartView(now);
    const highestValue = Math.max(...view.points.map((point) => point.value));
    const total = view.points.reduce((sum, point) => sum + point.value, 0);
    const fragment = document.createDocumentFragment();

    view.points.forEach((point, index) => {
      const column = document.createElement('div');
      column.className = 'chart-column';

      const bar = document.createElement('div');
      bar.className = index === view.points.length - 1 ? 'chart-bar chart-bar-alt' : 'chart-bar';
      bar.style.height = `${Math.max(8, point.value / highestValue * 92)}%`;
      bar.setAttribute('aria-label', `${point.label}: ${currencyFormat.format(point.value)}`);

      const tooltip = document.createElement('span');
      tooltip.className = 'bar-tooltip';
      tooltip.textContent = shortCurrencyFormat.format(point.value);
      bar.appendChild(tooltip);

      const label = document.createElement('span');
      label.className = 'chart-label';
      label.textContent = point.label;
      column.append(bar, label);
      fragment.appendChild(column);
    });

    chart.replaceChildren(fragment);
    chart.setAttribute('role', 'img');
    chart.setAttribute('aria-label', `${view.description} Total: ${currencyFormat.format(total)}.`);
    description.textContent = view.description;
    periodSummary.textContent = view.summary;
    const totalValue = document.createElement('strong');
    totalValue.textContent = rangeSelect.value === 'months' ? formatLakhs(total) : currencyFormat.format(total);
    periodSummary.appendChild(totalValue);
  }

  function renderDashboard() {
    const now = new Date();
    document.getElementById('active-members-value').textContent =
      numberFormat.format(dashboardData.activeMembers);
    document.getElementById('check-ins-value').textContent =
      numberFormat.format(dashboardData.checkInsToday);
    document.getElementById('capacity-value').textContent =
      `\u2191 ${Math.round(dashboardData.checkInsToday / dashboardData.floorCapacity * 100)}% Floor Capacity`;
    document.getElementById('collections-value').textContent =
      formatLakhs(dashboardData.monthlyCollections);
    document.getElementById('renewals-value').textContent =
      numberFormat.format(dashboardData.expiringRenewals);
    renderChart(now);
  }

  function refreshDashboard() {
    renderDashboard();
    updateClock();
    updatedStatus.textContent = `Sample data · refreshed ${dateTimeFormat.format(new Date())}`;
    refreshButton.textContent = 'Updated';
    refreshButton.disabled = true;
    window.clearTimeout(refreshTimeout);
    refreshTimeout = window.setTimeout(() => {
      refreshButton.textContent = 'Refresh';
      refreshButton.disabled = false;
    }, 1000);
  }

  rangeSelect.addEventListener('change', () => renderChart(new Date()));
  refreshButton.addEventListener('click', refreshDashboard);
  renderDashboard();
  updateClock();
  window.setInterval(updateClock, 1000);
})();
