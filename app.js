(function () {
  "use strict";
  const data = window.FINKBEINER_DEMO_DATA;
  if (!data) return;

  const zSelect = document.getElementById("z-select");
  const exposureSelect = document.getElementById("exposure-select");
  const focusSlider = document.getElementById("focus-threshold");
  const saturationSlider = document.getElementById("saturation-threshold");
  const conditionImage = document.getElementById("condition-image");
  const conditionCaption = document.getElementById("condition-caption");
  const readout = document.getElementById("readout");
  const svg = document.getElementById("focus-curve");

  data.zOffsets.forEach((z) => {
    const option = document.createElement("option");
    option.value = z;
    option.textContent = `${z} µm`;
    zSelect.appendChild(option);
  });
  data.exposures.forEach((exposure) => {
    const option = document.createElement("option");
    option.value = exposure;
    option.textContent = `${exposure}×`;
    exposureSelect.appendChild(option);
  });
  zSelect.value = data.defaultZ;
  exposureSelect.value = data.defaultExposure;

  function key(z, exposure) { return `z${z}_e${exposure}`; }
  function condition(z, exposure) { return data.conditions[key(z, exposure)]; }
  function svgElement(tag, attrs, label) {
    const el = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, value));
    if (label !== undefined) el.textContent = label;
    return el;
  }

  function stateFor(item) {
    const focusMin = Number(focusSlider.value);
    const satMax = Number(saturationSlider.value);
    if (item.focusRetention >= focusMin && item.saturation <= satMax) return "keep";
    if (item.focusRetention >= focusMin - 10 && item.saturation <= satMax + 1) return "review";
    return "reacquire";
  }

  function drawCurve(exposure, selectedZ) {
    svg.replaceChildren();
    const left = 46, top = 18, width = 520, height = 210;
    [0, 25, 50, 75, 100].forEach((tick) => {
      const y = top + height * (1 - tick / 100);
      svg.appendChild(svgElement("line", {x1:left,y1:y,x2:left+width,y2:y,stroke:"#e8e8e8"}));
      svg.appendChild(svgElement("text", {x:38,y:y+4,"text-anchor":"end",fill:"#777","font-size":"11"}, `${tick}%`));
    });
    const points = data.zOffsets.map((z, i) => {
      const x = left + i * width / (data.zOffsets.length - 1);
      const y = top + height * (1 - condition(z, exposure).focusRetention / 100);
      return {x,y,z};
    });
    svg.appendChild(svgElement("polyline", {points:points.map(p=>`${p.x},${p.y}`).join(" "),fill:"none",stroke:"#1f7a8c","stroke-width":"3"}));
    points.forEach((p) => {
      svg.appendChild(svgElement("circle", {cx:p.x,cy:p.y,r:p.z===selectedZ?6:4,fill:p.z===selectedZ?"#c07a2a":"#1f7a8c"}));
      svg.appendChild(svgElement("text", {x:p.x,y:252,"text-anchor":"middle",fill:"#777","font-size":"11"}, `${p.z}`));
    });
    svg.appendChild(svgElement("text", {x:306,y:274,"text-anchor":"middle",fill:"#666","font-size":"12"}, "Simulated defocus offset (µm)"));
  }

  function renderCondition() {
    const z = Number(zSelect.value);
    const exposure = Number(exposureSelect.value);
    const item = condition(z, exposure);
    const state = stateFor(item);
    conditionImage.src = item.image;
    conditionImage.alt = `Simulated microscopy crop at ${z} micrometres defocus and ${exposure} times exposure`;
    conditionCaption.textContent = `Selected · z=${z} µm, ${exposure}× exposure`;
    document.getElementById("metric-focus").textContent = `${item.focusRetention.toFixed(1)}%`;
    document.getElementById("metric-saturation").textContent = `${item.saturation.toFixed(2)}%`;
    document.getElementById("metric-action").textContent = state === "keep" ? "Keep" : state === "review" ? "Review" : "Retake";
    const reason = state === "keep" ? "clears both current limits" : state === "review" ? "sits close to a current limit" : "falls outside the current QC limits";
    readout.innerHTML = `<strong>${z} µm · ${exposure}×</strong> retains ${item.focusRetention.toFixed(1)}% of the same-exposure focal-plane edge energy and has ${item.saturation.toFixed(2)}% saturated pixels. It ${reason}.`;
    drawCurve(exposure, z);
  }

  function renderMatrix() {
    const matrix = document.getElementById("qc-matrix");
    matrix.replaceChildren();
    matrix.appendChild(Object.assign(document.createElement("div"), {className:"matrix-head", textContent:"Exposure"}));
    data.zOffsets.forEach((z) => matrix.appendChild(Object.assign(document.createElement("div"), {className:"matrix-head", textContent:`${z} µm`})));
    const counts = {keep:0,review:0,reacquire:0};
    data.exposures.forEach((exposure) => {
      matrix.appendChild(Object.assign(document.createElement("div"), {className:"matrix-label", textContent:`${exposure}×`}));
      data.zOffsets.forEach((z) => {
        const item = condition(z, exposure);
        const state = stateFor(item);
        counts[state] += 1;
        const button = document.createElement("button");
        button.type = "button";
        button.className = `matrix-cell ${state}`;
        button.textContent = `${item.focusRetention.toFixed(0)}%`;
        button.title = `${z} µm, ${exposure}×: ${state}; focus ${item.focusRetention.toFixed(1)}%, saturation ${item.saturation.toFixed(2)}%`;
        button.addEventListener("click", () => { zSelect.value=z; exposureSelect.value=exposure; renderCondition(); });
        matrix.appendChild(button);
      });
    });
    document.getElementById("focus-threshold-value").textContent = `${Number(focusSlider.value).toFixed(0)}%`;
    document.getElementById("saturation-threshold-value").textContent = `${Number(saturationSlider.value).toFixed(2)}%`;
    document.getElementById("gate-summary").innerHTML = `<strong>${counts.keep}/21 kept</strong> · ${counts.review} reviewed · ${counts.reacquire} reacquired`;
    renderCondition();
  }

  zSelect.addEventListener("change", renderCondition);
  exposureSelect.addEventListener("change", renderCondition);
  focusSlider.addEventListener("input", renderMatrix);
  saturationSlider.addEventListener("input", renderMatrix);
  renderMatrix();
}());
