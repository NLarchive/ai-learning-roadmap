/**
 * Main Application Entry Point
 * Initializes all modules and manages the application lifecycle
 * Works with modular view components from ui-tabs/
 */

const App = (() => {
  // View instances
  const views = {
    index: null,
    cards: null,
    tree: null,
    graph: null,
    timeline: null
  };

  // Initialization state
  let initialized = false;

  /**
   * Initialize the application
   */
  async function init() {
    if (initialized) return;

    console.log('🚀 Initializing AI Roadmap App...');

    try {
      // Initialize tab navigation
      TabNavigation.init();

      // Get view containers
      const containers = {
        index: document.getElementById('view-index'),
        cards: document.getElementById('view-cards'),
        tree: document.getElementById('view-tree'),
        graph: document.getElementById('view-graph'),
        timeline: document.getElementById('view-timeline')
      };

      // Initialize views with their containers
      if (containers.index && typeof TextIndexView !== 'undefined') {
        await TextIndexView.init(containers.index);
        views.index = TextIndexView;
      }

      if (containers.cards && typeof CardsView !== 'undefined') {
        await CardsView.init(containers.cards);
        views.cards = CardsView;
      }

      if (containers.tree && typeof TreeView !== 'undefined') {
        await TreeView.init(containers.tree);
        views.tree = TreeView;
      }

      if (containers.graph && typeof GraphView !== 'undefined') {
        await GraphView.init(containers.graph);
        views.graph = GraphView;
      }

      if (containers.timeline && typeof TimelineView !== 'undefined') {
        await TimelineView.init(containers.timeline);
        views.timeline = TimelineView;
      }

      // Register view renderers with tab navigation
      TabNavigation.registerRenderer('index', async () => {
        if (views.index) await views.index.render();
      });

      TabNavigation.registerRenderer('cards', async () => {
        if (views.cards) await views.cards.render();
      });

      TabNavigation.registerRenderer('tree', async () => {
        if (views.tree) await views.tree.render();
      });

      TabNavigation.registerRenderer('graph', async () => {
        if (views.graph) await views.graph.render();
      });

      TabNavigation.registerRenderer('timeline', async () => {
        if (views.timeline) await views.timeline.render();
      });

      // Render default view (index)
      if (views.index) {
        await views.index.render();
      }

      initialized = true;
      console.log('✅ App initialized successfully');

    } catch (error) {
      console.error('❌ Error initializing app:', error);
      showError('Failed to initialize application. Please refresh the page.');
    }
  }

  /**
   * Show error message
   */
  function showError(message) {
    const main = document.querySelector('.main-content');
    if (main) {
      main.innerHTML = `
        <div class="error-container">
          <h2>⚠️ Error</h2>
          <p>${message}</p>
          <button onclick="location.reload()">Refresh Page</button>
        </div>
      `;
    }
  }

  /**
   * Refresh all data
   */
  async function refreshData() {
    DataLoader.clearCache();
    const currentView = TabNavigation.getCurrentView();
    if (views[currentView]) {
      await views[currentView].refresh();
    }
  }

  /**
   * Get view instance
   */
  function getView(viewId) {
    return views[viewId];
  }

  // Public API
  return {
    init,
    refreshData,
    getView
  };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
