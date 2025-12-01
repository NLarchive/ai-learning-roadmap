# 🤖 AI Learning Roadmap

> Interactive course visualization for DeepLearning.AI career paths

[![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Live-success)](https://nlarchive.github.io/ai-learning-roadmap/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

A beautiful, interactive web application that helps you navigate through 95+ AI/ML courses from DeepLearning.AI. Explore different career paths and visualize your learning journey through multiple view modes.

## ✨ Features

### 📚 Multiple Visualization Modes

- **Index View** - Categorized, searchable course list with filtering
- **Cards View** - Interactive course cards with sorting and filtering
- **Tree View** - Hierarchical career path visualization
- **Mind Map** - Organic tree-of-life knowledge graph (NEW!)
- **Timeline** - Train station metaphor for learning progression

### 🎯 Career Paths

- 🌳 **Common Core** - Essential foundations for all AI careers
- 🔧 **AI Product Engineer** - Building apps, RAG, APIs
- 🔬 **Model Architect** - Math, training, fine-tuning
- 🏢 **Enterprise AI Architect** - Security, governance, integration

### 🛠️ Technical Features

- Pure vanilla JavaScript - no frameworks required
- Modular component architecture
- Responsive design for all devices
- Dark mode support (via system preference)
- URL hash-based navigation
- Cached data loading for performance

## 🚀 Quick Start

### View Online

Visit: [https://nlarchive.github.io/ai-learning-roadmap/](https://nlarchive.github.io/ai-learning-roadmap/)

### Run Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/NLarchive/ai-learning-roadmap.git
   cd ai-learning-roadmap
   ```

2. Start a local server:
   ```bash
   # Using Python
   python -m http.server 8000

   # Or using Node.js
   npx serve
   ```

3. Open `http://localhost:8000` in your browser

## 📁 Project Structure

```
ai-learning-roadmap/
├── config-roadmap/           # Course and career path data
│   ├── courses-index.json    # 95+ courses with metadata
│   └── career-paths.json     # Career path definitions
├── css/
│   └── styles.css            # Main application styles
├── js/
│   └── app.js                # Main application entry point
├── ui-tabs/                  # Modular view components
│   ├── shared/               # Shared utilities
│   │   ├── data-loader.js    # Data fetching and caching
│   │   ├── utils.js          # Common helper functions
│   │   └── tab-navigation.js # Tab switching logic
│   ├── index-view/           # Text index component
│   │   ├── view.js
│   │   └── styles.css
│   ├── cards-view/           # Cards grid component
│   │   ├── view.js
│   │   └── styles.css
│   ├── tree-view/            # Career tree component
│   │   ├── view.js
│   │   └── styles.css
│   ├── graph-view/           # Mind map component
│   │   ├── view.js
│   │   └── styles.css
│   └── timeline-view/        # Timeline component
│       ├── view.js
│       └── styles.css
├── index.html                # Main entry point
├── LICENSE                   # MIT License
└── README.md                 # This file
```

## 🧩 Architecture

### Modular Design

Each view is a self-contained module that can be used independently:

```javascript
// Example: Using a view component
const container = document.getElementById('my-container');
await TextIndexView.init(container);
await TextIndexView.render();
```

### Shared Utilities

- **DataLoader** - Centralized data fetching with caching
- **Utils** - Common helpers (debounce, colors, formatting)
- **TabNavigation** - View switching with URL hash support

### Data Flow

```
config-roadmap/*.json → DataLoader → View Components → DOM
```

## 🎨 Customization

### Adding a New View

1. Create a folder in `ui-tabs/your-view/`
2. Add `view.js` and `styles.css`
3. Register in `index.html` and `app.js`
4. Add tab button in navigation

### Modifying Course Data

Edit `config-roadmap/courses-index.json`:

```json
{
  "id": "your-course",
  "title": "Course Title",
  "url": "/courses/your-course",
  "difficulty": "Beginner|Intermediate|Advanced",
  "category": "fundamentals|architecture|coding|...",
  "career_paths": ["trunk", "builder", "researcher", "enterprise"]
}
```

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

## 👤 Author

**Nicolas Larenas**

- GitHub: [@NLarchive](https://github.com/NLarchive)

## 🙏 Acknowledgments

- Course data sourced from [DeepLearning.AI](https://learn.deeplearning.ai)
- Icons via native emoji
- Inspired by various learning roadmap projects

---

Made with ❤️ for AI learners worldwide
