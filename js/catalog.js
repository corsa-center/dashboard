/** GLOBALS */
// GiHub Data Directory
var ghDataDir = '../explore/github-data';
// Global chart standards
var stdTotalWidth = 500,
  stdTotalHeight = 400;
var stdMargin = { top: 40, right: 40, bottom: 40, left: 40 },
  stdWidth = stdTotalWidth - stdMargin.left - stdMargin.right,
  stdHeight = stdTotalHeight - stdMargin.top - stdMargin.bottom,
  stdMaxBuffer = 1.07;
var stdDotRadius = 4,
  stdLgndDotRadius = 5,
  stdLgndSpacing = 20;

/** ELEMENTS */

const HIDDEN_CLASS = 'hidden';

const REPO_SECTION_ELEMENT = document.getElementById('repositories');
const ELEMENT_NAV_DESKTOP = document.getElementById('category-nav');
const ELEMENT_NAV_MOBILE = document.getElementById('category-hamburger-nav');
const REPO_HEADER_ELEMENT = document.getElementById('category-header');

const ELEMENT_SEARCH = document.getElementById('searchText');

const ELEMENT_SINGLE_REPO_TARGET = document.getElementById('catalog-repo-single');

const ELEMENTS_ONLY_LIST = document.querySelectorAll('.catalog-list-only');
const ELEMENTS_ONLY_SINGLE_REPO = document.querySelectorAll('.catalog-single-only');

/** STATE VARIABLES */

//let searchTimeout; // TODO uncomment debounce once we have enough data
/**
 * Value of the text field which is visible on the category list view.
 */
let filterText = '';
/**
 * Value of the dropdown which is visible on the category list view.
 *
 * if this starts with a '-', reverse the sort order
 */
let orderProp = '-stars';
/**
 * Index of the active category from the catData array, relevant for showing visible repositories on the category list view.
 *
 * This value will also be tracked in the URL, but as the category's "urlParam".
 */
let selectedCategoryIndex = 0;
/**
 * Value of the visible repository. Also gets tracked in the URL.
 *
 * If this is an empty string or nullish - show category list view. Otherwise, show repository detail view
 */
let visibleRepo = '';
/**
 * category data which gets populated from an initial fetch. the first item is a hardcoded value meant to represent no filter
 */
const catData = [
  {
    title: 'ALL SOFTWARE',
    icon: {
      path: '/assets/images/categories/catalog.svg', // don't use baseUrl here, we'll add it in the src of the img tag
      alt: 'All Software',
    },
    description: {
      short: `Browse all ${window.config.labName} open source projects`,
      long: '',
    },
    displayTitle: 'All Software',
    urlParam: 'all',
    topics: [],
  },
];
/**
 * Mapping of repositories to topics
 */
const topicRepos = [];
/**
 * flag which will permanently be set to "true" once user visits category list page
 */
let hasUserVisitedCategoryListPageYet = false;

/////////////////////////////////////////////////////////
//////////// UTIL FUNCTIONS ////////////////////////////
/////////////////////////////////////////////////////////

/**
 *
 * @param {String} str provided string
 * @returns string with first character of each word capitalized
 */
function titleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

//check if repo is tagged as one of the categories
function containsTopics(catTopics, repoTopics) {
  if (!catTopics.length) return true;
  for (let i = 0; i < catTopics.length; i++) {
    if (repoTopics.includes(catTopics[i])) {
      return true;
    }
  }
  return false;
}

//////////////////////////////////////////////////////////
///////////////// REPO DETAIL FUNCTIONS //////////////////
//////////////////////////////////////////////////////////

/**
 * @param {string|null|undefined} queryParam parameter which may have been decoded from URL query parameter (or may not exist)
 */
function renderSingleRepoError(queryParam) {
  ELEMENT_SINGLE_REPO_TARGET.innerHTML = `
    <h2><span class="fa fa-exclamation-circle"></span> Whoops...</h2>
    <p>${
      queryParam ? `The repository ${queryParam} is not in our catalog.` : 'No repository specified in the URL (i.e. "?category=&repo=").'
    }</p>
  `;
}

/**
 * @param {Object} repo repo property from intReposInfo.json
 * @param {number} pulls count of all pull requests (open + closed)
 * @param {number} issues count of all issues (open + closed)
 */
