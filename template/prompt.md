You are working inside the existing Angular 22 PostpartumRAG project.

Your task is to build a new **Evidence Library** page at:

`/evidence`

and integrate navigation to it from the existing application.

IMPORTANT:

Do NOT redesign the existing Landing Page.
Do NOT redesign the existing Clinical Workspace.
Do NOT introduce a dashboard-style layout.
Do NOT add a sidebar.
Do NOT change the existing visual identity.

The new page must feel like a natural third page of the same product.

---

# PRODUCT CONTEXT

Product:

**PostpartumRAG**

Tagline:

**Grounded, not guessed.**

The product is an evidence-grounded RAG system for postpartum mental health.

Its core workflow is:

**Question → Retrieval → Grounded Answer → Citation → Source**

The Evidence Library is where the user can inspect the source documents that power the RAG system.

This page should communicate:

**“These are the sources behind the answers.”**

---

# EXISTING VISUAL IDENTITY

The current application already has an approved visual style.

Preserve it:

* warm cream / off-white background
* dark navy / deep text
* soft purple accent
* serif brand/title typography where already used
* clean sans-serif body typography
* thin subtle borders
* rounded cards
* generous whitespace
* minimal shadows
* calm, premium, editorial feel

Do NOT introduce:

* gradients
* neon colors
* heavy glassmorphism
* data dashboards
* excessive icons
* large illustrations
* stock healthcare imagery

The Evidence Library should look like it belongs to the same product as:

`/`
and
`/workspace`

---

# FIRST: INSPECT THE PROJECT

Before making changes:

1. Inspect the existing Angular 22 structure.
2. Locate:

   * landing page
   * clinical workspace
   * router configuration
   * shared layout/components/styles
3. Reuse the existing design tokens and components.
4. Do not create duplicate branding components if they already exist.
5. Do not install unnecessary packages.

---

# ROUTING

Create a route:

`/evidence`

Example conceptual route:

```ts
{
  path: 'evidence',
  loadComponent: () =>
    import('./features/evidence-library/pages/evidence-library.component')
      .then(m => m.EvidenceLibraryComponent)
}
```

Use the project's existing routing architecture and lazy loading style.

---

# NAVIGATION — HOW USERS REACH THE PAGE

There must be two obvious entry points.

## 1. LANDING PAGE

The existing Landing Page already has a navigation item:

**Evidence**

Make this navigate to:

`/evidence`

Do NOT redesign the landing page.

Only wire the existing Evidence navigation element to the route.

If it currently has no actual routing, add Angular Router navigation.

---

## 2. CLINICAL WORKSPACE

The existing `/workspace` page currently has a:

**← Back to Home**

control.

Do NOT remove the ability to go home.

Add a lightweight text navigation option:

**Evidence Library**

Place it in the existing top/header area without changing the workspace layout.

Recommended visual arrangement:

```text
PostpartumRAG                         Evidence Library
Grounded, not guessed.                  ← Back to Home
```

or another equally minimal arrangement that fits the existing header.

Clicking:

**Evidence Library**

must navigate to:

`/evidence`

Clicking:

**← Back to Home**

must continue navigating to:

`/`

Do not add a sidebar.

Do not add a large CTA.

---

# EVIDENCE LIBRARY PAGE

Create:

## Header

Brand:

**PostpartumRAG**

Tagline:

**Grounded, not guessed.**

Right side:

**← Back to Home**

Optionally include the current minimal navigation style used by the application.

---

# HERO / INTRO

Main heading:

**Evidence Library**

Supporting text:

**Explore the clinical guidelines behind PostpartumRAG’s evidence-grounded answers.**

Secondary supporting text:

**Each source is organized by document, section, page, and indexed content so evidence can be traced and verified.**

Keep this section compact.

Do not make it feel like a marketing hero.

---

# SOURCE FILTER / SEARCH

Create a simple search field:

Placeholder:

**Search documents, sections, or topics...**

Add lightweight source filters:

**All**

**NICE**

**WHO**

The filters should be visually subtle.

No complicated filter sidebar.

---

# SOURCE LIST

Display the currently indexed guideline sources as clean cards.

For the current project, the primary known sources are:

### NICE CG192

Title:

**Antenatal and postnatal mental health**

Metadata:

**Clinical Guideline**

Show:

* Source: NICE
* Sections: example count
* Pages: example count
* Indexed status

CTA:

**Explore Source →**

---

### WHO mhGAP

Title:

**mhGAP Intervention Guide**

Metadata:

**Clinical Guideline**

Show:

* Source: WHO
* Sections: example count
* Pages: example count
* Indexed status

CTA:

**Explore Source →**

---

IMPORTANT:

Do not invent unsupported real statistics.

For values such as section count, page count, or chunk count:

* use clearly marked demo/mock values
* or derive them from local project data if already available

Do not claim fake production metrics.

---

# SOURCE CARD DESIGN

Each card should contain:

### Source organization

NICE / WHO

### Document title

Example:

**Antenatal and postnatal mental health**

### Document metadata

* Clinical Guideline
* Indexed
* Source URL if available

### Traceability

Show:

**Document → Sections → Pages → Chunks**

But keep this visual, not technical.

Example:

`Document`
`Sections`
`Pages`
`Indexed chunks`

The page should visually reinforce the project's traceability model.

---

# SOURCE DETAIL VIEW

When the user clicks:

**Explore Source →**

Do NOT navigate to an unrelated external website immediately.

