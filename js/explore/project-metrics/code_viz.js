
// File upload interfaces
function createFileUploadUI(UIRootElement) {
const dropZone = document.createElement('label');
  dropZone.classList.add('drop-zone');
  dropZone.htmlFor = 'fileInput'; // Links clicking the label to the input

  // The hidden file input that handles file selection
  const fi = document.createElement('input');
  fi.type = 'file';
  fi.id = 'fileInput';
  fi.accept = '.json,.out,.txt'; // Only allow json files
  fi.classList.add('drop-zone__input');

  // The text prompt inside the drop zone
  const promptText = document.createElement('span');
  promptText.classList.add('drop-zone__prompt');
  promptText.textContent = 'Drag & drop a clang-tidy output file here, or click to select';

  // Function to process the selected/dropped file (avoids code duplication)
  const processFile = (file) => {
    console.log(file.type);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          let metricContent = new MetricParser()
          metricContent.parse(content);
          parseMetricJson(metricContent.metrics);
          displayMetrics('metric-container');
          promptText.textContent = `✅ Loaded: ${file.name}`; // Success feedback
        } catch (error) {
          console.error("Error parsing file:", error);
          promptText.textContent = `❌ Error: Invalid file. Try again.`;
        }
      };
      reader.onerror = (e) => {
        console.error("File reading error:", e);
        promptText.textContent = `❌ Error reading file.`;
      };
      reader.readAsText(file);
    } else if (file) {
      promptText.textContent = `❌ Error: Please upload a valid file.`;
    }
  };

  // Add event listener for file selection via click
  fi.addEventListener('change', () => {
    if (fi.files.length) {
      processFile(fi.files[0]);
    }
  });

  // Add event listeners for drag & drop functionality
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault(); // This is crucial to allow a drop event
    dropZone.classList.add('drop-zone--over');
  });

  ['dragleave', 'dragend'].forEach(type => {
    dropZone.addEventListener(type, () => {
      dropZone.classList.remove('drop-zone--over');
    });
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); // Prevent the browser from opening the file
    dropZone.classList.remove('drop-zone--over');
    if (e.dataTransfer.files.length) {
      fi.files = e.dataTransfer.files; // Assign dropped files to input
      processFile(fi.files[0]);
    }
  });

  // Assemble the component and add it to the root
  dropZone.appendChild(promptText);
  dropZone.appendChild(fi);
  UIRootElement.appendChild(dropZone);
}


// CDash interfaces

function getBuildNodeId(data) {
  let edges = data['data']['build']['files']['edges']
  if (edges.length != 1) {
    console.error("Too many or too few files available to render")
  }
  return edges[0]['node']['id']
}

function getProjectNodeId(data) {
  let edges = data['data']['projects']['edges']
  if (edges.length != 1) {
    console.error('Too many or too few projects match this name');
  }
  return edges[0]['node']['id'];
}


async function makeCDashPostRequest(url, query) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any necessary authorization headers, e.g., 'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ query })
  });
  if (!response.ok) {
    throw new Error(`HTTP Error! status ${response.status}`);
  }
  const data = await response.json();
  return data;
}


async function getFileId(url, bid) {
  const query = `
query {
  build(id:${bid}) {
    files {
      edges {
        node {
          id
        }
      }
    }
  }
}
`;
  return await makeCDashPostRequest(url, query);
}

async function getBuildDate(url, bid) {
  const query = `
query {
  build(id:${bid}) {
    submissionTime
  } 
}
`;
  return await makeCDashPostRequest(url, query);
}


async function getProjectId(url, projectName) {
  const query = `
query {
  projects(filters: {
    all: [
      {
       eq: { name: "${projectName}"}
      }
    ]
  }) {
    edges {
      node {
        id
      }
    }
  }
}`
  const projectIdRsp = await makeCDashPostRequest(url, query);
  return getProjectNodeId(projectIdRsp);
}


async function getMetricsData(rsp, cdash, bid) {
  const response = await fetch(cdash.protocol + "//" + cdash.hostname + "/build" + `/${bid}` + '/file/' + getBuildNodeId(rsp));
  if (!response.ok) {
    throw new Error(`HTTP Error! status ${response.status}`);
  }
  const data = await response.text();
  return data;
}


function getCDashGraphQLEndpoint(cdashUrl) {
  return cdashUrl.protocol + '//' + cdashUrl.hostname + '/graphql';
}

async function getCDashBuildContext(cdashUrl) {
  const cdash_path_array = cdashUrl.pathname.split('/');
  const bid = cdash_path_array[cdash_path_array.length - 1];
  const url = getCDashGraphQLEndpoint(cdashUrl);
  const rsp = await getFileId(url, bid);
  // Function to fetch a file from an API endpoint
  try {
    let unparsedCodeData = await getMetricsData(rsp, cdashUrl, bid);
    let metricContent = new MetricParser()
    metricContent.parse(unparsedCodeData);
    // maintain mirror of data to manipulate
    parseMetricJson(metricContent.metrics);
    displayMetrics('metric-container');
  } catch (error) {
    console.error('Error fetching file:', error);
    // Handle the error appropriately, e.g., display an error message to the user
  }
}


async function getCDashDashboardContext(cdashUrl) {
  let projectName = cdashUrl.searchParams.get('project');
  if (!projectName) {
    console.error('Ill formed CDash dashboard URL, cannot fetch project data');
  }
  let cdashGraphQLEndpoint = getCDashGraphQLEndpoint(cdashUrl);
  gCDashURL = getCDashGraphQLEndpoint(cdashUrl);
  projectId = await getProjectId(cdashGraphQLEndpoint, projectName);
  renderCalendarWidget();
}


function createCDashUI(UIRootElement) {
  const cdashUrl = document.createElement('input');
  cdashUrl.type = 'text';
  cdashUrl.id = 'cdash-url';
  cdashUrl.style.margin = '10px';
  const cdashUrlLabel = document.createElement('label');
  cdashUrlLabel.htmlFor='cdash-url';
  cdashUrlLabel.textContent = 'Enter url for CDash dashboard or build';
  // Add an event listener that runs a function every time the input value changes
  cdashUrl.addEventListener('keydown', async (event) => {
    if (event.key === 'Enter') {
      // Update the variable with the current value of the input field
      let cdash = null;
      try {
        cdash = new URL(event.target.value);
      } catch (error) {
        console.error("An error occured", error.message);
      }

      // Handle build vs dashboard
      if (cdash.search) {
        // Dashboard, potentially
        getCDashDashboardContext(cdash);
      }
      else {
        // Build probably
        getCDashBuildContext(cdash);
      }
    }
  });

  const cdashUrlComp = document.createElement('div');
  cdashUrlComp.appendChild(cdashUrlLabel);
  cdashUrlComp.appendChild(cdashUrl);
  UIRootElement.appendChild(cdashUrlComp);
}


function createCodeForgeUI(UIRootElement) {
  // Code location interface
  const codeForge = document.createElement('div');
  const codeForgeUrl = document.createElement('input');
  codeForgeUrl.type = 'text';
  codeForgeUrl.id = 'forge-url';
  codeForgeUrl.style.margin = '10px';
  const forgeUrlLabel = document.createElement('label');
  forgeUrlLabel.htmlFor='forge-url';
  forgeUrlLabel.textContent = 'Enter project code hosting URL:';
  codeForge.appendChild(forgeUrlLabel);
  codeForge.appendChild(codeForgeUrl);

  codeForgeUrl.addEventListener('input', (event) => {
    urlBase = event.target.value;
  });
  UIRootElement.appendChild(codeForge);
}


function createUploadUI_Tabbed(rootInterfaceElement) {
  // 1. Create main card and title
  const card = document.createElement('div');
  card.classList.add('metrics-card');

  const title = document.createElement('h2');
  title.textContent = 'Metrics Source';
  card.appendChild(title);

  // 2. Create containers for tabs and their content
  const tabContainer = document.createElement('div');
  tabContainer.classList.add('tab-container');

  const contentContainer = document.createElement('div');
  contentContainer.classList.add('content-container');

  const tabs = [
    { name: 'File Upload', creator: createFileUploadUI },
    { name: 'CDash', creator: createCDashUI },
    { name: 'Code Forge', creator: createCodeForgeUI }
  ];

  // 3. Create a tab and content panel for each source
  tabs.forEach((tab, index) => {
    // Create tab button
    const button = document.createElement('button');
    button.textContent = tab.name;
    button.classList.add('tab-button');
    button.dataset.tab = index; // Link button to its content
    tabContainer.appendChild(button);

    // Create content panel
    const panel = document.createElement('div');
    panel.classList.add('tab-content');
    panel.dataset.content = index; // Link content to its button
    
    // Populate panel using the original functions
    tab.creator(panel); 
    contentContainer.appendChild(panel);

    // Set the first tab as active by default
    if (index === 0) {
      button.classList.add('active');
      panel.classList.add('active');
    }
  });

  // 4. Add event listener to handle tab switching
  tabContainer.addEventListener('click', (event) => {
    // Ensure a button was clicked
    if (event.target.matches('.tab-button')) {
      const tabIndex = event.target.dataset.tab;

      // Deactivate all tabs and panels
      tabContainer.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
      contentContainer.querySelectorAll('.tab-content').forEach(pnl => pnl.classList.remove('active'));
      
      // Activate the clicked tab and its corresponding panel
      event.target.classList.add('active');
      contentContainer.querySelector(`.tab-content[data-content="${tabIndex}"]`).classList.add('active');
    }
  });
  
  // 5. Append the created structure to the DOM
  card.appendChild(tabContainer);
  card.appendChild(contentContainer);
  rootInterfaceElement.appendChild(card);
}


