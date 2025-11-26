# Reflection on AI-Assisted Development

## Learning from AI Agents
Using AI agents during this project shifted the workflow from simply *writing code* to *curating architecture and validating domain knowledge*. The agent's ability to analyze both the FuelEU methodology PDF and the legacy `app.js` concurrently enabled accurate migration of the compliance formulas and domain calculations—typically the most error-prone part of such refactoring. Providing the regulation document as context significantly reduced hallucinations and produced formulas aligned with the official FuelEU methodology.

---

## Efficiency Gains
Tasks that would traditionally require several hours were completed in minutes:

- **CSS → Tailwind Migration**: The AI mapped values from `style.css`—such as custom teal color variables—to equivalent Tailwind utility classes, preserving the application's design system without manually writing custom CSS.
- **Boilerplate Generation**: The Express server scaffold and structured Hexagonal folder layout (`core/ports/adapters`) were generated instantly, enabling faster iteration.
- **Component Layout**: Automatic conversion of DOM manipulation code to declarative React components reduced UI wiring complexity.

Estimated savings: **4–6 hours** compared to manual front-end restructuring.

---

## Improvements for Next Time
While generation quality was high, repository structure separation was initially weak. To improve collaboration between developer and AI:

### **Iterative Prompting Strategy**
Start by asking the agent to build isolated **Core Domain logic**. Once validated, request Adapters and Infrastructure code. This prevents tightly coupled output and improves maintainability.

### **Test-Driven Generation**
Request Jest tests *before implementation*. This ensures correctness for edge cases such as:
- Negative compliance balance scenarios
- Reduced targets for future year adjustments
- Banking limitations and pool validation rules

This workflow mirrors Test-Driven Development and ensures the agent generates robust and verifiable logic.

---