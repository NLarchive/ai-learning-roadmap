/**
 * Data Loader Module (Shared) v2.0
 * Handles loading and caching of course data from JSON files
 * Supports the new normalized database structure
 * This is a shared utility used by all view components
 */

const DataLoader = (() => {
  // Cache for loaded data
  const cache = {
    courses: null,
    categories: null,
    paths: null,
    externalResources: null,
    baseUrl: null,
    processedData: null
  };

  // Configuration - paths relative to root (new normalized structure)
  const config = {
    coursesPath: './config-roadmap/courses.json',
    categoriesPath: './config-roadmap/categories.json',
    pathsPath: './config-roadmap/paths.json',
    externalResourcesPath: './config-roadmap/external-resources.json',
    // Legacy paths for backwards compatibility
    legacyCoursesPath: './config-roadmap/courses-index.json',
    legacyCareerPathsPath: './config-roadmap/career-paths.json'
  };

  /**
   * Fetch JSON data with error handling
   */
  async function fetchJSON(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching ${url}:`, error);
      throw error;
    }
  }

  /**
   * Try to load from new path, fallback to legacy
   */
  async function fetchWithFallback(newPath, legacyPath) {
    try {
      return await fetchJSON(newPath);
    } catch (e) {
      console.warn(`New path ${newPath} failed, trying legacy...`);
      return await fetchJSON(legacyPath);
    }
  }

  /**
   * Load courses data
   */
  async function loadCourses() {
    if (cache.courses) {
      return cache.courses;
    }

    const data = await fetchWithFallback(config.coursesPath, config.legacyCoursesPath);
    
    // Store base URL for later use
    if (data.meta && data.meta.base_url) {
      cache.baseUrl = data.meta.base_url;
    }

    // Normalize all course URLs at load time
    try {
      if (data.meta && data.meta.base_url && Array.isArray(data.courses)) {
        const base = data.meta.base_url.replace(/\/$/, '');
        data.courses.forEach(course => {
          if (course.url && course.url.startsWith('/')) {
            course.url = base + course.url;
          }
        });
      }
    } catch (err) {
      console.warn('Could not normalize course URLs:', err);
    }

    cache.courses = data;
    return cache.courses;
  }

  /**
   * Load categories data
   */
  async function loadCategories() {
    if (cache.categories) {
      return cache.categories;
    }

    try {
      cache.categories = await fetchJSON(config.categoriesPath);
    } catch (e) {
      // Fallback: extract from legacy courses-index.json
      const coursesData = await loadCourses();
      cache.categories = coursesData.categories || {};
    }
    return cache.categories;
  }

  /**
   * Load career paths data
   */
  async function loadCareerPaths() {
    if (cache.paths) {
      return cache.paths;
    }

    // Fetch the raw paths file. Older/newer generators may return
    // either a plain mapping {trunk: {...}, ...} or a wrapper { meta: {...}, paths: { ... } }
    const raw = await fetchWithFallback(config.pathsPath, config.legacyCareerPathsPath);

    // Normalize: prefer raw.paths if present, otherwise assume raw is the mapping
    const mapping = raw && raw.paths ? raw.paths : raw || {};

    // Ensure every path has a 'stages' array expected by views (backwards compatibility)
    for (const id of Object.keys(mapping)) {
      const entry = mapping[id] || {};

      // If the pipeline produced a simple count 'courses', try to keep compatibility
      if (!Array.isArray(entry.stages)) {
        // If the entry stores full course list as 'courses' (array), wrap it into one stage
        if (Array.isArray(entry.courses)) {
          entry.stages = [ { courses: entry.courses } ];
        } else {
          // Otherwise, create an empty stages array so views don't break.
          entry.stages = [];
        }
      }

      // If there is a 'courses' top-level array, also expose a hydrated field for lookup
      if (Array.isArray(entry.courses) && !entry.coursesHydrated) {
        entry.coursesHydrated = entry.courses.slice();
      }

      mapping[id] = entry;
    }

    cache.paths = mapping;
    return cache.paths;
  }

  /**
   * Load external resources
   */
  async function loadExternalResources() {
    if (cache.externalResources) {
      return cache.externalResources;
    }

    try {
      cache.externalResources = await fetchJSON(config.externalResourcesPath);
    } catch (e) {
      // Fallback: extract from legacy courses-index.json
      const coursesData = await loadCourses();
      cache.externalResources = coursesData.external_gaps || [];
    }
    return cache.externalResources;
  }

  /**
   * Load all data sources
   */
  async function loadAll() {
    const [courses, categories, careerPaths, externalResources] = await Promise.all([
      loadCourses(),
      loadCategories(),
      loadCareerPaths(),
      loadExternalResources()
    ]);
    return { courses, categories, careerPaths, externalResources };
  }

  /**
   * Load and process all data sources into a unified structure.
   * This is the recommended function for views to use.
   * Returns a hydrated, ready-to-use data object.
   */
  async function loadProcessedData() {
    if (cache.processedData) {
      return cache.processedData;
    }

    const [coursesData, categoriesData, pathsData, externalData] = await Promise.all([
      loadCourses(),
      loadCategories(),
      loadCareerPaths(),
      loadExternalResources()
    ]);

    // Create courses map for quick lookup
    const coursesMap = new Map(coursesData.courses.map(c => [c.id, c]));
    const coursesArray = coursesData.courses;

    // Hydrate career paths with full course objects
    const hydratedPaths = {};
    for (const pathId in pathsData) {
      const path = pathsData[pathId];
      hydratedPaths[pathId] = { ...path };

      if (path.stages) {
        hydratedPaths[pathId].stages = path.stages.map(stage => ({
          ...stage,
          courses: (stage.courses || [])
            .map(courseId => coursesMap.get(courseId))
            .filter(Boolean)
        }));
      }
      
      // For legacy format with courses array
      if (path.courses && Array.isArray(path.courses)) {
        hydratedPaths[pathId].coursesHydrated = path.courses
          .map(c => typeof c === 'string' ? coursesMap.get(c) : coursesMap.get(c.id))
          .filter(Boolean);
      }
    }

    // Calculate statistics
    const stats = {
      totalCourses: coursesArray.length,
      totalHours: coursesArray.reduce((sum, c) => sum + (c.duration_hours || 0), 0),
      byDifficulty: {
        beginner: coursesArray.filter(c => c.difficulty === 'Beginner').length,
        intermediate: coursesArray.filter(c => c.difficulty === 'Intermediate').length,
        advanced: coursesArray.filter(c => c.difficulty === 'Advanced').length
      },
      byCategory: {},
      byPath: {},
      byPartner: {}
    };

    // Calculate category stats
    for (const catId in categoriesData) {
      stats.byCategory[catId] = coursesArray.filter(c => c.category === catId).length;
    }

    // Calculate path stats
    for (const pathId in pathsData) {
      stats.byPath[pathId] = coursesArray.filter(c => 
        c.career_paths && c.career_paths.includes(pathId)
      ).length;
    }

    // Calculate partner stats
    coursesArray.forEach(c => {
      if (c.partner) {
        stats.byPartner[c.partner] = (stats.byPartner[c.partner] || 0) + 1;
      }
    });

    const processed = {
      courses: coursesArray,
      coursesMap,
      categories: categoriesData,
      paths: hydratedPaths,
      externalResources: externalData,
      meta: coursesData.meta || {},
      stats
    };
    
    cache.processedData = processed;
    return processed;
  }

  /**
   * Get base URL from cached data
   */
  function getBaseUrl() {
    return cache.baseUrl || 'https://learn.deeplearning.ai';
  }

  /**
   * Get courses filtered by category
   */
  async function getCoursesByCategory(category) {
    const data = await loadCourses();
    return data.courses.filter(course => course.category === category);
  }

  /**
   * Get courses filtered by career path
   */
  async function getCoursesByCareerPath(pathId) {
    const data = await loadCourses();
    return data.courses.filter(course =>
      course.career_paths && course.career_paths.includes(pathId)
    );
  }

  /**
   * Get courses filtered by difficulty
   */
  async function getCoursesByDifficulty(difficulty) {
    const data = await loadCourses();
    return data.courses.filter(course =>
      course.difficulty?.toLowerCase() === difficulty.toLowerCase()
    );
  }

  /**
   * Get courses filtered by partner
   */
  async function getCoursesByPartner(partner) {
    const data = await loadCourses();
    return data.courses.filter(course =>
      course.partner?.toLowerCase() === partner.toLowerCase()
    );
  }

  /**
   * Get courses by tag
   */
  async function getCoursesByTag(tag) {
    const data = await loadCourses();
    return data.courses.filter(course =>
      course.tags && course.tags.includes(tag.toLowerCase())
    );
  }

  /**
   * Search courses by title or description
   */
  async function searchCourses(query) {
    const data = await loadCourses();
    const lowerQuery = query.toLowerCase();
    return data.courses.filter(course =>
      course.title.toLowerCase().includes(lowerQuery) ||
      (course.description && course.description.toLowerCase().includes(lowerQuery)) ||
      (course.tags && course.tags.some(tag => tag.includes(lowerQuery)))
    );
  }

  /**
   * Get course by ID
   */
  async function getCourseById(id) {
    const data = await loadCourses();
    return data.courses.find(course => course.id === id);
  }

  /**
   * Get all categories with metadata
   */
  async function getCategories() {
    return await loadCategories();
  }

  /**
   * Get career path by ID
   */
  async function getCareerPath(pathId) {
    const paths = await loadCareerPaths();
    return paths[pathId];
  }

  /**
   * Get all career paths
   */
  async function getAllCareerPaths() {
    return await loadCareerPaths();
  }

  /**
   * Get course prerequisites chain
   */
  async function getPrerequisiteChain(courseId) {
    const data = await loadCourses();
    const chain = [];
    const visited = new Set();

    function buildChain(id) {
      if (visited.has(id)) return;
      visited.add(id);

      const course = data.courses.find(c => c.id === id);
      if (!course) return;

      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereqId of course.prerequisites) {
          buildChain(prereqId);
        }
      }
      chain.push(course);
    }

    buildChain(courseId);
    return chain;
  }

  /**
   * Get recommended next courses
   */
  async function getRecommendedNext(courseId) {
    const course = await getCourseById(courseId);
    if (!course || !course.recommended_next) return [];

    const data = await loadCourses();
    return course.recommended_next
      .map(id => data.courses.find(c => c.id === id))
      .filter(Boolean);
  }

  /**
   * Build a dependency graph for visualizations
   * Returns nodes and edges suitable for graph libraries
   */
  async function buildDependencyGraph() {
    const data = await loadCourses();
    const nodes = [];
    const edges = [];

    data.courses.forEach(course => {
      nodes.push({
        id: course.id,
        label: course.title,
        category: course.category,
        difficulty: course.difficulty,
        paths: course.career_paths,
        duration: course.duration_hours
      });

      // Prerequisite edges
      if (course.prerequisites) {
        course.prerequisites.forEach(prereqId => {
          edges.push({
            source: prereqId,
            target: course.id,
            type: 'prerequisite'
          });
        });
      }

      // Recommended next edges
      if (course.recommended_next) {
        course.recommended_next.forEach(nextId => {
          edges.push({
            source: course.id,
            target: nextId,
            type: 'recommended'
          });
        });
      }
    });

    return { nodes, edges };
  }

  /**
   * Get skills across all courses
   */
  async function getAllSkills() {
    const data = await loadCourses();
    const skillsMap = new Map();

    data.courses.forEach(course => {
      if (course.skills_gained) {
        course.skills_gained.forEach(skill => {
          if (!skillsMap.has(skill)) {
            skillsMap.set(skill, []);
          }
          skillsMap.get(skill).push(course.id);
        });
      }
    });

    return skillsMap;
  }

  /**
   * Get all unique partners
   */
  async function getAllPartners() {
    const data = await loadCourses();
    const partners = new Set();
    data.courses.forEach(course => {
      if (course.partner) partners.add(course.partner);
    });
    return Array.from(partners).sort();
  }

  /**
   * Get all unique tags
   */
  async function getAllTags() {
    const data = await loadCourses();
    const tags = new Set();
    data.courses.forEach(course => {
      if (course.tags) {
        course.tags.forEach(tag => tags.add(tag));
      }
    });
    return Array.from(tags).sort();
  }

  /**
   * Clear cache (useful for refresh)
   */
  function clearCache() {
    cache.courses = null;
    cache.categories = null;
    cache.paths = null;
    cache.externalResources = null;
    cache.baseUrl = null;
    cache.processedData = null;
  }

  // Public API
  return {
    // Core loaders
    loadCourses,
    loadCategories,
    loadCareerPaths,
    loadExternalResources,
    loadAll,
    loadProcessedData,
    
    // Getters
    getBaseUrl,
    getCoursesByCategory,
    getCoursesByCareerPath,
    getCoursesByDifficulty,
    getCoursesByPartner,
    getCoursesByTag,
    searchCourses,
    getCourseById,
    getCategories,
    getCareerPath,
    getAllCareerPaths,
    getPrerequisiteChain,
    getRecommendedNext,
    
    // Graph & analysis
    buildDependencyGraph,
    getAllSkills,
    getAllPartners,
    getAllTags,
    
    // Cache management
    clearCache
  };
})();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
