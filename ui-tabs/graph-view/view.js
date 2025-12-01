/**
 * Mind Map View Component
 * Displays courses as an interactive radial mind-map visualization
 * Features smooth interactions, tooltips, and clickable nodes
 */

const GraphView = (() => {
  let container = null;
  let data = null;
  let transform = { x: 0, y: 0, scale: 1 };
  let isDragging = false;
  let lastMouse = { x: 0, y: 0 };
  let showLabels = false;
  let modalSticky = false;
  let activeNode = null;

  // Layout configuration
  const config = {
    centerNodeSize: 50,
    pathNodeSize: 35,
    courseNodeSize: 10,
    pathRadius: 180,
    courseRadius: 100,
    colors: {
      trunk: { primary: '#4CAF50', secondary: '#81C784' },
      builder: { primary: '#2196F3', secondary: '#64B5F6' },
      researcher: { primary: '#9C27B0', secondary: '#BA68C8' },
      enterprise: { primary: '#FF9800', secondary: '#FFB74D' }
    },
    icons: {
      trunk: '🌳',
      builder: '🔧', 
      researcher: '🔬',
      enterprise: '🏢'
    }
  };

  async function init(containerElement) {
    container = containerElement;
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('graph-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'graph-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/graph-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = Utils.createLoadingSpinner('Building mind map...');

    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      data = { careerPaths, courses: coursesData.courses || [] };

      const canvasWidth = container.clientWidth || 900;
      const canvasHeight = 600;
      
      transform = { 
        x: canvasWidth / 2, 
        y: canvasHeight / 2, 
        scale: Math.min(canvasWidth / 1000, 1) 
      };

      container.innerHTML = `
        <div class="mindmap-wrapper">
          <div class="mindmap-header">
            <h2>🧠 AI Learning Mind Map</h2>
            <p>Explore the knowledge tree. Hover over nodes for details, click to open courses.</p>
            <div class="mindmap-controls">
              <button class="ctrl-btn" id="mm-zoom-in" title="Zoom In">+</button>
              <button class="ctrl-btn" id="mm-zoom-out" title="Zoom Out">−</button>
              <button class="ctrl-btn" id="mm-reset" title="Reset">↺</button>
              <button class="ctrl-btn" id="mm-labels" title="Toggle Labels">Aa</button>
            </div>
          </div>
          <div class="mindmap-legend">
            ${Object.entries(config.colors).map(([id, c]) => `
              <span class="legend-item">
                <span class="legend-dot" style="background:${c.primary}"></span>
                ${id.charAt(0).toUpperCase() + id.slice(1)}
              </span>
            `).join('')}
          </div>
          <div class="mindmap-viewport" id="mm-viewport">
            <div class="mindmap-canvas" id="mm-canvas">
              ${buildMindMap()}
            </div>
          </div>
          <div class="mindmap-tooltip" id="mm-tooltip"></div>
        </div>
      `;

      applyTransform();
      attachEventListeners();

    } catch (error) {
      console.error('Error rendering mind map:', error);
      container.innerHTML = Utils.createErrorMessage('Error', 'Failed to load mind map.');
    }
  }

  function buildMindMap() {
    const { careerPaths, courses } = data;
    const pathIds = ['trunk', 'builder', 'researcher', 'enterprise'];
    const pathAngles = { trunk: 270, builder: 0, researcher: 90, enterprise: 180 };
    
    let html = '';
    
    // Draw connections (SVG layer)
    html += `<svg class="connections-svg" viewBox="-400 -400 800 800">`;
    
    // Draw branches from center to path nodes
    pathIds.forEach(pathId => {
      const angle = pathAngles[pathId];
      const pos = pointOnCircle(0, 0, config.pathRadius, angle);
      const color = config.colors[pathId].primary;
      
      html += `<path class="branch-line" d="${curvePath(0, 0, pos.x, pos.y)}" 
                     stroke="${color}" stroke-width="3" fill="none"/>`;
      
      // Draw branches to courses
      const pathCourses = getPathCourses(pathId, careerPaths, courses);
      const fanSpread = Math.min(50, pathCourses.length * 6);
      
      pathCourses.forEach((course, i) => {
        const courseAngle = angle + (i - (pathCourses.length - 1) / 2) * (fanSpread / Math.max(1, pathCourses.length - 1));
        const radius = config.pathRadius + config.courseRadius + (i % 3) * 25;
        const coursePos = pointOnCircle(0, 0, radius, courseAngle);
        
        html += `<path class="course-line" d="${curvePath(pos.x, pos.y, coursePos.x, coursePos.y)}" 
                       stroke="${config.colors[pathId].secondary}" stroke-width="1.5" 
                       fill="none" opacity="0.5" stroke-dasharray="4,3"/>`;
      });
    });
    
    html += `</svg>`;
    
    // Central node
    html += `
      <div class="mm-node mm-center" style="--size:${config.centerNodeSize * 2}px">
        <span class="mm-icon">🤖</span>
        <span class="mm-label">AI Learning</span>
      </div>
    `;
    
    // Path nodes and course nodes
    pathIds.forEach(pathId => {
      const pathData = careerPaths[pathId];
      if (!pathData) return;
      
      const angle = pathAngles[pathId];
      const pos = pointOnCircle(0, 0, config.pathRadius, angle);
      const color = config.colors[pathId];
      const pathCourses = getPathCourses(pathId, careerPaths, courses);
      
      // Path node
      html += `
        <div class="mm-node mm-path" 
             style="--x:${pos.x}px; --y:${pos.y}px; --size:${config.pathNodeSize * 2}px; 
                    --color:${color.primary}; --color-light:${color.secondary}"
             data-path="${pathId}">
          <span class="mm-icon">${config.icons[pathId]}</span>
          <span class="mm-path-label">${pathData.name}</span>
          <span class="mm-count">${pathCourses.length}</span>
        </div>
      `;
      
      // Course nodes
      const fanSpread = Math.min(50, pathCourses.length * 6);
      pathCourses.forEach((course, i) => {
        const courseAngle = angle + (i - (pathCourses.length - 1) / 2) * (fanSpread / Math.max(1, pathCourses.length - 1));
        const radius = config.pathRadius + config.courseRadius + (i % 3) * 25;
        const coursePos = pointOnCircle(0, 0, radius, courseAngle);
        
        html += `
          <div class="mm-node mm-course" 
               style="--x:${coursePos.x}px; --y:${coursePos.y}px; --size:${config.courseNodeSize * 2}px;
                      --color:${color.primary}"
               data-id="${course.id}"
               data-url="${course.url || '#'}"
               data-title="${escapeHtml(course.title)}"
               data-desc="${escapeHtml(course.description || '')}"
               data-diff="${course.difficulty || 'Beginner'}"
               data-hours="${course.duration_hours || '?'}">
            <span class="mm-course-label">${Utils.truncate(course.title, 18)}</span>
          </div>
        `;
      });
    });
    
    return html;
  }

  function getPathCourses(pathId, careerPaths, courses) {
    const pathData = careerPaths[pathId];
    if (!pathData) return [];
    
    if (pathId === 'trunk' && pathData.courses) {
      return pathData.courses.map(c => courses.find(fc => fc.id === c.id)).filter(Boolean);
    } else if (pathData.stages) {
      const result = [];
      pathData.stages.forEach(stage => {
        (stage.courses || []).forEach(courseId => {
          const course = courses.find(c => c.id === courseId);
          if (course) result.push(course);
        });
      });
      return result;
    }
    return [];
  }

  function pointOnCircle(cx, cy, radius, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + radius * Math.cos(rad), y: cy + radius * Math.sin(rad) };
  }

  function curvePath(x1, y1, x2, y2) {
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const offset = dist * 0.12;
    const cx = mx + (-dy / dist) * offset;
    const cy = my + (dx / dist) * offset;
    return `M${x1},${y1} Q${cx},${cy} ${x2},${y2}`;
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  }

  function applyTransform() {
    const canvas = document.getElementById('mm-canvas');
    if (canvas) {
      canvas.style.transform = `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`;
    }
  }

  function attachEventListeners() {
    const viewport = document.getElementById('mm-viewport');
    const tooltip = document.getElementById('mm-tooltip');
    
    // Zoom controls
    document.getElementById('mm-zoom-in')?.addEventListener('click', () => {
      transform.scale = Math.min(transform.scale * 1.25, 3);
      applyTransform();
    });
    
    document.getElementById('mm-zoom-out')?.addEventListener('click', () => {
      transform.scale = Math.max(transform.scale / 1.25, 0.3);
      applyTransform();
    });
    
    document.getElementById('mm-reset')?.addEventListener('click', () => {
      transform = { x: viewport.clientWidth / 2, y: 300, scale: Math.min(viewport.clientWidth / 1000, 1) };
      applyTransform();
    });
    
    document.getElementById('mm-labels')?.addEventListener('click', () => {
      showLabels = !showLabels;
      document.querySelectorAll('.mm-course-label').forEach(l => {
        l.style.opacity = showLabels ? '1' : '';
      });
    });
    
    // Mouse wheel zoom
    viewport?.addEventListener('wheel', e => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      transform.scale = Math.max(0.3, Math.min(3, transform.scale * delta));
      applyTransform();
    }, { passive: false });
    
    // Pan
    viewport?.addEventListener('mousedown', e => {
      if (e.target === viewport || e.target.classList.contains('mindmap-canvas') || e.target.tagName === 'svg' || e.target.tagName === 'path') {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
        viewport.style.cursor = 'grabbing';
      }
    });
    
    document.addEventListener('mousemove', e => {
      if (isDragging) {
        transform.x += e.clientX - lastMouse.x;
        transform.y += e.clientY - lastMouse.y;
        lastMouse = { x: e.clientX, y: e.clientY };
        applyTransform();
      }
    });
    
    document.addEventListener('mouseup', () => {
      isDragging = false;
      if (viewport) viewport.style.cursor = 'grab';
    });
    
    // Course node interactions
    document.querySelectorAll('.mm-course').forEach(node => {
      node.addEventListener('mouseenter', e => {
        if (modalSticky) return; // Don't update if sticky
        
        const rect = node.getBoundingClientRect();
        tooltip.innerHTML = `
          <div class="tt-header">
            <strong>${node.dataset.title}</strong>
            <button class="tt-close" aria-label="Close">×</button>
          </div>
          <p>${Utils.truncate(node.dataset.desc, 120)}</p>
          <div class="tt-meta">
            <span>⏱ ${node.dataset.hours}h</span>
            <span>📊 ${node.dataset.diff}</span>
          </div>
          <a href="${node.dataset.url}" target="_blank" class="tt-link">Open Course →</a>
        `;
        
        // Add close button handler
        tooltip.querySelector('.tt-close')?.addEventListener('click', e => {
          e.stopPropagation();
          tooltip.classList.remove('visible');
          modalSticky = false;
          activeNode = null;
          document.querySelectorAll('.mm-course').forEach(n => n.classList.remove('hovered'));
        });
        
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.classList.add('visible');
        node.classList.add('hovered');
      });

      node.addEventListener('mouseleave', () => {
        if (!modalSticky) {
          tooltip.classList.remove('visible');
          node.classList.remove('hovered');
        }
      });

      node.addEventListener('click', e => {
        e.stopPropagation();
        
        // Dismiss previous sticky modal
        if (activeNode && activeNode !== node) {
          activeNode.classList.remove('hovered');
          document.querySelectorAll('.mm-course').forEach(n => n.classList.remove('hovered'));
        }
        
        // Make this modal sticky
        modalSticky = true;
        activeNode = node;
        
        const rect = node.getBoundingClientRect();
        tooltip.innerHTML = `
          <div class="tt-header">
            <strong>${node.dataset.title}</strong>
            <button class="tt-close" aria-label="Close">×</button>
          </div>
          <p>${Utils.truncate(node.dataset.desc, 120)}</p>
          <div class="tt-meta">
            <span>⏱ ${node.dataset.hours}h</span>
            <span>📊 ${node.dataset.diff}</span>
          </div>
          <a href="${node.dataset.url}" target="_blank" class="tt-link">🔗 Open Course</a>
        `;
        
        // Add close button handler
        tooltip.querySelector('.tt-close')?.addEventListener('click', e => {
          e.stopPropagation();
          tooltip.classList.remove('visible');
          modalSticky = false;
          activeNode = null;
          node.classList.remove('hovered');
        });
        
        // Make tooltip stay at modal position
        tooltip.classList.add('visible', 'sticky');
        tooltip.style.left = `${rect.right + 10}px`;
        tooltip.style.top = `${rect.top}px`;
        tooltip.style.pointerEvents = 'auto';
        node.classList.add('hovered');
      });
    });
    
    // Close modal when clicking elsewhere
    document.addEventListener('click', e => {
      if (modalSticky && e.target !== tooltip && !tooltip.contains(e.target)) {
        tooltip.classList.remove('visible');
        modalSticky = false;
        if (activeNode) activeNode.classList.remove('hovered');
        activeNode = null;
      }
    });
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  return { init, render, refresh };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = GraphView;
}
