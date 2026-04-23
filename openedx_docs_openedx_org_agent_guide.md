# Open edX docs.openedx.org — Agent-Ready Repository Guide

> This file is a **practical, condensed map** of the `openedx/docs.openedx.org` repository for use by coding agents such as Antigravity.  
> It is **not** a verbatim export of the entire documentation corpus.  
> Instead, it captures the repository’s purpose, structure, build system, authoring workflow, and the main content areas so an agent can reason about the repo quickly and accurately.

- Repo: `https://github.com/openedx/docs.openedx.org`
- Public docs site: `https://docs.openedx.org`

---

## 1) What this repository is

This repository contains the **source files** for the main Open edX documentation website.

It is the documentation source for these audience areas:

- Educators
- Learners
- Site Operators
- Developers
- Documentors
- Translators
- Community / handbook / release notes

This is a **docs repo**, not the Open edX platform backend itself.

### Important distinction

If an agent is trying to:
- understand **how Open edX docs are organized** → this repo is the right place
- understand **how to run or extend the Open edX platform itself** → this repo helps, but the actual platform code lives elsewhere, especially:
  - `openedx/edx-platform`
  - `openedx/frontend-*`
  - `openedx/frontend-platform`
  - other Open edX services and libraries

---

## 2) What the repo is built with

This docs site is generated from source files using **Sphinx**.

Main facts:

- Primary authoring format: **reStructuredText (`.rst`)**
- Markdown support exists through **MyST parser**
- Theme: **sphinx-book-theme**
- Static docs build via Sphinx
- Local preview supported with `sphinx-autobuild`
- Read the Docs config is included in `.readthedocs.yaml`

### Core tooling visible in the repo

- `Makefile`
- `.readthedocs.yaml`
- `source/conf.py`
- `requirements/`
- `source/` (main docs content)

### Sphinx extensions configured

From `source/conf.py`, the repo uses extensions like:

- `sphinxcontrib.youtube`
- `sphinxcontrib.images`
- `sphinx_design`
- `sphinx_copybutton`
- `sphinx.ext.graphviz`
- `sphinx.ext.intersphinx`
- `sphinxext.rediraffe`
- `notfound.extension`
- `sphinx_tags`
- `sphinxemoji.sphinxemoji`
- `myst_parser`
- `linuxdoc.rstFlatTable`

This matters because an agent editing docs should preserve the authoring patterns those plugins enable.

---

## 3) Top-level repository layout

```text
docs.openedx.org/
├─ .github/
├─ requirements/
├─ source/
├─ .gitignore
├─ .readthedocs.yaml
├─ LICENSE
├─ Makefile
├─ README.rst
├─ catalog-info.yaml
└─ image_map.py
```

### What the top-level files do

#### `README.rst`
Explains:
- what the repo is
- who it serves
- how to contribute
- that docs are written in RST and built with Sphinx
- where to find local development guidance

#### `Makefile`
Used for:
- `make html`
- `make clean`
- `make help`
- `make serve_docs`
- dependency management targets like `make requirements` and `make upgrade`

#### `.readthedocs.yaml`
Defines:
- Read the Docs build config
- Python version used for builds
- Sphinx config file path
- search ranking adjustments for selected pages

#### `requirements/`
Contains pinned/build dependencies for the docs toolchain.

#### `source/`
This is the actual documentation content and Sphinx project root.

---

## 4) The `source/` tree — the part an agent should understand first

Top-level structure inside `source/`:

```text
source/
├─ _images/
├─ _static/
├─ _templates/
├─ _video_thumbnail/
├─ community/
├─ developers/
├─ documentors/
├─ educators/
├─ handbook/
├─ learners/
├─ other/
├─ site_ops/
├─ translators/
├─ conf.py
├─ glossary.rst
├─ index.rst
├─ links.txt
├─ maintenance_chart_checker.py
└─ substitutions.txt
```

### What each important folder is for

#### `_images/`
Image assets used throughout the docs.

#### `_static/`
Custom CSS/JS/static assets for the Sphinx site.

#### `_templates/`
Sphinx HTML templates / overrides.

#### `community/`
Community-facing documentation, including release notes and broader project material.

#### `developers/`
Docs for software developers extending, contributing to, or integrating with Open edX.

#### `documentors/`
Docs for people writing and maintaining the Open edX documentation itself.

#### `educators/`
Docs for course authors and education-side usage.