function displayFileInfo(containerId) {
  const container = document.getElementById(containerId);

  // Check if the container element exists
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found.`);
    return;
  }
  if (!per_file_metrics) {
    return;
  }
//////////////// AGGREGATE FILE METRICS /////////////////////
  // Add a baseline metrics box
  const overallMetrics = document.createElement('div');
  overallMetrics.classList.add('overall-metrics-container');
  overallMetrics.id = "overallMetrics";

  function addMetricCard(name, data, data_file=null) {
    var metric = document.createElement('div');
    metric.classList.add('code-metric-overview');
    var statName = document.createElement('h3');
    statName.classList.add('overall-metrics-name');
    var nameText = document.createTextNode(name);
    statName.appendChild(nameText);
    // Metric Value
    var value = document.createElement('p');
    value.classList.add('overall-metrics-value');
    value.innerHTML = data;
    metric.appendChild(statName);
    metric.appendChild(value);
    if (data_file) {
      var funcName = document.createElement('div');
      funcName.classList.add('overall-metrics-file-name');
      var metricFile = document.createTextNode(data_file);
      funcName.appendChild(metricFile);
      // Ref to rest of functions stats
      var ref = document.createElement('a');
      ref.classList.add('overall-metrics-link');
      ref.href = '#' + data_file + '-metrics';
      ref.appendChild(funcName);
      metric.appendChild(ref);
    }
    // add metric box to box of metrics
    overallMetrics.appendChild(metric);
  }
  
  addMetricCard('Average Cognitive Complexity Score', aggregateFileMetrics.averageScore);
  addMetricCard('Function Count', aggregateFunctionMetrics.functionCount);
  addMetricCard('Lines of Code', aggregateFunctionMetrics.loc);
  addMetricCard('File Count', aggregateFileMetrics.fileCount);
  addMetricCard(`Number of Files over threshold (${CC_THRESHOLD})`, aggregateFileMetrics.numberOfFilesOver);
  addMetricCard('Longest File', aggregateFileMetrics.mostLoc, aggregateFileMetrics.highestLocFile);
  addMetricCard('Highest Average Cognitive Complexity Score', aggregateFileMetrics.worstScore, aggregateFileMetrics.worstFile);
  addMetricCard('Lowest Average Cognitive Complexity Score', aggregateFileMetrics.bestScore, aggregateFileMetrics.bestFile);

  // // Add charts
  // const chartBox = document.createElement("div");
  // chartBox.classList.add("chart-contianer");

  // const methodChartBox = document.createElement('div');
  // methodChartBox.classList.add('chart-box');

  // const methodChart = document.createElement('canvas');
  // methodChart.id = "methodChart";
  // methodChartBox.appendChild(methodChart);
  // chartBox.appendChild(methodChartBox);

  // const methodCtx = methodChart.getContext('2d');
  // const data1 = {
  //   labels: [
  //       'Over',
  //       'Under',
  //   ],
  //   datasets: [{
  //       label: 'Methods under Threshold',
  //       data: [methodsAboveMargin, aggregateFunctionMetrics.fileCount - methodsAboveMargin],
  //       backgroundColor: [
  //           'rgb(255, 99, 132)',
  //           'rgb(6, 108, 18)',
  //       ],
  //       hoverOffset: 4
  //   }]
  // };
  // const methodConfig = {
  //   type: 'pie',
  //   data: data1,
  //   options: {
  //       responsive: true,
  //       plugins: {
  //           legend: {
  //               position: 'top',
  //           },
  //           title: {
  //               display: true,
  //               text: 'Methods over threshold'
  //           }
  //       }
  //   },
  // };


  // const fileChartBox = document.createElement('div');
  // fileChartBox.classList.add('chart-box');

  // const fileChart = document.createElement('canvas');
  // fileChart.id = "fileChart";
  // const fileCtx = fileChart.getContext('2d');
  // fileChartBox.appendChild(fileChart);
  // chartBox.appendChild(fileChartBox);

  // let files_over = 0;
  // for (file in per_file_metrics) {
  //   if (per_file_metrics[file]["number_over"] > 0) {
  //     files_over += 1;
  //   }
  // }
  // const data2 = {
  //   labels: [
  //       'Over',
  //       'Under',
  //   ],
  //   datasets: [{
  //       label: 'Files with methods over Threshold',
  //       data: [files_over, aggregateFunctionMetrics.fileCount - files_over],
  //       backgroundColor: [
  //           'rgb(255, 99, 132)',
  //           'rgb(6, 108, 18)',
  //       ],
  //       hoverOffset: 4
  //   }]
  // };
  // const fileConfig = {
  //   type: 'pie',
  //   data: data2,
  //   options: {
  //       responsive: true,
  //       plugins: {
  //           legend: {
  //               position: 'top',
  //           },
  //           title: {
  //               display: true,
  //               text: 'Files with methods over threshold'
  //           }
  //       }
  //   },
  // };


  // overallMetrics.appendChild(chartBox);
  // new Chart(methodCtx, methodConfig);
  // new Chart(fileCtx, fileConfig);


  //// INDIVIDUAL METRICS ///////////////

  // Add box of metrics to parent element
  container.appendChild(overallMetrics);

  var metricBox = document.createElement('div');
  metricBox.classList.add('code-metric-box');

  // Add legend
  var metricLegend = document.createElement('div');
  metricLegend.classList.add('code-metric-legend');
  metricLegend.style.zIndex = per_file_metrics.length + 1;

  var legendName = document.createElement('p');
  legendName.textContent = 'Name';

  var legendCC = document.createElement('p');
  legendCC.textContent = 'Average Congitive-Complexity';

  metricLegend.appendChild(legendName);
  metricLegend.appendChild(legendCC);

  metricBox.appendChild(metricLegend);

////////////# INDIVIDUAL METRICS #///////////////////

  // Iterate over each item in the metrics
  let comparator;
  if (sortOrder === 'dsc') {
    comparator = (a, b) => b[1][currentSortMethod] - a[1][currentSortMethod];
  }
  else {
    comparator = (a, b) => a[1][currentSortMethod] - b[1][currentSortMethod];
  }
  let entries = Object.entries(per_file_metrics);
  entries.sort(comparator);
  function fileIsFiltered(loc) {
    const re = new RegExp(RegExp.escape(currentFilterParam));
    if(loc.search(re)) {
      return filterExclude;
    }
    return !filterExclude;
  }
  entries.forEach((item, idx) => {
    
    var location = item[0];
    var metrics = item[1];
    if(fileIsFiltered(location)) {
      return;
    }

    var scoreColor = getColor("#00FF00", "#FF0000", 0, 100, metrics.averageScore);

    // Create collapsible toggle for each entry
    const codeCollapsible = document.createElement('button');
    codeCollapsible.type = "button";
    codeCollapsible.style.backgroundColor = scoreColor;
    codeCollapsible.style.width = '100%';
    codeCollapsible.addEventListener("click", function() {
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    })
    // specify name
    const name = document.createElement('p');
    name.textContent = location;
    codeCollapsible.appendChild(name);

    // specify location
    // const loc = document.createElement('p');
    // loc.textContent = item['location'];
    // codeCollapsible.appendChild(loc);
    // specify cc
    const cc = document.createElement('p');
    cc.textContent = metrics.averageScore;
    codeCollapsible.appendChild(cc);

    codeCollapsible.classList.add('code-info-toggle');
    // Add arrow
    const toggle = document.createElement('i');
    toggle.classList.add('fa', 'fa-chevron-down');
    codeCollapsible.appendChild(toggle);

    // Create group for managing info + toggle
    const metricElement = document.createElement('div');
    metricElement.style.zIndex = `${per_file_metrics.length - (idx)}`;

    metricElement.appendChild(codeCollapsible);

    // Create a new div element for each entry
    const codeElement = document.createElement('div');
    codeElement.classList.add('code-info-item');
    codeElement.id = location + "-metrics";
    codeElement.style.display = "none";

    // const codeLineElement = document.createElement('pre');
    // codeLineElement.textContent = item["code-line"];

    // codeLineElement.style.color = scoreColor;
    // const codeLineElementRef = document.createElement('a');
    // var href = item.split(":").slice(0,1).join("#");
    // codeLineElementRef.href = urlBase + href;
    // codeLineElementRef.appendChild(codeLineElement);
    // codeElement.appendChild(codeLineElementRef);

    const statsElement = document.createElement('div');
    statsElement.classList.add('code-stats');
    function makeStatElement(name, stat, funcName=null) {
      const listItem = document.createElement('div');
      listItem.classList.add('info-box');
      const header = document.createElement('h3');
      header.textContent = name;
      const body = document.createElement('p');
      body.textContent = stat;
      listItem.appendChild(header);
      listItem.appendChild(body);
      if(funcName) {
        const func = document.createElement('p');
        func.textContent = funcName;
        listItem.appendChild(func);
      }
      statsElement.appendChild(listItem);
      codeElement.appendChild(statsElement);
    }
    makeStatElement('Highest Cognitive Complexity', metrics.worstScore.score, metrics.worstScore.method);
    makeStatElement('Lowest Cognitive Complexity', metrics.bestScore.score, metrics.bestScore.method);
    makeStatElement('Total Lines of Code', metrics.totalLoc);
    makeStatElement('Average Lines of Code', metrics.averageLoc);
    makeStatElement('Average Cognitive Complexity', metrics.averageScore);
    makeStatElement('Number of methods over Cognitive Complexity Threshold', metrics.numberOver);

    // Append code information to individual metrics element
    metricElement.appendChild(codeElement);
    // Append the created code element to the container
    metricBox.appendChild(metricElement);
  });
  container.appendChild(metricBox);
}

function createFileCogDonutChart() {
  // --- Data for the Chart ---
    // Example: 85% correct, 15% incorrect
    const dataValues = [85, 15];
    const dataLabels = ['Correct', 'Incorrect'];
    const backgroundColors = [
        'rgba(75, 192, 192, 0.7)',  // Green for 'Correct'
        'rgba(255, 99, 132, 0.7)'   // Red for 'Incorrect'
    ];
    
    // --- Dynamically Create Elements ---

    // 1. Create a container div for sizing
    const chartContainer = document.createElement('div');
    chartContainer.className = 'chart-container';

    // 2. Create the canvas element where the chart will be drawn
    const canvas = document.createElement('canvas');
    canvas.id = 'myDonutChart';

    // 3. Append the canvas to the container, and the container to the body
    chartContainer.appendChild(canvas);
    document.body.appendChild(chartContainer);

    // --- Create the Chart ---

    // 4. Get the 2D context of the canvas
    const ctx = canvas.getContext('2d');

    // 5. Define the chart's configuration
    const chartConfig = {
        type: 'doughnut', // Specify the chart type
        data: {
            labels: dataLabels,
            datasets: [{
                label: 'Result Percentage',
                data: dataValues,
                backgroundColor: backgroundColors,
                borderColor: [
                    'rgba(75, 192, 192, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1,
                cutout: '70%' // Controls the size of the hole in the middle
            }]
        },
        options: {
            responsive: true, // Makes the chart resize with its container
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top', // Position of the legend
                },
                title: {
                    display: true,
                    text: 'Assessment Results',
                    font: {
                        size: 18
                    }
                }
            }
        }
    };

    // 6. Create the new chart instance
    const myDonutChart = new Chart(ctx, chartConfig);
}

function splitAtFirstCapital(str) {
  if (!str) {
    return [];
  }

  const index = str.search(/[A-Z]/);

  if (index === -1 || index === 0) {
    return [str];
  }

  return [str.slice(0, index), str.slice(index)];
}

function clearMetric(containerId) {
  let metricContainer = document.getElementById(containerId);
  while(metricContainer.firstChild) {
    metricContainer.removeChild(metricContainer.firstChild);
  }
}

function displayMetrics(containerId) {
  // clear existing metrics
  clearMetric(containerId);
  function renderPerView() {
    clearMetric(containerId);
    if (currentView === 'file') {
      currentSortMethod = currentSortMethod ? currentSortMethod : "averageScore";
      displayFileInfo(containerId);
    }
    else {
      currentSortMethod = currentSortMethod ? currentSortMethod : "cognitive_complexity";
      displayFunctionInfo(containerId);
    }
  }
  const viewToggleOptions = {
    defaultView: 'file',
    onChangeCallback: (selectedView) => {
      currentView = selectedView;
      currentSortMethod = '';
      changeSortOptions();
      renderPerView()
    }
  };
  if (firstRender) {
    createControlsCard('user-interface');
    createViewToggleCard('user-interface', viewToggleOptions);
    firstRender = false;
  }
  renderPerView();
}


function changeSortOptions() {
  const sortContainer = document.getElementById('sort-controls-container-select');
  let options = currentView === 'file'? fileSortOptions : functionSortOptions;
  sortContainer.options.length = 0;
  Object.keys(options).forEach((key, index) => {
    const option = document.createElement('option');
    option.value = options[key][0]; // e.g., 'fileName'
    option.textContent = options[key][1]; // e.g., 'File Name'
    sortContainer.appendChild(option);

    // Set the first option as the default selected one
    if (index === 0) {
      option.selected = true;
    }
  });
}

function displayFunctionInfo(containerId) {
  // Get the container element where we'll add the code information
  const container = document.getElementById(containerId);

  // Check if the container element exists
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found.`);
    return;
  }
  if (!currCodeData) {
    return;
  }
  let comparator;
  if (sortOrder === 'dsc') {
    comparator = (a, b) => b[currentSortMethod] - a[currentSortMethod];
  }
  else {
    comparator = (a, b) => a[currentSortMethod] - b[currentSortMethod];
  }
  currCodeData.sort(comparator)
