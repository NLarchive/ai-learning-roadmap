/**
 * Tree View Component
 * Organic branching tree visualization - courses organized by career path stages
 * Root (trunk) at bottom, branches expanding upward with curved connectors
 */

const TreeView = (() => {
  let container = null;
  let coursesMap = new Map();
  let careerPaths = null;

  const config = {
    svgWidth: 1400,
    svgHeight: 900,
    nodeRadius: 16,
    levelHeight: 120,
    branchColor: '#8b6f47',
    colors: {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
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
      careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      coursesData.courses.forEach(c => coursesMap.set(c.id, c));

      // Build tree structure from all career paths
      const treeData = buildTreeFromPaths(careerPaths, coursesData.courses);

      container.innerHTML = `
        <div class="tree-wrapper">
          <div class="tree-header">
            <h2>🌳 AI Learning Roadmap</h2>
            <p>Core trunk with specialized branches — each number represents a course step</p>
          </div>
          <div class="tree-container">
            <svg id="tree-svg" class="tree-svg" viewBox="0 0 ${config.svgWidth} ${config.svgHeight}" preserveAspectRatio="xMidYMid meet"></svg>
          </div>
          <div class="tree-legend">
            <span><strong>🌳 Trunk</strong> = Common Core</span>
            <span><strong>🔧 Builder</strong> = AI Product Engineer</span>
            <span><strong>🔬 Researcher</strong> = Model Architect</span>
            <span><strong>🏢 Enterprise</strong> = Enterprise AI</span>
          </div>
        </div>
      `;

      renderTreeSvg(treeData);
      attachEventListeners();

    } catch (error) {
      console.error('Error rendering tree:', error);
      container.innerHTML = Utils.createErrorMessage('Error', 'Failed to load tree.');
    }
  }

  /**
   * Build tree structure from career path stages
   */
  function buildTreeFromPaths(paths, courses) {
    const nodes = [];
    let nodeId = 0;

    // Process each career path (trunk, builder, researcher, enterprise)
    Object.entries(paths).forEach(([pathKey, pathData]) => {
      if (typeof pathData !== 'object' || !pathData.courses) {
        return;
      }

      // Handle trunk (direct courses array)
      if (pathKey === 'trunk' && Array.isArray(pathData.courses)) {
        pathData.courses.forEach((courseItem, idx) => {
          const courseId = courseItem.id || courseItem;
          const courseObj = courses.find(c => c.id === courseId);
          if (courseObj) {
            nodes.push({
              id: nodeId++,
              courseId: courseId,
              title: courseObj.title,
              order: idx + 1,
              stage: 'Trunk',
              pathKey: pathKey,
              level: 0,
              x: 0,
              y: 0
            });
          }
        });
        return;
      }

      // Process stages in a career path
      if (Array.isArray(pathData.stages)) {
        pathData.stages.forEach((stage, stageIdx) => {
          (stage.courses || []).forEach((courseId, courseIdx) => {
            const courseObj = courses.find(c => c.id === courseId);
            if (courseObj) {
              nodes.push({
                id: nodeId++,
                courseId: courseId,
                title: courseObj.title,
                order: courseIdx + 1,
                stage: stage.name,
                pathKey: pathKey,
                level: stageIdx + 1,
                x: 0,
                y: 0
              });
            }
          });
        });
      }
    });

    // Position nodes in a tree layout
    positionNodes(nodes);

    return { nodes };
  }

  /**
   * Position nodes in tree layers (from bottom/trunk upward)
   */
  function positionNodes(nodes) {
    // Group by level
    const levels = {};
    nodes.forEach(node => {
      if (!levels[node.level]) levels[node.level] = [];
      levels[node.level].push(node);
    });

    const maxLevel = Math.max(...Object.keys(levels).map(Number), 0);

    // Position nodes
    Object.entries(levels).forEach(([level, levelNodes]) => {
      const levelNum = parseInt(level);
      const y = config.svgHeight - (levelNum * config.levelHeight + 80);

      levelNodes.forEach((node, idx) => {
        const totalInLevel = levelNodes.length;
        const spacing = config.svgWidth / (totalInLevel + 1);
        node.x = spacing * (idx + 1);
        node.y = y;
      });
    });
  }

  /**
   * Render tree into SVG
   */
  function renderTreeSvg({ nodes }) {
    const svg = document.getElementById('tree-svg');
    if (!svg) return;

    // Group nodes by level to draw branches between levels
    const levels = {};
    nodes.forEach(node => {
      if (!levels[node.level]) levels[node.level] = [];
      levels[node.level].push(node);
    });

    // Draw curved connectors between levels
    const levelKeys = Object.keys(levels).map(Number).sort((a, b) => a - b);
    for (let i = 0; i < levelKeys.length - 1; i++) {
      const currentLevel = levels[levelKeys[i]];
      const nextLevel = levels[levelKeys[i + 1]];

      // Connect nodes with curved paths (same career path)
      currentLevel.forEach(fromNode => {
        nextLevel.forEach(toNode => {
          if (fromNode.pathKey === toNode.pathKey) {
            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            const curveY = fromNode.y - (config.levelHeight * 0.4);
            const d = `M ${fromNode.x} ${fromNode.y} C ${fromNode.x} ${curveY}, ${toNode.x} ${curveY}, ${toNode.x} ${toNode.y}`;
            path.setAttribute('d', d);
            path.setAttribute('stroke', config.colors[toNode.pathKey]);
            path.setAttribute('stroke-width', '3');
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke-linecap', 'round');
            path.setAttribute('opacity', '0.5');
            svg.appendChild(path);
          }
        });
      });
    }

    // Draw nodes (courses)
    nodes.forEach(node => {
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.classList.add('tree-node');
      g.setAttribute('transform', `translate(${node.x}, ${node.y})`);
      g.dataset.courseId = node.courseId;
      g.dataset.title = node.title;
      g.style.cursor = 'pointer';

      // Circle background
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('r', config.nodeRadius);
      circle.setAttribute('fill', config.colors[node.pathKey]);
      circle.setAttribute('stroke', 'white');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', '0.85');
      circle.classList.add('node-circle');
      g.appendChild(circle);

      // Text: order number
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', '0');
      text.setAttribute('y', '0');
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('dy', '0.3em');
      text.setAttribute('font-size', '14');
      text.setAttribute('font-weight', 'bold');
      text.setAttribute('fill', 'white');
      text.setAttribute('pointer-events', 'none');
      text.textContent = node.order;
      g.appendChild(text);

      g.addEventListener('mouseenter', function() {
        circle.setAttribute('r', config.nodeRadius + 4);
        circle.setAttribute('opacity', '1');
      });

      g.addEventListener('mouseleave', function() {
        circle.setAttribute('r', config.nodeRadius);
        circle.setAttribute('opacity', '0.85');
      });

      g.addEventListener('click', () => {
        const course = coursesMap.get(node.courseId);
        if (course && course.url) {
          window.open(course.url, '_blank');
        }
      });

      svg.appendChild(g);
    });
  }

  function attachEventListeners() {
    const svg = document.getElementById('tree-svg');
    if (!svg) return;

    // Tooltip on hover
    const tooltip = document.createElement('div');
    tooltip.classList.add('tree-tooltip');
    container.appendChild(tooltip);

    document.querySelectorAll('.tree-node').forEach(node => {
      node.addEventListener('mouseenter', (e) => {
        const courseId = node.dataset.courseId;
        const course = coursesMap.get(courseId);
        if (course) {
          tooltip.innerHTML = `<strong>${course.title}</strong><br><small>${course.difficulty} • ${course.duration_hours}h</small>`;
          tooltip.style.display = 'block';
          tooltip.style.left = e.pageX + 10 + 'px';
          tooltip.style.top = e.pageY + 10 + 'px';
        }
      });

      node.addEventListener('mouseleave', () => {
        tooltip.style.display = 'none';
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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TreeView;
}
