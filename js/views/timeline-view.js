/**
 * Timeline View Component
 * Displays courses as a train station timeline progression
 */

const TimelineView = (() => {
  let container = null;

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
  }

  /**
   * Render the timeline view
   */
  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">Building timeline...</span>
      </div>
    `;

    try {
      const careerPaths = await DataLoader.loadCareerPaths();
      const coursesData = await DataLoader.loadCourses();
      const courses = coursesData.courses || [];

      container.innerHTML = `
        <div class="timeline-header">
          <h2>🚂 Learning Journey Timeline</h2>
          <p class="text-muted">Follow the tracks to progress through your AI learning journey</p>
          <div class="timeline-path-selector">
            <button class="path-btn active" data-path="trunk">🌳 Common Core</button>
            <button class="path-btn" data-path="builder">🔧 Builder</button>
            <button class="path-btn" data-path="researcher">🔬 Researcher</button>
            <button class="path-btn" data-path="enterprise">🏢 Enterprise</button>
          </div>
        </div>
        <div class="timeline-container">
          <div class="timeline-track" id="timeline-track">
            ${renderTimeline(careerPaths.trunk, courses, 'trunk')}
          </div>
        </div>
      `;

      attachEventListeners(careerPaths, courses);

    } catch (error) {
      container.innerHTML = `
        <div class="loading">
          <span class="loading-text">Error building timeline. Please refresh.</span>
        </div>
      `;
      console.error('Error rendering timeline view:', error);
    }
  }

  /**
   * Render timeline for a specific path
   */
  function renderTimeline(pathData, courses, pathId) {
    if (!pathData) return '<p class="text-muted">No data available for this path.</p>';

    const pathColors = {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
    };
    const color = pathColors[pathId] || '#2196F3';

    // For trunk path, use direct course list
    if (pathId === 'trunk' && pathData.courses) {
      return `
        <div class="timeline-line" style="background: linear-gradient(to bottom, ${color}, ${adjustColor(color, 30)});"></div>
        ${pathData.courses.map((course, index) => renderStation(course, index + 1, color, courses)).join('')}
        <div class="timeline-end">
          <div class="end-marker" style="border-color: ${color};">🎯</div>
          <span>Continue to Specialization</span>
        </div>
      `;
    }

    // For other paths, use stages
    if (pathData.stages) {
      let stationNumber = 1;
      return `
        <div class="timeline-line" style="background: linear-gradient(to bottom, ${color}, ${adjustColor(color, 30)});"></div>
        ${pathData.stages.map(stage => `
          <div class="stage-section">
            <div class="stage-header">
              <span class="stage-badge" style="background: ${color};">${stage.name}</span>
            </div>
            ${stage.courses.map(courseId => {
              const course = courses.find(c => c.id === courseId);
              if (!course) return '';
              return renderStationFromCourse(course, stationNumber++, color);
            }).join('')}
          </div>
        `).join('')}
        ${pathData.capstone ? `
          <div class="timeline-capstone">
            <div class="capstone-marker" style="border-color: ${color};">🏆</div>
            <div class="capstone-content">
              <h4>Capstone Project</h4>
              <p>${pathData.capstone}</p>
            </div>
          </div>
        ` : ''}
      `;
    }

    return '<p class="text-muted">No courses available for this path.</p>';
  }

  /**
   * Render a single station (for trunk path)
   */
  function renderStation(course, number, color, allCourses) {
    const fullCourse = allCourses.find(c => c.id === course.id);
    const duration = fullCourse?.duration_hours || '?';
    const difficulty = fullCourse?.difficulty || 'Beginner';

    return `
      <div class="timeline-station" data-id="${course.id}">
        <div class="station-marker" style="border-color: ${color}; color: ${color};">${number}</div>
        <div class="station-content" style="border-left-color: ${color};">
          <div class="station-title">${course.title}</div>
          <div class="station-stage">${course.stage}</div>
          <div class="station-meta">
            <span>⏱ ${duration}h</span>
            <span>📊 ${difficulty}</span>
          </div>
        </div>
        <div class="station-train" style="color: ${color};">🚃</div>
      </div>
    `;
  }

  /**
   * Render a station from full course data
   */
  function renderStationFromCourse(course, number, color) {
    return `
      <div class="timeline-station" data-id="${course.id}">
        <div class="station-marker" style="border-color: ${color}; color: ${color};">${number}</div>
        <div class="station-content" style="border-left-color: ${color};">
          <div class="station-title">${course.title}</div>
          <div class="station-description">${course.description || ''}</div>
          <div class="station-meta">
            <span>⏱ ${course.duration_hours || '?'}h</span>
            <span>📊 ${course.difficulty || 'Beginner'}</span>
          </div>
        </div>
        <div class="station-train" style="color: ${color};">🚃</div>
      </div>
    `;
  }

  /**
   * Adjust color brightness
   */
  function adjustColor(color, amount) {
    const hex = color.replace('#', '');
    const num = parseInt(hex, 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${(1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1)}`;
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners(careerPaths, courses) {
    // Path selector buttons
    document.querySelectorAll('.path-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        // Update active state
        document.querySelectorAll('.path-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        // Update timeline
        const pathId = btn.dataset.path;
        const track = document.getElementById('timeline-track');
        if (track && careerPaths[pathId]) {
          track.innerHTML = renderTimeline(careerPaths[pathId], courses, pathId);
          attachStationListeners();
        }
      });
    });

    attachStationListeners();
  }

  /**
   * Attach station click listeners
   */
  function attachStationListeners() {
    document.querySelectorAll('.timeline-station').forEach(station => {
      station.addEventListener('click', async () => {
        const courseId = station.dataset.id;
        const course = await DataLoader.getCourseById(courseId);
        if (course?.url) {
          window.open(course.url, '_blank');
        }
      });
      station.style.cursor = 'pointer';
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
