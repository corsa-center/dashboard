let urlBase = ''
const CC_THRESHOLD = 25;
var totalScore = 0;
var seenFiles = new Set();
var codeData;
var currCodeData;
var sortOrder = "asc";
let aggregateMetrics = {
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

// File Name -> per method info
let per_file_metrics= {

};

let methodsAboveMargin = 0;

const cm = document.getElementById('codeMetrics');
const interface = document.createElement('g');
interface.id = "user-interface";

// File upload interfaces

const fi =  document.createElement('input');
fi.type = 'file'
fi.id = 'fileInput';
fi.style.margin = '20px';

fi.addEventListener('change', (event) => {
  const file = event.target.files[0];

    if (file) {
      const reader = new FileReader();

      reader.onload = (e) => {
        const content = e.target.result;
        // Process the file content
        codeData = parseMetricJson(JSON.parse(content));
        // maintain mirror of data to manipulate
        currCodeData = Array.from(codeData);
        render(currCodeData);
      };
      reader.onerror = (e) => {
        console.error("File reading error:", e);
      }
      reader.readAsText(file);
    }
});

// CDash interfaces

const cdashUrl = document.createElement('input');
cdashUrl.type = 'text';
cdashUrl.id = 'cdash-url';
cdashUrl.style.margin = '10px';
const cdashUrlLabel = document.createElement('label');
cdashUrlLabel.htmlFor='cdash-url';
cdashUrlLabel.textContent = 'Enter url for CDash build';

function getNodeId(data) {
  let edges = data['data']['build']['files']['edges']
  if (edges.length != 1) {
    console.error("Too many or too few files available to render")
  }
  return edges[0]['node']['id']
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

async function getMetricsJson(rsp, cdash, bid) {
  const response = await fetch(cdash.protocol + "//" + cdash.hostname + "/build" + `/${bid}` + '/file/' + getNodeId(rsp));
  if (!response.ok) {
    throw new Error(`HTTP Error! status ${response.status}`);
  }
  const data = await response.json();
  return data;
}

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
    const cdash_path_array = cdash.pathname.split('/');
    const bid = cdash_path_array[cdash_path_array.length - 1];
    const url = cdash.protocol + '//' + cdash.hostname + '/graphql';
    const rsp = await getFileId(url, bid);
    // Function to fetch a file from an API endpoint
    try {
      codeData = await getMetricsJson(rsp, cdash, bid);
      // maintain mirror of data to manipulate
      currCodeData = Array.from(codeData);
      parseMetricJson(codeData);
      render(currCodeData);
    } catch (error) {
      console.error('Error fetching file:', error);
      // Handle the error appropriately, e.g., display an error message to the user
    }
  }
});

const cdashUrlComp = document.createElement('div');
cdashUrlComp.appendChild(cdashUrlLabel);
cdashUrlComp.appendChild(cdashUrl);



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


const uploadUi = document.createElement('div');
uploadUi.classList.add('code-info-upload');

uploadUi.appendChild(fi);
uploadUi.appendChild(cdashUrlComp);
uploadUi.appendChild(codeForge);

interface.appendChild(uploadUi);

cm.appendChild(interface);

const mc = document.createElement('div');
mc.id = "metric-container";
cm.appendChild(mc);


