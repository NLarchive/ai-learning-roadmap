/**
 * Text Index View Component
 * Displays courses as a categorized, clickable text list
 * Independent module that can be used standalone
 */

const TextIndexView = (() => {
  let container = null;
  let data = null;

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
    injectStyles();
  }

  /**
   * Inject component-specific styles
   */
  function injectStyles() {
    if (document.getElementById('text-index-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'text-index-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/index-view/styles.css';
    document.head.appendChild(link);
  }

  /**
   * Render the text index view
   */
  async function render() {
    if (!container) return;

    // Show loading state
    container.innerHTML = Utils.createLoadingSpinner('Loading courses...');

    try {
      // Use processed data so we have courses + categories + stats in one place
      data = await DataLoader.loadProcessedData();
      const courses = data.courses || [];
      const categories = data.categories || {};

      // Group courses by category (ensure categories include all defined
      // categories from the normalized dataset)
      const grouped = groupByCategory(courses, categories);

      container.innerHTML = `
        <div class="text-index-container">
          <div class="index-header">
            <h2>📚 Course Index</h2>
            <div class="index-controls">
              <input type="text" 
                     id="index-search" 
                     class="search-input" 
                     placeholder="Search courses...">
              <select id="index-path-filter" class="filter-select">
                <option value="">All Paths</option>
                <option value="trunk">🌳 Common Core</option>
                <option value="builder">🔧 Builder</option>
                <option value="researcher">🔬 Researcher</option>
                <option value="enterprise">🏢 Enterprise</option>
              </select>
              <select id="index-difficulty-filter" class="filter-select">
                <option value="">All Levels</option>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
          <div class="index-stats">
            <span class="stat-item">📊 ${courses.length} courses</span>
            <span class="stat-item">📁 ${Object.keys(categories).length} categories</span>
          </div>
          <div class="categories-list">
            ${renderCategories(grouped)}
          </div>
        </div>
      `;

      attachEventListeners();

    } catch (error) {
      console.error('Error rendering text index:', error);
      container.innerHTML = Utils.createErrorMessage('Load Error', 'Failed to load courses. Please refresh the page.');
    }
  }

  /**
   * Group courses by category
   */
  function groupByCategory(courses, categories) {
    const grouped = {};
    
    // Initialize groups
    Object.keys(categories).forEach(key => {
      grouped[key] = {
        ...categories[key],
        courses: []
      };
    });

    // Group courses
    courses.forEach(course => {
      if (grouped[course.category]) {
        grouped[course.category].courses.push(course);
      }
    });

    // Sort courses within each category by order
    Object.values(grouped).forEach(group => {
      group.courses.sort((a, b) => (a.order || 999) - (b.order || 999));
    });

    return grouped;
  }

  /**
   * Render all categories
   */
  function renderCategories(grouped) {
    return Object.entries(grouped)
      .filter(([_, group]) => group.courses.length > 0)
      .map(([key, group]) => renderCategorySection(key, group))
      .join('');
  }

  /**
   * Render a single category section
   */
  function renderCategorySection(key, group) {
    return `
      <div class="category-section" data-category="${key}">
        <div class="category-header">
          <span class="category-icon">${group.icon || '📚'}</span>
          <h3 class="category-title">${group.name}</h3>
          <span class="category-count">${group.courses.length} courses</span>
        </div>
        <ul class="course-list">
          ${group.courses.map(course => renderCourseItem(course)).join('')}
        </ul>
      </div>
    `;
  }

  /**
   * Render a single course item
   */
  function renderCourseItem(course) {
    const difficultyClass = course.difficulty?.toLowerCase() || 'beginner';
    const paths = (course.career_paths || []).map(p => getPathBadge(p)).join('');
    
    return `
      <li class="course-item" 
          data-id="${course.id}" 
          data-difficulty="${difficultyClass}" 
          data-paths="${(course.career_paths || []).join(',')}"
          data-title="${course.title.toLowerCase()}">
        <a href="${course.url || '#'}" class="course-link" target="_blank" rel="noopener">
          <span class="course-title">${course.title}</span>
        </a>
        <div class="course-meta">
          <span class="difficulty-badge ${difficultyClass}">${course.difficulty || 'Beginner'}</span>
          ${course.duration_hours ? `<span class="duration">⏱ ${course.duration_hours}h</span>` : ''}
          <span class="path-badges">${paths}</span>
        </div>
      </li>
    `;
  }

  /**
   * Get path badge HTML
   */
  function getPathBadge(pathId) {
    const color = Utils.getPathColor(pathId);
    const icon = Utils.getPathIcon(pathId);
    const names = {
      trunk: 'Core',
      builder: 'Builder',
      researcher: 'Researcher',
      enterprise: 'Enterprise'
    };
    return `<span class="path-badge" style="background: ${Utils.hexToRgba(color, 0.15)}; color: ${color};" title="${names[pathId] || pathId}">${icon}</span>`;
  }

  /**
   * Attach event listeners for filtering
   */
  function attachEventListeners() {
    const searchInput = document.getElementById('index-search');
    const pathFilter = document.getElementById('index-path-filter');
    const difficultyFilter = document.getElementById('index-difficulty-filter');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(applyFilters, 300));
    }

    if (pathFilter) {
      pathFilter.addEventListener('change', applyFilters);
    }

    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', applyFilters);
    }
  }

  /**
   * Apply all filters
   */
  function applyFilters() {
    const searchTerm = document.getElementById('index-search')?.value.toLowerCase() || '';
    const pathFilter = document.getElementById('index-path-filter')?.value || '';
    const difficultyFilter = document.getElementById('index-difficulty-filter')?.value || '';

    const items = document.querySelectorAll('.course-item');
    let visibleCount = 0;

    items.forEach(item => {
      const title = item.dataset.title || '';
      const paths = item.dataset.paths || '';
      const difficulty = item.dataset.difficulty || '';

      const matchesSearch = !searchTerm || title.includes(searchTerm);
      const matchesPath = !pathFilter || paths.includes(pathFilter);
      const matchesDifficulty = !difficultyFilter || difficulty === difficultyFilter;

      const visible = matchesSearch && matchesPath && matchesDifficulty;
      item.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Update category visibility
    document.querySelectorAll('.category-section').forEach(section => {
      const visibleItems = section.querySelectorAll('.course-item[style=""], .course-item:not([style])');
      const hasVisible = Array.from(section.querySelectorAll('.course-item')).some(item => item.style.display !== 'none');
      section.style.display = hasVisible ? '' : 'none';
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

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = TextIndexView;
}
