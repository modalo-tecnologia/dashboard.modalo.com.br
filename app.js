document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');

  const clientInfo = document.getElementById('client-info');
  const dStatus = document.getElementById('delivery-status');
  const dContent = document.getElementById('dashboard-content');

  // Chart References
  let statusChartInstance = null;
  let categoryChartInstance = null;

  if (!token) {
    clientInfo.textContent = "Modo de Demonstração";
    renderDemoDashboard();
    return;
  }

  // Parse Token: {name}_{YYYYMMDD}
  const parts = token.split('_');
  if (parts.length < 2) {
    clientInfo.textContent = "Token Inválido";
    showProgress(0, "Erro no parâmetro de acesso.");
    return;
  }

  const clientName = parts[0];
  const dateStr = parts[parts.length - 1]; // In case name has underscores
  
  if (dateStr.length !== 8) {
    clientInfo.textContent = "Formato de data incorreto";
    showProgress(0, "A data deve ser no formato YYYYMMDD");
    return;
  }

  clientInfo.textContent = `Cliente: ${clientName.toUpperCase()}`;

  // Parse delivery date
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  const deliveryDate = new Date(year, month, day);
  const today = new Date();
  
  const isPast = deliveryDate < today;
  
  // Try to fetch data
  // Try to fetch data
  try {
    const response = await fetch('https://api.modalo.com.br/api/dashboard', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    });
    const result = await response.json();

    if (result.success && result.data && result.data.totalLogs > 0) {
      // We have data -> Show dashboard
      renderDashboard(result.data);
    } else {
      // No data or error
      handleNoData(isPast, deliveryDate, today);
    }
  } catch (err) {
    console.error("Fetch Error:", err);
    handleNoData(isPast, deliveryDate, today);
  }
});

function handleNoData(isPast, deliveryDate, today) {
  if (isPast) {
    // Past date but no data yet
    showProgress(95, "Fazendo ajustes finais na sua solução. Quase pronto!");
  } else {
    // Future date
    const diffTime = Math.abs(deliveryDate - today);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // Fallback pseudo-calculation for progress assuming a 30-day standard delivery timeframe
    let percent = Math.max(0, 100 - (diffDays / 30) * 100);
    if (percent > 99) percent = 99;
    if (percent < 5) percent = 5;

    showProgress(percent, `Faltam aproximadamente ${diffDays} dia(s) para a entrega.`);
  }
}

function showProgress(percentage, message) {
  const dStatus = document.getElementById('delivery-status');
  const dContent = document.getElementById('dashboard-content');
  
  dStatus.classList.remove('hidden');
  dContent.classList.add('hidden');

  document.getElementById('delivery-subtitle').textContent = message;
  
  setTimeout(() => {
    document.getElementById('progress-bar').style.width = percentage + '%';
    document.getElementById('progress-text').textContent = Math.round(percentage) + '%';
  }, 100);
}

function renderDemoDashboard() {
  const demoData = {
    totalLogs: 1542,
    statusDistribution: [
        { status_negocio: "Lead Quente", count: 320 },
        { status_negocio: "Venda Concluída", count: 150 },
        { status_negocio: "Desqualificado", count: 800 },
        { status_negocio: "Geral", count: 272 }
    ],
    categoryDistribution: [
        { categoria: "WhatsApp", count: 1200 },
        { categoria: "Email", count: 342 }
    ],
    recentLogs: [
        { timestamp: new Date().toISOString(), status_negocio: "Lead Quente", dados_brutos: '{"msg": "Quero comprar o plano anual"}' }
    ]
  };
  renderDashboard(demoData);
}

function renderDashboard(data) {
  const dStatus = document.getElementById('delivery-status');
  const dContent = document.getElementById('dashboard-content');
  
  dStatus.classList.add('hidden');
  dContent.classList.remove('hidden');

  // KPIs
  document.getElementById('kpi-total').textContent = data.totalLogs;
  
  let converted = 0;
  let potentials = 0;
  
  const statusLabels = [];
  const statusCounts = [];
  
  data.statusDistribution.forEach(item => {
    statusLabels.push(item.status_negocio);
    statusCounts.push(item.count);
    
    const lower = item.status_negocio.toLowerCase();
    if (lower.includes('venda') || lower.includes('concluída') || lower.includes('sucesso')) {
        converted += item.count;
    }
    if (lower.includes('lead') || lower.includes('quente') || lower.includes('potencial')) {
        potentials += item.count;
    }
  });

  document.getElementById('kpi-potenciais').textContent = potentials;
  
  // Conversion Rate (converted relative to potentials + converted)
  const baseForConversion = potentials + converted;
  const rate = baseForConversion > 0 ? ((converted / baseForConversion) * 100).toFixed(1) : 0;
  document.getElementById('kpi-taxa').textContent = rate + '%';

  // Charts Config
  Chart.defaults.color = "#94a3b8";
  
  // Status Chart (Doughnut)
  const ctxStatus = document.getElementById('statusChart').getContext('2d');
  new Chart(ctxStatus, {
    type: 'doughnut',
    data: {
      labels: statusLabels,
      datasets: [{
        data: statusCounts,
        backgroundColor: ['#3b82f6', '#10b981', '#8b5cf6', '#ef4444', '#f59e0b', '#64748b'],
        borderWidth: 0,
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'right' }
      }
    }
  });

  // Category Chart (Bar)
  const catLabels = [];
  const catCounts = [];
  data.categoryDistribution.forEach(item => {
    catLabels.push(item.categoria);
    catCounts.push(item.count);
  });

  const ctxCategory = document.getElementById('categoryChart').getContext('2d');
  new Chart(ctxCategory, {
    type: 'bar',
    data: {
      labels: catLabels,
      datasets: [{
        label: 'Operações por Categoria',
        data: catCounts,
        backgroundColor: '#3b82f6',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
        x: { grid: { display: false } }
      }
    }
  });

  // Table Data
  const tBody = document.getElementById('table-body');
  tBody.innerHTML = '';
  data.recentLogs.forEach(log => {
    const tr = document.createElement('tr');
    
    // Format date
    const d = new Date(log.timestamp);
    const dateStr = d.toLocaleString('pt-BR');
    
    // Shorten data
    let dataSnippet = log.dados_brutos;
    if (dataSnippet && dataSnippet.length > 50) {
      dataSnippet = dataSnippet.substring(0, 50) + '...';
    }

    tr.innerHTML = `
      <td>${dateStr}</td>
      <td><span style="background: rgba(255,255,255,0.1); padding: 4px 8px; border-radius: 4px;">${log.status_negocio}</span></td>
      <td class="text-muted" style="font-family: monospace; font-size: 0.8rem;">${dataSnippet}</td>
    `;
    tBody.appendChild(tr);
  });
}