//////////////// AGGREGATE METRICS /////////////////////
  // Add a baseline metrics box
  const overallMetrics = document.createElement('div');
  overallMetrics.classList.add('overall-metrics-container');
  overallMetrics.id = "overallMetrics";
  for (item in aggregateFunctionMetrics) {
    // container for each metric
    var metric = document.createElement('div');
    metric.classList.add('code-metric-overview');
    // metric.style.display = 'inline-block';

    // metric name
    var name = document.createElement('h3');
    name.classList.add('overall-metrics-name');
    var nameText;
    if (item === 'loc') {
      nameText = document.createTextNode("Lines of Code");
    }
    else {
      var readableNameArr = splitAtFirstCapital(item);
      if (readableNameArr.length > 1) {
        var cognitive = ' ';
        if (item.includes('Score')) {
          cognitive = ' Cognitive Complexity ';
        }
        var readableName = readableNameArr[0].charAt(0).toUpperCase() + readableNameArr[0].slice(1) + cognitive + readableNameArr[1];
      }
      else {
        var readableName = readableNameArr[0];
      }
      nameText = document.createTextNode(readableName);
    }
    name.appendChild(nameText);

    // Metric Value
    var value = document.createElement('p');
    value.classList.add('overall-metrics-value');

    if (typeof aggregateFunctionMetrics[item] === 'object') {
      // Function name
      var funcName = document.createElement('div');
      funcName.classList.add('overall-metrics-function-name');
      var funcNameText = document.createTextNode(aggregateFunctionMetrics[item].function);
      funcName.appendChild(funcNameText);

      // Ref to rest of functions stats
      var ref = document.createElement('a');
      ref.classList.add('overall-metrics-link');
      ref.href = '#' + aggregateFunctionMetrics[item].function + '-metrics';
      ref.appendChild(funcName);

      value.innerHTML = aggregateFunctionMetrics[item].value;
    }
    else {
      value.innerHTML = aggregateFunctionMetrics[item];
    }

    // Add sub info to metric box
    metric.appendChild(name);
    metric.appendChild(value);
    if (typeof aggregateFunctionMetrics[item] === 'object' ) {
      metric.appendChild(ref);
    }
    // add metric box to box of metrics
    overallMetrics.appendChild(metric);
  }

  // Add charts
  const chartBox = document.createElement("div");
  chartBox.classList.add("chart-contianer");

  const methodChartBox = document.createElement('div');
  methodChartBox.classList.add('chart-box');

  const methodChart = document.createElement('canvas');
  methodChart.id = "methodChart";
  methodChartBox.appendChild(methodChart);
  chartBox.appendChild(methodChartBox);

  const methodCtx = methodChart.getContext('2d');
  const data1 = {
    labels: [
        'Over',
        'Under',
    ],
    datasets: [{
        label: 'Methods under Threshold',
        data: [methodsAboveMargin, aggregateFunctionMetrics.fileCount - methodsAboveMargin],
        backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(6, 108, 18)',
        ],
        hoverOffset: 4
    }]
  };
  const methodConfig = {
    type: 'pie',
    data: data1,
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Methods over threshold'
            }
        }
    },
  };


  const fileChartBox = document.createElement('div');
  fileChartBox.classList.add('chart-box');

  const fileChart = document.createElement('canvas');
  fileChart.id = "fileChart";
  const fileCtx = fileChart.getContext('2d');
  fileChartBox.appendChild(fileChart);
  chartBox.appendChild(fileChartBox);

  let files_over = 0;
  for (file in per_file_metrics) {
    if (per_file_metrics[file]["number_over"] > 0) {
      files_over += 1;
    }
  }
  const data2 = {
    labels: [
        'Over',
        'Under',
    ],
    datasets: [{
        label: 'Files with methods over Threshold',
        data: [files_over, aggregateFunctionMetrics.fileCount - files_over],
        backgroundColor: [
            'rgb(255, 99, 132)',
            'rgb(6, 108, 18)',
        ],
        hoverOffset: 4
    }]
  };
  const fileConfig = {
    type: 'pie',
    data: data2,
    options: {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
            },
            title: {
                display: true,
                text: 'Files with methods over threshold'
            }
        }
    },
  };


  overallMetrics.appendChild(chartBox);
  new Chart(methodCtx, methodConfig);
  new Chart(fileCtx, fileConfig);


  //// INDIVIDUAL METRICS ///////////////

  // Add box of metrics to parent element
  container.appendChild(overallMetrics);

  var metricBox = document.createElement('div');
  metricBox.classList.add('code-metric-box');

  // Add legend
  var metricLegend = document.createElement('div');
  metricLegend.classList.add('code-metric-legend');
  metricLegend.style.zIndex = currCodeData.length + 1;

  var legendName = document.createElement('p');
  legendName.textContent = 'Name';

  var legendLocation = document.createElement('p');
  legendLocation.textContent = 'Location';

  var legendCC = document.createElement('p');
  legendCC.textContent = 'Congitive-Complexity';

  metricLegend.appendChild(legendName);
  metricLegend.appendChild(legendLocation);
  metricLegend.appendChild(legendCC);

  metricBox.appendChild(metricLegend);


