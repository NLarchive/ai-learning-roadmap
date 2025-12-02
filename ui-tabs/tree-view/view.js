/**
 * Tree View Component
 * Renders an organic, branching tree visualization based on the provided image.
 * The structure flows from a common trunk upwards into specialized branches.
 */
const TreeView = (() => {
  let container = null;
  let coursesMap = new Map();
  let careerPaths = null;

  // Configuration for the tree layout and appearance, inspired by the image
  const config = {
    width: 1400,
    height: 1000,
    padding: { top: 50, bottom: 50, left: 20, right: 20 },
    levelHeight: 110,
    trunkStrokeWidth: 40,
    branchStrokeWidth: 20,
    twigStrokeWidth: 8,
    nodeRadius: 8,
    colors: {
      trunk: 'var(--trunk, #4CAF50)',
      builder: 'var(--builder, #2196F3)',
      researcher: 'var(--researcher, #9C27B0)',
      enterprise: 'var(--enterprise, #FF9800)',
      branch: '#8d6e63' // A woody brown for the branches
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
      careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      coursesData.courses.forEach(c => coursesMap.set(c.id, c));
      
      const treeData = buildTreeLayout(careerPaths, coursesData.courses);

      container.innerHTML = `
        <div class="tree-wrapper-dark">
          <div class="tree-header-dark">
            <h2>🌳 AI Learning Roadmap</h2>
            <p>An organic representation of the AI curriculum, from foundational trunk to specialized branches.</p>
          </div>
          <div class="tree-svg-container-dark">
            <svg id="tree-svg" viewbox="0 0 ${config.width} ${config.height}" preserveAspectRatio="xMidYMin meet"></svg>
            <div id="tree-tooltip" class="tree-tooltip-dark"></div>
          </div>
        </div>
      `;

      renderSvgTree(treeData);
      attachEventListeners();

    } catch (error) {
      console.error('Error rendering tree view:', error);
      container.innerHTML = Utils.createErrorMessage('Error', 'Could not grow the knowledge tree.');
    }
  }

  /**
   * Builds the entire tree layout with node positions.
   */
  function buildTreeLayout(paths, allCourses) {
    let nodes = [];
    let edges = [];
    const mainBranches = Object.keys(paths).filter(k => k !== 'trunk' && k !== 'additional_paths');
    const availableWidth = config.width - config.padding.left - config.padding.right;
    const branchSpacing = availableWidth / mainBranches.length;

    // Level 0: Trunk - handle both formats:
    // 1. stages: [{ courses: [...] }] (new format)
    // 2. courses: [{ id: ... }] (legacy format with direct course objects)
    let trunkCourses = [];
    if (paths.trunk) {
      if (Array.isArray(paths.trunk.stages)) {
        // New format with stages
        trunkCourses = paths.trunk.stages.flatMap(stage => stage.courses || []);
        trunkCourses = trunkCourses
          .map(id => allCourses.find(c => c.id === id))
          .filter(Boolean);
      } else if (Array.isArray(paths.trunk.courses)) {
        // Legacy format - courses is array of objects with id property
        trunkCourses = paths.trunk.courses
          .map(c => {
            const courseId = typeof c === 'string' ? c : c.id;
            return allCourses.find(course => course.id === courseId);
          })
          .filter(Boolean);
      }
    }

    let lastTrunkNode = null;
    trunkCourses.forEach((courseTrunk, index) => {
      const y = config.height - config.padding.bottom - (index * 40);
      const node = {
        id: courseTrunk.id,
        level: 0,
        x: config.width / 2,
        y: y,
        path: 'trunk',
        order: courseTrunk.order || index + 1
      };
      nodes.push(node);
      if (lastTrunkNode) {
        edges.push({ source: lastTrunkNode, target: node, path: 'trunk' });
      }
      lastTrunkNode = node;
    });

    // Levels 1+: Main Branches and Stages
    mainBranches.forEach((pathKey, branchIndex) => {
      const pathData = paths[pathKey];
      if (!pathData || !pathData.stages) return;
      
      const branchCenterX = config.padding.left + (branchIndex * branchSpacing) + (branchSpacing / 2);
      let lastStageNode = lastTrunkNode; // Connect first stage to the top of the trunk

      pathData.stages.forEach((stage, stageIndex) => {
        const level = stageIndex + 1;
        const stageCourses = stage.courses || [];
        
        stageCourses.forEach((courseId, courseIndex) => {
          const course = allCourses.find(c => c.id === courseId);
          if (!course) return;

          // Distribute courses horizontally within their branch's allocated space
          const courseX = branchCenterX + (courseIndex - (stageCourses.length - 1) / 2) * 60;
          const y = config.height - config.padding.bottom - (level * config.levelHeight);
          
          const node = { id: courseId, level, x: courseX, y, path: pathKey, order: courseIndex + 1 };
          nodes.push(node);

          // Connect to the previous level
          // Simple connection: connect to the first node of the previous stage in the same branch, or the trunk.
          let parentNode = nodes.find(n => n.level === level - 1 && n.path === pathKey) || lastStageNode;
          edges.push({ source: parentNode, target: node, path: pathKey });
        });
      });
    });

    return { nodes, edges };
  }
  
  /**
   * Renders the tree data into the SVG element.
   */
  function renderSvgTree({ nodes, edges }) {
    const svg = document.getElementById('tree-svg');
    if (!svg) return;

    // Render Edges (Branches)
    edges.forEach(edge => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M ${edge.source.x} ${edge.source.y} C ${edge.source.x} ${edge.source.y - config.levelHeight / 2}, ${edge.target.x} ${edge.target.y + config.levelHeight / 2}, ${edge.target.x} ${edge.target.y}`;
      path.setAttribute('d', d);
      path.classList.add('tree-branch');
      path.setAttribute('stroke', config.colors.branch);
      
      // Vary stroke width based on level
      const strokeWidth = Math.max(2, config.trunkStrokeWidth / (Math.pow(edge.target.level, 1.5) + 1));
      path.setAttribute('stroke-width', strokeWidth);
      
      svg.appendChild(path);
    });

    // Render Nodes (Courses with numbers)
    nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('tree-node');
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.dataset.courseId = node.id;

      // Add a number label next to the node, like in the image
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.textContent = node.order;
      text.setAttribute('x', -15);
      text.setAttribute('y', 5);
      text.classList.add('tree-node-label');
      text.style.fill = config.colors[node.path];
      g.appendChild(text);

      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', config.nodeRadius);
      circle.setAttribute('fill', config.colors.branch);
      circle.setAttribute('stroke', config.colors[node.path]);
      g.appendChild(circle);
      
      svg.appendChild(g);
    });
  }

  function attachEventListeners() {
    const tooltip = document.getElementById('tree-tooltip');
    const svgContainer = document.querySelector('.tree-svg-container-dark');
    if (!tooltip || !svgContainer) return;

    document.querySelectorAll('.tree-node').forEach(nodeEl => {
      const courseId = nodeEl.dataset.courseId;
      const course = coursesMap.get(courseId);

      nodeEl.addEventListener('mouseenter', (e) => {
        if (!course) return;
        nodeEl.classList.add('active');
        tooltip.innerHTML = `<strong>${course.title}</strong><span>${course.difficulty} | ${course.duration_hours}h</span>`;
        tooltip.style.borderColor = config.colors[course.career_paths[0]] || config.colors.branch;
        tooltip.classList.add('visible');
        
        const rect = svgContainer.getBoundingClientRect();
        tooltip.style.left = `${e.clientX - rect.left + 20}px`;
        tooltip.style.top = `${e.clientY - rect.top - tooltip.offsetHeight - 10}px`;
      });

      nodeEl.addEventListener('mouseleave', () => {
        nodeEl.classList.remove('active');
        tooltip.classList.remove('visible');
      });

      nodeEl.addEventListener('click', () => {
        if (course && course.url) window.open(course.url, '_blank');
      });
    });
  }

  async function refresh() {
    DataLoader.clearCache();
    coursesMap.clear();
    await render();
  }

  return { init, render, refresh };
})();