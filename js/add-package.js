/**
 * "Add a Package" form. Builds a package_config YAML file for
 * corsa-center/metrics_packages and a link to GitHub's new-file page with that
 * file filled in, so the submitter opens the pull request from their own
 * account. Nothing is sent anywhere by this page except read-only requests to
 * the public GitHub and GitLab APIs.
 */
(function () {
  'use strict';

  const PACKAGES_REPO = 'corsa-center/metrics_packages';
  const PACKAGES_BRANCH = 'main';
  const CONFIG_DIR = 'package_config';

  // Optional string fields, in the order they're written to the file.
  const REPO_FIELDS = ['default_branch', 'primary_language'];
  const LINK_FIELDS = ['cdash', 'documentation', 'homepage', 'spack_repo'];

  const $ = (id) => document.getElementById(id);
  const form = $('add-package-form');
  if (!form) return;

  /**
   * Split a repository URL into its host and project path. GitHub paths are
   * owner/repo; GitLab paths can have subgroups. Anything after the project
   * path (/tree/..., GitLab's /-/...) and a trailing .git are dropped.
   *
   * @param  {String} value  The URL as typed
   * @return {Object|null} {url, host, type, owner, repo} or null if it can't be read
   */
  function parseRepoUrl(value) {
    let url;
    try {
      url = new URL(value.trim());
    } catch (e) {
      return null;
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;

    const host = url.hostname.toLowerCase();
    let parts = url.pathname.split('/').filter(Boolean);
    const dash = parts.indexOf('-');
    if (dash !== -1) parts = parts.slice(0, dash);

    const type = host === 'github.com' || host === 'www.github.com' ? 'github' : 'gitlab';
    if (type === 'github') parts = parts.slice(0, 2);
    if (parts.length < 2) return null;
    parts[parts.length - 1] = parts[parts.length - 1].replace(/\.git$/i, '');

    const path = parts.join('/');
    return {
      url: `https://${type === 'github' ? 'github.com' : host}/${path}`,
      host,
      type,
      path,
      owner: parts[parts.length - 2],
      repo: parts[parts.length - 1],
    };
  }

  /** package_config file name: <owner>_<repo>.yaml, as the existing files are named. */
  function configFileName(repo) {
    const clean = (s) => s.replace(/[^A-Za-z0-9._-]/g, '-');
    return `${clean(repo.owner)}_${clean(repo.repo)}.yaml`;
  }

  /** A YAML double-quoted scalar. JSON string escapes are valid YAML. */
  function yamlString(s) {
    return JSON.stringify(s);
  }

  function isHttpUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'https:' || u.protocol === 'http:';
    } catch (e) {
      return false;
    }
  }

  async function sha256Hex(text) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
  }

  function field(name) {
    const el = form.elements[name];
    return el ? el.value.trim() : '';
  }

  function isPublished() {
    return form.querySelector('input[name="published"]:checked').value === 'true';
  }

  /** Fill an empty input; never overwrite what the submitter typed. */
  function fillIfEmpty(name, value) {
    const el = form.elements[name];
    if (el && !el.value.trim() && value) el.value = value;
  }

  async function getJson(url) {
    const resp = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!resp.ok) {
      const err = new Error(`HTTP ${resp.status}`);
      err.status = resp.status;
      throw err;
    }
    return resp.json();
  }

  /** Fill blank fields from the repository's public metadata. */
  async function lookup() {
    const status = $('ap-lookup-status');
    const repo = parseRepoUrl(field('repo_url'));
    if (!repo) {
      status.textContent = 'Enter a repository URL such as https://github.com/owner/repo.';
      return;
    }
    form.elements.repo_type.value = repo.type;
    status.textContent = 'Looking up the repository...';

    try {
      if (repo.type === 'github') {
        const data = await getJson(`https://api.github.com/repos/${repo.path}`);
        fillIfEmpty('name', data.name);
        fillIfEmpty('description', data.description);
        fillIfEmpty('default_branch', data.default_branch);
        fillIfEmpty('primary_language', data.language);
        fillIfEmpty('homepage', data.homepage);
        status.textContent = data.archived
          ? 'Filled in the blank fields. Note: this repository is archived.'
          : 'Filled in the blank fields from GitHub. Check them before continuing.';
      } else {
        const api = `https://${repo.host}/api/v4/projects/${encodeURIComponent(repo.path)}`;
        const data = await getJson(api);
        fillIfEmpty('name', data.name);
        fillIfEmpty('description', data.description);
        fillIfEmpty('default_branch', data.default_branch);
        try {
          // {"C++": 71.3, "C": 20.1, ...}
          const langs = await getJson(`${api}/languages`);
          const top = Object.keys(langs).sort((a, b) => langs[b] - langs[a])[0];
          fillIfEmpty('primary_language', top);
        } catch (e) {
          // Language is optional; the rest of the lookup still helps.
        }
        status.textContent = 'Filled in the blank fields from GitLab. Check them before continuing.';
      }
    } catch (e) {
      if (e.status === 404) {
        status.textContent = "Couldn't find that repository. Is the URL right, and is the repository public?";
      } else if (e.status === 403 || e.status === 429) {
        status.textContent = "The repository host's rate limit was reached. Fill in the fields by hand.";
      } else {
        status.textContent = "Couldn't look up the repository. Fill in the fields by hand.";
      }
    }
  }

  function validate(repo) {
    const errors = [];
    if (!repo) errors.push('Enter the repository URL, such as https://github.com/owner/repo.');
    if (!field('name')) errors.push('Enter the package name.');
    for (const name of LINK_FIELDS) {
      const value = field(name);
      if (value && !isHttpUrl(value)) {
        const label = form.querySelector(`label[for="${form.elements[name].id}"]`).textContent.trim();
        errors.push(`${label} must be a URL starting with https://.`);
      }
    }
    if (!isPublished() && !$('ap-password').value) {
      errors.push('Enter a password for the unpublished package.');
    }
    return errors;
  }

  async function buildYaml(repo) {
    const lines = ['schema: 1', `published: ${isPublished()}`];
    if (!isPublished()) lines.push(`password_sha256: ${await sha256Hex($('ap-password').value)}`);
    lines.push(`name: ${yamlString(field('name'))}`);
    if (field('description')) lines.push(`description: ${yamlString(field('description'))}`);
    lines.push(`repo_type: ${form.elements.repo_type.value}`);
    lines.push(`repo_url: ${yamlString(repo.url)}`);
    for (const name of REPO_FIELDS) {
      if (field(name)) lines.push(`${name}: ${yamlString(field(name))}`);
    }

    const links = LINK_FIELDS.filter((name) => field(name));
    if (links.length) {
      lines.push('', '# Optional fields');
      for (const name of links) lines.push(`${name}: ${yamlString(field(name))}`);
    }
    return lines.join('\n') + '\n';
  }

  function newFileUrl(fileName, yaml, name) {
    const params = new URLSearchParams({
      filename: `${CONFIG_DIR}/${fileName}`,
      value: yaml,
      message: `Add ${name}`,
    });
    return `https://github.com/${PACKAGES_REPO}/new/${PACKAGES_BRANCH}?${params}`;
  }

  /** Warn when a package_config file of the same name is already there. */
  async function checkExisting(fileName) {
    const warning = $('ap-exists');
    warning.hidden = true;
    try {
      const url = `https://api.github.com/repos/${PACKAGES_REPO}/contents/${CONFIG_DIR}/${encodeURIComponent(fileName)}?ref=${PACKAGES_BRANCH}`;
      const data = await getJson(url);
      warning.innerHTML = '';
      warning.append(
        `${CONFIG_DIR}/${fileName} already exists, so this package may already be on the dashboard. To change it, `,
        Object.assign(document.createElement('a'), { href: data.html_url, textContent: 'edit the existing file' }),
        ' instead.'
      );
      warning.hidden = false;
    } catch (e) {
      // 404 is the expected answer; on any other failure the pull request's
      // check still catches a duplicate.
    }
  }

  function showErrors(errors) {
    const box = $('ap-errors');
    box.innerHTML = '';
    if (!errors.length) {
      box.hidden = true;
      return;
    }
    const list = document.createElement('ul');
    for (const msg of errors) {
      list.appendChild(Object.assign(document.createElement('li'), { textContent: msg }));
    }
    box.appendChild(list);
    box.hidden = false;
  }

  async function build(event) {
    event.preventDefault();
    const repo = parseRepoUrl(field('repo_url'));
    const errors = validate(repo);
    showErrors(errors);
    if (errors.length) {
      $('ap-preview').hidden = true;
      return;
    }

    const fileName = configFileName(repo);
    const yaml = await buildYaml(repo);
    $('ap-filename').textContent = `${CONFIG_DIR}/${fileName}`;
    $('ap-filename-hint').textContent = `${CONFIG_DIR}/${fileName}`;
    $('ap-yaml').textContent = yaml;
    $('ap-open').href = newFileUrl(fileName, yaml, field('name'));
    $('ap-preview').hidden = false;
    $('ap-build').hidden = true;
    $('ap-preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
    checkExisting(fileName);
  }

  /** Any edit makes the built file stale: hide it until it's rebuilt. */
  function invalidate() {
    $('ap-preview').hidden = true;
    $('ap-build').hidden = false;
  }

  form.addEventListener('submit', build);
  form.addEventListener('input', invalidate);
  form.addEventListener('change', (event) => {
    invalidate();
    if (event.target.name === 'published') {
      $('ap-password-group').hidden = isPublished();
    }
  });

  $('ap-lookup').addEventListener('click', lookup);

  // Pick the host from the URL as it's typed; it can still be changed by hand.
  form.elements.repo_url.addEventListener('change', () => {
    const repo = parseRepoUrl(field('repo_url'));
    if (repo) form.elements.repo_type.value = repo.type;
  });

  $('ap-copy').addEventListener('click', async () => {
    const button = $('ap-copy');
    try {
      await navigator.clipboard.writeText($('ap-yaml').textContent);
      button.textContent = 'Copied';
    } catch (e) {
      button.textContent = 'Select the YAML above and copy it';
    }
    setTimeout(() => (button.textContent = 'Copy YAML'), 2000);
  });
})();
