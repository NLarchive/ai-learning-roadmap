/**
 * Tree View Component
 * Displays career paths as organic root system growing downward
 * Visual metaphor: trunk at top, roots spreading below
 */

const TreeView = (() => {
  let container = null;

  async function init(containerElement) {
    container = containerElement;
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('tree-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'tree-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/tree-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = Utils.createLoadingSpinner('Growing roots...');

    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      const courses = coursesData.courses || [];

      container.innerHTML = `
        <div class="roots-wrapper">
          <div class="roots-header">
            <h2>🌳 Knowledge Tree</h2>
            <p>Start from the trunk and let your knowledge spread through the roots.</p>
          </div>
          <div class="tree-visualization">
            ${renderTrunk(careerPaths.trunk, courses)}
            <div class="roots-container">
              ${renderRoot('builder', careerPaths.builder, courses)}
              ${renderRoot('researcher', careerPaths.researcher, courses)}
              ${renderRoot('enterprise', careerPaths.enterprise, courses)}
            </div>
          </div>
        </div>
      `;

      attachEventListeners();

    } catch (error) {
      console.error('Error rendering tree:', error);
      container.innerHTML = Utils.createErrorMessage('Error', 'Failed to load tree.');
    }
  }

  function renderTrunk(trunkData, courses) {
    if (!trunkData || !trunkData.courses) return '';

    const trunkCourses = trunkData.courses.map(c => {
      const full = courses.find(fc => fc.id === c.id);
      return { ...c, ...full };
    });

    return `
      <div class="trunk-section">
        <div class="trunk-label">
          <span class="trunk-icon">🌳</span>
          <span class="trunk-name">${trunkData.name}</span>
        </div>
        <div class="trunk-line"></div>
        <div class="trunk-nodes">
          ${trunkCourses.map((course, i) => `
            <div class="trunk-node" data-id="${course.id}">
              <div class="node-ring">${i + 1}</div>
              <a href="${course.url || '#'}" class="node-label" target="_blank" rel="noopener">
                ${course.title}
              </a>
            </div>
          `).join('')}
        </div>
        <div class="trunk-end">
          <div class="branch-point">●</div>
          <span>Choose your path</span>
        </div>
      </div>
    `;
  }

  function renderRoot(pathId, pathData, courses) {
    if (!pathData) return '';

    const colors = {
      builder: { main: '#2196F3', light: '#BBDEFB' },
      researcher: { main: '#9C27B0', light: '#E1BEE7' },
      enterprise: { main: '#FF9800', light: '#FFE0B2' }
    };
    const icons = { builder: '🔧', researcher: '🔬', enterprise: '🏢' };
    const color = colors[pathId] || { main: '#667eea', light: '#E8EAF6' };

    // Get all courses for this path
    let pathCourses = [];
    if (pathData.stages) {
      pathData.stages.forEach(stage => {
        (stage.courses || []).forEach(courseId => {
          const course = courses.find(c => c.id === courseId);
          if (course) pathCourses.push({ ...course, stageName: stage.name });
        });
      });
    }

    return `
      <div class="root-branch" style="--root-color: ${color.main}; --root-light: ${color.light}">
        <div class="root-header">
          <span class="root-icon">${icons[pathId] || '📚'}</span>
          <div class="root-info">
            <span class="root-name">${pathData.name}</span>
            <span class="root-count">${pathCourses.length} courses</span>
          </div>
        </div>
        <div class="root-line"></div>
        <div class="root-stages">
          ${renderStages(pathData.stages || [], courses, color.main)}
        </div>
        ${pathData.capstone ? `
          <div class="root-capstone">
            <span class="capstone-badge">🏆 Capstone</span>
            <p>${pathData.capstone}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderStages(stages, courses, color) {
    return stages.map(stage => {
      const stageCourses = (stage.courses || [])
        .map(id => courses.find(c => c.id === id))
        .filter(Boolean);

      return `
        <div class="stage-group">
          <div class="stage-label">${stage.name}</div>
          <div class="stage-nodes">
            ${stageCourses.map(course => `
              <a href="${course.url || '#'}" class="stage-node" target="_blank" rel="noopener" 
                 title="${course.title}">
                <span class="node-dot"></span>
                <span class="node-text">${course.title}</span>
              </a>
            `).join('')}
          </div>
        </div>
      `;
    }).join('');
  }

  function attachEventListeners() {
    // Hover effects for nodes
    document.querySelectorAll('.trunk-node, .stage-node').forEach(node => {
      node.addEventListener('mouseenter', () => {
        node.style.transform = 'translateX(8px)';
      });
      node.addEventListener('mouseleave', () => {
        node.style.transform = '';
      });
    });
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  return { init, render, refresh };
})();

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeView;
}
