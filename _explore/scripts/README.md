# Software Portal Exploration Scripts

These are a set of scripts for updating the local github data in this repository, used as the source for displaying the content on software.ornl.gov

## Getting Started

```
# Create a Python virtual environment
virtualenv -p python3 venv

# Activate the virtual environment
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run the collection script
./UPDATE.sh
```

## Cronjob

The `cron.sh` script can be a useful utility for automatically running the collection script and pushing it to your remote repositories - view the comments in the file for more details on how to set it up.