function renderSingleRepoHTML(repo, pulls, issues) {
  ELEMENT_SINGLE_REPO_TARGET.innerHTML = `
    <h2 class="page-header text-center">
      <a class="title" href="${repo.url}" title="View Project on GitHub">${sanitizeHTML(repo.name)}</a>
      <br />
      <a class="subtitle" href="https://github.com/${repo.owner.login}" title="View Owner on GitHub">
        <span class="fa fa-user-circle"></span>${repo.owner.login}
      </a>
      ${
        repo.primaryLanguage
          ? `
        <span class="subtitle" title="Primary Language">
          <span class="fa fa-code"></span>
          ${repo.primaryLanguage.name}
        </span>
      `
          : ''
      }
      ${
        repo.licenseInfo && repo.licenseInfo.spdxId !== 'NOASSERTION'
          ? `
        <a
          class="subtitle"
          href="${repo.licenseInfo.url}"
          title="${repo.licenseInfo.name}"
        >
          <span class="fa fa-balance-scale"></span>
          ${repo.licenseInfo.spdxId}
        </a>
      `
          : ''
      }
    </h2>

    <p class="stats text-center">
      <a href="${repo.url}"> <span class="fa fa-github"></span>GitHub Page </a>

      <a href="${repo.url}/stargazers"> <span class="fa fa-star"></span>Stargazers : ${repo.stargazers.totalCount} </a>

      <a href="${repo.url}/network"> <span class="fa fa-code-fork"></span>Forks : ${repo.forks.totalCount} </a>

      ${
        repo.cdash
          ? `
          <a href="${repo.cdash}"> <img src="${window.config.baseUrl}/assets/images/logos/cdash.svg" height="20" width="20" class="cdash-icon"></img>   CDash Dashboard </a>
      `
          : ''
      }

      ${
        repo.homepageUrl
          ? `
        <a href="${repo.homepageUrl}"> <span class="fa fa-globe"></span>Project Website </a>
      `
          : ''
      }
    </p>
    ${
      repo.description
        ? `
      <blockquote cite="${repo.url}"> ${sanitizeHTML(repo.description)} </blockquote>
    `
        : ''
    }

    <div class="text-center">
      <svg class="repoActivityChart"></svg>
      <br />
      <svg class="pieUsers"></svg>
      <br />
      ${pulls ? '<svg class="piePulls"></svg>' : ''}
      ${issues ? '<svg class="pieIssues"></svg>' : ''}
      <br />
      <svg class="repoCreationHistory"></svg>
      <br />
      ${repo.stargazers.totalCount ? '<svg class="repoStarHistory"></svg>' : ''}
      <br />
      ${repo.languages.totalCount ? '<svg class="languagePie"></svg>' : ''}
      ${repo.repositoryTopics.totalCount ? '<svg class="topicCloud"></svg>' : ''}
    </div>
  `;
}

/**
 *
 * @param {string} queryParam parameter which was decoded from URL query parameter
 */
function renderSingleRepo(queryParam) {
  fetch(`${window.config.baseUrl}/explore/github-data/intReposInfo.json`)
    .then((res) => res.json())
    .then((infoJson) => {
      const reposObj = infoJson.data;
      if (reposObj.hasOwnProperty(queryParam)) {
        const repo = reposObj[queryParam];
        let pulls = 0;
        let issues = 0;
        const pullCounters = ['pullRequests_Merged', 'pullRequests_Open'];
        const issueCounters = ['issues_Closed', 'issues_Open'];
        pullCounters.forEach(function (c) {
          pulls += repo[c]['totalCount'];
        });
        issueCounters.forEach(function (c) {
          issues += repo[c]['totalCount'];
        });
        renderSingleRepoHTML(repo, pulls, issues);
        draw_line_repoActivity('repoActivityChart', queryParam);
        draw_pie_repoUsers('pieUsers', queryParam);
        draw_line_repoCreationHistory('repoCreationHistory', queryParam);
        draw_pie_languages('languagePie', queryParam);
        draw_cloud_topics('topicCloud', queryParam);
        if (repo.stargazers.totalCount) {
          draw_line_repoStarHistory('repoStarHistory', queryParam);
        }
        if (pulls) {
          draw_pie_repoPulls('piePulls', queryParam);
        }
        if (issues) {
          draw_pie_repoIssues('pieIssues', queryParam);
        }
      } else {
        renderSingleRepoError(queryParam);
      }
    });
}

