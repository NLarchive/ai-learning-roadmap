/**
 * Tree View Component
 * Displays career paths as hierarchical branch trees
 */

const TreeView = (() => {
  let container = null;

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
  }

  /**
   * Render the tree view
   */
  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading career paths...</span>
      </div>
    `;

    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      const courses = coursesData.courses || [];

      container.innerHTML = `
        <div class="tree-container">
          <div class="tree">
            ${renderTrunkPath(careerPaths.trunk, courses)}
            ${renderBranchPath('builder', careerPaths.builder, courses)}
            ${renderBranchPath('researcher', careerPaths.researcher, courses)}
            ${renderBranchPath('enterprise', careerPaths.enterprise, courses)}
          </div>
        </div>
      `;

      attachEventListeners();

    } catch (error) {
      container.innerHTML = `
        <div class="loading">
          <span class="loading-text">Error loading career paths. Please refresh.</span>
        </div>
      `;
      console.error('Error rendering tree view:', error);
    }
  }

  /**
   * Render the trunk (common core) path
   */
  function renderTrunkPath(trunk, courses) {
    if (!trunk) return '';

    const pathCourses = trunk.courses || [];
    
    return `
      <div class="tree-path trunk">
        <div class="path-header">
          <span class="path-icon">🌳</span>
          <div class="path-info">
            <h3>${trunk.name}</h3>
            <p>${trunk.description}</p>
          </div>
        </div>
        <div class="trunk-courses">
          ${pathCourses.map((course, index) => `
            <div class="trunk-node" data-id="${course.id}">
              <div class="node-connector ${index === 0 ? 'first' : ''} ${index === pathCourses.length - 1 ? 'last' : ''}"></div>
              <div class="node-content">
                <span class="node-order">${course.order}</span>
                <div class="node-info">
                  <span class="node-title">${course.title}</span>
                  <span class="node-stage">${course.stage}</span>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Render a branch path (builder, researcher, enterprise)
   */
  function renderBranchPath(pathId, pathData, courses) {
    if (!pathData) return '';

    const icons = {
      builder: '🔧',
      researcher: '🔬',
      enterprise: '🏢'
    };

    return `
      <div class="tree-path ${pathId}">
        <div class="path-header">
          <span class="path-icon">${icons[pathId] || pathData.icon || '📚'}</span>
          <div class="path-info">
            <h3>${pathData.name}</h3>
            <p>${pathData.description}</p>
          </div>
        </div>
        <div class="stages">
          ${(pathData.stages || []).map(stage => `
            <div class="stage">
              <div class="stage-name">${stage.name}</div>
              <ul class="stage-courses">
                ${(stage.courses || []).map(courseId => {
                  const course = courses.find(c => c.id === courseId);
                  return course ? `
                    <li class="stage-course" data-id="${courseId}">
                      <span class="course-bullet">→</span>
                      ${course.title}
                    </li>
                  ` : '';
                }).join('')}
              </ul>
            </div>
          `).join('')}
        </div>
        ${pathData.capstone ? `
          <div class="capstone">
            <span class="capstone-icon">🏆</span>
            <div class="capstone-info">
              <strong>Capstone Project:</strong>
              <p>${pathData.capstone}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    // Course node clicks
    document.querySelectorAll('.trunk-node, .stage-course').forEach(node => {
      node.addEventListener('click', async () => {
        const courseId = node.dataset.id;
        const course = await DataLoader.getCourseById(courseId);
        if (course?.url) {
          window.open(course.url, '_blank');
        }
      });
      node.style.cursor = 'pointer';
    });
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
