/**
 * Graph View Component
 * Displays courses as connected nodes showing prerequisites and relationships
 */

const GraphView = (() => {
  let container = null;
  let nodes = [];
  let edges = [];
  let canvas = null;
  let ctx = null;
  let isDragging = false;
  let dragNode = null;
  let offset = { x: 0, y: 0 };

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
  }

  /**
   * Render the graph view
   */
  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">Building course graph...</span>
      </div>
    `;

    try {
      const data = await DataLoader.loadCourses();
      const courses = data.courses || [];

      // Build nodes and edges
      buildGraph(courses);

      container.innerHTML = `
        <div class="graph-controls">
          <button class="graph-btn" id="graph-reset">🔄 Reset Layout</button>
          <button class="graph-btn" id="graph-zoom-in">➕ Zoom In</button>
          <button class="graph-btn" id="graph-zoom-out">➖ Zoom Out</button>
          <select class="filter-select" id="graph-path-filter">
            <option value="">All Paths</option>
            <option value="trunk">Common Core</option>
            <option value="builder">Builder Path</option>
            <option value="researcher">Researcher Path</option>
            <option value="enterprise">Enterprise Path</option>
          </select>
        </div>
        <div class="graph-container" id="graph-canvas-container">
          <canvas id="graph-canvas"></canvas>
          <div class="graph-nodes" id="graph-nodes"></div>
        </div>
        <div class="graph-legend">
          <span class="legend-item"><span class="legend-color" style="background: #4CAF50"></span> Core</span>
          <span class="legend-item"><span class="legend-color" style="background: #2196F3"></span> Builder</span>
          <span class="legend-item"><span class="legend-color" style="background: #9C27B0"></span> Researcher</span>
          <span class="legend-item"><span class="legend-color" style="background: #FF9800"></span> Enterprise</span>
        </div>
      `;

      initCanvas();
      renderNodes();
      renderEdges();
      attachEventListeners();

    } catch (error) {
      container.innerHTML = `
        <div class="loading">
          <span class="loading-text">Error building graph. Please refresh.</span>
        </div>
      `;
      console.error('Error rendering graph view:', error);
    }
  }

  /**
   * Build graph data from courses
   */
  function buildGraph(courses) {
    nodes = [];
    edges = [];

    const pathColors = {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
    };

    // Create nodes
    courses.forEach((course, index) => {
      const primaryPath = course.career_paths?.[0] || 'trunk';
      const angle = (index / courses.length) * 2 * Math.PI;
      const radius = 200 + Math.random() * 100;

      nodes.push({
        id: course.id,
        title: course.title,
        x: 400 + Math.cos(angle) * radius,
        y: 300 + Math.sin(angle) * radius,
        color: pathColors[primaryPath] || '#666',
        paths: course.career_paths || [],
        prerequisites: course.prerequisites || [],
        recommended: course.recommended_next || [],
        url: course.url
      });
    });

    // Create edges for prerequisites
    nodes.forEach(node => {
      node.prerequisites.forEach(prereqId => {
        const prereqNode = nodes.find(n => n.id === prereqId);
        if (prereqNode) {
          edges.push({
            from: prereqId,
            to: node.id,
            type: 'prerequisite',
            color: '#999'
          });
        }
      });

      // Create edges for recommended next
      node.recommended.forEach(nextId => {
        const nextNode = nodes.find(n => n.id === nextId);
        if (nextNode) {
          edges.push({
            from: node.id,
            to: nextId,
            type: 'recommended',
            color: '#ddd'
          });
        }
      });
    });
  }

  /**
   * Initialize canvas
   */
  function initCanvas() {
    canvas = document.getElementById('graph-canvas');
    const containerEl = document.getElementById('graph-canvas-container');
    
    if (!canvas || !containerEl) return;

    canvas.width = containerEl.clientWidth;
    canvas.height = containerEl.clientHeight;
    ctx = canvas.getContext('2d');
  }

  /**
   * Render nodes as DOM elements
   */
  function renderNodes() {
    const nodesContainer = document.getElementById('graph-nodes');
    if (!nodesContainer) return;

    nodesContainer.innerHTML = nodes.map(node => `
      <div class="graph-node" 
           data-id="${node.id}"
           style="left: ${node.x}px; top: ${node.y}px; border-color: ${node.color};">
        ${truncate(node.title, 25)}
      </div>
    `).join('');
  }

  /**
   * Render edges on canvas
   */
  function renderEdges() {
    if (!ctx || !canvas) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (fromNode && toNode) {
        drawArrow(
          fromNode.x + 90, // Center of node
          fromNode.y + 15,
          toNode.x + 90,
          toNode.y + 15,
          edge.color,
          edge.type === 'prerequisite'
        );
      }
    });
  }

  /**
   * Draw an arrow between two points
   */
  function drawArrow(fromX, fromY, toX, toY, color, isDashed = false) {
    const headLength = 10;
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = isDashed ? 2 : 1;
    
    if (isDashed) {
      ctx.setLineDash([5, 5]);
    } else {
      ctx.setLineDash([]);
    }

    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrowhead
    ctx.beginPath();
    ctx.setLineDash([]);
    ctx.moveTo(toX, toY);
    ctx.lineTo(
      toX - headLength * Math.cos(angle - Math.PI / 6),
      toY - headLength * Math.sin(angle - Math.PI / 6)
    );
    ctx.lineTo(
      toX - headLength * Math.cos(angle + Math.PI / 6),
      toY - headLength * Math.sin(angle + Math.PI / 6)
    );
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    const nodesContainer = document.getElementById('graph-nodes');
    const resetBtn = document.getElementById('graph-reset');
    const pathFilter = document.getElementById('graph-path-filter');

    // Node drag handling
    if (nodesContainer) {
      nodesContainer.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Node click for opening course
      nodesContainer.addEventListener('dblclick', (e) => {
        const nodeEl = e.target.closest('.graph-node');
        if (nodeEl) {
          const node = nodes.find(n => n.id === nodeEl.dataset.id);
          if (node?.url) {
            window.open(node.url, '_blank');
          }
        }
      });
    }

    // Reset layout
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resetLayout();
      });
    }

    // Path filter
    if (pathFilter) {
      pathFilter.addEventListener('change', (e) => {
        filterByPath(e.target.value);
      });
    }
  }

  /**
   * Handle mouse down for dragging
   */
  function handleMouseDown(e) {
    const nodeEl = e.target.closest('.graph-node');
    if (nodeEl) {
      isDragging = true;
      dragNode = nodes.find(n => n.id === nodeEl.dataset.id);
      const rect = nodeEl.getBoundingClientRect();
      offset = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    }
  }

  /**
   * Handle mouse move for dragging
   */
  function handleMouseMove(e) {
    if (!isDragging || !dragNode) return;

    const containerRect = document.getElementById('graph-canvas-container').getBoundingClientRect();
    dragNode.x = e.clientX - containerRect.left - offset.x;
    dragNode.y = e.clientY - containerRect.top - offset.y;

    // Update node position
    const nodeEl = document.querySelector(`.graph-node[data-id="${dragNode.id}"]`);
    if (nodeEl) {
      nodeEl.style.left = `${dragNode.x}px`;
      nodeEl.style.top = `${dragNode.y}px`;
    }

    // Redraw edges
    renderEdges();
  }

  /**
   * Handle mouse up
   */
  function handleMouseUp() {
    isDragging = false;
    dragNode = null;
  }

  /**
   * Reset node layout
   */
  function resetLayout() {
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = 200 + Math.random() * 100;
      node.x = 400 + Math.cos(angle) * radius;
      node.y = 300 + Math.sin(angle) * radius;
    });
    renderNodes();
    renderEdges();
    attachEventListeners();
  }

  /**
   * Filter nodes by career path
   */
  function filterByPath(pathId) {
    const nodeEls = document.querySelectorAll('.graph-node');
    nodeEls.forEach(el => {
      const node = nodes.find(n => n.id === el.dataset.id);
      if (!pathId || (node && node.paths.includes(pathId))) {
        el.style.opacity = '1';
      } else {
        el.style.opacity = '0.2';
      }
    });
  }

  /**
   * Truncate text
   */
  function truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  }

  /**
   * Refresh the view
   */
  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  // Public API
  return {
    init,
    render,
    refresh
  };
})();
