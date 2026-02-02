# HDF5 Metrics

This directory contains metrics data for the HDF5 software package.

## File Structure

- `metrics.json` - Contains all metrics data organized by dimension (Impact, Sustainability, Quality)

## Metrics JSON Structure

The `metrics.json` file follows this structure:

```json
{
  "package": "HDFGroup/hdf5",
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
  "sustainability": {
    "4.2.1": {
      "title": "Codes of Conduct (CoC), Governance, and Contributor Guidelines",
      "data": null
    },
    ...
  },
  "quality": {
    "4.3.1": {
      "title": "Reliability and Robustness",
      "data": null
    },
    ...
  }
}
```

## Adding Metrics Data

To add metrics data:

1. Edit `metrics.json`
2. Update the `"data"` field for any metric
3. Use `null` for metrics not yet available
4. The `"data"` field can contain HTML, text, or structured content

### Example with Data

```json
{
  "package": "HDFGroup/hdf5",
  "impact": {
    "4.1.1": {
      "title": "Software Citation and Adoption",
      "data": "<p><strong>Citations:</strong> 1,234 papers</p><p><strong>Downloads:</strong> 50,000+ per month</p>"
    }
  }
}
```

## How It Renders

- When `data` is `null`: Shows placeholder "Metrics data will be displayed here"
- When `data` is populated: Displays the content in a styled metrics card