/////////////////////////////////////////////////////////
//////////// REPO LIST RENDER FUNCTIONS /////////////
/////////////////////////////////////////////////////////

function renderRepoListHeaderHtml() {
  // selectedCategoryIndex will be set to a valid number on initialization
  const category = catData[selectedCategoryIndex];
  REPO_HEADER_ELEMENT.innerHTML = `
    <img
      src="${window.config.baseUrl}${category.icon.path}"
      width="125"
      height="125"
      alt="${category.icon.alt}"
      title="${category.icon.alt}"
      loading="lazy"
    />
    <div class="title-description">
      <h2>${category.title}</h2>
      <p>${category.description.short}${category.description.long}</p>
    </div>
  `;
}

function renderRepoListHtml() {
  const isOrderReversed = orderProp.startsWith('-');
  const resolvedOrderProp = isOrderReversed ? orderProp.slice(1) : orderProp;
  const items = topicRepos[selectedCategoryIndex]
    .filter(
      (repo) =>
        repo.name.toLowerCase().includes(filterText) ||
        repo.owner.toLowerCase().includes(filterText) ||
        repo.language?.toLowerCase().includes(filterText) ||
        repo.description?.toLowerCase().includes(filterText),
    )
    .sort((a, b) => {
      const x = a[resolvedOrderProp];
      const y = b[resolvedOrderProp];
      return x < y ? -1 : x > y ? 1 : 0;
    });
  if (isOrderReversed) {
    items.reverse();
  }
  REPO_SECTION_ELEMENT.innerHTML = items
    .map(
      (repo) => `
  <div class="catalog-grid-item">
    <a class="repoLink">
      <h3 class="text-center">
        <span title="Name">${repo.name}</span>
        <small><span title="Owner">${repo.owner}</span></small>
        <small><span title="Primary Language">${repo.language || '-'}</span></small>
      </h3>
    </a>
    ${repo.description ? `<p>${sanitizeHTML(repo.description)}</p>` : ''}

    <p class="stats text-center">
      <a href="${repo.gitUrl}" title="GitHub Page">
        <span class="fa fa-github"></span>
      </a>

      <a href="${repo.gitUrl}/stargazers" title="Stargazers">
        <span class="fa fa-star"></span> ${repo.stars}
      </a>

      <a href="${repo.gitUrl}/network" title="Forks">
        <span class="fa fa-code-fork"></span> ${repo.forks}
      </a>
      <a href="/explore/spack-dependencies/?package=${repo.name}" title="Dependency Network">
        <span class="fa fa-pie-chart"></span>
      </a>
      ${
        repo.homepageUrl
          ? `
        <a href="${repo.homepageUrl}" title="Project Website">
          <span class="fa fa-globe"></span>
        </a>
      `
          : ''
      }
      ${
        repo.cdash
          ? `
          <a href="${repo.cdash}"><img src="${window.config.baseUrl}/assets/images/logos/cdash.svg" height="20" width="20"></img></a>
      `
          : ''
      }

    </p>
  </div>
  `,
    )
    .join('');
  const repoLinks = document.getElementsByClassName('repoLink');
  for (let i = 0; i < repoLinks.length; i++) {
    repoLinks[i].addEventListener('click', () => {
      const repo = encodeURIComponent(items[i].nameWithOwner);
      setVisibleRepo(repo);
    });
  }
}

/**
 * Call when the user updates category (either through the UI or through the browser)
 *
 * @param {number} categoryIdx selected index of the category
 */
function onCategoryUpdate(categoryIdx) {
  selectedCategoryIndex = categoryIdx;
  const categoryButtons = document.getElementsByClassName('tab');
  for (let i = 0; i < categoryButtons.length; i++) {
    const button = categoryButtons[i];
    if (button.id.endsWith(categoryIdx)) {
      button.classList.add('selected-tab');
    } else {
      button.classList.remove('selected-tab');
    }
  }
  renderRepoListHeaderHtml();
  renderRepoListHtml();
}