#### `handbook/`
Core contributor / handbook content.

#### `learners/`
Docs for learners using Open edX.

#### `site_ops/`
Docs for operators deploying/configuring/running Open edX installations.

#### `translators/`
Docs for translation workflows.

#### `index.rst`
The homepage / main information architecture entry point.

#### `glossary.rst`
Cross-cutting glossary.

#### `links.txt` and `substitutions.txt`
Reusable references and substitutions shared across docs.

#### `conf.py`
The Sphinx project configuration file.

---

## 5) Information architecture of the docs site

The main homepage (`source/index.rst`) routes readers into role-based sections and quick starts.

High-level entry areas:

- Quick Starts
- Role Guides
- Core Contributors Handbook
- Release Notes
- Help & Feedback

### Role guide entry points

The main role buckets are:

- Community
- Educators
- Learners
- Site Operators
- Developers
- Documentors
- Translators

That means an agent should not treat this repo as a linear manual.  
It is closer to a **role-based documentation portal**.

---

## 6) What is inside each major docs area

## 6.1 Developers

Developer docs include several layers:

- Quick starts
- How-tos
- Concepts
- References
- Maintainer docs

Key things surfaced from the developer home:

- first Open edX PR
- contributing quick starts
- Tutor quick starts
- platform overview
- backend layout and approach
- hooks extension framework
- design tokens
- developer guide
- running PR tests
- maintainer tasks and repo maintenance

### Very important platform facts for agents

From the platform overview:

- Open edX is made of **multiple web services**
- Backend services are mostly **Django**
- Frontends are increasingly **React-based MFEs**
- Core repositories highlighted in docs:
  - `openedx-platform`
  - `frontend-platform`
- The legacy monolith in `openedx-platform` can run as:
  - **LMS**
  - **Studio**

### Strong architectural implication

If an agent is working on a custom Open edX solution:
- this repo explains the ecosystem
- but real platform implementation work will usually touch:
  - `openedx/edx-platform`
  - MFE repos (`frontend-app-*`)
  - Tutor / deployment docs
  - extension/plugin docs

### Extension-first guidance

Developer docs explicitly lean toward **extending** the platform rather than patching core whenever possible, using things such as:

- frontend plugin slots
- XBlocks
- hooks extension framework
- design tokens

That is important because an agent should not default to invasive core changes.

---

## 6.2 Site Operators

Site operator docs are about deployment, configuration, and running an Open edX site.

High-level areas include:

- Tutor docs / Tutor quickstarts
- installing, configuring, and running the platform
- operational how-tos
- references and concepts for operators

### Practical implication

If an agent needs to:
- deploy Open edX
- run it locally
- configure services
- operate production-ish instances

then it should mine `site_ops/` first.

---

## 6.3 Educators

Educator docs cover course creation and management.

Main buckets include:

- creating a course
- learner engagement and communication
- content creation and management
- components and activities
- data and analytics
- accessibility
- advanced course features
- OLX (Open Learning XML)

### Practical implication

If an agent needs course-authoring knowledge, course structure knowledge, or educator workflows, `educators/` is the right branch.

---

## 6.4 Learners

Learner docs cover:

- dashboard/profile
- enrolling
- prerequisites
- course start and progress
- certificates
- video player
- discussions
- assignments
- ORA
- Google Docs usage
- teams
- bookmarks
- notes
- notifications
- wiki
- licensing

### Practical implication

If the goal is learner-facing UX or documentation mapping, use `learners/`.

---

## 6.5 Documentors

This is the most relevant area if the task is to edit or generate docs in this repository.

Documentor docs include:

- first documentation PR
- update docs through GitHub
- add a new doc
- local docs development
- style guide
- templates
- checklist
- maintenance guidance
- documentation standards
- audience guidance
- quick reference
- documentation decisions

### Practical implication

If an agent is changing this repo, `documentors/` should be treated as the local ruleset.

---

## 6.6 Community / Handbook / Translators

These sections support:
- project/community-level material
- core contributor onboarding and handbook content
- translation workflows

An agent should consult these areas when a request is governance/community-process oriented rather than technical.

---

## 7) How to build the docs locally

This repo is intended to be built locally with Sphinx.

## 7.1 Environment assumptions

The local development guide assumes:

- Mac or Linux
- comfort with command line
- Git installed
- Python matching the version in `.readthedocs.yaml`

