/**
 * Kanban View Component
 * Trello-style board visualization with drag-and-drop
 * Organizes courses by learning stages within a selected career path
 * 100% Vanilla JS - No external libraries
 */

const KanbanView = (() => {
  let container = null;
  let data = null;
  let currentPath = 'builder'; // Default path
  let draggedCard = null;
  let completedCourses = new Set();

  async function init(containerElement) {
    container = containerElement;
    injectStyles();
    loadProgress();
  }

  function injectStyles() {
    if (document.getElementById('kanban-view-styles')) return;
    const link = document.createElement('link');
    link.id = 'kanban-view-styles';
    link.rel = 'stylesheet';
    link.href = 'ui-tabs/kanban-view/styles.css';
    document.head.appendChild(link);
  }

  function loadProgress() {
    try {
      const saved = localStorage.getItem('kanban-progress');
      if (saved) {
        completedCourses = new Set(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not load progress:', e);
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem('kanban-progress', JSON.stringify([...completedCourses]));
    } catch (e) {
      console.warn('Could not save progress:', e);
    }
  }

  async function render() {
    if (!container) return;

    container.innerHTML = `
      <div class="kanban-loading">
        <div class="kanban-spinner"></div>
        <p>Loading Kanban board...</p>
      </div>
    `;

    try {
      data = await DataLoader.loadProcessedData();
      renderKanban();
    } catch (error) {
      console.error('KanbanView render error:', error);
      container.innerHTML = `
        <div class="kanban-error">
          <p>❌ Failed to load Kanban board</p>
          <button onclick="KanbanView.refresh()">Retry</button>
        </div>
      `;
    }
  }

  function renderKanban() {
    const { paths } = data;
    const path = paths[currentPath];
    
    if (!path || !path.stages) {
      container.innerHTML = '<div class="kanban-error"><p>No stages found for this path</p></div>';
      return;
    }

    const pathColor = path.color || '#667eea';
    const totalCourses = path.stages.reduce((sum, s) => sum + (s.courses?.length || 0), 0);
    const completedInPath = path.stages.reduce((sum, stage) => {
      return sum + (stage.courses?.filter(c => completedCourses.has(c.id)).length || 0);
    }, 0);
    const progressPercent = totalCourses > 0 ? Math.round((completedInPath / totalCourses) * 100) : 0;

    container.innerHTML = `
      <div class="kanban-container">
        <div class="kanban-header">
          <div class="kanban-title">
            <h2>${path.icon || '📋'} ${path.name} Learning Path</h2>
            <p class="kanban-description">${path.description || ''}</p>
          </div>
          
          <div class="kanban-controls">
            <div class="path-selector">
              <label>Career Path:</label>
              <select id="kanban-path-select" onchange="KanbanView.setPath(this.value)">
                ${Object.keys(paths).map(pId => `
                  <option value="${pId}" ${pId === currentPath ? 'selected' : ''}>
                    ${paths[pId].icon || ''} ${paths[pId].name}
                  </option>
                `).join('')}
              </select>
            </div>
            
            <div class="progress-tracker">
              <div class="progress-info">
                <span class="progress-text">${completedInPath} / ${totalCourses} completed</span>
                <span class="progress-percent">${progressPercent}%</span>
              </div>
              <div class="progress-bar">
                <div class="progress-fill" style="width: ${progressPercent}%; background: ${pathColor}"></div>
              </div>
            </div>
            
            <button class="reset-btn" onclick="KanbanView.resetProgress()">
              🔄 Reset Progress
            </button>
          </div>
        </div>
        
        <div class="kanban-board" id="kanban-board">
          ${path.stages.map((stage, idx) => renderColumn(stage, idx, pathColor)).join('')}
        </div>
        
        ${path.capstone ? `
          <div class="kanban-capstone" style="border-color: ${pathColor}">
            <div class="capstone-icon">🎓</div>
            <div class="capstone-content">
              <h4>Capstone Project</h4>
              <p>${path.capstone}</p>
            </div>
          </div>
        ` : ''}
      </div>
    `;

    attachDragListeners();
  }

  function renderColumn(stage, index, pathColor) {
    const courses = stage.courses || [];
    const completedCount = courses.filter(c => completedCourses.has(c.id)).length;
    
    return `
      <div class="kanban-column" data-stage="${index}">
        <div class="column-header" style="--path-color: ${pathColor}">
          <div class="column-title">
            <span class="stage-number">${index + 1}</span>
            <h3>${stage.name}</h3>
          </div>
          <div class="column-count">
            <span class="count-completed">${completedCount}</span>
            <span class="count-separator">/</span>
            <span class="count-total">${courses.length}</span>
          </div>
        </div>
        
        <div class="column-description">${stage.description || ''}</div>
        
        <div class="column-cards" data-stage="${index}">
          ${courses.map(course => renderCard(course, pathColor)).join('')}
        </div>
      </div>
    `;
  }

  function renderCard(course, pathColor) {
    if (!course) return '';
    
    const isCompleted = completedCourses.has(course.id);
    const difficultyClass = (course.difficulty || 'Beginner').toLowerCase();
    
    return `
      <div class="kanban-card ${isCompleted ? 'completed' : ''}" 
           data-course-id="${course.id}"
           draggable="true">
        <div class="card-header">
          <span class="difficulty-badge ${difficultyClass}">${course.difficulty || 'N/A'}</span>
          <button class="complete-btn ${isCompleted ? 'checked' : ''}" 
                  onclick="KanbanView.toggleComplete('${course.id}', event)"
                  title="${isCompleted ? 'Mark as incomplete' : 'Mark as complete'}">
            ${isCompleted ? '✓' : '○'}
          </button>
        </div>
        
        <h4 class="card-title">${course.title}</h4>
        
        <p class="card-description">${truncate(course.description || '', 80)}</p>
        
        <div class="card-meta">
          <span class="meta-duration">⏱️ ${course.duration_hours || 0}h</span>
          <span class="meta-partner">${course.partner || ''}</span>
        </div>
        
        <div class="card-skills">
          ${(course.skills_gained || []).slice(0, 3).map(skill => 
            `<span class="skill-tag">${skill}</span>`
          ).join('')}
        </div>
        
        <a href="${course.url || '#'}" target="_blank" rel="noopener" class="card-link" 
           style="--link-color: ${pathColor}">
          Start Course →
        </a>
      </div>
    `;
  }

  function truncate(text, maxLen) {
    if (!text || text.length <= maxLen) return text;
    return text.slice(0, maxLen - 1) + '…';
  }

  function attachDragListeners() {
    const cards = container.querySelectorAll('.kanban-card');
    const columns = container.querySelectorAll('.column-cards');

    cards.forEach(card => {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);
    });

    columns.forEach(column => {
      column.addEventListener('dragover', handleDragOver);
      column.addEventListener('dragleave', handleDragLeave);
      column.addEventListener('drop', handleDrop);
    });
  }

  function handleDragStart(e) {
    draggedCard = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', e.target.dataset.courseId);
  }

  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    draggedCard = null;
    container.querySelectorAll('.column-cards').forEach(col => {
      col.classList.remove('drag-over');
    });
  }

  function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    e.currentTarget.classList.add('drag-over');
    
    // Insert position indicator
    const afterElement = getDragAfterElement(e.currentTarget, e.clientY);
    if (draggedCard) {
      if (afterElement) {
        e.currentTarget.insertBefore(draggedCard, afterElement);
      } else {
        e.currentTarget.appendChild(draggedCard);
      }
    }
  }

  function handleDragLeave(e) {
    e.currentTarget.classList.remove('drag-over');
  }

  function handleDrop(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    // The card is already moved during dragover
  }

  function getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.kanban-card:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;
      
      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  function toggleComplete(courseId, event) {
    event.stopPropagation();
    
    if (completedCourses.has(courseId)) {
      completedCourses.delete(courseId);
    } else {
      completedCourses.add(courseId);
    }
    
    saveProgress();
    renderKanban();
  }

  function setPath(pathId) {
    currentPath = pathId;
    renderKanban();
  }

  function resetProgress() {
    if (confirm('Reset all progress? This cannot be undone.')) {
      completedCourses.clear();
      saveProgress();
      renderKanban();
    }
  }

  async function refresh() {
    DataLoader.clearCache();
    await render();
  }

  return {
    init,
    render,
    refresh,
    setPath,
    toggleComplete,
    resetProgress
  };
})();

window.KanbanView = KanbanView;

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KanbanView;
}