////////////# INDIVIDUAL METRICS #///////////////////
  function functionIsFiltered(func) {
    const re = new RegExp(RegExp.escape(currentFilterParam));
    if(func.name.search(re) || func.signature.search(re)) {
      return filterExclude;
    }
    return !filterExclude;
  }
  // Iterate over each item in the metrics
  currCodeData.forEach((item, idx) => {

    if (functionIsFiltered(item)) {
      return;
    }
    var scoreColor = getColor("#00FF00", "#FF0000", 0, 100, item.cognitive_complexity);

    // Create collapsible toggle for each entry
    const codeCollapsible = document.createElement('button');
    codeCollapsible.type = "button";
    codeCollapsible.style.backgroundColor = scoreColor;
    codeCollapsible.style.width = '100%';
    codeCollapsible.addEventListener("click", function() {
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    })
    // specify name
    const name = document.createElement('p');
    name.textContent = item.name;
    codeCollapsible.appendChild(name);

    // specify location
    const loc = document.createElement('p');
    loc.textContent = item.location;
    codeCollapsible.appendChild(loc);
    // specify cc
    const cc = document.createElement('p');
    cc.textContent = item.cognitive_complexity
    codeCollapsible.appendChild(cc);

    codeCollapsible.classList.add('code-info-toggle');
    // Add arrow
    const toggle = document.createElement('i');
    toggle.classList.add('fa', 'fa-chevron-down');
    codeCollapsible.appendChild(toggle);

    // Create group for managing info + toggle
    const metricElement = document.createElement('div');
    metricElement.style.zIndex = `${currCodeData.length - (idx)}`;

    metricElement.appendChild(codeCollapsible);

    // Create a new div element for each entry
    const codeElement = document.createElement('div');
    codeElement.classList.add('code-info-item');
    codeElement.id = item["name"] + "-metrics";
    codeElement.style.display = "none";

    const codeLineElement = document.createElement('pre');
    codeLineElement.textContent = item.signature;

    codeLineElement.style.color = scoreColor;
    const codeLineElementRef = document.createElement('a');
    var href = item.location.split(":").slice(0,1).join("#");
    codeLineElementRef.href = urlBase + href;
    codeLineElementRef.appendChild(codeLineElement);
    codeElement.appendChild(codeLineElementRef);
    const statsElement = document.createElement('div');
    statsElement.classList.add('code-stats');
    const skipped_stats = new Set(['name', 'location', 'cognitive-complexity']);
    for (const key in item) {
      if (!skipped_stats.has(key)) {
        let name = key;
        const listItem = document.createElement('div');
        listItem.classList.add('info-box');
        const header = document.createElement('h3');
        header.textContent = name;
        const body = document.createElement('p');
        body.textContent = item[key];
        listItem.appendChild(header);
        listItem.appendChild(body);
        statsElement.appendChild(listItem);
      }
      codeElement.appendChild(statsElement);
    }
    // Append code information to individual metrics element
    metricElement.appendChild(codeElement);
    // Append the created code element to the container
    metricBox.appendChild(metricElement);
  });
  container.appendChild(metricBox);
}

// Parse file upload
function extractPerFileMetrics(data, file) {
  // File metrics
  per_file_metrics[file].totalLoc += data.lines;
  per_file_metrics[file].totalScore += data.cognitive_complexity

  var cogComplexity = data.cognitive_complexity;
  if (cogComplexity > CC_THRESHOLD) {
    per_file_metrics[file]["numberOver"] += 1;
    methodsAboveMargin += 1;
  }
  if (cogComplexity > per_file_metrics[file].worstScore.score) {
    per_file_metrics[file].worstScore.score = cogComplexity;
    per_file_metrics[file].worstScore.method = data.name;
  }
  if (cogComplexity < per_file_metrics[file].bestScore.score) {
    per_file_metrics[file].bestScore.score = cogComplexity;
    per_file_metrics[file].bestScore.method = data.name;
  }
}

function parseMetricJson(data) {
  currCodeData = [];
  var funcCount = 0;
  var totalScore = 0;
  for(var file in data) {
    per_file_metrics[file] = {
      "methodCount": 0,
      "numberOver": 0,
      "worstScore": {
        'score': 0,
        'method': ''
      },
      "bestScore" : {
        'score': 9999,
        'method': ''
      },
      "totalScore" : 0,
      "totalLoc": 0,
      "averageScore": 0,
      "averageLoc": 0,
    }
    for (var func in data[file]) {
      extractPerFileMetrics(data[file][func], file);
      funcCount += 1;
      totalScore += data[file][func].cognitive_complexity;
      // Function contexts
      aggregateFunctionMetrics.functionCount += 1;
      aggregateFunctionMetrics.loc += data[file][func].lines;
      var cogComplexity = data[file][func].cognitive_complexity;
      var numBranches = data[file][func].branches;
      var funLen = data[file][func].statements;
      // highest score
      if ( cogComplexity > aggregateFunctionMetrics.highestScore.value) {
        aggregateFunctionMetrics.highestScore.value = cogComplexity;
        aggregateFunctionMetrics.highestScore.function = func;
      }
      // lowest score
      if (cogComplexity < aggregateFunctionMetrics.lowestScore.value ) {
        aggregateFunctionMetrics.lowestScore.value = cogComplexity;
        aggregateFunctionMetrics.lowestScore.function = func;
      }
      // longest function
      if (funLen > aggregateFunctionMetrics.longestFunction.value) {
        aggregateFunctionMetrics.longestFunction.value = funLen;
        aggregateFunctionMetrics.longestFunction.function = func;
      }
      // most branches
      if (numBranches > aggregateFunctionMetrics.branchCount.value) {
        aggregateFunctionMetrics.branchCount.value = numBranches;
        aggregateFunctionMetrics.branchCount.function = func;
      }
      currCodeData.push(data[file][func]);
    }

    if(per_file_metrics[file].worstScore.score > aggregateFileMetrics.worstScore) {
      aggregateFileMetrics.worstScore = per_file_metrics[file].worstScore.score;
      aggregateFileMetrics.worstFile = file;
    }
    if(per_file_metrics[file].bestScore.score < aggregateFileMetrics.bestScore) {
      aggregateFileMetrics.bestScore = per_file_metrics[file].bestScore.score;
      aggregateFileMetrics.bestFile = file;
    }
    if(per_file_metrics[file].totalLoc > aggregateFileMetrics.mostLoc) {
      aggregateFileMetrics.mostLoc = per_file_metrics[file].totalLoc;
      aggregateFileMetrics.highestLocFile = file;
    }
    let methodCount = Object.keys(data[file]).length;
    let avgScore = per_file_metrics[file].totalScore / methodCount;
    let avgLoc = per_file_metrics[file].totalLoc / methodCount;
    per_file_metrics[file].averageScore = avgScore.toFixed(2);
    per_file_metrics[file].averageLoc = avgLoc;
    per_file_metrics[file].methodCount = methodCount;
    if (avgScore > CC_THRESHOLD) {
      aggregateFileMetrics.numberOfFilesOver += 1;
    }
  }
  aggregateFunctionMetrics.averageScore = (totalScore / funcCount).toFixed(2);
  aggregateFunctionMetrics.fileCount = Object.keys(data).length;

  // compute aggregate file metrics
  aggregateFileMetrics.fileCount = Object.keys(data).length
  aggregateFileMetrics.averageScore = (totalScore / aggregateFileMetrics.fileCount).toFixed(2);
}

