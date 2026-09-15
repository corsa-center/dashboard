# Website Categories

This folder is the home of the JSON file containing the info for the software catalog categories used internally by the catalog to group repositories by topic. If any edits need to be made to these categories, just edit the data in the JSON. (These catalog categories/topics are separate from the category tags on News posts.)

A repository can have up to 20 tags. The list below also contains each category's blurb to ensure consistency in phrasing and length. Note that in some cases the category is plural but the corresponding tag is singular.

For each category, this file contains its title, [icon][icon dir] filepath, and category description. This data is read by the [catalog javascript][js dir].

- **Artificial Intelligence**: Domain-aware methods to ingest scientific knowledge and robust Machine Learning techniques that aid in simulation and automating scientific and engineering processes - `artificial-intelligence`, `evolutionary-algorithms`, `intelligent-agents`, `machine-learning`, `clustering`, `neuromorphic-computing`, `reduced-order-models`, `text-analysis`
- **Scientific Data Management**: Robust systems which capture both the data and metadata needed for secure storage, searchability and harmonization throughout the data’s lifecycle - `data-enclave`, `data-integration`, `data-lifecycle management`, `data-storage-systems`, `in-situ-and-in-transit-workflows`, `intelligent-data-management`, `intelligent-automated-archives`, `knowlege-management`, `portals`, `storage-and-io`, `workflow-automation`
- **Data Analysis & Visualization**: Manage visualizations with robust features and configurable analysis - `data-reduction`, `data-ingest-and-cross-validation`, `data-services`, `data-visualization`, `design-of-experiments`, `feature-extraction`, `in-situ-analysis`, `metadata-management`, `information-visualization`, `portals`, `scientific-visualization`, `statistical-analysis`, `visual-analytics`
- **Performance & Correctness Tools**: Tools that can be applied to monitor, analyze, and diagnose performance and behavior of computational science applications and systems - `performance`, `correctness`, `autotuning`, `behavior`
- **Programming Systems**: Programming Systems are the first point of contact in human-computer interactions, and never ceased to evolve along with hardware and software technology" - `compilers`, `programming-languages`, `programming-models`
- **Math & Physics Libraries**: Robust mathematical techniques and numerical algorithms to reliably address the challenges of large-scale simulation of complex physical phenomena - `numerical-optimization`, `problem-discretization`, `algebraic-systems`, `uncertainty-quantification`

To add a new category to the catalog:

1. Update this README with the category name (in alphabetical order), description, and tag.
2. Add the new icon (.svg) to [Assets > Images > Categories][icon dir].
3. Update [`category_info.json`](category_info.json) with category metadata such as image file path, descriptive blurb, and corresponding topic(s).
4. Tag repos with the new topic as appropriate.

[icon dir]: ../assets/images/categories/
[js dir]: ../js/catalog.js