function render(content) {
  aggregateMetrics.averageScore = totalScore / codeData.length;
  aggregateMetrics.fileCount = seenFiles.size;
  displayCodeInfo(content, 'metric-container');
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

function displayCodeInfo(codeArray, containerId) {
  // Get the container element where we'll add the code information
  const container = document.getElementById(containerId);

  // Check if the container element exists
  if (!container) {
    console.error(`Container element with ID "${containerId}" not found.`);
    return;
  }
  if (!codeArray) {
    return;
  }

//////////////// AGGREGATE METRICS /////////////////////
  // Add a baseline metrics box
  const overallMetrics = document.createElement('div');
  overallMetrics.classList.add('overall-metrics-container');
  overallMetrics.id = "overallMetrics";
  for (item in aggregateMetrics) {
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

    if (typeof aggregateMetrics[item] === 'object') {
      // Function name
      var funcName = document.createElement('div');
      funcName.classList.add('overall-metrics-function-name');
      var funcNameText = document.createTextNode(aggregateMetrics[item].function);
      funcName.appendChild(funcNameText);

      // Ref to rest of functions stats
      var ref = document.createElement('a');
      ref.classList.add('overall-metrics-link');
      ref.href = '#' + aggregateMetrics[item].function + '-metrics';
      ref.appendChild(funcName);

      value.innerHTML = aggregateMetrics[item].value;
    }
    else {
      value.innerHTML = aggregateMetrics[item];
    }

    // Add sub info to metric box
    metric.appendChild(name);
    metric.appendChild(value);
    if (typeof aggregateMetrics[item] === 'object' ) {
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
        data: [methodsAboveMargin, aggregateMetrics.fileCount - methodsAboveMargin],
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
        data: [files_over, aggregateMetrics.fileCount - files_over],
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
  metricLegend.style.zIndex = codeArray.length + 1;

  var legendName = document.createElement('p');
  legendName.textContent = 'Name';

  var legendType = document.createElement('p');
  legendType.textContent = 'Type';

  var legendLocation = document.createElement('p');
  legendLocation.textContent = 'Location';

  var legendCC = document.createElement('p');
  legendCC.textContent = 'Congitive-Complexity';

  metricLegend.appendChild(legendName);
  metricLegend.appendChild(legendType);
  metricLegend.appendChild(legendLocation);
  metricLegend.appendChild(legendCC);

  metricBox.appendChild(metricLegend);


////////////# INDIVIDUAL METRICS #///////////////////

  // Iterate over each item in the metrics
  codeArray.forEach((item, idx) => {
    var scoreColor = getColor("#00FF00", "#FF0000", 0, 100, item["cognitive-complexity"]);

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
    name.textContent = item['name'];
    codeCollapsible.appendChild(name);
    // specify type
    const type = document.createElement('p');
    type.textContent = item['type'];
    codeCollapsible.appendChild(type);
    // specify location
    const loc = document.createElement('p');
    loc.textContent = item['location'];
    codeCollapsible.appendChild(loc);
    // specify cc
    const cc = document.createElement('p');
    cc.textContent = item['cognitive-complexity'];
    codeCollapsible.appendChild(cc);

    codeCollapsible.classList.add('code-info-toggle');
    // Add arrow
    const toggle = document.createElement('i');
    toggle.classList.add('fa', 'fa-chevron-down');
    codeCollapsible.appendChild(toggle);

    // Create group for managing info + toggle
    const metricElement = document.createElement('div');
    metricElement.style.zIndex = `${codeArray.length - (idx)}`;

    metricElement.appendChild(codeCollapsible);

    // Create a new div element for each entry
    const codeElement = document.createElement('div');
    codeElement.classList.add('code-info-item');
    codeElement.id = item["name"] + "-metrics";
    codeElement.style.display = "none";

    const codeLineElement = document.createElement('pre');
    codeLineElement.textContent = item["code-line"];

    codeLineElement.style.color = scoreColor;
    const codeLineElementRef = document.createElement('a');
    var href = item["location"].split(":").slice(0,1).join("#");
    codeLineElementRef.href = urlBase + href;
    codeLineElementRef.appendChild(codeLineElement);
    codeElement.appendChild(codeLineElementRef);
    const statsElement = document.createElement('div');
    statsElement.classList.add('code-stats');
    const skipped_stats = new Set(['name', 'type', 'location', 'cognitive-complexity']);
    for (const key in item) {
      if (!skipped_stats.has(key)) {
        let name = key;
        if (key == 'code-line') {
          name = 'signature'
        }
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
function parseMetricJson(data) {
  var parsedCodeData = [];
  for(var item of data) {
    if ("cognitive-complexity" in item) {
      totalScore += item["cognitive-complexity"];
      aggregateMetrics.functionCount += 1;
      var location = item["location"].split(":")[0];
      seenFiles.add(location);
      // Add or update file info for file view
      if (!(location in per_file_metrics)) {
        per_file_metrics[location] = {
          "items" : [],
          "number_over": 0,
        }
      }
      per_file_metrics[location]["items"].push(item)

      aggregateMetrics.loc += item["num-lines"];
      var cogComplexity = item["cognitive-complexity"];
      if (cogComplexity > CC_THRESHOLD) {
        per_file_metrics[location]["number_over"] += 1;
        methodsAboveMargin += 1;
      }
      var numBranches = item["num-branches"];
      var funLen = item["num-statements"];
      // highest score
      if ( cogComplexity > aggregateMetrics.highestScore.value) {
        aggregateMetrics.highestScore.value = cogComplexity;
        aggregateMetrics.highestScore.function = item["name"];
      }
      // lowest score
      if (cogComplexity <aggregateMetrics.lowestScore.value ) {
        aggregateMetrics.lowestScore.value = cogComplexity;
        aggregateMetrics.lowestScore.function = item["name"];
      }
      // longest function
      if (funLen > aggregateMetrics.longestFunction.value) {
        aggregateMetrics.longestFunction.value = funLen;
        aggregateMetrics.longestFunction.function = item["name"];
      }
      // most branches
      if (numBranches > aggregateMetrics.branchCount.value) {
        aggregateMetrics.branchCount.value = numBranches;
        aggregateMetrics.branchCount.function = item["name"];
      }
      parsedCodeData.push(item);
    }
  }
  return parsedCodeData;
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

function createSortSelector(containerId, sortOptions, onSortChange) {
  const container = document.getElementById(containerId);

  if (!container) {
    console.error(`Container element with ID "${containerId}" not found.`);
    return;
  }

  const label = document.createElement('label');
  label.textContent = 'Sort by: ';
  container.appendChild(label);

  const select = document.createElement('select');
  select.addEventListener('change', (event) => {
    const sortBy = event.target.value;
    onSortChange(sortBy); // Call the provided event handler with the selected value
  });

  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = 'Select an option';
  select.appendChild(defaultOption);

  for (const key in sortOptions) {
    if (sortOptions.hasOwnProperty(key)) {
      const option = document.createElement('option');
      option.value = sortOptions[key][0];
      option.textContent = sortOptions[key][1];
      select.appendChild(option);
    }
  }

  container.appendChild(select);
}

// Example Usage:
const sortOptions = {
  cogComplexity: ['cognitive-complexity','Cognitive Complexity'],
  numlines: ['num-lines', 'Number of Lines'],
  numstatements: ['num-statements', 'Number of Statements'],
  numbranches: ['num-branches', 'Number of Branches'],
  numparameters: ['num-parameters', 'Number of Parameters'],
  nestinglvl: ['nesting-level', 'Nesting Level'],
  numvariables: ['num-variables', 'Number of Variables']
};

function handleSort(sortByCriteria) {
  document.getElementById('metric-container').innerHTML = '';
  currCodeData = sortArrayOfObjects(currCodeData, sortByCriteria, sortOrder);
  displayCodeInfo(currCodeData, 'metric-container');
}

document.addEventListener('DOMContentLoaded', () => {
  createSortSelector('user-interface', sortOptions, handleSort);
  // Inclusive filter
  addSearchBarWithEnterEvent('user-interface', false);
  // Exclusive filter
  addSearchBarWithEnterEvent('user-interface', true);
  createToggleSwitch('user-interface', 'order-switch', "Ascending/Descending", false, handleOrdering);
});

function sortArrayOfObjects(arr, key, direction = 'asc') {
  if (!Array.isArray(arr)) {
    console.error("Input must be an array.");
    return arr; // Or throw an error
  }

  if (arr.length === 0) {
    return [];
  }

  if (typeof arr[0] !== 'object' || arr[0] === null || !(key in arr[0])) {
    console.error("Array elements must be non-null objects containing the specified key.");
    return arr; // Or throw an error
  }

  const sortedArray = [...arr]; // Create a copy to avoid modifying the original array

  sortedArray.sort((a, b) => {
    const valueA = a[key];
    const valueB = b[key];

    let comparison = 0;

    if (typeof valueA === 'string' && typeof valueB === 'string') {
      comparison = valueA.localeCompare(valueB);
    } else if (typeof valueA === 'number' && typeof valueB === 'number') {
      comparison = valueA - valueB;
    } else if (valueA > valueB) {
      comparison = 1;
    } else if (valueA < valueB) {
      comparison = -1;
    }

    return direction === 'asc' ? comparison : comparison * -1;
  });

  return sortedArray;
}


function filterArrayOfObjects(arr, matcher, reject=false) {
  if (!Array.isArray(arr)) {
    console.error("Error: Input is not an array.");
    return [];
  }
  // Create regular expression to match method names
  if (!matcher) {
    return codeData;
  }
  const re = new RegExp(RegExp.escape(matcher));
  return arr.filter(obj => {
    if(obj["name"].search(re) || obj["code-line"].search(re)) {
      return !reject;
    }
    return reject;
  });
}

document.addEventListener('DOMContentLoaded', () => {
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
    document.body.append(h2, calendarContainer, selectedDatesDisplay);

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
        const start = startDate.toLocaleDateString();
        const end = endDate.toLocaleDateString();


        // You can replace this alert with any other action.
        alert(`🎉 Date range selected!\n\nStart: ${start}\nEnd: ${end}`);
    }

    // --- Initial Render ---
    renderCalendar();
});


function filterExcludeArrayOfObjects(arr, matcher) {
  return filterArrayOfObjects(arr, matcher, true);
}


function handleOrdering(isChecked, switchId) {
    if (isChecked) {
      sortOrder = "asc";
    }
    else {
      sortOrder = "dsc";
    }
    if (currCodeData) {
      currCodeData.reverse();
      document.getElementById('metric-container').innerHTML = '';
      displayCodeInfo(currCodeData, 'metric-container');
    }
}


function createToggleSwitch(parentElementId, switchId, labelText, defaultChecked = false, onChangeCallback = null) {

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
  // The "knob" of the switch will be created using a CSS pseudo-element (::before) on the slider.

  // Assemble the core switch parts
  switchLabelElement.appendChild(checkboxInput);
  switchLabelElement.appendChild(sliderElement);

  // Optional label text element, displayed next to the switch
  if (labelText && typeof labelText === 'string') {
      const labelTextElement = document.createElement('span');
      labelTextElement.className = 'js-switch-label-text';
      labelTextElement.textContent = labelText;
      switchLabelElement.appendChild(labelTextElement); // Append after the visual switch
  }

  // Append the fully assembled switch to the specified parent element
  var parentElement = document.getElementById(parentElementId);
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

function addSearchBarWithEnterEvent(parentElementId, exclusion=false) {
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
      if (codeData) {
        filteredCodeData = filterArrayOfObjects(codeData, query, !exclusion);
        currCodeData = filteredCodeData;
        document.getElementById('metric-container').innerHTML = '';
        displayCodeInfo(filteredCodeData, 'metric-container');
      }
    }
  });

  const parentElement = document.getElementById(parentElementId);
  parentElement.appendChild(searchInput);

  const styleId = 'dynamic-search-bar-styles';
  if (!document.getElementById(styleId) && className === 'dynamic-search-bar') {
    const styleElement = document.createElement('style');
    styleElement.id = styleId;
    styleElement.textContent = `
        .${className} {
            padding: 10px 15px;
            border: 1px solid #ccc;
            border-radius: 25px; /* More rounded for modern look */
            font-size: 1em;
            margin-top: 5px;
            min-width: 250px; /* Default width */
            box-sizing: border-box; /* Include padding and border in the element's total width and height */
        }
        .${className}:focus {
            outline: none;
            border-color: #007bff; /* Highlight color on focus */
            box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.25); /* Focus ring */
        }
    `;
    document.head.appendChild(styleElement);
  }

  return searchInput;
}

function resetFilters(parentElementId) {
  const parentElement = document.getElementById(parentElementId);
  parentElement.innerHTML = '';
  sortOrder = 'asc';
  currCodeData = Array.from(codeData);
  displayCodeInfo(currCodeData, parentElementId);
}

async function cdashRenderRangeData(url, pid, old, current) {
  const oldQuery = `
query {
  project(id:${pid}) {
    builds(filters: {
      any: [
            {
              gt: {
                  submissionTime: "${old}"
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
  const newQuery = `
query {
  project(id:${pid}) {
    builds(filters: {
      any: [
            {
              lt:{
                submissionTime: "${current}"
              }
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
  const oldresponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any necessary authorization headers, e.g., 'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ oldQuery })
  });
  if (!oldresponse.ok) {
    throw new Error(`HTTP Error! status ${oldresponse.status}`);
  }
  const newresponse = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Add any necessary authorization headers, e.g., 'Authorization': 'Bearer YOUR_TOKEN'
    },
    body: JSON.stringify({ newQuery })
  })
  if (!newresponse.ok) {
    throw new Error(`HTTP Error! status ${newresponse.status}`);
  }

  // Extract all BIDs from old

  // Extract all BIDS from new

  // Compute overlap

  // For each BID, get file

  // For each file, compute longitudinal data

  // Render
}

function renderCalendarWidget() {
  const monthYearDisplay = document.getElementById('month-year-display');
    const calendarDays = document.getElementById('calendar-days');
    const prevMonthBtn = document.getElementById('prev-month-btn');
    const nextMonthBtn = document.getElementById('next-month-btn');
    const selectedDatesDisplay = document.getElementById('selected-dates-display');

    // --- State Variables ---
    let currentDate = new Date();
    let startDate = null;
    let endDate = null;

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

        // 3. Add days from the next month
        const totalDaysRendered = calendarDays.children.length;
        const nextMonthDays = (7 - (totalDaysRendered % 7)) % 7;
        for (let i = 1; i <= nextMonthDays; i++) {
            const dayElement = document.createElement('div');
            dayElement.classList.add('day', 'next-month');
            dayElement.textContent = i;
            calendarDays.appendChild(dayElement);
        }
    };

    // --- Event Handlers ---
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
                // This is where your custom event occurs after the second date is selected.
                handleDateRangeSelected();
                // ---------------------
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
        const start = startDate.toLocaleDateString();
        const end = endDate.toLocaleDateString();
        cdashRenderRangeData(start, end);
    }

    // --- Initial Render ---
    renderCalendar();
}