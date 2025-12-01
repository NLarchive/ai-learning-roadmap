/**
 * Heatmap View Component
 * Pure vanilla CSS Grid heatmap visualization
 * Shows course density by category vs difficulty/duration
 * No external libraries - 100% vanilla JS/CSS
 */

const HeatmapView = (() => {
  let container = null;
  let data = null;
  let currentMode = 'difficulty'; // 'difficulty' or 'duration' or 'partner'

  async function init(containerElement) {
    container = containerElement;
    injectStyles();
  }

  function injectStyles() {
    if (document.getElementById('heatmap-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'heatmap-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/heatmap-view/styles.css';
    document.head.appendChild(link);
  }

  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="heatmap-loading">
        <div class="heatmap-spinner"></div>
        <p>Building heatmap...</p>
      </div>
    `;

    try {
      data = await DataLoader.loadProcessedData();
      // expose processed data for helper/renderer (used by renderMatrix)
      window.HeatmapView._data = data;
      renderHeatmap();
    } catch (error) {
      console.error('HeatmapView render error:', error);
      container.innerHTML = `
        <div class="heatmap-error">
          <p>❌ Failed to load heatmap data</p>
          <button onclick="HeatmapView.refresh()">Retry</button>
        </div>
      `;
    }
  }

  function renderHeatmap() {
    const { courses, categories } = data;
    
    // Build the matrix based on current mode
    const matrix = buildMatrix(courses, categories);
    
    container.innerHTML = `
      <div class="heatmap-container">
        <div class="heatmap-header">
          <h2>📊 Course Heatmap</h2>
          <div class="heatmap-controls">
            <label>View by:</label>
            <select id="heatmap-mode" onchange="HeatmapView.setMode(this.value)">
              <option value="difficulty" ${currentMode === 'difficulty' ? 'selected' : ''}>Difficulty Level</option>
              <option value="duration" ${currentMode === 'duration' ? 'selected' : ''}>Duration Range</option>
              <option value="partner" ${currentMode === 'partner' ? 'selected' : ''}>Partner Organization</option>
            </select>
          </div>
        </div>
        
        <div class="heatmap-legend">
          <span class="legend-label">Fewer courses</span>
          <div class="legend-gradient"></div>
          <span class="legend-label">More courses</span>
        </div>
        
        <div class="heatmap-grid" id="heatmap-grid">
          ${renderMatrix(matrix)}
        </div>
        
        <div class="heatmap-stats">
          ${renderStats()}
        </div>
      </div>
    `;
    
    attachEventListeners();
  }

  function buildMatrix(courses, categories) {
    const categoryIds = Object.keys(categories);
    let columns = [];
    
    switch (currentMode) {
      case 'difficulty':
        columns = ['Beginner', 'Intermediate', 'Advanced'];
        break;
      case 'duration':
        columns = ['Quick (≤1h)', 'Short (1-2h)', 'Medium (2-5h)', 'Long (5-20h)', 'Extended (20h+)'];
        break;
      case 'partner':
        const partners = [...new Set(courses.map(c => c.partner).filter(Boolean))].sort();
        columns = partners.slice(0, 10); // Top 10 partners
        break;
    }
    
    const matrix = {
      rows: categoryIds,
      columns: columns,
      data: {},
      maxValue: 0
    };
    
    categoryIds.forEach(catId => {
      matrix.data[catId] = {};
      columns.forEach(col => {
        matrix.data[catId][col] = [];
      });
    });
    
    courses.forEach(course => {
      const catId = course.category;
      if (!matrix.data[catId]) return;
      
      let column = null;
      switch (currentMode) {
        case 'difficulty':
          column = course.difficulty;
          break;
        case 'duration':
          const hours = course.duration_hours || 0;
          if (hours <= 1) column = 'Quick (≤1h)';
          else if (hours <= 2) column = 'Short (1-2h)';
          else if (hours <= 5) column = 'Medium (2-5h)';
          else if (hours <= 20) column = 'Long (5-20h)';
          else column = 'Extended (20h+)';
          break;
        case 'partner':
          column = course.partner;
          break;
      }
      
      if (column && matrix.data[catId][column] !== undefined) {
        matrix.data[catId][column].push(course);
        matrix.maxValue = Math.max(matrix.maxValue, matrix.data[catId][column].length);
      }
    });
    
    return matrix;
  }

  function renderMatrix(matrix) {
    const { rows, columns, data, maxValue } = matrix;
    const { categories } = window.HeatmapView._data || data;
    
    // Header row
    let html = `
      <div class="heatmap-corner"></div>
      ${columns.map(col => `<div class="heatmap-col-header">${col}</div>`).join('')}
    `;
    
    // Data rows
    rows.forEach(rowId => {
      const cat = data.categories ? data.categories[rowId] : { name: rowId, icon: '📁' };
      const catData = categories[rowId] || { name: rowId, icon: '📁' };
      
      html += `<div class="heatmap-row-header">
        <span class="cat-icon">${catData.icon || '📁'}</span>
        <span class="cat-name">${catData.name || rowId}</span>
      </div>`;
      
      columns.forEach(col => {
        const courses = matrix.data[rowId][col] || [];
        const count = courses.length;
        const intensity = maxValue > 0 ? count / maxValue : 0;
        const hue = 200 + (intensity * 60); // Blue to purple gradient
        const saturation = 60 + (intensity * 30);
        const lightness = 90 - (intensity * 50);
        
        html += `
          <div class="heatmap-cell" 
               data-category="${rowId}" 
               data-column="${col}"
               data-count="${count}"
               style="--cell-bg: hsl(${hue}, ${saturation}%, ${lightness}%); --cell-opacity: ${0.3 + intensity * 0.7}">
            <span class="cell-count">${count > 0 ? count : ''}</span>
            ${count > 0 ? `<div class="cell-tooltip">
              <strong>${count} course${count > 1 ? 's' : ''}</strong>
              <ul>${courses.slice(0, 5).map(c => `<li>${c.title}</li>`).join('')}</ul>
              ${count > 5 ? `<small>+${count - 5} more...</small>` : ''}
            </div>` : ''}
          </div>
        `;
      });
    });
    
    return html;
  }

  function renderStats() {
    const { stats, courses } = data;
    
    return `
      <div class="stat-card">
        <div class="stat-value">${stats.totalCourses}</div>
        <div class="stat-label">Total Courses</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.totalHours}h</div>
        <div class="stat-label">Total Content</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.byDifficulty.beginner}</div>
        <div class="stat-label">Beginner</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.byDifficulty.intermediate}</div>
        <div class="stat-label">Intermediate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.byDifficulty.advanced}</div>
        <div class="stat-label">Advanced</div>
      </div>
    `;
  }

  function attachEventListeners() {
    // Cell click to show course list
    container.querySelectorAll('.heatmap-cell[data-count]').forEach(cell => {
      cell.addEventListener('click', () => {
        const cat = cell.dataset.category;
        const col = cell.dataset.column;
        showCourseModal(cat, col);
      });
    });
  }

  function showCourseModal(categoryId, column) {
    const { courses, categories } = data;
    const catName = categories[categoryId]?.name || categoryId;
    
    let filtered = courses.filter(c => c.category === categoryId);
    
    switch (currentMode) {
      case 'difficulty':
        filtered = filtered.filter(c => c.difficulty === column);
        break;
      case 'duration':
        filtered = filtered.filter(c => {
          const h = c.duration_hours || 0;
          switch (column) {
            case 'Quick (≤1h)': return h <= 1;
            case 'Short (1-2h)': return h > 1 && h <= 2;
            case 'Medium (2-5h)': return h > 2 && h <= 5;
            case 'Long (5-20h)': return h > 5 && h <= 20;
            case 'Extended (20h+)': return h > 20;
            default: return false;
          }
        });
        break;
      case 'partner':
        filtered = filtered.filter(c => c.partner === column);
        break;
    }
    
    if (filtered.length === 0) return;
    
    const modal = document.createElement('div');
    modal.className = 'heatmap-modal-overlay';
    modal.innerHTML = `
      <div class="heatmap-modal">
        <div class="modal-header">
          <h3>${catName} - ${column}</h3>
          <button class="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <ul class="course-list">
            ${filtered.map(c => `
              <li>
                <a href="${c.url}" target="_blank" rel="noopener">
                  <span class="course-title">${c.title}</span>
                  <span class="course-meta">${c.duration_hours}h · ${c.difficulty}</span>
                </a>
              </li>
            `).join('')}
          </ul>
        </div>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    modal.querySelector('.modal-close').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.remove();
    });
  }

  function setMode(mode) {
    currentMode = mode;
    renderHeatmap();
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  // Public API
  return {
    init,
    render,
    refresh,
    setMode
  };
})();

// Make setMode accessible globally for the select onchange
window.HeatmapView = HeatmapView;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = HeatmapView;
}