At the moment, `.readthedocs.yaml` uses **Python 3.12**, and the local docs guide examples also use Python 3.12.

## 7.2 Basic local setup flow

Typical flow:

```bash
git clone git@github.com:openedx/docs.openedx.org.git
cd docs.openedx.org
python3.12 -m venv .venv
source .venv/bin/activate
make requirements
make clean
make html
make serve_docs
```

Then preview locally at:

```text
http://127.0.0.1:8000
```

### Notes

- `make html` performs a full docs build.
- `make serve_docs` runs a live local preview.
- For large structural changes, the docs recommend stopping the live server and rebuilding with:
  - `make clean`
  - `make html`

### Why this matters to an agent

If an agent edits this repo, it should assume that:
- build warnings matter
- cross-references and link structures can break builds
- a final validation pass should include a clean rebuild

---

## 8) What the Makefile implies

The `Makefile` shows a standard Sphinx-oriented workflow plus requirement maintenance.

Key commands:

```bash
make help
make requirements
make clean
make html
make serve_docs
make upgrade
```

### What they mean

- `make requirements`
  - installs/syncs doc build dependencies

- `make html`
  - builds the HTML output

- `make serve_docs`
  - launches an auto-rebuilding preview server

- `make upgrade`
  - updates requirement lock files through `pip-compile`

### Practical implication for an agent

If the task is:
- write docs only → likely `make html`
- work interactively on docs → `make serve_docs`
- change dependency pins/tooling → `make upgrade`

---

## 9) Sphinx configuration behavior agents should know

From `source/conf.py`:

### Theme / repo integration
The site is configured to expose repo-aware buttons like:
- repository button
- issues button
- edit page button

That means each page is intended to be directly editable from GitHub.

### Cross-repo docs linking
The config uses **intersphinx** mappings to other Open edX docs projects, including:

- `edx-platform`
- `xblock`
- `openedx-events`
- `openedx-filters`
- `edx-django-utils`
- `credentials`
- `authz`
- and others

This is important because not all Open edX docs live here.

### Redirects
The repo uses `rediraffe` redirects.  
So if an agent renames or moves docs, redirect handling may matter.

### Tags / metadata
The docs use role/content tags such as:

- educator
- developer
- site operator
- documentor
- translator
- concept
- how-to
- quickstart
- reference

This is useful when preserving content classification.

### Static customization
Custom assets are loaded from:
- `_static`
- custom CSS
- custom JS

---

## 10) How authors are expected to work in this repo

The repository is designed for both browser-based edits and local development.

## 10.1 Lightweight contribution path
A contributor can:
- browse docs site
- click “suggest edit”
- edit in GitHub
- create a branch
- submit a PR

## 10.2 Local authoring path
A contributor can:
- clone repo
- create virtualenv
- install requirements
- edit docs locally
- run `make html`
- preview with `make serve_docs`
- submit PR

### Agent guidance
If Antigravity is editing the repo:
- prefer minimal, scoped changes
- preserve existing doc patterns
- keep content in the correct audience folder
- do not invent new structure if an existing section already fits
- respect role + doc-type organization

---

## 11) How this repo is organized conceptually

This repo is not organized purely by product module or code service.

It is organized mainly by **audience** and **doc type**.

### Audience axis
- educator
- learner
- site operator
- developer
- documentor
- translator
- community/core contributor

### Doc type axis
Within those areas, content usually falls into:
- quickstarts
- how-tos
- concepts
- references

### Why this matters
When generating or moving docs, an agent should usually answer two questions first:

1. **Who is this for?**
2. **What kind of document is it?**
   - quickstart
   - how-to
   - concept
   - reference

That usually tells the agent where the content belongs.

---

## 12) What this repo does NOT contain completely

An agent should not over-assume.

This repo does **not** contain all implementation details for the entire Open edX ecosystem in one place.

Important limits:

- many component-specific docs live in other repos
- much platform implementation lives in `openedx/edx-platform`
- many frontend apps live in separate MFE repos
- Tutor has its own docs site
- not every operational or API detail is centralized here

### Practical implication
If a task requires exact code-level implementation:
- use this repo as the map
- then branch into the component repo or external docs it references

---

## 13) Best-use strategy for Antigravity

If you are giving this repo to an agent, the most effective operating model is:

## 13.1 For documentation edits
1. Read `source/index.rst`
2. Read the relevant audience home page
3. Read `documentors/` standards and style docs
4. Edit the target `.rst` or `.md` file
5. Build with `make html`
6. Fix warnings/errors
7. Submit changes

## 13.2 For Open edX architecture understanding
1. Read `developers/concepts/platform_overview.rst`
2. Read `developers/quickstarts/*`
3. Read `site_ops/*` if deployment is involved
4. Jump to linked repos/docs for implementation specifics

## 13.3 For course/learning UX understanding
1. Read `learners/`
2. Read `educators/`
3. Cross-map terminology with `glossary.rst`

---

## 14) Recommended reading order for an agent

If the goal is to understand the repo fast, read in this order:

1. `README.rst`
2. `source/index.rst`
3. `source/conf.py`
4. `source/documentors/index.rst`
5. `source/documentors/how-tos/develop_docs_locally.rst`
6. `source/developers/index.rst`
7. `source/developers/concepts/platform_overview.rst`
8. `source/site_ops/index.rst`
9. `source/educators/index.rst`
10. `source/learners/index.rst`

---

## 15) Quick operational cheat sheet

## Clone and prepare
```bash
git clone git@github.com:openedx/docs.openedx.org.git
cd docs.openedx.org
python3.12 -m venv .venv
source .venv/bin/activate
make requirements
```

## Build docs
```bash
make clean
make html
```

## Preview docs locally
```bash
make serve_docs
```

## Common mental model
- `source/` = content
- `conf.py` = Sphinx behavior
- `documentors/` = rules for editing docs
- `developers/` = architecture and contribution paths
- `site_ops/` = deployment/operations knowledge
- `educators/` + `learners/` = end-user/product usage knowledge

---

## 16) Guidance for tasks Antigravity should perform well

Antigravity should do well on tasks like:

- find where a new doc belongs
- update an existing doc page
- add a quickstart/how-to/reference in the correct area
- preserve Sphinx authoring patterns
- reason about Open edX docs structure
- build an internal docs map
- point from this repo to the correct implementation repo

Antigravity should be cautious on tasks like:

- assuming this repo alone contains all platform source truth
- making architecture claims without checking linked component repos
- inventing new doc IA without checking existing audience/doc-type structure
- rewriting large sections without checking style and reference consistency

---

## 17) Suggested prompts to give Antigravity

### Prompt A — understand the repo
```text
Read this repository as the source for the main Open edX documentation site.
Build a mental model of:
- repo purpose
- docs information architecture
- main audience sections
- build process
- contribution workflow
Then summarize where a new document should live depending on whether it is a quickstart, how-to, concept, or reference.
```

### Prompt B — update docs safely
```text
You are editing the Open edX docs source repo.
Before making any change:
1. identify the audience folder
2. identify doc type (quickstart/how-to/concept/reference)
3. preserve local style and Sphinx patterns
4. avoid introducing broken cross-references
5. prefer minimal edits over structural rewrites
After changes, run the equivalent of a clean docs build check.
```

### Prompt C — use this repo as a map, not the whole platform
```text
Use this repository to understand how Open edX documentation is organized.
Do not assume it contains every implementation detail.
When code-level details are required, identify and name the likely component repo or external docs source that should be consulted next.
```

---

## 18) Short conclusion

This repository is the **documentation source portal** for Open edX, organized mainly by **audience** and **doc type**, built with **Sphinx**, and intended for both GitHub-based and local contribution workflows.

For agents:
- use it as the **docs source of truth**
- use it as a **map to the broader Open edX ecosystem**
- do **not** confuse it with the main platform runtime codebase

---

## 19) High-signal file list

```text
README.rst
Makefile
.readthedocs.yaml
source/index.rst
source/conf.py
source/documentors/index.rst
source/documentors/how-tos/develop_docs_locally.rst
source/developers/index.rst
source/developers/concepts/platform_overview.rst
source/site_ops/index.rst
source/educators/index.rst
source/learners/index.rst
source/glossary.rst
source/links.txt
source/substitutions.txt
```

---

## 20) Final note

If you need a **deeper machine-ingestible export**, the next logical step is:

1. crawl the repo file tree
2. convert each `.rst` page to normalized markdown or plain text
3. preserve original path metadata
4. build a searchable index by:
   - audience
   - doc type
   - section title
   - path
   - outbound references

This file is the planning layer that helps an agent do that correctly.
