/**
 * Cards View Component
 * Displays courses as interactive cards in a responsive grid layout
 * Independent module that can be used standalone
 */

const CardsView = (() => {
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
    if (document.getElementById('cards-view-styles')) return;
    
    const link = document.createElement('link');
    link.id = 'cards-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/cards-view/styles.css';
    document.head.appendChild(link);
  }

  /**
   * Render the cards view
   */
  async function render() {
    if (!container) return;

    container.innerHTML = Utils.createLoadingSpinner('Loading courses...');

    try {
      data = await DataLoader.loadCourses();
      const courses = data.courses || [];
      const categories = data.categories || {};

      container.innerHTML = `
        <div class="cards-container">
          <div class="cards-header">
            <h2>🎴 Course Cards</h2>
            <div class="cards-controls">
              <input type="text" 
                     id="cards-search" 
                     class="search-input" 
                     placeholder="Search courses...">
              <select id="cards-category-filter" class="filter-select">
                <option value="">All Categories</option>
                ${Object.entries(categories).map(([key, cat]) => 
                  `<option value="${key}">${cat.icon} ${cat.name}</option>`
                ).join('')}
              </select>
              <select id="cards-sort" class="filter-select">
                <option value="order">Default Order</option>
                <option value="title">Title A-Z</option>
                <option value="difficulty">Difficulty</option>
                <option value="duration">Duration</option>
              </select>
            </div>
          </div>
          <div class="cards-stats">
            <span>Showing <strong id="cards-count">${courses.length}</strong> courses</span>
          </div>
          <div class="cards-grid" id="cards-grid">
            ${courses.map(course => renderCard(course, categories)).join('')}
          </div>
        </div>
      `;

      attachEventListeners();

    } catch (error) {
      console.error('Error rendering cards view:', error);
      container.innerHTML = Utils.createErrorMessage('Load Error', 'Failed to load courses. Please refresh the page.');
    }
  }

  /**
   * Render a single course card
   */
  function renderCard(course, categories) {
    const category = categories[course.category] || { name: 'General', icon: '📚' };
    const difficultyClass = course.difficulty?.toLowerCase() || 'beginner';
    
    // Determine card color based on primary career path
    const primaryPath = course.career_paths?.[0] || 'trunk';
    const cardColor = Utils.getPathColor(primaryPath);

    return `
      <article class="course-card" 
               data-id="${course.id}" 
               data-category="${course.category}"
               data-difficulty="${difficultyClass}"
               data-duration="${course.duration_hours || 0}"
               data-title="${course.title.toLowerCase()}">
        <div class="card-header" style="background: linear-gradient(135deg, ${cardColor}, ${Utils.adjustColor(cardColor, -20)})">
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
          <div class="card-meta">
            <span class="difficulty-badge ${difficultyClass}">${course.difficulty || 'Beginner'}</span>
            <span class="duration">⏱ ${Utils.formatDuration(course.duration_hours)}</span>
          </div>
          <a href="${course.url || '#'}" class="card-link" target="_blank" rel="noopener">
            View Course →
          </a>
        </div>
      </article>
    `;
  }

  /**
   * Attach event listeners
   */
  function attachEventListeners() {
    const searchInput = document.getElementById('cards-search');
    const categoryFilter = document.getElementById('cards-category-filter');
    const sortSelect = document.getElementById('cards-sort');

    if (searchInput) {
      searchInput.addEventListener('input', Utils.debounce(applyFilters, 300));
    }

    if (categoryFilter) {
      categoryFilter.addEventListener('change', applyFilters);
    }

    if (sortSelect) {
      sortSelect.addEventListener('change', applySort);
    }

    // Card hover effects
    document.querySelectorAll('.course-card').forEach(card => {
      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-8px)';
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /**
   * Apply filters to cards
   */
  function applyFilters() {
    const searchTerm = document.getElementById('cards-search')?.value.toLowerCase() || '';
    const categoryFilter = document.getElementById('cards-category-filter')?.value || '';

    const cards = document.querySelectorAll('.course-card');
    let visibleCount = 0;

    cards.forEach(card => {
      const title = card.dataset.title || '';
      const category = card.dataset.category || '';

      const matchesSearch = !searchTerm || title.includes(searchTerm);
      const matchesCategory = !categoryFilter || category === categoryFilter;

      const visible = matchesSearch && matchesCategory;
      card.style.display = visible ? '' : 'none';
      if (visible) visibleCount++;
    });

    // Update count
    const countEl = document.getElementById('cards-count');
    if (countEl) countEl.textContent = visibleCount;
  }

  /**
   * Sort cards
   */
  function applySort() {
    const sortBy = document.getElementById('cards-sort')?.value || 'order';
    const grid = document.getElementById('cards-grid');
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll('.course-card'));
    
    cards.sort((a, b) => {
      switch (sortBy) {
        case 'title':
          return (a.dataset.title || '').localeCompare(b.dataset.title || '');
        case 'difficulty':
          const diffOrder = { beginner: 1, intermediate: 2, advanced: 3 };
          return (diffOrder[a.dataset.difficulty] || 0) - (diffOrder[b.dataset.difficulty] || 0);
        case 'duration':
          return (parseFloat(a.dataset.duration) || 0) - (parseFloat(b.dataset.duration) || 0);
        default:
          return 0;
      }
    });

    cards.forEach(card => grid.appendChild(card));
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
  module.exports = CardsView;
}