function hexToRgb(hex) {
  var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function map(value, fromSource, toSource, fromTarget, toTarget) {
  return (value - fromSource) / (toSource - fromSource) * (toTarget - fromTarget) + fromTarget;
}

// inspired by https://stackoverflow.com/a/46543292
function getColor(startcolor, endcolor, min, max, value) {
  var startRGB = hexToRgb(startcolor);
  var endRGB = hexToRgb(endcolor);
  var percentFade = map(value, min, max, 0, 1);

  var diffRed = endRGB.r - startRGB.r;
  var diffGreen = endRGB.g - startRGB.g;
  var diffBlue = endRGB.b - startRGB.b;

  diffRed = (diffRed * percentFade) + startRGB.r;
  diffGreen = (diffGreen * percentFade) + startRGB.g;
  diffBlue = (diffBlue * percentFade) + startRGB.b;

  var result = "rgb(" + Math.round(diffRed) + ", " + Math.round(diffGreen) + ", " + Math.round(diffBlue) + ")";
  return result;
}

function createSortSelector(container, sortOptions, onSortChange) {
  const parentContainer = container;
  if (!parentContainer) {
    console.error(`Container element with ID "${containerId}" not found.`);
    return;
  }

  // 1. Create a wrapper for better styling control
  const sortContainer = document.createElement('div');
  sortContainer.className = 'js-sort-selector-container';

  // 2. Create the label
  const label = document.createElement('label');
  label.className = 'js-sort-label';
  label.textContent = 'Sort by:';
  label.htmlFor = `${container.id}-select`; // Link to the select input for accessibility

  // 3. Create and configure the select dropdown
  const select = document.createElement('select');
  select.className = 'js-sort-select';
  select.id = `${container.id}-select`;
  
  select.addEventListener('change', (event) => {
    if (onSortChange && typeof onSortChange === 'function') {
      onSortChange(event.target.value);
    }
  });

  // 4. Populate the select with options
  Object.keys(sortOptions).forEach((key, index) => {
    const option = document.createElement('option');
    option.value = sortOptions[key][0]; // e.g., 'fileName'
    option.textContent = sortOptions[key][1]; // e.g., 'File Name'
    select.appendChild(option);

    // Set the first option as the default selected one
    if (index === 0) {
      option.selected = true;
    }
  });
  
  // 5. Assemble the component and add it to the parent
  sortContainer.appendChild(label);
  sortContainer.appendChild(select);
  parentContainer.appendChild(sortContainer);

  // 6. Inject CSS for the selector (only once per page load)
  const styleId = 'js-dynamic-sort-selector-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      .js-sort-selector-container {
        display: inline-flex;
        align-items: center;
        gap: 8px; /* Space between label and select box */
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      }
      .js-sort-label {
        font-weight: 600;
        color: #444;
      }
      .js-sort-select {
        /* Remove default browser appearance */
        -webkit-appearance: none;
        appearance: none;
        /* Custom styles */
        display: inline-block;
        padding: 8px 32px 8px 12px; /* Extra right padding for custom arrow */
        font-size: 1em;
        color: #333;
        background-color: #ffffff;
        border: 1px solid #ccc;
        border-radius: 6px;
        cursor: pointer;
        transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        /* Custom dropdown arrow using an embedded SVG */
        background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'%3e%3cpath fill='none' stroke='%23343a40' stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M2 5l6 6 6-6'/%3e%3c/svg%3e");
        background-repeat: no-repeat;
        background-position: right 0.7rem center;
        background-size: 1em;
      }
      .js-sort-select:hover {
        border-color: #aaa;
      }
      .js-sort-select:focus {
        outline: none; /* Remove default focus outline */
        border-color: #007bff; /* Use theme color for focus border */
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* Focus ring consistent with other elements */
      }
    `;
    document.head.appendChild(styleSheet);
  }
}

// Example Usage:
const functionSortOptions = {
  cogComplexity: ['cognitive_complexity','Cognitive Complexity'],
  numlines: ['lines', 'Number of Lines'],
  numstatements: ['statements', 'Number of Statements'],
  numbranches: ['branches', 'Number of Branches'],
  numparameters: ['parameters', 'Number of Parameters'],
  nestinglvl: ['level', 'Nesting Level'],
  numvariables: ['variables', 'Number of Variables']
};

const fileSortOptions = {
  cogComplexity: ['averageScore','Cognitive Complexity'],
  numlines: ['totalLoc', 'Number of Lines'],
  nummethods: ['methodCount', 'Number of Methods'],
};

function handleSort(sortByCriteria) {
  currentSortMethod = sortByCriteria;
  displayMetrics('metric-container');
}

function createViewToggleCard(parentElementId, options) {
    const parentElement = document.getElementById(parentElementId);
    if (!parentElement) {
        console.error(`Parent element with ID "${parentElementId}" not found.`);
        return;
    }

    // 1. Create the main card structure
    const card = document.createElement('div');
    card.className = 'view-toggle-card';

    const title = document.createElement('h2');
    title.textContent = 'View';
    card.appendChild(title);

    // 2. Create the content container
    const contentContainer = document.createElement('div');
    contentContainer.className = 'view-toggle-card-content';
    // Assign a unique ID so the helper function can find it
    const contentId = `${parentElementId}-view-toggle-content`;
    contentContainer.id = contentId;
    
    // 3. Call the helper to create the toggle inside the content container
    createFileViewToggle(
        contentContainer,
        options.defaultView,
        options.onChangeCallback
    );

    // 4. Assemble the card and append it to the DOM
    card.appendChild(contentContainer);
    parentElement.appendChild(card);

    // 5. Inject CSS for the card layout
    const styleId = 'js-dynamic-view-toggle-card-styles';
    if (!document.getElementById(styleId)) {
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            /* Main Card Styling */
            .view-toggle-card {
                background-color: #ffffff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                margin-bottom: 20px;
            }
            .view-toggle-card h2 {
                margin: 0;
                padding: 20px 24px;
                font-size: 1.25em;
                background-color: #fafafa;
                border-bottom: 1px solid #ddd;
            }
            /* Content area styling */
            .view-toggle-card-content {
                /* Use flexbox to easily center the toggle */
                display: flex;
                justify-content: center;
                align-items: center;
                padding: 24px;
            }
        `;
        document.head.appendChild(styleSheet);
    }
}


function createControlsCard(parentElementId, options) {
    const parentElement = document.getElementById(parentElementId);
    if (!parentElement) {
        console.error(`Parent element with ID "${parentElementId}" not found.`);
        return;
    }

    // 1. Create main card and title
    const card = document.createElement('div');
    card.className = 'controls-card';
    card.id = 'filter-controls-card'

    const title = document.createElement('h2');
    title.textContent = 'Filter & Sort Controls';
    card.appendChild(title);

    // 2. Create the main content container (will use flexbox)
    const contentContainer = document.createElement('div');
    contentContainer.className = 'controls-card-content';

    // 3. Create sub-containers for layout groups
    const searchControls = document.createElement('div');
    searchControls.className = 'search-controls';
    searchControls.id = 'search-controls-container'; // Give it an ID for children to attach to

    const sortControls = document.createElement('div');
    sortControls.className = 'sort-controls';
    sortControls.id = 'sort-controls-container'; // Give it an ID

    // 4. Call helper functions to populate the sub-containers
    // Populate Search Controls
    addSearchBarWithEnterEvent(searchControls, false); // Include
    addSearchBarWithEnterEvent(searchControls, true);  // Exclude

    // Populate Sort Controls
    createSortSelector(
        sortControls,
        currentView === 'file'? fileSortOptions : functionSortOptions,
        handleSort
    );
    createToggleSwitch(
        sortControls,
        'sort-direction-toggle',
        true,
        handleOrdering
    );
    
    // 5. Assemble the layout and append to the DOM
    contentContainer.appendChild(searchControls);
    contentContainer.appendChild(sortControls);
    card.appendChild(contentContainer);
    parentElement.appendChild(card);
    
    // 6. Inject CSS for the card layout
    const styleId = 'js-dynamic-controls-card-styles';
    if (!document.getElementById(styleId)) {
        const styleSheet = document.createElement('style');
        styleSheet.id = styleId;
        styleSheet.textContent = `
            /* Main Card Styling */
            .controls-card {
                background-color: #ffffff;
                border: 1px solid #ddd;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
                margin-bottom: 20px;
            }
            .controls-card h2 {
                margin: 0;
                padding: 20px 24px;
                font-size: 1.25em;
                background-color: #fafafa;
                border-bottom: 1px solid #ddd;
            }
            /* Flexbox container for controls */
            .controls-card-content {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 24px;
                gap: 20px;
                flex-wrap: wrap; /* Allows items to stack on smaller screens */
            }
            /* Grouping for search and sort controls */
            .search-controls, .sort-controls {
                display: flex;
                align-items: center;
                gap: 12px; /* Space between items in a group */
                flex-wrap: wrap;
            }
            .search-controls {
                flex-grow: 1; /* Allows search bars to take up available space */
            }
              /* Make search bars within the flex group expand */
            .search-controls .js-dynamic-search-bar {
                min-width: 200px;
                flex-grow: 1;
            }
        `;
        document.head.appendChild(styleSheet);
    }
}

// Order data
function handleOrdering(isChecked, switchId) {
  if (isChecked) {
    sortOrder = "dsc";
  }
  else {
    sortOrder = "asc";
  }
  displayMetrics('metric-container');
}