Create an internal source detail experience.

Preferred route:

`/evidence/:sourceId`

For example:

`/evidence/nice-cg192`

Use the same application shell.

---

# SOURCE DETAIL PAGE

Header:

**NICE CG192**

Subtitle:

**Antenatal and postnatal mental health**

Then show:

**Source**
NICE

**Document**
NICE CG192

**Type**
Clinical Guideline

**Source URL**
Open source →

---

# SECTIONS

Display:

**Document Sections**

Example:

**1. Principles of care**

**2. Assessment**

**3. Postnatal mental health**

Each section should show:

* section title
* page reference
* indexed status

Example:

`Page 18`

`Indexed`

Clicking a section should open/expand it.

---

# CHUNK / EVIDENCE PREVIEW

When a section is expanded, show a compact evidence preview.

Conceptually:

```text
Postnatal mental health

Page 18

Relevant indexed passage

[short demo excerpt]

Chunk ID:
nice-cg192-sec3-...
```

Do not display huge amounts of text.

The goal is to demonstrate that the system indexes content at a granular level.

---

# SOURCE TRACEABILITY

Include a subtle visual explanation:

**How evidence is organized**

```text
Document
   ↓
Section
   ↓
Page
   ↓
Chunk
```

This should feel like product UX, not a technical diagram.

---

# CONNECTION TO THE RAG WORKSPACE

Create a CTA on the detail page:

**Ask a Question About This Source →**

Clicking it should navigate to:

`/workspace`

Optionally preserve the selected source context in the URL or local state if the project's architecture already supports it.

Do not implement real filtering/retrieval yet.

This is only a clean navigation foundation for future integration.

---

# DATA ARCHITECTURE

Do not hardcode the entire page directly inside the template.

Create typed models.

Example:

```ts
export interface EvidenceSource {
  id: string;
  organization: string;
  documentName: string;
  title: string;
  type: string;
  sourceUrl?: string;
  sections: EvidenceSection[];
}

export interface EvidenceSection {
  id: string;
  title: string;
  pageNumber: number;
  indexed: boolean;
  chunkCount?: number;
  excerpt?: string;
}
```

Use mock/local data for now.

Keep all mock data isolated in a service.

Suggested structure:

```text
features/
└── evidence-library/
    ├── components/
    │   ├── evidence-header.component.ts
    │   ├── evidence-search.component.ts
    │   ├── evidence-source-card.component.ts
    │   ├── evidence-section-list.component.ts
    │   └── evidence-detail.component.ts
    │
    ├── models/
    │   ├── evidence-source.model.ts
    │   └── evidence-section.model.ts
    │
    ├── services/
    │   └── evidence-library.service.ts
    │
    └── pages/
        ├── evidence-library.component.ts
        └── evidence-source-detail.component.ts
```

Adapt this to the project's actual architecture instead of blindly duplicating structure.

---

# SEARCH AND FILTER BEHAVIOR

Implement local frontend filtering for now.

Search should match:

* organization
* document title
* document name
* section title

Filters:

**All / NICE / WHO**

Use Angular Signals for the local state.

No backend required.

---

# RESPONSIVE DESIGN

Desktop:

* centered content
* two-column source card grid if appropriate

Tablet:

* responsive 2 → 1 column transition

Mobile:

* single-column cards
* clean compact header
* search remains prominent
* source detail sections stack vertically

Do not simply shrink the desktop design.

---

# INTERACTION DETAILS

Use subtle motion only:

* source cards fade/translate slightly on entry
* hover state
* filter transition
* section expand/collapse
* route transition if already supported

No excessive animations.

---

# ACCESSIBILITY

Implement:

* semantic headings
* accessible buttons
* keyboard navigation
* visible focus states
* accessible expandable sections
* sufficient contrast

---

# IMPORTANT DESIGN RULE

This page is NOT:

* an admin dashboard
* analytics
* a document management system
* a generic PDF viewer

It is:

**A trusted evidence library for the clinical RAG system.**

The user should understand within seconds:

**“These are the documents the AI relies on, and I can trace them down to sections and pages.”**

---

# ACCEPTANCE CRITERIA

The implementation is complete when:

[ ] `/evidence` exists

[ ] Landing Page “Evidence” navigates to `/evidence`

[ ] Workspace contains a lightweight “Evidence Library” navigation link

[ ] Workspace “Back to Home” still works

[ ] Evidence Library matches the existing visual identity

[ ] NICE and WHO source cards are displayed

[ ] Search works

[ ] NICE / WHO filters work

[ ] Source detail route exists

[ ] Source sections are displayed

[ ] Page numbers are visible

[ ] Evidence/chunk preview is represented

[ ] “Ask a Question About This Source” navigates to `/workspace`

[ ] Existing Landing Page remains unchanged visually

[ ] Existing Clinical Workspace remains unchanged visually except for the new navigation link

[ ] No unnecessary libraries are installed

[ ] TypeScript is strictly typed

[ ] Angular build succeeds

[ ] No console/template errors

---

# FINAL STEP

After implementing:

1. Run the Angular project.
2. Test:
   `/`
   `/workspace`
   `/evidence`
   `/evidence/nice-cg192`
3. Verify all navigation links.
4. Verify responsive behavior.
5. Verify search/filter interactions.
6. Fix any TypeScript, routing, template, or SCSS errors.
7. Report exactly which files were created/modified.

Do not modify unrelated features.
