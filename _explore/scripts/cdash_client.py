"""Live CDash GraphQL checks.

Replaces the hand-maintained "does this repo publish clang-tidy metrics"
CSV flag with a live query: a project publishes clang-tidy metrics via
CDash if any of its recent builds have a file object attached.
"""

import json
from urllib.parse import urlsplit, parse_qs

import requests

RECENT_BUILDS_SAMPLE = 200


def _graphql_endpoint(cdash_url):
    parts = urlsplit(cdash_url)
    return "%s://%s/graphql" % (parts.scheme, parts.netloc)


def _project_name(cdash_url):
    return parse_qs(urlsplit(cdash_url).query).get("project", [None])[0]


def _builds_query(project_name, sample, order_by):
    # Older CDash instances (e.g. cdash.spack.io) don't support `orderBy` on
    # `builds`, so callers retry without it rather than treat that as unreachable.
    order_clause = ", orderBy: [{ column: SUBMISSION_TIME, order: DESC }]" if order_by else ""
    return """
query {
  project(name: %s) {
    builds(first: %d%s) {
      edges { node { files { edges { node { id } } } } }
    }
  }
}""" % (json.dumps(project_name), sample, order_clause)


def _post_graphql(cdash_url, query, timeout):
    try:
        response = requests.post(
            _graphql_endpoint(cdash_url),
            json={"query": query},
            headers={"Content-Type": "application/json", "Accept": "application/json"},
            timeout=timeout,
        )
        response.raise_for_status()
        return response.json()
    except (requests.RequestException, ValueError):
        return None


def has_recent_file_upload(cdash_url, sample=RECENT_BUILDS_SAMPLE, timeout=20):
    """Check whether a CDash project has uploaded a file (e.g. clang-tidy
    output) on any of its `sample` most recent builds.

    Returns True/False when the check succeeds, or None if the project
    couldn't be identified or the CDash instance couldn't be reached/queried
    (network error, firewall block, unsupported schema, unknown project) --
    callers should fall back to the last-known value in that case rather
    than treat it as "no".
    """
    project_name = _project_name(cdash_url)
    if not project_name:
        return None

    for order_by in (True, False):
        data = _post_graphql(cdash_url, _builds_query(project_name, sample, order_by), timeout)
        if data is None:
            return None
        if "errors" in data:
            continue
        project = data.get("data", {}).get("project")
        if project is None:
            return None
        return any(edge["node"]["files"]["edges"] for edge in project["builds"]["edges"])
    return None
