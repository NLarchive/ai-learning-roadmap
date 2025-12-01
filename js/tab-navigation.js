/**
 * Tab Navigation Module
 * Handles tab switching and view management
 */

const TabNavigation = (() => {
  // State
  let currentTab = 'index';
  let views = {};
  let initialized = false;

  /**
   * Initialize the tab navigation system
   */
  function init() {
    if (initialized) return;

    // Get all tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    const viewContainers = document.querySelectorAll('.view-container');

    // Store references to views
    viewContainers.forEach(container => {
      views[container.dataset.view] = container;
    });

    // Add click handlers to tabs
    tabButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.tab;
        switchTo(viewId);
      });
    });

    // Handle browser back/forward
    window.addEventListener('popstate', (event) => {
      if (event.state && event.state.view) {
        switchTo(event.state.view, false);
      }
    });

    // Check URL hash on load
    const hash = window.location.hash.slice(1);
    if (hash && views[hash]) {
      switchTo(hash, false);
    }

    initialized = true;
  }

  /**
   * Switch to a specific view
   */
  function switchTo(viewId, pushState = true) {
    if (!views[viewId]) {
      console.warn(`View "${viewId}" not found`);
      return;
    }

    // Update active tab button
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === viewId);
    });

    // Update active view container
    Object.keys(views).forEach(key => {
      views[key].classList.toggle('active', key === viewId);
    });

    // Update URL hash
    if (pushState) {
      history.pushState({ view: viewId }, '', `#${viewId}`);
    }

    // Update current tab
    currentTab = viewId;

    // Emit custom event for view renderers
    document.dispatchEvent(new CustomEvent('viewChanged', {
      detail: { view: viewId }
    }));
  }

  /**
   * Get current active view
   */
  function getCurrentView() {
    return currentTab;
  }

  /**
   * Register a view renderer
   */
  function registerRenderer(viewId, renderer) {
    document.addEventListener('viewChanged', (event) => {
      if (event.detail.view === viewId) {
        renderer();
      }
    });
  }

  /**
   * Add a new tab dynamically
   */
  function addTab(id, label, icon) {
    const nav = document.querySelector('.tab-navigation');
    if (!nav) return;

    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.dataset.tab = id;
    btn.innerHTML = `
      <span class="tab-icon">${icon}</span>
      <span>${label}</span>
    `;
    btn.addEventListener('click', () => switchTo(id));
    nav.appendChild(btn);
  }

  // Public API
  return {
    init,
    switchTo,
    getCurrentView,
    registerRenderer,
    addTab
  };
})();

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  TabNavigation.init();
});
