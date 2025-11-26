# AI Agent Workflow Log

## Agents Used
- **Gemini (Google)**: Primary agent for architectural planning, code generation, and refactoring.

## Context Analysis
Analyzed `app.js` and `index.html` to understand existing domain logic and UI requirements.

---

## Prompts & Outputs

### **Example 1: Architectural Scaffolding**
**Prompt:**
> "Refactor the provided app.js logic into a Node.js backend using Hexagonal Architecture. Define entities for Route and ComplianceBalance. Create a repository interface for PostgreSQL."

**Output (Snippet):**
```ts
// domain/entities.ts
export class Route {
  constructor(
    public id: string,
    public vesselType: string,
    public ghgIntensity: number,
    // ...
  ) {}
}

// ports/RouteRepository.ts
export interface RouteRepository {
  findAll(): Promise<Route[]>;
  save(route: Route): Promise<void>;
}
```

---

### **Example 2: Frontend Logic Migration**
**Prompt:**
> "Convert the vanilla JS event listeners in app.js (like bankSurplus) into React custom hooks. Use Tailwind CSS for styling instead of the provided style.css."

**Refinement:**
The initial implementation used simple `useState`. I enhanced this to a `useCompliance` custom hook to separate computation logic from UI components for better maintainability and separation of concerns.

---

## Validation / Corrections
- **Validation:** Confirmed that the Compliance Balance formula in the generated TypeScript logic matches the reference in `2025-May-ESSF-SAPS-WS1-FuelEU-calculation-methodologies.pdf (Annex IV)`.
- **Correction:** The agent initially omitted the 2025 2% reduction target. I updated `ComplianceService` to dynamically apply the yearly reduction:

```
$91.16 * (1 - 0.02) = 89.3368
```

---

## Observations
### **Efficiency**
The agent efficiently transformed imperative DOM manipulation code into declarative React JSX, significantly reducing UI boilerplate work.

### **Challenges**
Mapping SQL schema definitions to Hexagonal Architecture entities required manual adjustments to ensure that **Adapter** layer implementations correctly converted DB rows into Domain objects.

---

## Best Practices Followed
- **Hexagonal Separation:** Domain logic (e.g., CB calculations) isolated from infrastructure (`Express/PostgreSQL`).
- **Type Safety:** TypeScript interfaces for all DTOs.
- **Mocking:** Mock Repository pattern used so frontend development could proceed prior to full database provisioning.

---

