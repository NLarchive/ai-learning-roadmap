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
    timeline: null,
    heatmap: null,
    sunburst: null,
    kanban: null,
    network: null
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
        timeline: document.getElementById('view-timeline'),
        heatmap: document.getElementById('view-heatmap'),
        sunburst: document.getElementById('view-sunburst'),
        kanban: document.getElementById('view-kanban'),
        network: document.getElementById('view-network')
      };

      // Initialize core views
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

      // Initialize NEW visualization views
      if (containers.heatmap && typeof HeatmapView !== 'undefined') {
        await HeatmapView.init(containers.heatmap);
        views.heatmap = HeatmapView;
        console.log('📊 Heatmap view initialized');
      }

      if (containers.sunburst && typeof SunburstView !== 'undefined') {
        await SunburstView.init(containers.sunburst);
        views.sunburst = SunburstView;
        console.log('🌞 Sunburst view initialized');
      }

      if (containers.kanban && typeof KanbanView !== 'undefined') {
        await KanbanView.init(containers.kanban);
        views.kanban = KanbanView;
        console.log('📋 Kanban view initialized');
      }

      if (containers.network && typeof NetworkView !== 'undefined') {
        await NetworkView.init(containers.network);
        views.network = NetworkView;
        console.log('🕸️ Network view initialized');
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

      // Register NEW view renderers
      TabNavigation.registerRenderer('heatmap', async () => {
        if (views.heatmap) await views.heatmap.render();
      });

      TabNavigation.registerRenderer('sunburst', async () => {
        if (views.sunburst) await views.sunburst.render();
      });

      TabNavigation.registerRenderer('kanban', async () => {
        if (views.kanban) await views.kanban.render();
      });

      TabNavigation.registerRenderer('network', async () => {
        if (views.network) await views.network.render();
      });

      // Render default view (index)
      if (views.index) {
        await views.index.render();
      }

      initialized = true;
      console.log('✅ App initialized successfully with', Object.keys(views).filter(v => views[v]).length, 'views');

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
    if (views[currentView] && views[currentView].refresh) {
      await views[currentView].refresh();
    }
  }

  /**
   * Get view instance
   */
  function getView(viewId) {
    return views[viewId];
  }

  /**
   * Get all registered views
   */
  function getAllViews() {
    return Object.keys(views).filter(v => views[v]);
  }

  // Public API
  return {
    init,
    refreshData,
    getView,
    getAllViews
  };
})();

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
