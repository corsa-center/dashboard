(function () {
  const modal = document.getElementById("guideModal");
  const openGuide = document.getElementById("openGuide");
  const closeGuide = document.getElementById("closeGuide");

  function setModal(open) {
    if (!modal) return;
    modal.classList.toggle("open", open);
    modal.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  openGuide?.addEventListener("click", () => setModal(true));
  closeGuide?.addEventListener("click", () => setModal(false));
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) setModal(false);
  });
  const uploadModal = document.getElementById("uploadModal");
  const openUploadModal = document.getElementById("openUploadModal");
  const closeUploadModal = document.getElementById("closeUploadModal");
  const cancelUpload = document.getElementById("cancelUpload");
  const dependencyFile = document.getElementById("dependencyFile");
  const uploadFileRow = document.getElementById("uploadFileRow");
  const uploadFileName = document.getElementById("uploadFileName");
  const removeUploadFile = document.getElementById("removeUploadFile");
  const submitUpload = document.getElementById("submitUpload");

  function setUploadModal(open) {
    if (!uploadModal) return;
    uploadModal.classList.toggle("open", open);
    uploadModal.setAttribute("aria-hidden", String(!open));
    document.body.style.overflow = open ? "hidden" : "";
  }

  function clearUploadFile() {
    if (dependencyFile) dependencyFile.value = "";
    if (uploadFileRow) uploadFileRow.hidden = true;
    if (submitUpload) submitUpload.disabled = true;
  }

  openUploadModal?.addEventListener("click", () => setUploadModal(true));
  closeUploadModal?.addEventListener("click", () => setUploadModal(false));
  cancelUpload?.addEventListener("click", () => setUploadModal(false));
  uploadModal?.addEventListener("click", (event) => {
    if (event.target === uploadModal) setUploadModal(false);
  });
  dependencyFile?.addEventListener("change", () => {
    const file = dependencyFile.files?.[0];
    if (!file) return clearUploadFile();
    if (uploadFileName) uploadFileName.textContent = file.name;
    if (uploadFileRow) uploadFileRow.hidden = false;
    if (submitUpload) submitUpload.disabled = false;
  });
  removeUploadFile?.addEventListener("click", clearUploadFile);
  submitUpload?.addEventListener("click", () => setUploadModal(false));

  const uploadMode = new URLSearchParams(window.location.search).get("upload") === "1";
  if (uploadMode && uploadModal) {
    document.body.classList.add("upload-mode");
    const projectName = document.querySelector(".project-name");
    const projectDescription = document.querySelector(".project-strip p");
    const infoWrap = document.querySelector(".info-wrap");
    const statValues = document.querySelectorAll(".stats strong");
    const resultCount = document.querySelector(".result-count");
    const dataTable = document.querySelector(".data-table");

    if (projectName?.firstChild) projectName.firstChild.textContent = "No data loaded ";
    if (projectDescription) projectDescription.textContent = "Upload a dependency data file to begin exploring.";
    if (infoWrap) infoWrap.hidden = true;
    statValues.forEach((value) => { value.textContent = "0"; });
    if (resultCount) resultCount.textContent = "Showing 0 of 0 dependents";
    document.querySelectorAll(".table-row:not(.table-head)").forEach((row) => { row.hidden = true; });
    document.querySelector(".show-more")?.setAttribute("hidden", "");
    document.querySelectorAll(".graph-canvas .node, .graph-canvas .edge, .graph-canvas .legend").forEach((item) => { item.hidden = true; });
    document.querySelectorAll(".citation-card").forEach((card) => { card.hidden = true; });
    const publicationCount = document.querySelector(".citation-summary strong");
    if (publicationCount) publicationCount.textContent = "0 publications found";
    if (dataTable) {
      const message = document.createElement("div");
      message.className = "empty-table-message";
      message.textContent = "Upload data to populate the dependents table.";
      dataTable.append(message);
    }
    const graphCanvas = document.querySelector(".graph-canvas");
    if (graphCanvas) {
      const message = document.createElement("div");
      message.className = "empty-tab-message";
      message.textContent = "Upload data to visualize a dependency network.";
      graphCanvas.append(message);
    }
    const citationsPanel = document.querySelector(".citations-panel");
    if (citationsPanel) {
      const message = document.createElement("div");
      message.className = "empty-tab-message";
      message.textContent = "Upload data to discover academic citations.";
      citationsPanel.append(message);
    }
    setUploadModal(true);
  }

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setModal(false);
      setUploadModal(false);
    }
  });

  const tabs = Array.from(document.querySelectorAll(".tab"));
  const panels = Array.from(document.querySelectorAll(".tab-panel"));
  const switchViewButton = document.getElementById("switchViewButton");

  function activateTab(name) {
    tabs.forEach((tab) => tab.classList.toggle("active", tab.dataset.tab === name));
    panels.forEach((panel) => panel.classList.toggle("active", panel.dataset.panel === name));
    if (switchViewButton) {
      switchViewButton.textContent = name === "graph" ? "View dependents in List" : "View dependents in graph";
    }
  }

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tab));
  });

  const depthFilter = document.getElementById("depthFilter");
  const sortFilter = document.getElementById("sortFilter");
  const dependentRows = Array.from(document.querySelectorAll("#dependentsPanel .table-row:not(.table-head)"));
  const dependentCount = document.querySelector("#dependentsPanel .result-count");
  const showMoreRows = document.getElementById("showMoreRows");
  const dependentsTable = document.querySelector("#dependentsPanel .data-table");
  let visibleRowLimit = 10;
  let generatedRowCount = 0;

  const dummyPackages = [
    ["conduit", "LLNL", "L1"],
    ["ascent", "Alpine-DAV", "L2"],
    ["umpire", "LLNL", "L2"],
    ["raja", "LLNL", "L1"],
    ["chai", "LLNL", "L2"],
    ["sundials", "LLNL", "L1"],
    ["hypre", "hypre-space", "L2"],
    ["adios2", "ornladios", "L2"],
    ["kokkos", "kokkos", "L1"],
    ["glvis", "glvis", "L2"],
  ];

  function addDummyRow() {
    if (!dependentsTable) return;
    const template = dummyPackages[generatedRowCount % dummyPackages.length];
    const batch = Math.floor(generatedRowCount / dummyPackages.length) + 1;
    const key = `${template[0]}-${batch}`;
    const name = batch === 1 ? template[0] : `${template[0]}-${batch}`;
    const stars = Math.max(120, 880 - generatedRowCount * 23).toLocaleString("en-US");
    const row = document.createElement("button");
    row.className = "table-row";
    row.type = "button";
    row.dataset.package = key;
    row.setAttribute("role", "row");
    row.innerHTML = `<span>${name}</span><span>${template[1]}</span><span class="depth${template[2] === "L1" ? " l1" : ""}">${template[2]}</span><span>${stars}</span><span>2026-02-01</span>`;
    dependentsTable.appendChild(row);
    dependentRows.push(row);
    packageData[key] = { name, owner: template[1], stars, depth: template[2] };
    generatedRowCount += 1;
  }

  function filterByDepth() {
    if (!depthFilter || document.body.classList.contains("upload-mode")) return;
    const selectedDepth = depthFilter.value;
    let visibleRows = 0;

    dependentRows.forEach((row, index) => {
      const rowDepth = row.querySelector(".depth")?.textContent.trim();
      const isAvailable = index < visibleRowLimit;
      const visible = isAvailable && (selectedDepth === "all" || rowDepth === selectedDepth);
      row.hidden = !visible;
      if (visible) visibleRows += 1;
    });

    if (dependentCount) dependentCount.textContent = `Showing ${visibleRows} of 507 dependents`;
  }

  function sortDependents() {
    if (!dependentsTable || !sortFilter) return;
    const mode = sortFilter.value;

    dependentRows.sort((rowA, rowB) => {
      const nameA = rowA.querySelector("span")?.firstChild?.textContent.trim().toLowerCase() || "";
      const nameB = rowB.querySelector("span")?.firstChild?.textContent.trim().toLowerCase() || "";
      const starsA = Number(rowA.children[3]?.textContent.replace(/,/g, "")) || 0;
      const starsB = Number(rowB.children[3]?.textContent.replace(/,/g, "")) || 0;

      if (mode === "stars-asc") return starsA - starsB || nameA.localeCompare(nameB);
      if (mode === "package-name") return nameA.localeCompare(nameB);
      return starsB - starsA || nameA.localeCompare(nameB);
    });

    dependentRows.forEach((row) => dependentsTable.appendChild(row));
    filterByDepth();
  }

  depthFilter?.addEventListener("change", filterByDepth);
  depthFilter?.addEventListener("input", filterByDepth);
  sortFilter?.addEventListener("change", sortDependents);
  sortFilter?.addEventListener("input", sortDependents);
  showMoreRows?.addEventListener("click", () => {
    visibleRowLimit += 10;
    while (dependentRows.length < visibleRowLimit) addDummyRow();
    sortDependents();
    if (dependentsTable) dependentsTable.scrollTop = dependentsTable.scrollHeight;
  });

  sortDependents();

  switchViewButton?.addEventListener("click", () => {
    const graphIsActive = document.querySelector('.tab[data-tab="graph"]')?.classList.contains("active");
    activateTab(graphIsActive ? "dependents" : "graph");
  });

  const packageData = {
    godot: { name: "godot", owner: "godotengine", stars: "107,283", depth: "L1" },
    vcpkg: { name: "vcpkg", owner: "microsoft", stars: "26,696", depth: "L2" },
    filament: { name: "filament", owner: "google", stars: "19,728", depth: "L1" },
    blender: { name: "blender", owner: "blender", stars: "17,634", depth: "L2" },
    bgfx: { name: "bgfx", owner: "bkaradzic", stars: "16,806", depth: "L2" },
    "homebrew-core": { name: "homebrew-core", owner: "Homebrew", stars: "15,078", depth: "L2" },
    dolphin: { name: "dolphin", owner: "dolphin-emu", stars: "14,682", depth: "L2" },
    Open3D: { name: "Open3D", owner: "isl-org", stars: "13,362", depth: "L2" },
    LunaTranslator: { name: "LunaTranslator", owner: "HIllya51", stars: "10,796", depth: "L2" },
    gcc: { name: "gcc", owner: "gcc-mirror", stars: "10,726", depth: "L2" },
    vtk: { name: "vtk", owner: "Kitware", stars: "9,842", depth: "L1" },
    openfoam: { name: "OpenFOAM", owner: "OpenFOAM", stars: "8,917", depth: "L1" },
    paraview: { name: "ParaView", owner: "Kitware", stars: "7,904", depth: "L1" },
    lammps: { name: "LAMMPS", owner: "lammps", stars: "7,566", depth: "L1" },
    visit: { name: "VisIt", owner: "visit-dav", stars: "4,831", depth: "L2" },
    meshio: { name: "meshio", owner: "nschloe", stars: "4,320", depth: "L2" },
    fenics: { name: "FEniCS", owner: "FEniCS", stars: "3,207", depth: "L2" },
    trilinos: { name: "Trilinos", owner: "trilinos", stars: "2,914", depth: "L2" },
    amanzi: { name: "Amanzi", owner: "amanzi", stars: "1,842", depth: "L2" },
    libpressio: { name: "libpressio", owner: "robertu94", stars: "1,128", depth: "L2" },
    mfem: { name: "MFEM", owner: "mfem", stars: "1,096", depth: "L1" },
    catalyst: { name: "Catalyst", owner: "Kitware", stars: "924", depth: "L2" },
    zfp: { name: "zfp", owner: "LLNL", stars: "3,421", depth: "Root" },
    openvdb: { name: "openvdb", owner: "AcademySoftwareFoundation", stars: "9,504", depth: "L2" },
    open3d: { name: "Open3D", owner: "isl-org", stars: "13,362", depth: "L2" },
    pytorch3d: { name: "pytorch3d", owner: "facebookresearch", stars: "11,980", depth: "L2" },
  };

  const emptyInspector = document.getElementById("emptyInspector");
  const detailInspector = document.getElementById("detailInspector");
  const packageName = document.getElementById("packageName");
  const packageOwner = document.getElementById("packageOwner");
  const packageDepth = document.getElementById("packageDepth");
  const packageStars = document.getElementById("packageStars");
  const packageChain = document.getElementById("packageChain");

  function selectPackage(key) {
    const data = packageData[key] || packageData.filament;
    document.querySelectorAll("[data-package]").forEach((row) => {
      row.classList.toggle("selected", row.dataset.package === key);
    });
    if (emptyInspector && detailInspector) {
      emptyInspector.hidden = true;
      detailInspector.hidden = false;
    }
    if (packageName) packageName.textContent = data.name;
    if (packageOwner) packageOwner.textContent = data.owner;
    if (packageDepth) {
      packageDepth.textContent = data.depth;
      packageDepth.classList.toggle("l1", data.depth === "L1" || data.depth === "Root");
    }
    if (packageStars) packageStars.textContent = data.stars;
    if (packageChain) packageChain.textContent = data.depth;
  }

  document.addEventListener("click", (event) => {
    const row = event.target.closest("[data-package]");
    if (row) selectPackage(row.dataset.package);
  });
})();