function createFileViewToggle(parentElement, defaultView = 'file', onChangeCallback = null) {
  // 1. Create the main container
  const toggleContainer = document.createElement('div');
  toggleContainer.className = 'js-view-toggle-container';

  // 2. Create the two button options for better accessibility
  const fileOption = document.createElement('button');
  fileOption.className = 'js-view-toggle-option';
  fileOption.textContent = 'File';
  fileOption.dataset.value = 'file';

  const functionOption = document.createElement('button');
  functionOption.className = 'js-view-toggle-option';
  functionOption.textContent = 'Function';
  functionOption.dataset.value = 'function';

  // 3. Set the initial active state
  if (defaultView === 'function') {
    functionOption.classList.add('active');
  } else {
    fileOption.classList.add('active');
  }

  // 4. Add the options to the container
  toggleContainer.append(fileOption, functionOption);

  // 5. Add event listener to the container for efficient handling
  toggleContainer.addEventListener('click', (event) => {
    const clickedOption = event.target.closest('.js-view-toggle-option');

    // Ensure a button was clicked and it's not already active
    if (clickedOption && !clickedOption.classList.contains('active')) {
      // Remove 'active' from the currently active option
      toggleContainer.querySelector('.active').classList.remove('active');
      
      // Add 'active' to the clicked option
      clickedOption.classList.add('active');

      // Execute the callback with the new value if it exists
      if (onChangeCallback && typeof onChangeCallback === 'function') {
        onChangeCallback(clickedOption.dataset.value);
      }
    }
  });

  // 6. Append the fully assembled toggle to the specified parent
    if (parentElement) {
        parentElement.appendChild(toggleContainer);
    } else {
        console.error(`Parent element with ID "${parentElementId}" not found.`);
    }

  // 7. Inject CSS for the toggle switch (only once per page load)
  const styleId = 'js-dynamic-view-toggle-styles';
  if (!document.getElementById(styleId)) {
    const styleSheet = document.createElement('style');
    styleSheet.id = styleId;
    styleSheet.textContent = `
      .js-view-toggle-container {
        display: inline-flex;
        background-color: #e9ecef; /* A light grey background */
        border-radius: 20px; /* Fully rounded ends for the pill shape */
        padding: 4px;
        border: 1px solid #dee2e6;
        user-select: none;
      }
      .js-view-toggle-option {
        /* Reset default button styles */
        border: none;
        background: none;
        /* Styling */
        padding: 6px 16px;
        cursor: pointer;
        border-radius: 16px; /* Rounded shape for the button itself */
        font-weight: 600;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
        font-size: 0.9em;
        color: #495057; /* Text color for inactive options */
        transition: background-color 0.2s ease-in-out, color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
      }
      .js-view-toggle-option:hover:not(.active) {
        background-color: #dee2e6; /* Slight hover effect for inactive options */
      }
      .js-view-toggle-option.active {
        background-color: #ffffff; /* White background for the active option */
        color: #007bff; /* A primary color for active text */
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
        cursor: default;
      }
    `;
    document.head.appendChild(styleSheet);
  }
}


// toggle switch for engaging the asc/desc order
function createToggleSwitch(parentElement, switchId, defaultChecked = true, onChangeCallback = null) {

  // Main container (label for the checkbox, makes the whole thing clickable)
  const switchLabelElement = document.createElement('label');
  switchLabelElement.className = 'js-toggle-switch';
  switchLabelElement.htmlFor = switchId; // Associate label with checkbox

  // Hidden actual checkbox input (handles state and accessibility)
  const checkboxInput = document.createElement('input');
  checkboxInput.type = 'checkbox';
  checkboxInput.id = switchId;
  checkboxInput.name = switchId; // Good practice for form data
  checkboxInput.className = 'js-switch-input';
  checkboxInput.checked = defaultChecked;

  if (onChangeCallback && typeof onChangeCallback === 'function') {
      checkboxInput.addEventListener('change', (event) => {
          onChangeCallback(event.target.checked, event.target.id);
      });
  }

  // Visual part of the switch (the track)
  const sliderElement = document.createElement('span');
  sliderElement.className = 'js-switch-slider';

  // Create the label text element
  const labelTextElement = document.createElement('span');
  labelTextElement.className = 'js-switch-label-text';
  // Set the initial text based on the default state
  labelTextElement.textContent = checkboxInput.checked ? "Descending" : "Ascending";
  
  // Add the single, comprehensive event listener
  checkboxInput.addEventListener('change', (event) => {
      const isChecked = event.target.checked;
      
      // 1. Update the dynamic label text
      labelTextElement.textContent = isChecked ? "Descending" : "Ascending";

      // 2. Execute the external callback function if it was provided
      if (onChangeCallback && typeof onChangeCallback === 'function') {
          onChangeCallback(isChecked, event.target.id);
      }
  });


  // Assemble the core switch parts
  switchLabelElement.appendChild(checkboxInput);
  switchLabelElement.appendChild(sliderElement);
  switchLabelElement.appendChild(labelTextElement);

  // Append the fully assembled switch to the specified parent element
  parentElement.appendChild(switchLabelElement);

  // Inject CSS for the toggle switch (only once per page load)
  const styleId = 'js-dynamic-toggle-switch-styles';
  if (!document.getElementById(styleId)) {
      const styleSheet = document.createElement('style');
      styleSheet.id = styleId;
      styleSheet.textContent = `
          .js-toggle-switch {
              display: inline-flex; /* Aligns slider and optional text label nicely */
              align-items: center;
              cursor: pointer;
              user-select: none; /* Prevent text selection on click */
              gap: 8px; /* Space between the visual switch and its text label */
              vertical-align: middle; /* Aligns better if mixed with text */
          }
          .js-switch-input {
              /* Hide the default checkbox visually but keep it accessible */
              opacity: 0;
              width: 0;
              height: 0;
              position: absolute; /* Take it out of the layout flow */
          }
          .js-switch-slider {
              position: relative;
              display: inline-block;
              width: 40px;  /* Width of the switch track */
              height: 20px; /* Height of the switch track */
              background-color: #ccc; /* Default color of the track (off state) */
              border-radius: 20px; /* Fully rounded track ends */
              transition: background-color 0.2s ease-in-out;
          }
          /* The Knob for the switch */
          .js-switch-slider::before {
              content: "";
              position: absolute;
              height: 16px; /* Diameter of the knob */
              width: 16px;  /* Diameter of the knob */
              left: 2px;    /* Initial horizontal position of the knob (offset from left) */
              bottom: 2px;  /* Initial vertical position of the knob (offset from bottom) */
              background-color: white;
              border-radius: 50%; /* Perfectly circular knob */
              transition: transform 0.2s ease-in-out;
              box-shadow: 0 1px 3px rgba(0,0,0,0.2);
          }
          /* Styles when the switch is checked (on) */
          .js-switch-input:checked + .js-switch-slider {
              background-color: #4CAF50; /* Active color for the track (e.g., green) */
          }
          .js-switch-input:checked + .js-switch-slider::before {
              /* Move knob to the right: track_width - knob_width - left_offset = 40 - 16 - 2 = 22px (from left edge of slider) */
              /* Or simply slider_width - knob_width - initial_left_offset */
              /* The knob moves by (track_width - (2*offset) - knob_width) = 40 - 4 - 16 = 20px */
              transform: translateX(20px);
          }
          /* Accessibility: Focus styles for keyboard navigation */
          .js-switch-input:focus + .js-switch-slider {
              box-shadow: 0 0 0 2px rgba(76, 175, 80, 0.5); /* Example focus ring, matches active color */
          }
          .js-switch-input:focus:not(:checked) + .js-switch-slider {
                box-shadow: 0 0 0 2px rgba(0,0,0,0.2); /* Focus ring for off state */
          }
          .js-switch-label-text {
              font-size: 1em; /* Adjust as needed */
              color: #333;   /* Text color for the label */
          }
      `;
      document.head.appendChild(styleSheet);
  }
}

// Search bar for methods
function addSearchBarWithEnterEvent(parentElement, exclusion=false) {
  var filterType = exclusion ? 'exclude' : 'include';
  const placeholderText = `Filter (${filterType})...`;
  const className = 'dynamic-search-bar';
  const elementId = filterType + '-method-filter';

  const searchInput = document.createElement('input');
  searchInput.type = 'search'; // 'search' type can offer built-in clear ('x') button
  searchInput.id = elementId;
  searchInput.className = className;
  searchInput.placeholder = placeholderText;
  searchInput.setAttribute('aria-label', placeholderText);

  searchInput.addEventListener('keyup', function(event) {
    if (event.key === 'Enter') {
      const query = searchInput.value.trim();
      if (currCodeData) {
        currentFilterParam = query;
        filterExclude = !exclusion;
        displayMetrics('metric-container');
      }
    }
  });

  parentElement.appendChild(searchInput);

  const styleId = 'dynamic-search-bar-styles';
  if (!document.getElementById(styleId) && className === 'dynamic-search-bar') {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    // --- CSS MODIFICATIONS START ---
    styleElement.textContent = `
        .${className} {
            /* Sizing and Box Model */
            width: 100%;
            box-sizing: border-box; /* Consistent with other inputs */
            padding: 8px 12px;

            /* Typography and Appearance */
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            font-size: 1em;
            color: #333;
            background-color: #ffffff;
            
            /* Border and Shape */
            border: 1px solid #ccc;
            border-radius: 6px; /* Reduced to match dropdown/buttons */
            
            /* Transitions for smooth interaction */
            transition: border-color 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
        }

        /* Consistent focus state styling */
        .${className}:focus {
            outline: none;
            border-color: #007bff;
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25);
        }

        /* Style placeholder text */
        .${className}::placeholder {
            color: #888;
            opacity: 1; /* Override Firefox's lower default opacity */
        }
    `;
    document.head.appendChild(styleElement);
  }

  return searchInput;
}

