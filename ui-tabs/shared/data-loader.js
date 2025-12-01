/**
 * Data Loader Module (Shared)
 * Handles loading and caching of course data from JSON files
 * This is a shared utility used by all view components
 */

const DataLoader = (() => {
  // Cache for loaded data
  const cache = {
    courses: null,
    careerPaths: null,
    baseUrl: null
  };

  // Configuration - paths relative to root
  const config = {
    coursesPath: './config-roadmap/courses-index.json',
    careerPathsPath: './config-roadmap/career-paths.json'
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
   * Load courses index data
   */
  async function loadCourses() {
    if (cache.courses) {
      return cache.courses;
    }

    const data = await fetchJSON(config.coursesPath);

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
   * Load career paths data
   */
  async function loadCareerPaths() {
    if (cache.careerPaths) {
      return cache.careerPaths;
    }
    cache.careerPaths = await fetchJSON(config.careerPathsPath);
    return cache.careerPaths;
  }

  /**
   * Load all data sources
   */
  async function loadAll() {
    const [courses, careerPaths] = await Promise.all([
      loadCourses(),
      loadCareerPaths()
    ]);
    return { courses, careerPaths };
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
   * Search courses by title or description
   */
  async function searchCourses(query) {
    const data = await loadCourses();
    const lowerQuery = query.toLowerCase();
    return data.courses.filter(course =>
      course.title.toLowerCase().includes(lowerQuery) ||
      (course.description && course.description.toLowerCase().includes(lowerQuery))
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
    const data = await loadCourses();
    return data.categories || {};
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

    async function buildChain(id) {
      if (visited.has(id)) return;
      visited.add(id);

      const course = data.courses.find(c => c.id === id);
      if (!course) return;

      if (course.prerequisites && course.prerequisites.length > 0) {
        for (const prereqId of course.prerequisites) {
          await buildChain(prereqId);
        }
      }
      chain.push(course);
    }

    await buildChain(courseId);
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
   * Clear cache (useful for refresh)
   */
  function clearCache() {
    cache.courses = null;
    cache.careerPaths = null;
    cache.baseUrl = null;
  }

  // Public API
  return {
    loadCourses,
    loadCareerPaths,
    loadAll,
    getBaseUrl,
    getCoursesByCategory,
    getCoursesByCareerPath,
    getCoursesByDifficulty,
    searchCourses,
    getCourseById,
    getCategories,
    getCareerPath,
    getAllCareerPaths,
    getPrerequisiteChain,
    getRecommendedNext,
    clearCache
  };
})();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = DataLoader;
}
