/**
 * Timeline View Component
 * Displays courses as a clean train journey timeline
 * Fixed layout with proper spacing
 */

const TimelineView = (() => {
  let container = null;

  async function init(containerElement) {
    container = containerElement;
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('timeline-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'timeline-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/timeline-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = Utils.createLoadingSpinner('Building timeline...');

    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      const courses = coursesData.courses || [];

      container.innerHTML = `
        <div class="timeline-wrapper">
          <div class="timeline-header">
            <h2>🚂 Learning Journey</h2>
            <p>Follow your path like a train journey. Each station is a milestone.</p>
            <div class="path-tabs">
              <button class="path-tab active" data-path="trunk">🌳 Core</button>
              <button class="path-tab" data-path="builder">🔧 Builder</button>
              <button class="path-tab" data-path="researcher">🔬 Researcher</button>
              <button class="path-tab" data-path="enterprise">🏢 Enterprise</button>
            </div>
          </div>
          <div class="timeline-scroll">
            <div class="timeline-track" id="timeline-track">
              ${renderPath('trunk', careerPaths.trunk, courses)}
            </div>
          </div>
        </div>
      `;

      attachEventListeners(careerPaths, courses);

    } catch (error) {
      console.error('Error rendering timeline:', error);
      container.innerHTML = Utils.createErrorMessage('Error', 'Failed to load timeline.');
    }
  }

  function renderPath(pathId, pathData, courses) {
    if (!pathData) return '<p class="no-data">No data available.</p>';

    const colors = {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
    };
    const color = colors[pathId] || '#667eea';

    let pathCourses = [];
    let stages = [];

    // Handle trunk with courses array (legacy format)
    if (pathId === 'trunk' && pathData.courses && Array.isArray(pathData.courses)) {
      pathCourses = pathData.courses.map(c => {
        const courseId = typeof c === 'string' ? c : c.id;
        const full = courses.find(fc => fc.id === courseId);
        return full ? { ...c, ...full } : null;
      }).filter(Boolean);
    } else if (pathData.stages && Array.isArray(pathData.stages)) {
      pathData.stages.forEach(stage => {
        const stageCourses = (stage.courses || []).map(courseId => {
          return courses.find(c => c.id === courseId);
        }).filter(Boolean);
        if (stageCourses.length > 0) {
          stages.push({ name: stage.name, courses: stageCourses });
        }
      });
    }

    let html = `<div class="track-rail" style="--track-color: ${color}"></div>`;

    if (pathCourses.length > 0) {
      html += pathCourses.map((course, i) => renderStation(course, i + 1, color)).join('');
    } else if (stages.length > 0) {
      let num = 1;
      stages.forEach(stage => {
        html += `<div class="stage-divider"><span style="background: ${color}">${stage.name}</span></div>`;
        stage.courses.forEach(course => {
          html += renderStation(course, num++, color);
        });
      });
    }

    html += `
      <div class="track-end" style="--track-color: ${color}">
        <span class="end-flag">🏁</span>
        <span class="end-text">${pathData.name} Complete!</span>
      </div>
    `;

    if (pathData.capstone) {
      html += `
        <div class="capstone-card">
          <span class="capstone-icon">🏆</span>
          <div class="capstone-text">
            <strong>Capstone Project</strong>
            <p>${pathData.capstone}</p>
          </div>
        </div>
      `;
    }

    return html;
  }

  function renderStation(course, num, color) {
    const url = course.url || '#';
    const duration = course.duration_hours || '?';
    const difficulty = course.difficulty || 'Beginner';
    
    return `
      <div class="station" data-id="${course.id}">
        <div class="station-marker" style="--color: ${color}">
          <span class="marker-num">${num}</span>
        </div>
        <div class="station-card">
          <a href="${url}" class="station-title" target="_blank" rel="noopener">
            ${course.title}
          </a>
          ${course.stage ? `<span class="station-stage">${course.stage}</span>` : ''}
          <div class="station-meta">
            <span>⏱ ${duration}h</span>
            <span class="difficulty ${difficulty.toLowerCase()}">${difficulty}</span>
          </div>
        </div>
      </div>
    `;
  }

  function attachEventListeners(careerPaths, courses) {
    const tabs = document.querySelectorAll('.path-tab');
    const track = document.getElementById('timeline-track');

    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const pathId = tab.dataset.path;
        if (track && careerPaths[pathId]) {
          track.innerHTML = renderPath(pathId, careerPaths[pathId], courses);
        }
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
  module.exports = TimelineView;
}