function addRangeMetricBox(parentContainerId) {
  const container = document.getElementById(parentContainerId);
  var metricBox = document.createElement('div');
  metricBox.classList.add('code-metric-box');
  metricBox.id = `range-code-metric-box`
  container.appendChild(metricBox);
  return metricBox.id;
}

function addRangeLegend(parentContainerId) {
  const container = document.getElementById(parentContainerId);

  // Add legend
  var metricLegend = document.createElement('div');
  metricLegend.classList.add('code-metric-legend');
  metricLegend.style.zIndex = per_file_metrics.length + 1;

  var legendName = document.createElement('p');
  legendName.textContent = 'Build #';

  var legendType = document.createElement('p');
  legendType.textContent = 'Date';

  var legendCC = document.createElement('p');
  legendCC.textContent = 'Average Congitive-Complexity';

  metricLegend.appendChild(legendName);
  metricLegend.appendChild(legendType);
  metricLegend.appendChild(legendCC);
  container.appendChild(metricLegend);
}

function minimalFileConext(parentContainerId) {
  // Iterate over each item in the metrics
  const container = document.getElementById(parentContainerId);
  let comparator;
  if (sortOrder === 'dsc') {
    comparator = (a, b) => b[1][currentSortMethod] - a[1][currentSortMethod];
  }
  else {
    comparator = (a, b) => a[1][currentSortMethod] - b[1][currentSortMethod];
  }
  let entries = Object.entries(per_file_metrics);
  entries.sort(comparator);
  function fileIsFiltered(loc) {
    const re = new RegExp(RegExp.escape(currentFilterParam));
    if(loc.search(re)) {
      return filterExclude;
    }
    return !filterExclude;
  }
  entries.forEach((item, idx) => {
    
    var location = item[0];
    var metrics = item[1];
    if(fileIsFiltered(location)) {
      return;
    }

    var scoreColor = getColor("#00FF00", "#FF0000", 0, 100, metrics.averageScore);

    // Create collapsible toggle for each entry
    const codeCollapsible = document.createElement('button');
    codeCollapsible.type = "button";
    codeCollapsible.style.backgroundColor = scoreColor;
    codeCollapsible.style.width = '100%';
    codeCollapsible.addEventListener("click", function() {
      var content = this.nextElementSibling;
      if (content.style.display === "block") {
        content.style.display = "none";
      } else {
        content.style.display = "block";
      }
    })
    // specify name
    const name = document.createElement('p');
    name.textContent = location;
    codeCollapsible.appendChild(name);
    // specify type
    const type = document.createElement('p');
    type.textContent = 'file';
    codeCollapsible.appendChild(type);
    // specify location
    // const loc = document.createElement('p');
    // loc.textContent = item['location'];
    // codeCollapsible.appendChild(loc);
    // specify cc
    const cc = document.createElement('p');
    cc.textContent = metrics.averageScore;
    codeCollapsible.appendChild(cc);

    codeCollapsible.classList.add('code-info-toggle');
    // Add arrow
    const toggle = document.createElement('i');
    toggle.classList.add('fa', 'fa-chevron-down');
    codeCollapsible.appendChild(toggle);

    // Create group for managing info + toggle
    const metricElement = document.createElement('div');
    metricElement.style.zIndex = `${per_file_metrics.length - (idx)}`;

    metricElement.appendChild(codeCollapsible);

    // Create a new div element for each entry
    const codeElement = document.createElement('div');
    codeElement.classList.add('code-info-item');
    codeElement.id = location + "-metrics";
    codeElement.style.display = "none";

    // const codeLineElement = document.createElement('pre');
    // codeLineElement.textContent = item["code-line"];

    // codeLineElement.style.color = scoreColor;
    // const codeLineElementRef = document.createElement('a');
    // var href = item.split(":").slice(0,1).join("#");
    // codeLineElementRef.href = urlBase + href;
    // codeLineElementRef.appendChild(codeLineElement);
    // codeElement.appendChild(codeLineElementRef);

    const statsElement = document.createElement('div');
    statsElement.classList.add('code-stats');
    function makeStatElement(name, stat, funcName=null) {
      const listItem = document.createElement('div');
      listItem.classList.add('info-box');
      const header = document.createElement('h3');
      header.textContent = name;
      const body = document.createElement('p');
      body.textContent = stat;
      listItem.appendChild(header);
      listItem.appendChild(body);
      if(funcName) {
        const func = document.createElement('p');
        func.textContent = funcName;
        listItem.appendChild(func);
      }
      statsElement.appendChild(listItem);
      codeElement.appendChild(statsElement);
    }
    makeStatElement('Highest Cognitive Complexity', metrics.worstScore.score, metrics.worstScore.method);
    makeStatElement('Lowest Cognitive Complexity', metrics.bestScore.score, metrics.bestScore.method);
    makeStatElement('Total Lines of Code', metrics.totalLoc);
    makeStatElement('Average Lines of Code', metrics.averageLoc);
    makeStatElement('Average Cognitive Complexity', metrics.averageScore);
    makeStatElement('Number of methods over Cognitive Complexity Threshold', metrics.numberOver);

    // Append code information to individual metrics element
    metricElement.appendChild(codeElement);
    // Append the created code element to the container
    container.appendChild(metricElement);
  });
}

function addBuildEntry(bid, date, parentContainerId, idx) {
  const container = document.getElementById(parentContainerId);
  var scoreColor = getColor("#00FF00", "#FF0000", 0, 100, aggregateFileMetrics.averageScore);

  // Create collapsible toggle for each entry
  const codeCollapsible = document.createElement('button');
  codeCollapsible.type = "button";
  codeCollapsible.style.backgroundColor = scoreColor;
  codeCollapsible.style.width = '100%';
  codeCollapsible.addEventListener("click", function() {
    var content = this.nextElementSibling;
    if (content.style.display === "block") {
      content.style.display = "none";
    } else {
      content.style.display = "block";
    }
  })
  // specify name
  const name = document.createElement('p');
  name.textContent = `Build #${bid}`;
  codeCollapsible.appendChild(name);
  // specify type
  const dateElem = document.createElement('p');
  dateElem.textContent = `Date: ${date}`;
  codeCollapsible.appendChild(dateElem);
  const cc = document.createElement('p');
  cc.textContent = aggregateFileMetrics.averageScore;
  codeCollapsible.appendChild(cc);

  codeCollapsible.classList.add('code-info-toggle');
  // Add arrow
  const toggle = document.createElement('i');
  toggle.classList.add('fa', 'fa-chevron-down');
  codeCollapsible.appendChild(toggle);

  // Create group for managing info + toggle
  const metricElement = document.createElement('div');
  metricElement.style.zIndex = `${buildCount - (idx)}`;

  metricElement.appendChild(codeCollapsible);
  // Create a new div element for each entry
  const codeElement = document.createElement('div');
  codeElement.classList.add('code-info-item');
  codeElement.id = bid + "-metrics";
  codeElement.style.display = "none";

  const statsElement = document.createElement('div');
  statsElement.classList.add('code-stats');
  function makeStatElement(name, stat, funcName) {
    const listItem = document.createElement('div');
    listItem.classList.add('info-box');
    const header = document.createElement('h3');
    header.textContent = name;
    const body = document.createElement('p');
    body.textContent = stat;
    listItem.appendChild(header);
    listItem.appendChild(body);
    if(funcName) {
      const func = document.createElement('p');
      func.textContent = funcName;
      listItem.appendChild(func);
    }
    statsElement.appendChild(listItem);
    codeElement.appendChild(statsElement);
  }
  makeStatElement('Highest Cognitive Complexity', aggregateFileMetrics.worstScore, aggregateFileMetrics.worstFile);
  makeStatElement('Lowest Cognitive Complexity', aggregateFileMetrics.bestScore, aggregateFileMetrics.bestFile);
  makeStatElement('Total Lines of Code', aggregateFileMetrics.totalLoc);
  makeStatElement('Highest Lines of Code', aggregateFileMetrics.mostLoc, aggregateFileMetrics.highestLocFile);
  makeStatElement('Average Cognitive Complexity', aggregateFileMetrics.averageScore);
  makeStatElement('Number of files over Cognitive Complexity Threshold', aggregateFileMetrics.numberOfFilesOver);
  metricElement.appendChild(codeElement);
  container.appendChild(metricElement)
  minimalFileConext(codeElement.id);
}

