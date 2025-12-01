/**
 * Tree View Component
 * Branch Timeline visualization with core trunk and specialized branches
 * Visual metaphor: central main learning path with career branches extending out
 */

const TreeView = (() => {
  let container = null;
  let data = null;

  const config = {
    colors: {
      trunk: { primary: '#4CAF50', light: '#C8E6C9' },
      builder: { primary: '#2196F3', light: '#BBDEFB' },
      researcher: { primary: '#9C27B0', light: '#E1BEE7' },
      enterprise: { primary: '#FF9800', light: '#FFE0B2' }
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
    if (document.getElementById('tree-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'tree-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/tree-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = Utils.createLoadingSpinner('Growing knowledge tree...');
    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      const courses = coursesData.courses || [];
      
      data = { careerPaths, courses };

      const branches = [
        { id: 'trunk', label: careerPaths.trunk?.name, data: careerPaths.trunk, align: 'center' },
        { id: 'builder', label: careerPaths.builder?.name, data: careerPaths.builder, align: 'up-left' },
        { id: 'researcher', label: careerPaths.researcher?.name, data: careerPaths.researcher, align: 'up-right' },
        { id: 'enterprise', label: careerPaths.enterprise?.name, data: careerPaths.enterprise, align: 'down' }
      ];

      container.innerHTML = `
        <div class="tree-wrapper">
          <div class="tree-header">
            <h2>🌳 AI Learning Journey</h2>
            <p>Your main trunk of knowledge with specialized career branches</p>
          </div>
          <div class="branch-timeline">
            <svg class="timeline-svg" viewBox="0 0 1200 600" preserveAspectRatio="xMidYMid meet">
              ${renderConnections(branches)}
            </svg>
            <div class="milestones">
              ${renderMilestones(branches)}
            </div>
            <div class="branches-container">
              ${branches.map(branch => renderBranch(branch)).join('')}
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

  // Render prominent milestone bubbles that sit above/below the main timeline
  function renderMilestones() {
    // positions are in viewBox coordinates (1200 x 600)
    const nodes = [
      { x: 210, y: 300, size: 18, color: '#ff6b6b', text: '2024', target: 'trunk' },
      { x: 350, y: 220, size: 26, color: '#ff7f50', text: 'Intro', target: 'trunk' },
      { x: 420, y: 150, size: 66, color: '#2ecc71', text: 'Foundations', target: 'builder' },
      { x: 600, y: 300, size: 20, color: '#29b6f6', text: '2026', target: 'trunk' },
      { x: 500, y: 420, size: 86, color: '#4fc3f7', text: 'Applied AI', target: 'builder' },
      { x: 780, y: 300, size: 20, color: '#3f51b5', text: '2027', target: 'trunk' },
      { x: 900, y: 200, size: 72, color: '#2196f3', text: 'Specialization', target: 'researcher' },
      { x: 1040, y: 300, size: 26, color: '#ffb74d', text: '2029', target: 'trunk' },
      { x: 840, y: 420, size: 66, color: '#9c27b0', text: 'Capstone', target: 'enterprise' }
    ];

    return nodes.map((n, idx) => {
      const left = (n.x / 1200) * 100;
      const top = (n.y / 600) * 100;
      const size = n.size;
      return `
        <a href="#" class="milestone" data-idx="${idx}" data-target="${n.target || ''}" style="left:${left}%; top:${top}%; --size:${size}px; --color:${n.color};">
          <div class="milestone-bubble">${n.text}</div>
        </a>
      `;
    }).join('');
  }

  function renderConnections(branches) {
    let svg = '';
    
    // Main horizontal line
    svg += `<line x1="100" y1="300" x2="1100" y2="300" class="timeline-line" stroke="#4CAF50" stroke-width="3"/>`;
    
    // Connection lines from trunk to each branch
    const positions = {
      'trunk': { x: 600, y: 300 },
      'builder': { x: 300, y: 150 },
      'researcher': { x: 900, y: 150 },
      'enterprise': { x: 600, y: 450 }
    };

    // Builder branch line (up-left diagonal)
    svg += `<path d="M 400 300 Q 350 225 300 150" class="branch-line" stroke="#2196F3" stroke-width="2" fill="none"/>`;
    
    // Researcher branch line (up-right diagonal)
    svg += `<path d="M 800 300 Q 850 225 900 150" class="branch-line" stroke="#9C27B0" stroke-width="2" fill="none"/>`;
    
    // Enterprise branch line (down)
    svg += `<path d="M 600 300 L 600 450" class="branch-line" stroke="#FF9800" stroke-width="2" fill="none"/>`;

    // Station points on main timeline
    svg += `<circle cx="100" cy="300" r="6" class="station" fill="#4CAF50"/>`;
    svg += `<circle cx="250" cy="300" r="6" class="station" fill="#4CAF50"/>`;
    svg += `<circle cx="400" cy="300" r="6" class="station" fill="#4CAF50"/>`;
    svg += `<circle cx="600" cy="300" r="8" class="station central" fill="#4CAF50"/>`;
    svg += `<circle cx="800" cy="300" r="6" class="station" fill="#4CAF50"/>`;
    svg += `<circle cx="950" cy="300" r="6" class="station" fill="#4CAF50"/>`;
    svg += `<circle cx="1100" cy="300" r="6" class="station" fill="#4CAF50"/>`;

    return svg;
  }

  function renderBranch(branch) {
    const { id, data: pathData, align } = branch;
    if (!pathData) return '';

    const color = config.colors[id];
    const icon = config.icons[id];
    
    // Get courses for this path
    let pathCourses = [];
    if (id === 'trunk' && pathData.courses) {
      pathCourses = pathData.courses.map(c => {
        const full = data.courses.find(fc => fc.id === c.id);
        return { ...c, ...full };
      });
    } else if (pathData.stages) {
      pathData.stages.forEach(stage => {
        (stage.courses || []).forEach(courseId => {
          const course = data.courses.find(c => c.id === courseId);
          if (course) pathCourses.push({ ...course, stageName: stage.name });
        });
      });
    }

    const isMainTrunk = id === 'trunk';
    const containerClass = `branch-container ${align} ${isMainTrunk ? 'main-branch' : 'sub-branch'}`;

    return `
      <div class="${containerClass}" data-path="${id}" style="--branch-color: ${color.primary}; --branch-light: ${color.light}">
        <div class="branch-header">
          <span class="branch-icon">${icon}</span>
          <div class="branch-info">
            <h3 class="branch-title">${pathData.name}</h3>
            <span class="branch-count">${pathCourses.length} courses</span>
          </div>
        </div>
        
        ${isMainTrunk ? renderTrunkCourses(pathCourses) : renderBranchCourses(pathCourses, pathData.stages)}
        
        ${pathData.capstone ? `
          <div class="branch-capstone">
            <span class="capstone-badge">🏆 Capstone</span>
            <p>${pathData.capstone}</p>
          </div>
        ` : ''}
      </div>
    `;
  }

  function renderTrunkCourses(courses) {
    return `
      <div class="courses-grid trunk-courses">
        ${courses.map((course, i) => `
          <a href="${course.url || '#'}" class="course-node trunk-node" target="_blank" rel="noopener"
             title="${course.title}" data-index="${i}">
            <div class="course-number">${i + 1}</div>
            <span class="course-title">${Utils.truncate(course.title, 20)}</span>
          </a>
        `).join('')}
      </div>
    `;
  }

  function renderBranchCourses(courses, stages) {
    if (!stages || stages.length === 0) {
      return `
        <div class="courses-grid">
          ${courses.map(course => `
            <a href="${course.url || '#'}" class="course-card" target="_blank" rel="noopener"
               title="${course.title}">
              <span class="card-title">${Utils.truncate(course.title, 18)}</span>
            </a>
          `).join('')}
        </div>
      `;
    }

    return `
      <div class="stages-container">
        ${stages.map((stage, stageIdx) => {
          const stageCourses = (stage.courses || [])
            .map(id => data.courses.find(c => c.id === id))
            .filter(Boolean);

          return `
            <div class="stage-group">
              <div class="stage-header">
                <span class="stage-number">${stageIdx + 1}</span>
                <span class="stage-name">${stage.name}</span>
              </div>
              <div class="stage-courses">
                ${stageCourses.map(course => `
                  <a href="${course.url || '#'}" class="course-card" target="_blank" rel="noopener"
                     title="${course.title}">
                    <span class="card-title">${Utils.truncate(course.title, 16)}</span>
                  </a>
                `).join('')}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function attachEventListeners() {
    // Hover effects for course nodes
    document.querySelectorAll('.course-node, .course-card').forEach(node => {
      node.addEventListener('mouseenter', function() {
        this.classList.add('active');
      });
      node.addEventListener('mouseleave', function() {
        this.classList.remove('active');
      });
    });

    // Branch expansion on click
    document.querySelectorAll('.branch-container').forEach(branch => {
      branch.addEventListener('click', function(e) {
        if (e.target.closest('a')) return; // Allow links to work
        this.classList.toggle('expanded');
      });
    });

    // Milestone bubble clicks should open relevant branch / scroll
    document.querySelectorAll('.milestone').forEach(m => {
      m.addEventListener('click', function(e) {
        e.preventDefault();
        const target = m.dataset.target;
        if (!target) return;
        const branch = container.querySelector(`.branch-container[data-path="${target}"]`);
        if (!branch) return;

        // collapse other branches and open target
        document.querySelectorAll('.branch-container').forEach(b => b.classList.remove('expanded'));
        branch.classList.toggle('expanded');
        branch.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
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