////////////////////////////////////////////////
///////////// MAIN UPDATE FUNCTIONS /////////////
////////////////////////////////////////////////

function showCategoryList() {
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  ELEMENTS_ONLY_LIST.forEach((ele) => ele.classList.remove(HIDDEN_CLASS));
  ELEMENTS_ONLY_SINGLE_REPO.forEach((ele) => ele.classList.add(HIDDEN_CLASS));
}

function showSingleRepo() {
  setTimeout(() => window.scrollTo({ top: 0, behavior: 'auto' }), 0);
  ELEMENTS_ONLY_SINGLE_REPO.forEach((ele) => ele.classList.remove(HIDDEN_CLASS));
  ELEMENTS_ONLY_LIST.forEach((ele) => ele.classList.add(HIDDEN_CLASS));
}

/**
 *
 * User has selected a visible repository. If user selects empty repository, render category list instead.
 *
 * @param {string} newValue the next repo to change
 * @param {boolean} shouldPushState Set to true the first time the user navigates to the catalog, or navigates from history. 
 *   Leave as false or undefined if the user triggers a click event.
 *
 */
function setVisibleRepo(newValue, shouldPushState) {
  visibleRepo = newValue;
  if (!visibleRepo) {
    if (!hasUserVisitedCategoryListPageYet) {
      hasUserVisitedCategoryListPageYet = true;
      // init
      fetch(`${window.config.baseUrl}/catalog/category_info.json`)
        .then((res) => res.json())
        .then((catInfoJson) => {
          Object.values(catInfoJson.data)
            .map((data) => {
              data['displayTitle'] = titleCase(data.title);
              // this is used both in the URL and the HTML ID
              data['urlParam'] = categoryToUrl(data.title);
              return data;
            })
            .sort((a, b) => {
              const x = a['displayTitle'];
              const y = b['displayTitle'];
              return x < y ? -1 : x > y ? 1 : 0;
            })
            .forEach((category) => catData.push(category));
          // get selected index from URL query param, or default to "all software" if invalid/no param
          const initialCategory = new URLSearchParams(window.location.search).get('category')?.toLowerCase() || 'all';
          for (let c = 0; c < catData.length; c++) {
            if (catData[c].urlParam === initialCategory) {
              selectedCategoryIndex = c;
              break;
            }
          }

          // render category specific HTML
          renderRepoListHeaderHtml();
          ELEMENT_NAV_DESKTOP.innerHTML = catData
            .map(
              (category, idx) => `
            <button id="btn__${idx}" class="tab${idx === selectedCategoryIndex ? ' selected-tab' : ''}">
              <img
                src="${window.config.baseUrl}${category.icon.path}"
                height="40"
                width="40"
                alt="${category.icon.alt}"
                title="${category.icon.alt}"
                loading="lazy"
              />
              <span>
                ${sanitizeHTML(category.displayTitle)}
              </span>
            </button>
          `,
            )
            .join('');
          ELEMENT_NAV_MOBILE.innerHTML = catData
            .map(
              (category, idx) => `
            <button id="nav-btn__${idx}" class="tab${idx === selectedCategoryIndex ? ' selected-tab' : ''}">${sanitizeHTML(
                category.displayTitle,
              )}</button>
          `,
            )
            .join('');
          const tabElements = document.getElementsByClassName('tab');
          for (let i = 0; i < tabElements.length; i++) {
            const ele = tabElements[i];
            const tabIdx = Number(ele.id.split('__')[1]);
            ele.addEventListener('click', () => {
              window.history.pushState(
                { categoryIndex: tabIdx, repo: visibleRepo },
                '',
                `?category=${catData[tabIdx].urlParam}&repo=${visibleRepo}`,
              );
              onCategoryUpdate(tabIdx);
            });
          }

          // map topics to categories
          fetch(`${window.config.baseUrl}/explore/github-data/intRepos_Topics.json`)
            .then((res) => res.json())
            .then((topicJson) => {
              const reposObj = topicJson.data;
              catData.forEach((category) => {
                const catRepos = [];
                for (let r in reposObj) {
                  const repo = reposObj[r];
                  const topics = [];
                  repo.repositoryTopics.nodes.forEach((node) => {
                    topics.push(node.topic.name);
                  });
                  if (containsTopics(category.topics, topics)) {
                    catRepos.push({ nameWithOwner: r });
                  }
                }
                topicRepos.push(catRepos);
              });
              fetch(`${window.config.baseUrl}/explore/github-data/intReposInfo.json`)
                .then((res) => res.json())
                .then((infoJson) => {
                  const reposInfoObj = infoJson.data;
                  for (let repo in reposInfoObj) {
                    //reposInfoObj[repo] is the actual repo object
                    for (let j in topicRepos) {
                      //var category is array of objects
                      const category = topicRepos[j];
                      for (let count in category) {
                        // category[count] is a specific repo within a category
                        //if we find a repo that is included in the category repos, we save more info on it
                        if (category[count].nameWithOwner === reposInfoObj[repo].nameWithOwner) {
                          //save only necessary data fields
                          category[count]['name'] = reposInfoObj[repo].name;
                          category[count]['description'] = reposInfoObj[repo].description;
                          category[count]['ownerAvatar'] = reposInfoObj[repo].owner.avatarUrl;
                          category[count]['owner'] = reposInfoObj[repo].owner.login;
                          category[count]['stars'] = reposInfoObj[repo].stargazers.totalCount;
                          category[count]['gitUrl'] = reposInfoObj[repo].url;
                          category[count]['homepageUrl'] = reposInfoObj[repo].homepageUrl;
                          if (reposInfoObj[repo].primaryLanguage) {
                            category[count]['language'] = reposInfoObj[repo].primaryLanguage.name;
                          } else {
                            category[count]['language'] = '';
                          }
                          category[count]['forks'] = reposInfoObj[repo].forks.totalCount;
                          if (reposInfoObj[repo].cdash) {
                            category[count]['cdash'] = reposInfoObj[repo].cdash
                          }
                        }
                      }
                    }
                  }
                  renderRepoListHtml();
                });
            });
        });
    }
    showCategoryList();
  } else {
    renderSingleRepo(decodeURIComponent(visibleRepo));
    showSingleRepo();
  }
  if (!shouldPushState) {
    window.history.pushState(
      { categoryIndex: selectedCategoryIndex, repo: visibleRepo },
      '',
      `?category=${catData[selectedCategoryIndex].urlParam}&repo=${visibleRepo}`,
    );
  }
}

