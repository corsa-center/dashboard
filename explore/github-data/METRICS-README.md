# Software Package Metrics

This directory contains individual metrics directories for each software package in the CORSA dashboard.

## Directory Structure

Each software package has its own metrics directory following the naming convention:

```
explore/github-data/
  ├── {repository-name}-metrics/
  │   ├── metrics.json
  │   └── README.md
  ├── hdf5-metrics/
  │   ├── metrics.json
  │   └── README.md
  ├── trilinos-metrics/
  │   ├── metrics.json
  │   └── README.md
  └── ...
```

## Naming Convention

For a repository `Owner/Repository`:
- Extract the repository name: `Repository`
- Create a directory: `{repository-name}-metrics/`
- Place metrics in: `{repository-name}-metrics/metrics.json`

### Examples:
- `HDFGroup/hdf5` → `hdf5-metrics/metrics.json`
- `trilinos/Trilinos` → `Trilinos-metrics/metrics.json`
- `LLNL/sundials` → `sundials-metrics/metrics.json`

## Metrics JSON Structure

> [!NOTE]
> Throughout the metrics collection framework and sustainability dashboard, we refer to 'Ecosystem' in place of the CASS 'Sustainability' dimension.

Each `metrics.json` file contains three main dimensions:

```json
{
  "package": "Owner/Repository",
  "impact": {
    "4.1.1": {
      "title": "Software Citation and Adoption",
      "data": null
    },
    "4.1.2": {
      "title": "Field Research Impact",
      "data": null
    }
  },
  "ecosystem": {
    "4.2.1": {
      "title": "Codes of Conduct (CoC), Governance, and Contributor Guidelines",
      "data": null
    },
    "4.2.2": {
      "title": "Open-Source Licensing and FAIR Compliance",
      "data": null
    },
    "4.2.3": {
      "title": "Active Maintenance",
      "data": null
    },
    "4.2.4": {
      "title": "Engagement",
      "data": null
    },
    "4.2.5": {
      "title": "Outreach",
      "data": null
    },
    "4.2.6": {
      "title": "Welcomeness",
      "data": null
    },
    "4.2.7": {
      "title": "Collaboration",
      "data": null
    },
    "4.2.8": {
      "title": "Financial Sustainability",
      "data": null
    },
    "4.2.9": {
      "title": "Institutional & Organizational Support",
      "data": null
    },
    "4.2.10": {
      "title": "Project Longevity and Community Health",
      "data": null
    }
  },
  "quality": {
    "4.3.1": {
      "title": "Reliability and Robustness",
      "data": null
    },
    "4.3.2": {
      "title": "Development Practices",
      "data": null
    },
    "4.3.3": {
      "title": "Reproducibility",
      "data": null
    },
    "4.3.4": {
      "title": "Usability",
      "data": null
    },
    "4.3.5": {
      "title": "Accessibility",
      "data": null
    },
    "4.3.6": {
      "title": "Maintainability and Understandability",
      "data": null
    },
    "4.3.7": {
      "title": "Performance and Efficiency",
      "data": null
    }
  }
}
```

## Field Descriptions

### Top Level
- **package**: The repository identifier in `Owner/Repository` format

### Dimensions
1. **impact**: Measures software influence and adoption (4.1.x metrics)
2. **ecosystem**: Measures community health and longevity (4.2.x metrics)
3. **quality**: Measures technical excellence and usability (4.3.x metrics)

### Metric Objects
Each metric contains:
- **title**: Human-readable name
- **data**: Actual metrics data
  - `null`: Shows placeholder text
  - HTML/text string: Rendered in the metrics card

## Where These Files Come From

The `*-metrics/` directories aren't committed to this repository, and editing them here has no effect. The metrics collector ([corsa-center/metrics](https://github.com/corsa-center/metrics)) writes them into [corsa-center/metrics_data](https://github.com/corsa-center/metrics_data), and the Pages deployment copies each package's newest one in when it builds the site.

- **To add a package**, add its `package_config/*.yaml` entry to [corsa-center/metrics_packages](https://github.com/corsa-center/metrics_packages). The next collection run picks it up.
- **To change what a metric shows**, change the collector, or for a single package, use the `overrides` block of its package config.

## How the Dashboard Uses These Files

The dashboard JavaScript:
1. Takes repository name (e.g., `trilinos/Trilinos`)
2. Extracts repository part (`Trilinos`)
3. Loads `Trilinos-metrics/metrics.json`
4. Renders metrics with data or placeholders
5. Falls back gracefully if directory doesn't exist

## Metric Data

### Data Format Options

The `data` field supports:
- **HTML strings**: `"<p>Citations: 1,234</p>"`
- **Plain text**: `"No data available yet"`
- **null**: Shows default placeholder

## Example: Populated Metric

```json
"4.1.1": {
  "title": "Software Citation and Adoption",
  "data": "<p><strong>Academic Citations:</strong> 1,234 papers</p><p><strong>Monthly Downloads:</strong> 50,000+</p><p><strong>Major Users:</strong> NASA, CERN, DOE National Labs</p>"
}
```

## Directory Organization Benefits

This structure provides:
- **Clear separation** between software packages
- **Scalability** for additional files per package in the future
- **Simple maintenance** (each package isolated)
