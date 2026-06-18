# Contributing to ICT Helpdesk System

First off, thank you for considering contributing to the ICT Helpdesk System! 

## Development Process

1. **Fork** the repo on GitHub
2. **Clone** the project to your own machine
3. **Commit** changes to your own branch
4. **Push** your work back up to your fork
5. Submit a **Pull Request** so that we can review your changes

## Coding Standards

### HTML/CSS
- Use semantic HTML elements
- Do not use Tailwind/external CSS frameworks (per specification)
- Stick to the defined CSS variables in `main.css` for colors, spacing, and typography
- Ensure responsiveness across mobile, tablet, and desktop

### JavaScript
- Use ES6+ syntax (const/let, arrow functions, async/await)
- Keep functions small and focused
- Add standard JSDoc block comments to new functions
- Avoid global variables where possible (use the existing `window.DataService`, `window.UI` namespaces)
- No `console.log` in production code

### Pull Requests
- Fill out the provided Pull Request template completely
- Ensure all tests pass (`npm test`) before submitting
- PRs must receive at least one approval before being merged

## Bug Reports & Feature Requests

Please use the provided GitHub Issue templates to submit bug reports or feature requests. Provide as much detail as possible to help us reproduce the issue or understand the request.
