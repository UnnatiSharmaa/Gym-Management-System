const data = {
  members: 1280,
  checkIns: 248,
  capacity: 345,
  collections: 482000,
  renewals: 34,
  months: [340000, 380000, 410000, 460000, 440000, 482000],
  days: [11000, 13000, 14000, 15000, 13000, 17000, 18000, 16000, 14000, 15000,
    13000, 17000, 19000, 16000, 15000, 14000, 18000, 17000, 16000, 15000,
    14000, 19000, 17000, 16000, 18000, 15000, 17000, 20000, 19000, 21000]
};

const range = document.getElementById('revenue-range');
const chart = document.getElementById('revenue-chart');
const summary = document.getElementById('revenue-period-summary');
const description = document.getElementById('revenue-description');
const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const money = value => '\u20B9' + value.toLocaleString('en-IN');
const lakhs = value => '\u20B9' + (value / 100000).toFixed(2) + 'L';
const dateLabel = date => date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

function updateClock() {
  const now = new Date();
  const hour = now.getHours();
  const shift = hour < 12 ? 'Morning' : hour < 17 ? 'Afternoon' : 'Evening';
  const clock = document.getElementById('system-clock');
  clock.textContent = now.toLocaleTimeString('en-IN') + ' | ' + shift + ' Lead';
  clock.dateTime = now.toISOString();
}

function getChartData() {
  const today = new Date();
  let labels = [];
  let values = [];
  let text;
  let totalText;

  if (range.value === 'months') {
    values = data.months;
    for (let i = 0; i < values.length; i++) {
      labels.push(monthNames[new Date(today.getFullYear(), today.getMonth() - 5 + i, 1).getMonth()]);
    }
    text = 'Consolidated fee collections over the last 6 months.';
    totalText = 'Total collected in 6 months: ';
  } else if (range.value === 'days30') {
    for (let start = 0; start < 30; start += 6) {
      let total = 0;
      for (let i = start; i < start + 6; i++) total += data.days[i];
      values.push(total);
      const from = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29 + start);
      const to = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 24 + start);
      labels.push(dateLabel(from) + ' - ' + dateLabel(to));
    }
    text = 'Fee collections grouped by 6-day periods over the last 30 days.';
    totalText = 'Total collected in 30 days: ';
  } else {
    values = data.days.slice(-7);
    for (let i = 6; i >= 0; i--) {
      labels.push(dateLabel(new Date(today.getFullYear(), today.getMonth(), today.getDate() - i)));
    }
    text = 'Daily fee collections over the last 7 days.';
    totalText = 'Total collected in 7 days: ';
  }

  return { labels, values, text, totalText };
}

function renderChart() {
  const chartData = getChartData();
  let total = 0;
  let highest = 0;

  for (let i = 0; i < chartData.values.length; i++) {
    total += chartData.values[i];
    if (chartData.values[i] > highest) highest = chartData.values[i];
  }

  let bars = '';
  for (let i = 0; i < chartData.values.length; i++) {
    const value = chartData.values[i];
    const height = Math.max(8, value / highest * 92);
    const color = i === chartData.values.length - 1 ? 'chart-bar chart-bar-alt' : 'chart-bar';
    const tooltip = value >= 100000 ? lakhs(value) : money(value);
    bars += `<div class="chart-column"><div class="${color}" style="height:${height}%" aria-label="${chartData.labels[i]}: ${money(value)}"><span class="bar-tooltip">${tooltip}</span></div><span class="chart-label">${chartData.labels[i]}</span></div>`;
  }

  chart.innerHTML = bars;
  chart.setAttribute('role', 'img');
  chart.setAttribute('aria-label', chartData.text + ' Total: ' + money(total) + '.');
  description.textContent = chartData.text;
  summary.innerHTML = chartData.totalText + '<strong>' +
    (range.value === 'months' ? lakhs(total) : money(total)) + '</strong>';
}

function renderDashboard() {
  document.getElementById('active-members-value').textContent = data.members.toLocaleString('en-IN');
  document.getElementById('check-ins-value').textContent = data.checkIns.toLocaleString('en-IN');
  document.getElementById('capacity-value').textContent =
    '\u2191 ' + Math.round(data.checkIns / data.capacity * 100) + '% Floor Capacity';
  document.getElementById('collections-value').textContent = lakhs(data.collections);
  document.getElementById('renewals-value').textContent = data.renewals.toLocaleString('en-IN');
  renderChart();
}

range.addEventListener('change', renderChart);
document.getElementById('refresh-dashboard').addEventListener('click', function () {
  renderDashboard();
  updateClock();
  document.getElementById('dashboard-updated').textContent =
    'Sample data - refreshed ' + new Date().toLocaleString('en-IN');
});

renderDashboard();
updateClock();
window.setInterval(updateClock, 1000);