async function cdashRenderRangeData(url, pid, old, current) {
  const query = `
query {
  project(id:${pid}) {
    builds(filters: {
      all: [
            {
              lt:{
                submissionTime: "2025-08-25T21:30:12+00:00"
              }
            },
            {
              gt: {
                  submissionTime: "2025-08-25T16:00:12+00:00"
              },
            },
          ]
    }) {
      edges {
        node {
          id
        }
      }
    }
  }
}
`;
  const rsp = await makeCDashPostRequest(url, query);
  let edges = rsp['data']['project']['builds']['edges']
  if (!(edges.length > 0)) {
    console.error("No builds found between these dates");
  }
  let bids = new Array();
  edges.forEach(edge => {
    bids.push(edge['node']['id']);
  });
  let data_entries = new Array()
  buildCount = bids.length;
  for (const bid of bids ) {
    const rsp = await getFileId(url, bid);
    // Function to fetch a file from an API endpoint
    try {
      let unparsedCodeData = await getMetricsData(rsp, new URL(url), bid);
      let metricContent = new MetricParser()
      metricContent.parse(unparsedCodeData);
      let buildDate = await getBuildDate(url, bid);
      data_entries.push([bid, buildDate.data.build.submissionTime, metricContent.metrics]);
    } catch (error) {
      console.error('Error fetching file:', error);
      // Handle the error appropriately, e.g., display an error message to the user
      continue;
    }
  }
  const parentContainerId = 'metric-container';
  const metricContainerId = addRangeMetricBox(parentContainerId);
  addRangeLegend(metricContainerId);
  data_entries.forEach((entry,idx) => {
    // parse metric data
    parseMetricJson(entry[2]);
    addBuildEntry(entry[0], entry[1], metricContainerId, idx);
  });
}

function toISOStringWithTimezone(date) {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const seconds = date.getSeconds().toString().padStart(2, '0');
  const milliseconds = date.getMilliseconds().toString().padStart(3, '0');

  const offset = date.getTimezoneOffset();
  const offsetSign = offset > 0 ? '-' : '+';
  const offsetHours = Math.floor(Math.abs(offset) / 60).toString().padStart(2, '0');
  const offsetMinutes = (Math.abs(offset) % 60).toString().padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}${offsetSign}${offsetHours}:${offsetMinutes}`;
}

// CALENDAR //

function renderCalendarWidget() {

  // --- State Variables ---
  let currentDate = new Date();
  let startDate = null;
  let endDate = null;

  // --- Create and Structure DOM Elements ---
  const h2 = document.createElement('h2');
  h2.textContent = 'Select a Date Range';

  const calendarContainer = document.createElement('div');
  calendarContainer.id = 'calendar-container';

  // Header
  const calendarHeader = document.createElement('div');
  calendarHeader.className = 'calendar-header';

  const prevMonthBtn = document.createElement('button');
  prevMonthBtn.id = 'prev-month-btn';
  prevMonthBtn.innerHTML = '&lt;';

  const monthYearDisplay = document.createElement('h3');
  monthYearDisplay.id = 'month-year-display';

  const nextMonthBtn = document.createElement('button');
  nextMonthBtn.id = 'next-month-btn';
  nextMonthBtn.innerHTML = '&gt;';

  calendarHeader.append(prevMonthBtn, monthYearDisplay, nextMonthBtn);

  // Weekdays
  const weekdaysContainer = document.createElement('div');
  weekdaysContainer.className = 'calendar-weekdays';
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  weekdays.forEach(day => {
      const dayDiv = document.createElement('div');
      dayDiv.textContent = day;
      weekdaysContainer.appendChild(dayDiv);
  });

  // Days Grid
  const calendarDays = document.createElement('div');
  calendarDays.id = 'calendar-days';
  calendarDays.className = 'calendar-grid';

  // Selected Dates Display
  const selectedDatesDisplay = document.createElement('p');
  selectedDatesDisplay.id = 'selected-dates-display';
  selectedDatesDisplay.textContent = 'No dates selected';

  // Assemble the calendar
  calendarContainer.append(calendarHeader, weekdaysContainer, calendarDays);
  let UI = document.getElementById('user-interface');
  UI.append(h2, calendarContainer, selectedDatesDisplay);

  // --- Main Function to Render the Calendar ---
  const renderCalendar = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      monthYearDisplay.textContent = `${currentDate.toLocaleString('default', { month: 'long' })} ${year}`;
      calendarDays.innerHTML = ''; // Clear previous days

      const firstDayOfMonth = new Date(year, month, 1).getDay();
      const daysInMonth = new Date(year, month + 1, 0).getDate();

      // 1. Add days from the previous month
      const daysInPrevMonth = new Date(year, month, 0).getDate();
      for (let i = firstDayOfMonth; i > 0; i--) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'prev-month');
        dayElement.textContent = daysInPrevMonth - i + 1;
        calendarDays.appendChild(dayElement);
      }

      // 2. Add days for the current month
      for (let i = 1; i <= daysInMonth; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day');
        dayElement.textContent = i;
        dayElement.dataset.date = new Date(year, month, i).toISOString();

        const thisDate = new Date(year, month, i);

        // Apply styles for selected dates and range
        if (startDate && thisDate.getTime() === startDate.getTime()) {
            dayElement.classList.add('selected', 'start-range');
        }
        if (endDate && thisDate.getTime() === endDate.getTime()) {
            dayElement.classList.add('selected', 'end-range');
        }
        if (startDate && endDate && thisDate > startDate && thisDate < endDate) {
            dayElement.classList.add('in-range');
        }

        calendarDays.appendChild(dayElement);
      }

      // 3. Add days from the next month (to fill the grid)
      const totalDaysRendered = calendarDays.children.length;
      const nextMonthDays = (7 - (totalDaysRendered % 7)) % 7;
      for (let i = 1; i <= nextMonthDays; i++) {
        const dayElement = document.createElement('div');
        dayElement.classList.add('day', 'next-month');
        dayElement.textContent = i;
        calendarDays.appendChild(dayElement);
      }
  };

  // --- Event Listeners ---
  prevMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() - 1);
      renderCalendar();
  });

  nextMonthBtn.addEventListener('click', () => {
      currentDate.setMonth(currentDate.getMonth() + 1);
      renderCalendar();
  });

  calendarDays.addEventListener('click', (e) => {
      if (e.target.classList.contains('day') && e.target.dataset.date) {
          const selectedDate = new Date(e.target.dataset.date);

          if (!startDate || (startDate && endDate)) {
            // First click or resetting the selection
            startDate = selectedDate;
            endDate = null;
          } else if (startDate && !endDate) {
              // Second click
              if (selectedDate < startDate) {
                endDate = startDate;
                startDate = selectedDate;
              } else {
                endDate = selectedDate;
              }

              // ---- EVENT TRIGGER ----
              handleDateRangeSelected();
          }
          updateSelectedDatesDisplay();
          renderCalendar(); // Re-render to apply new styles
      }
  });

  // --- Helper Functions ---
  const updateSelectedDatesDisplay = () => {
      if (startDate && endDate) {
          selectedDatesDisplay.textContent = `Selected Range: ${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`;
      } else if (startDate) {
          selectedDatesDisplay.textContent = `Selected Start Date: ${startDate.toLocaleDateString()}`;
      } else {
          selectedDatesDisplay.textContent = 'No dates selected';
      }
  };

  function handleDateRangeSelected() {
      const start = toISOStringWithTimezone(startDate);
      const end = toISOStringWithTimezone(endDate);

      cdashRenderRangeData(gCDashURL, projectId, start, end);
      // // You can replace this alert with any other action.
      // alert(`🎉 Date range selected!\n\nStart: ${start}\nEnd: ${end}`);
  }

  // --- Initial Render ---
  renderCalendar();


}


// GLOBALS

let urlBase = ''
let projectId = ''
const CC_THRESHOLD = 25;
let gCDashURL = '';

var currCodeData;
var currentView = 'file';
let currentSortMethod = '';
let filterExclude = true;
let currentFilterParam = '';
let buildCount = 0;

var sortOrder = "dsc";
let aggregateFunctionMetrics = {
    "averageScore": 0,
    "functionCount" : 0,
    "loc" : 0,
    "fileCount" : 0,
    "highestScore" : {
      "value": 0,
      "function" : "",
    },
    "lowestScore": {
      "value": 1000,
      "function" : "",
    },
    "longestFunction": {
      "value": 0,
      "function" : "",
    },
    "branchCount": {
      "value": 0,
      "function" : "",
    },
};

let aggregateFileMetrics = {
  "fileCount" : 0,
  "numberOfFilesOver": 0,
  "worstFile": '',
  'worstScore': 0,
  'bestFile': '',
  'bestScore': 9999,
  'totalScore': 0,
  'mostLoc': 0,
  'highestLocFile': '',
  'averageScore': 0
}

// File Name -> per method info
let per_file_metrics = {};
let methodsAboveMargin = 0;
let firstRender = true;


function renderMetricsPage() {
  const cm = document.getElementById('codeMetrics');
  const ui = document.createElement('g');
  ui.id = "user-interface";
  createUploadUI_Tabbed(ui);
  cm.appendChild(ui);

  const mc = document.createElement('div');
  mc.id = "metric-container";
  cm.appendChild(mc);
}


renderMetricsPage();