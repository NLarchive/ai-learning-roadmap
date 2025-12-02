/**
 * Network View Component
 * Force-directed network graph using vis.js
 * Shows course relationships, prerequisites, and recommended paths
 */

const NetworkView = (() => {
  let container = null;
  let data = null;
  let network = null;
  let nodes = null;
  let edges = null;

  const colors = {
    trunk: { background: '#4CAF50', border: '#388E3C', highlight: { background: '#66BB6A', border: '#2E7D32' } },
    builder: { background: '#2196F3', border: '#1976D2', highlight: { background: '#42A5F5', border: '#1565C0' } },
    researcher: { background: '#9C27B0', border: '#7B1FA2', highlight: { background: '#AB47BC', border: '#6A1B9A' } },
    enterprise: { background: '#FF9800', border: '#F57C00', highlight: { background: '#FFA726', border: '#E65100' } },
    default: { background: '#667eea', border: '#5a67d8', highlight: { background: '#818cf8', border: '#4f46e5' } }
  };

  const difficultyShapes = {
    'Beginner': 'dot',
    'Intermediate': 'diamond',
    'Advanced': 'star'
  };

  async function init(containerElement) {
    container = containerElement;
    await loadVisJs();
    injectStyles();
  }

  async function loadVisJs() {
    if (window.vis) return;

    return new Promise((resolve, reject) => {
      // Load vis-network CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://unpkg.com/vis-network@9.1.6/styles/vis-network.min.css';
      document.head.appendChild(link);

      // Load vis-network JS
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/vis-network@9.1.6/standalone/umd/vis-network.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function injectStyles() {
    if (document.getElementById('network-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'network-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/network-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="network-loading">
        <div class="network-spinner"></div>
        <p>Building network graph...</p>
      </div>
    `;

    try {
      await loadVisJs();
      data = await DataLoader.loadProcessedData();
      renderNetwork();
    } catch (error) {
      console.error('NetworkView render error:', error);
      container.innerHTML = `
        <div class="network-error">
          <p>❌ Failed to load network visualization</p>
          <button onclick="NetworkView.refresh()">Retry</button>
        </div>
      `;
    }
  }

  function buildGraphData() {
    const { courses, paths } = data;
    const nodesList = [];
    const edgesList = [];
    const coursesMap = new Map(courses.map(c => [c.id, c]));

    // Create course nodes
    courses.forEach(course => {
      const primaryPath = course.career_paths?.[0] || 'default';
      // derive color from processed path config when available
      const pathCfg = data.paths && data.paths[primaryPath];
      const colorHex = (pathCfg && pathCfg.color) || (colors[primaryPath] && colors[primaryPath].background) || colors.default.background;
      const borderHex = Utils.adjustColor(colorHex, -40);
      const highlightBg = Utils.hexToRgba(colorHex, 0.9);
      const shape = difficultyShapes[course.difficulty] || 'dot';
      
      nodesList.push({
        id: course.id,
        label: truncateLabel(course.title, 25),
        title: buildTooltip(course),
        group: primaryPath,
        shape: shape,
        size: 15 + Math.min(course.duration_hours || 1, 20),
        color: {
          background: colorHex,
          border: borderHex,
          highlight: { background: highlightBg, border: Utils.adjustColor(colorHex, -20) }
        },
        font: { size: 11, color: '#333', face: 'Inter, sans-serif' },
        course: course
      });

      // Create prerequisite edges
      if (course.prerequisites) {
        course.prerequisites.forEach(prereqId => {
          if (coursesMap.has(prereqId)) {
            edgesList.push({
              from: prereqId,
              to: course.id,
              arrows: 'to',
              color: { color: '#94a3b8', highlight: '#64748b' },
              width: 2,
              dashes: false,
              title: 'Prerequisite'
            });
          }
        });
      }

      // Create recommended edges (lighter, dashed)
      if (course.recommended_next) {
        course.recommended_next.forEach(nextId => {
          if (coursesMap.has(nextId)) {
            edgesList.push({
              from: course.id,
              to: nextId,
              arrows: 'to',
              color: { color: '#cbd5e1', highlight: '#94a3b8' },
              width: 1,
              dashes: [5, 5],
              title: 'Recommended'
            });
          }
        });
      }
    });

    return { nodes: nodesList, edges: edgesList };
  }

  function truncateLabel(text, maxLen) {
    if (!text || text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
  }

  function buildTooltip(course) {
    return `
      <div class="network-tooltip">
        <strong>${course.title}</strong>
        <br><span class="tooltip-meta">${course.difficulty || 'N/A'} · ${course.duration_hours || 0}h</span>
        <br><span class="tooltip-partner">${course.partner || ''}</span>
        <br><span class="tooltip-desc">${course.description || ''}</span>
      </div>
    `;
  }

  function renderNetwork() {
    container.innerHTML = `
      <div class="network-container">
        <div class="network-header">
          <h2>🕸️ Course Dependency Network</h2>
          <div class="network-controls">
            <button id="network-fit" class="control-btn">📐 Fit</button>
            <button id="network-physics" class="control-btn active">⚡ Physics</button>
            <select id="network-filter" class="control-select">
              <option value="all">All Paths</option>
              <option value="trunk">🌳 Common Core</option>
              <option value="builder">🔧 Builder</option>
              <option value="researcher">🔬 Researcher</option>
              <option value="enterprise">🏢 Enterprise</option>
            </select>
          </div>
        </div>
        
        <div class="network-wrapper">
          <div id="network-graph"></div>
          <div id="network-panel" class="network-panel hidden">
            <button class="panel-close" onclick="NetworkView.closePanel()">×</button>
            <div id="panel-content"></div>
          </div>
        </div>
        
        <div class="network-legend">
          <div class="legend-section">
            <span class="legend-title">Career Paths:</span>
            <div class="legend-item"><span class="legend-dot" style="background: ${data.paths?.trunk?.color || colors.trunk.background}"></span> Common Core</div>
            <div class="legend-item"><span class="legend-dot" style="background: ${data.paths?.builder?.color || colors.builder.background}"></span> Builder</div>
            <div class="legend-item"><span class="legend-dot" style="background: ${data.paths?.researcher?.color || colors.researcher.background}"></span> Researcher</div>
            <div class="legend-item"><span class="legend-dot" style="background: ${data.paths?.enterprise?.color || colors.enterprise.background}"></span> Enterprise</div>
          </div>
          <div class="legend-section">
            <span class="legend-title">Difficulty:</span>
            <div class="legend-item"><span class="legend-shape">●</span> Beginner</div>
            <div class="legend-item"><span class="legend-shape">◆</span> Intermediate</div>
            <div class="legend-item"><span class="legend-shape">★</span> Advanced</div>
          </div>
          <div class="legend-section">
            <span class="legend-title">Edges:</span>
            <div class="legend-item"><span class="legend-line solid"></span> Prerequisite</div>
            <div class="legend-item"><span class="legend-line dashed"></span> Recommended</div>
          </div>
        </div>
      </div>
    `;

    const graphContainer = document.getElementById('network-graph');
    const graphData = buildGraphData();

    nodes = new vis.DataSet(graphData.nodes);
    edges = new vis.DataSet(graphData.edges);

    const options = {
      nodes: {
        borderWidth: 2,
        shadow: { enabled: true, size: 5, x: 2, y: 2 },
        // vis-network expects boolean or allowed values for `inherit`; avoid invalid legacy strings.
        // We explicitly disable global color inheritance since nodes are individually colored below.
        color: { inherit: false },
        widthConstraint: { minimum: 30, maximum: 150 }
      },
      edges: {
        smooth: { type: 'cubicBezier', forceDirection: 'horizontal', roundness: 0.4 },
        shadow: { enabled: true, size: 3 }
      },
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -3000,
          centralGravity: 0.3,
          springLength: 150,
          springConstant: 0.04,
          damping: 0.09
        },
        stabilization: { iterations: 100 }
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        hideEdgesOnDrag: true,
        navigationButtons: true,
        keyboard: true
      },
      layout: {
        improvedLayout: true
      }
    };

    network = new vis.Network(graphContainer, { nodes, edges }, options);

    // Event listeners
    network.on('click', handleNodeClick);
    network.on('stabilizationIterationsDone', () => {
      network.setOptions({ physics: { enabled: true } });
    });

    // Control buttons
    document.getElementById('network-fit').addEventListener('click', () => {
      network.fit({ animation: true });
    });

    document.getElementById('network-physics').addEventListener('click', (e) => {
      const btn = e.target;
      const enabled = !btn.classList.contains('active');
      btn.classList.toggle('active', enabled);
      network.setOptions({ physics: { enabled } });
    });

    document.getElementById('network-filter').addEventListener('change', (e) => {
      filterByPath(e.target.value);
    });
  }

  function handleNodeClick(params) {
    if (params.nodes.length === 0) {
      closePanel();
      return;
    }

    const nodeId = params.nodes[0];
    const node = nodes.get(nodeId);
    if (!node || !node.course) return;

    showCoursePanel(node.course);

    // Highlight connected nodes
    const connectedNodes = network.getConnectedNodes(nodeId);
    const allNodes = nodes.get();
    
    allNodes.forEach(n => {
      if (n.id === nodeId) {
        nodes.update({ id: n.id, opacity: 1, font: { ...n.font, size: 14, bold: true } });
      } else if (connectedNodes.includes(n.id)) {
        nodes.update({ id: n.id, opacity: 1 });
      } else {
        nodes.update({ id: n.id, opacity: 0.2 });
      }
    });
  }

  function showCoursePanel(course) {
    const panel = document.getElementById('network-panel');
    const content = document.getElementById('panel-content');
    
    content.innerHTML = `
      <h3>${course.title}</h3>
      <div class="panel-meta">
        <span class="badge ${(course.difficulty || 'beginner').toLowerCase()}">${course.difficulty || 'N/A'}</span>
        <span class="duration">⏱️ ${course.duration_hours || 0}h</span>
        <span class="partner">${course.partner || ''}</span>
      </div>
      <p class="panel-desc">${course.description || ''}</p>
      
      ${course.skills_gained?.length ? `
        <div class="panel-section">
          <h4>Skills Gained</h4>
          <div class="skill-tags">
            ${course.skills_gained.map(s => `<span class="skill">${s}</span>`).join('')}
          </div>
        </div>
      ` : ''}
      
      ${course.prerequisites?.length ? `
        <div class="panel-section">
          <h4>Prerequisites</h4>
          <ul class="prereq-list">
            ${course.prerequisites.map(p => {
              const prereq = data.coursesMap.get(p);
              return prereq ? `<li onclick="NetworkView.focusNode('${p}')">${prereq.title}</li>` : '';
            }).join('')}
          </ul>
        </div>
      ` : ''}
      
      ${course.recommended_next?.length ? `
        <div class="panel-section">
          <h4>Recommended Next</h4>
          <ul class="next-list">
            ${course.recommended_next.map(n => {
              const next = data.coursesMap.get(n);
              return next ? `<li onclick="NetworkView.focusNode('${n}')">${next.title}</li>` : '';
            }).join('')}
          </ul>
        </div>
      ` : ''}
      
      <a href="${course.url || '#'}" target="_blank" rel="noopener" class="panel-link">
        Open Course →
      </a>
    `;
    
    panel.classList.remove('hidden');
  }

  function closePanel() {
    const panel = document.getElementById('network-panel');
    panel.classList.add('hidden');
    
    // Reset node opacity
    const allNodes = nodes.get();
    allNodes.forEach(n => {
      nodes.update({ id: n.id, opacity: 1, font: { ...n.font, size: 11, bold: false } });
    });
  }

  function focusNode(nodeId) {
    network.focus(nodeId, {
      scale: 1.5,
      animation: { duration: 500, easingFunction: 'easeInOutQuad' }
    });
    network.selectNodes([nodeId]);
    
    const node = nodes.get(nodeId);
    if (node?.course) {
      showCoursePanel(node.course);
    }
  }

  function filterByPath(pathId) {
    const allNodes = nodes.get();
    
    if (pathId === 'all') {
      allNodes.forEach(n => {
        nodes.update({ id: n.id, hidden: false });
      });
    } else {
      allNodes.forEach(n => {
        const inPath = n.course?.career_paths?.includes(pathId);
        nodes.update({ id: n.id, hidden: !inPath });
      });
    }
    
    network.fit({ animation: true });
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  return {
    init,
    render,
    refresh,
    focusNode,
    closePanel
  };
})();

window.NetworkView = NetworkView;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = NetworkView;
}
