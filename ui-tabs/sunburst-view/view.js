/**
 * Sunburst View Component
 * Hierarchical radial visualization using D3.js
 * Shows: Root -> Career Paths -> Stages -> Courses
 */

const SunburstView = (() => {
  let container = null;
  let data = null;
  let svg = null;
  let width = 800;
  let height = 800;
  let radius = 0;

  const colors = {
    root: '#667eea',
    trunk: '#4CAF50',
    builder: '#2196F3',
    researcher: '#9C27B0',
    enterprise: '#FF9800'
  };

  async function init(containerElement) {
    container = containerElement;
    await loadD3();
    injectStyles();
  }

  async function loadD3() {
    if (window.d3) return;
    
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://d3js.org/d3.v7.min.js';
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function injectStyles() {
    if (document.getElementById('sunburst-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'sunburst-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/sunburst-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="sunburst-loading">
        <div class="sunburst-spinner"></div>
        <p>Building sunburst chart...</p>
      </div>
    `;

    try {
      await loadD3();
      data = await DataLoader.loadProcessedData();
      renderSunburst();
    } catch (error) {
      console.error('SunburstView render error:', error);
      container.innerHTML = `
        <div class="sunburst-error">
          <p>❌ Failed to load sunburst visualization</p>
          <button onclick="SunburstView.refresh()">Retry</button>
        </div>
      `;
    }
  }

  function buildHierarchy() {
    const { paths, courses } = data;
    
    const hierarchy = {
      name: 'AI Learning Roadmap',
      children: []
    };

    // Build tree from paths -> stages -> courses
    Object.keys(paths).forEach(pathId => {
      const path = paths[pathId];
      if (!path.stages) return;

      const pathNode = {
        name: path.name,
        pathId: pathId,
        color: path.color || colors[pathId],
        children: []
      };

      path.stages.forEach(stage => {
        const stageNode = {
          name: stage.name,
          pathId: pathId,
          isStage: true,
          children: []
        };

        if (stage.courses && Array.isArray(stage.courses)) {
          // stage.courses may be strings (course IDs) or full objects
          stage.courses.forEach(courseRef => {
            let courseObj = null;
            if (typeof courseRef === 'string') {
              courseObj = data.coursesMap.get(courseRef);
            } else if (courseRef && typeof courseRef === 'object') {
              courseObj = courseRef;
            }

            if (courseObj) {
              stageNode.children.push({
                name: courseObj.title || courseRef,
                course: courseObj,
                pathId: pathId,
                value: courseObj.duration_hours || 1
              });
            } else {
              // fallback to ID if object missing
              stageNode.children.push({
                name: typeof courseRef === 'string' ? courseRef : (courseRef && courseRef.title) || 'Course',
                course: null,
                pathId: pathId,
                value: 1
              });
            }
          });
        }

        if (stageNode.children.length > 0) {
          pathNode.children.push(stageNode);
        }
      });

      if (pathNode.children.length > 0) {
        hierarchy.children.push(pathNode);
      }
    });

    return hierarchy;
  }

  function renderSunburst() {
    const containerRect = container.getBoundingClientRect();
    width = Math.min(containerRect.width - 40, 900);
    height = Math.min(window.innerHeight - 200, 900);
    radius = Math.min(width, height) / 2;

    const hierarchyData = buildHierarchy();

    container.innerHTML = `
      <div class="sunburst-container">
        <div class="sunburst-header">
          <h2>🌞 Career Path Sunburst</h2>
          <p class="sunburst-subtitle">Click segments to zoom in • Click center to zoom out</p>
        </div>
        <div class="sunburst-wrapper">
          <div id="sunburst-chart"></div>
          <div id="sunburst-tooltip" class="sunburst-tooltip"></div>      
        </div>
        <div class="sunburst-controls" id="sunburst-controls">
          <label>Highlight Path:</label>
          <select id="sunburst-path-filter" onchange="SunburstView.filterByPath(this.value)">
            <option value="all">All Paths</option>
            <option value="trunk">🌳 Common Core</option>
            <option value="builder">🔧 Builder</option>
            <option value="researcher">🔬 Researcher</option>
            <option value="enterprise">🏢 Enterprise</option>
          </select>
          <button id="sunburst-zoom-reset" onclick="SunburstView.resetZoom()">🔄 Reset Zoom</button>
        </div>
        <div class="sunburst-legend" id="sunburst-legend"></div>
        <div class="sunburst-breadcrumb" id="sunburst-breadcrumb"></div>
      </div>
    `;

    const chartContainer = container.querySelector('#sunburst-chart');
    
    // Create D3 partition layout
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value || 0)
      .sort((a, b) => b.value - a.value);

    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    partition(root);

    const arc = d3.arc()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    svg = d3.select(chartContainer)
      .append('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [-width / 2, -height / 2, width, height])
      .style('font', '12px sans-serif');

    // Add arcs
    const paths = svg.append('g')
      .selectAll('path')
      .data(root.descendants().filter(d => d.depth))
      .join('path')
      .attr('fill', d => getColor(d))
      .attr('fill-opacity', d => arcOpacity(d))
      .attr('d', arc)
      .style('cursor', 'pointer')
      .on('mouseover', handleMouseOver)
      .on('mouseout', handleMouseOut)
      .on('click', handleClick);

    // Add labels for larger segments
    const labels = svg.append('g')
      .attr('pointer-events', 'none')
      .attr('text-anchor', 'middle')
      .selectAll('text')
      .data(root.descendants().filter(d => d.depth && (d.x1 - d.x0) > 0.04))
      .join('text')
      .attr('transform', d => labelTransform(d))
      .attr('dy', '0.35em')
      .attr('fill', d => d.depth > 1 ? '#fff' : '#333')
      .attr('font-size', d => d.depth === 1 ? '12px' : (d.depth === 2 ? '10px' : '9px'))
      .attr('font-weight', d => d.depth === 1 ? '600' : '400')
      .text(d => truncateLabel(d.data.name, d.x1 - d.x0));

    // Center circle
    svg.append('circle')
      .attr('r', radius * 0.15)
      .attr('fill', colors.root)
      .attr('cursor', 'pointer')
      .on('click', () => zoomTo(root));

    svg.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.35em')
      .attr('fill', 'white')
      .attr('font-weight', 'bold')
      .text('🤖 AI');

    renderLegend();
  }

  function getColor(d) {
    // Find the path ancestor
    let node = d;
    while (node.depth > 1) node = node.parent;
    
    if (node.depth === 1 && node.data.pathId) {
      // prefer configured path color when available from processed data
      const configured = (data.paths && data.paths[node.data.pathId] && data.paths[node.data.pathId].color) || colors[node.data.pathId];
      return configured || colors.root;
    }
    return colors.root;
  }

  function arcOpacity(d) {
    // Darker for paths, lighter for stages, medium for courses
    if (d.depth === 1) return 1;
    if (d.depth === 2) return 0.75;
    return 0.5 + (0.3 * Math.random()); // Slight variation for courses
  }

  function labelTransform(d) {
    const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
    const y = (d.y0 + d.y1) / 2;
    return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
  }

  function truncateLabel(text, angle) {
    if (!text) return '';
    const maxLen = Math.floor(angle * 15);
    return text.length > maxLen ? text.slice(0, maxLen - 1) + '…' : text;
  }

  function handleMouseOver(event, d) {
    const tooltip = document.getElementById('sunburst-tooltip');
    const course = d.data.course;
    
    let content = `<strong>${d.data.name}</strong>`;
    
    if (course) {
      content += `
        <br><span class="tooltip-meta">${course.difficulty || 'N/A'} · ${course.duration_hours || 0}h</span>
        <br><span class="tooltip-desc">${course.description || ''}</span>
      `;
    } else if (d.depth === 1) {
      content += `<br><span class="tooltip-meta">${d.children?.length || 0} stages</span>`;
    } else if (d.depth === 2) {
      content += `<br><span class="tooltip-meta">${d.children?.length || 0} courses</span>`;
    }
    
    tooltip.innerHTML = content;
    tooltip.style.opacity = 1;
    tooltip.style.left = (event.pageX + 15) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';

    // Highlight path
    d3.select(event.target).attr('fill-opacity', 1);
    
    // Update breadcrumb
    updateBreadcrumb(d);
  }

  function handleMouseOut(event, d) {
    const tooltip = document.getElementById('sunburst-tooltip');
    tooltip.style.opacity = 0;
    
    d3.select(event.target).attr('fill-opacity', arcOpacity(d));
  }

  function handleClick(event, d) {
    if (d.data.course && d.data.course.url) {
      window.open(d.data.course.url, '_blank');
    }
  }

  function zoomTo(d) {
    // Future enhancement: implement zoom animation
    console.log('Zoom to:', d.data.name);
  }

  function filterByPath(pathId) {
    const arcs = document.querySelectorAll('path');
    const labels = document.querySelectorAll('text');

    arcs.forEach(arc => {
      // reset opacity
      arc.style.opacity = 1;
      arc.style.filter = 'none';
    });

    if (pathId === 'all') {
      // show all
      arcs.forEach(arc => {
        arc.style.opacity = 1;
        arc.style.filter = 'brightness(1)';
      });
    } else {
      // dim all, highlight matching path
      arcs.forEach((arc, idx) => {
        const datum = arc.__data__;
        if (!datum) return;
        
        // find if this arc is part of the selected path
        let node = datum;
        while (node.depth > 1) node = node.parent;
        
        const inPath = node.depth === 1 && node.data.pathId === pathId;
        arc.style.opacity = inPath ? 1 : 0.15;
        arc.style.filter = inPath ? 'brightness(1.2)' : 'brightness(0.8)';
      });
    }
  }

  function resetZoom() {
    // Reset to root level if zoomed in, or clear filter
    if (svg) {
      const root = d3.hierarchy(buildHierarchy())
        .sum(d => d.value || 0)
        .sort((a, b) => b.value - a.value);
      
      // Optionally re-render or just reset zoom
      const transform = d3.zoomIdentity.translate(width / 2, height / 2);
      svg.transition().duration(500).call(d3.zoom().transform, transform);
    }
    
    // reset filter
    document.getElementById('sunburst-path-filter').value = 'all';
    filterByPath('all');
  }

  function updateBreadcrumb(d) {
    const breadcrumb = document.getElementById('sunburst-breadcrumb');
    const ancestors = d.ancestors().reverse();
    
    breadcrumb.innerHTML = ancestors.map((node, i) => {
      const isLast = i === ancestors.length - 1;
      return `<span class="crumb ${isLast ? 'active' : ''}">${node.data.name}</span>`;
    }).join('<span class="crumb-separator">›</span>');
  }

  function renderLegend() {
    const legend = document.getElementById('sunburst-legend');
    const pathIds = ['trunk', 'builder', 'researcher', 'enterprise'];
    
    legend.innerHTML = pathIds.map(pathId => {
      const path = data.paths[pathId];
      if (!path) return '';
      return `
        <div class="legend-item">
          <span class="legend-color" style="background: ${path.color || colors[pathId]}"></span>
          <span class="legend-label">${path.icon || ''} ${path.name}</span>
        </div>
      `;
    }).join('');
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  return {
    init,
    render,
    refresh,
    filterByPath,
    resetZoom
  };
})();

window.SunburstView = SunburstView;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = SunburstView;
}
