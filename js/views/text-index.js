/**
 * Text Index View Component
 * Displays courses as a categorized, clickable text list
 */

const TextIndexView = (() => {
  let container = null;
  let data = null;

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
    await render();
  }

  /**
   * Render the text index view
   */
  async function render() {
    if (!container) return;

    // Show loading state
    container.innerHTML = `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">Loading courses...</span>
      </div>
    `;

    try {
      // Load data
      data = await DataLoader.loadCourses();
      const categories = data.categories || {};
      const courses = data.courses || [];

      // Group courses by category
      const grouped = groupByCategory(courses, categories);

      // Render the index
      container.innerHTML = `
        <div class="filter-bar">
          <div class="filter-group">
            <label class="filter-label">Filter by:</label>
            <select class="filter-select" id="category-filter">
              <option value="">All Categories</option>
              ${Object.entries(categories).map(([key, cat]) => 
                `<option value="${key}">${cat.icon} ${cat.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="filter-group">
            <select class="filter-select" id="difficulty-filter">
              <option value="">All Levels</option>
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div class="filter-group">
            <select class="filter-select" id="path-filter">
              <option value="">All Paths</option>
              <option value="trunk">Common Core</option>
              <option value="builder">AI Product Engineer</option>
              <option value="researcher">Model Architect</option>
              <option value="enterprise">Enterprise AI</option>
            </select>
          </div>
          <input type="text" class="search-input" id="search-input" placeholder="Search courses...">
        </div>
        <div class="text-index" id="courses-list">
          ${renderCategories(grouped)}
        </div>
      `;

      // Attach event listeners
      attachEventListeners();

    } catch (error) {
      container.innerHTML = `
        <div class="loading">
          <span class="loading-text">Error loading courses. Please refresh the page.</span>
        </div>
      `;
      console.error('Error rendering text index:', error);
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
          <h2 class="category-title">${group.name}</h2>
          <span class="text-muted">(${group.courses.length} courses)</span>
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
      <li class="course-item" data-id="${course.id}" data-difficulty="${difficultyClass}" data-paths="${(course.career_paths || []).join(',')}">
        <a href="${course.url || '#'}" class="course-link" target="_blank" rel="noopener">
          ${course.title}
        </a>
        <div class="course-meta">
          <span class="difficulty-badge ${difficultyClass}">${course.difficulty || 'Beginner'}</span>
          ${course.duration_hours ? `<span class="duration">⏱ ${course.duration_hours}h</span>` : ''}
          ${paths}
        </div>
      </li>
    `;
  }

  /**
   * Get path badge HTML
   */
  function getPathBadge(pathId) {
    const pathColors = {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
    };
    const pathNames = {
      trunk: 'Core',
      builder: 'Builder',
      researcher: 'Researcher',
      enterprise: 'Enterprise'
    };
    const color = pathColors[pathId] || '#666';
    return `<span class="tag" style="background: ${color}22; color: ${color}; border: 1px solid ${color}44;">${pathNames[pathId] || pathId}</span>`;
  }

  /**
   * Attach event listeners for filtering
   */
  function attachEventListeners() {
    const categoryFilter = document.getElementById('category-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const pathFilter = document.getElementById('path-filter');
    const searchInput = document.getElementById('search-input');

    if (categoryFilter) {
      categoryFilter.addEventListener('change', applyFilters);
    }
    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', applyFilters);
    }
    if (pathFilter) {
      pathFilter.addEventListener('change', applyFilters);
    }
    if (searchInput) {
      searchInput.addEventListener('input', debounce(applyFilters, 300));
    }
  }

  /**
   * Apply all filters
   */
  function applyFilters() {
    const category = document.getElementById('category-filter')?.value || '';
    const difficulty = document.getElementById('difficulty-filter')?.value || '';
    const path = document.getElementById('path-filter')?.value || '';
    const search = document.getElementById('search-input')?.value.toLowerCase() || '';

    const sections = document.querySelectorAll('.category-section');
    const items = document.querySelectorAll('.course-item');

    // Filter individual items
    items.forEach(item => {
      const matchesDifficulty = !difficulty || item.dataset.difficulty === difficulty;
      const matchesPath = !path || (item.dataset.paths && item.dataset.paths.split(',').includes(path));
      const matchesSearch = !search || item.querySelector('.course-link').textContent.toLowerCase().includes(search);
      
      item.style.display = (matchesDifficulty && matchesPath && matchesSearch) ? '' : 'none';
    });

    // Filter sections
    sections.forEach(section => {
      const matchesCategory = !category || section.dataset.category === category;
      const hasVisibleItems = Array.from(section.querySelectorAll('.course-item'))
        .some(item => item.style.display !== 'none');
      
      section.style.display = (matchesCategory && hasVisibleItems) ? '' : 'none';
    });
  }

  /**
   * Debounce helper
   */
  function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
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