/////////////////////////////////////////////////////////////////
////////////////////// INIT /////////////////////////////////////
/////////////////////////////////////////////////////////////////

// Sets initial category page
const repoFromUrl = new URLSearchParams(window.location.search).get('repo') || '';
setVisibleRepo(repoFromUrl, true);

////////////////////////////////////////////////////////////////
//////////////////////// EVENT LISTENERS ///////////////////////
////////////////////////////////////////////////////////////////

// searching
document.getElementById('searchText').addEventListener('input', (e) => {
  filterText = e.target.value.toLowerCase();
  renderRepoListHtml();
  // TODO test out debounce when we have a lot of data
  // clearTimeout(searchTimeout);
  // searchTimeout = setTimeout(() => {
  //   filterText = e.target.value.toLowerCase();
  //   renderRepoHtml();
  // }, 1000);
});

// sorting
document.getElementById('orderProp').addEventListener('change', (e) => {
  orderProp = e.target.value;
  renderRepoListHtml();
});

// mobile nav
document.getElementById('category-hamburger-btn').addEventListener('click', () => {
  ELEMENT_NAV_MOBILE.classList.toggle(HIDDEN_CLASS);
});

// back button on category list
document.getElementById('category-list-btn').addEventListener('click', () => {
  setVisibleRepo('');
});

// user presses back/forward buttons on their browser
window.addEventListener('popstate', (e) => {
  const oldRepoState = e.state?.repo;
  const hasOldRepoState = !!oldRepoState;
  if (!hasOldRepoState || oldRepoState !== visibleRepo) {
    setVisibleRepo(hasOldRepoState ? oldRepoState : '', true);
  }

  const oldCategoryState = e.state?.categoryIndex;
  const hasOldCategoryState = typeof oldCategoryState === 'number';
  if (!hasOldCategoryState || oldCategoryState !== selectedCategoryIndex) {
    onCategoryUpdate(hasOldCategoryState ? oldCategoryState : 0);
  }
});
