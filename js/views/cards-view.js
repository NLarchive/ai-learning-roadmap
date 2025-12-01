/**
 * Cards View Component
 * Displays courses as interactive cards in a grid layout
 */

const CardsView = (() => {
  let container = null;
  let data = null;

  /**
   * Initialize the view
   */
  async function init(containerElement) {
    container = containerElement;
  }

  /**
   * Render the cards view
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
      data = await DataLoader.loadCourses();
      const courses = data.courses || [];
      const categories = data.categories || {};

      container.innerHTML = `
        <div class="filter-bar">
          <div class="filter-group">
            <label class="filter-label">Category:</label>
            <select class="filter-select" id="cards-category-filter">
              <option value="">All Categories</option>
              ${Object.entries(categories).map(([key, cat]) => 
                `<option value="${key}">${cat.icon} ${cat.name}</option>`
              ).join('')}
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Sort by:</label>
            <select class="filter-select" id="cards-sort">
              <option value="order">Default Order</option>
              <option value="title">Title A-Z</option>
              <option value="duration">Duration</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </div>
          <input type="text" class="search-input" id="cards-search" placeholder="Search courses...">
        </div>
        <div class="cards-grid" id="cards-container">
          ${courses.map(course => renderCard(course, categories)).join('')}
        </div>
      `;

      attachEventListeners();

    } catch (error) {
      container.innerHTML = `
        <div class="loading">
          <span class="loading-text">Error loading courses. Please refresh the page.</span>
        </div>
      `;
      console.error('Error rendering cards view:', error);
    }
  }

  /**
   * Render a single course card
   */
  function renderCard(course, categories) {
    const category = categories[course.category] || { name: 'General', icon: '📚' };
    const difficultyClass = course.difficulty?.toLowerCase() || 'beginner';
    const pathColors = {
      trunk: '#4CAF50',
      builder: '#2196F3',
      researcher: '#9C27B0',
      enterprise: '#FF9800'
    };
    
    // Determine card color based on primary career path
    const primaryPath = course.career_paths?.[0] || 'trunk';
    const cardColor = pathColors[primaryPath] || '#2196F3';

    return `
      <article class="course-card" 
               data-id="${course.id}" 
               data-category="${course.category}"
               data-difficulty="${difficultyClass}"
               data-duration="${course.duration_hours || 0}"
               data-title="${course.title.toLowerCase()}">
        <div class="card-header" style="background: linear-gradient(135deg, ${cardColor}, ${adjustColor(cardColor, -20)})">
          <div class="card-category">${category.icon} ${category.name}</div>
          <h3 class="card-title">${course.title}</h3>
        </div>
        <div class="card-body">
          <p class="card-description">${course.description || 'No description available.'}</p>
          <div class="card-tags">
            ${(course.tags || []).slice(0, 4).map(tag => `<span class="tag">${tag}</span>`).join('')}
          </div>
        </div>
        <div class="card-footer">
          <span class="difficulty-badge ${difficultyClass}">${course.difficulty || 'Beginner'}</span>
          <span class="duration">
            <span>⏱</span>
            ${course.duration_hours ? `${course.duration_hours}h` : 'N/A'}
          </span>
        </div>
      </article>
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
  function attachEventListeners() {
    const categoryFilter = document.getElementById('cards-category-filter');
    const sortSelect = document.getElementById('cards-sort');
    const searchInput = document.getElementById('cards-search');

    if (categoryFilter) {
      categoryFilter.addEventListener('change', applyFilters);
    }
    if (sortSelect) {
      sortSelect.addEventListener('change', applySort);
    }
    if (searchInput) {
      searchInput.addEventListener('input', debounce(applyFilters, 300));
    }

    // Card click handlers
    document.querySelectorAll('.course-card').forEach(card => {
      card.addEventListener('click', () => {
        const courseId = card.dataset.id;
        showCourseDetails(courseId);
      });
    });
  }

  /**
   * Apply filters to cards
   */
  function applyFilters() {
    const category = document.getElementById('cards-category-filter')?.value || '';
    const search = document.getElementById('cards-search')?.value.toLowerCase() || '';

    const cards = document.querySelectorAll('.course-card');
    cards.forEach(card => {
      const matchesCategory = !category || card.dataset.category === category;
      const matchesSearch = !search || card.dataset.title.includes(search);
      card.style.display = (matchesCategory && matchesSearch) ? '' : 'none';
    });
  }

  /**
   * Sort cards
   */
  function applySort() {
    const sortBy = document.getElementById('cards-sort')?.value || 'order';
    const container = document.getElementById('cards-container');
    const cards = Array.from(container.querySelectorAll('.course-card'));

    cards.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return a.dataset.title.localeCompare(b.dataset.title);
        case 'duration':
          return parseInt(b.dataset.duration) - parseInt(a.dataset.duration);
        case 'difficulty':
          const order = { beginner: 1, intermediate: 2, advanced: 3 };
          return order[a.dataset.difficulty] - order[b.dataset.difficulty];
        default:
          return 0;
      }
    });

    cards.forEach(card => container.appendChild(card));
  }

  /**
   * Show course details modal
   */
  async function showCourseDetails(courseId) {
    const course = await DataLoader.getCourseById(courseId);
    if (!course) return;

    // For now, open the course URL
    if (course.url) {
      window.open(course.url, '_blank');
    }
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
