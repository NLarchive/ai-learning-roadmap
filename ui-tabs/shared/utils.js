/**
 * Shared Utilities Module
 * Common helper functions used across all view components
 */

const Utils = (() => {
  /**
   * Debounce function - limits rate of function execution
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
   * Throttle function - ensures function runs at most once in specified time
   */
  function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
      if (!inThrottle) {
        func.apply(this, args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  }

  /**
   * Truncate text with ellipsis
   */
  function truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
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
   * Convert hex to RGBA
   */
  function hexToRgba(hex, alpha = 1) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(0, 0, 0, ${alpha})`;
    return `rgba(${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}, ${alpha})`;
  }

  /**
   * Generate unique ID
   */
  function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Path colors for career paths
   */
  const PATH_COLORS = {
    trunk: '#4CAF50',
    builder: '#2196F3',
    researcher: '#9C27B0',
    enterprise: '#FF9800'
  };

  /**
   * Path icons
   */
  const PATH_ICONS = {
    trunk: '🌳',
    builder: '🔧',
    researcher: '🔬',
    enterprise: '🏢'
  };

  /**
   * Difficulty colors
   */
  const DIFFICULTY_COLORS = {
    beginner: '#4CAF50',
    intermediate: '#FF9800',
    advanced: '#f44336'
  };

  /**
   * Get path color
   */
  function getPathColor(pathId) {
    return PATH_COLORS[pathId] || '#2196F3';
  }

  /**
   * Get path icon
   */
  function getPathIcon(pathId) {
    return PATH_ICONS[pathId] || '📚';
  }

  /**
   * Get difficulty color
   */
  function getDifficultyColor(difficulty) {
    return DIFFICULTY_COLORS[difficulty?.toLowerCase()] || DIFFICULTY_COLORS.beginner;
  }

  /**
   * Create loading spinner HTML
   */
  function createLoadingSpinner(message = 'Loading...') {
    return `
      <div class="loading">
        <div class="loading-spinner"></div>
        <span class="loading-text">${message}</span>
      </div>
    `;
  }

  /**
   * Create error message HTML
   */
  function createErrorMessage(title, message) {
    return `
      <div class="error-container">
        <h3>⚠️ ${title}</h3>
        <p>${message}</p>
      </div>
    `;
  }

  /**
   * Format duration
   */
  function formatDuration(hours) {
    if (!hours) return 'N/A';
    if (hours < 1) return `${Math.round(hours * 60)}min`;
    return `${hours}h`;
  }

  /**
   * Sort courses by various criteria
   */
  function sortCourses(courses, sortBy = 'order') {
    const sorted = [...courses];
    switch (sortBy) {
      case 'title':
        return sorted.sort((a, b) => a.title.localeCompare(b.title));
      case 'difficulty':
        const diffOrder = { beginner: 1, intermediate: 2, advanced: 3 };
        return sorted.sort((a, b) => 
          (diffOrder[a.difficulty?.toLowerCase()] || 0) - 
          (diffOrder[b.difficulty?.toLowerCase()] || 0)
        );
      case 'duration':
        return sorted.sort((a, b) => (a.duration_hours || 0) - (b.duration_hours || 0));
      case 'order':
      default:
        return sorted.sort((a, b) => (a.order || 999) - (b.order || 999));
    }
  }

  /**
   * Group courses by a key
   */
  function groupCourses(courses, key) {
    return courses.reduce((groups, course) => {
      const groupKey = course[key] || 'other';
      if (!groups[groupKey]) {
        groups[groupKey] = [];
      }
      groups[groupKey].push(course);
      return groups;
    }, {});
  }

  /**
   * Calculate position on a circle
   */
  function pointOnCircle(centerX, centerY, radius, angleInDegrees) {
    const angleInRadians = (angleInDegrees - 90) * Math.PI / 180;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  }

  /**
   * Linear interpolation
   */
  function lerp(start, end, t) {
    return start + (end - start) * t;
  }

  /**
   * Clamp value between min and max
   */
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  // Public API
  return {
    debounce,
    throttle,
    truncate,
    adjustColor,
    hexToRgba,
    generateId,
    PATH_COLORS,
    PATH_ICONS,
    DIFFICULTY_COLORS,
    getPathColor,
    getPathIcon,
    getDifficultyColor,
    createLoadingSpinner,
    createErrorMessage,
    formatDuration,
    sortCourses,
    groupCourses,
    pointOnCircle,
    lerp,
    clamp
  };
})();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = Utils;
}
