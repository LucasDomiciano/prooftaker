(function () {
  var script = document.currentScript;
  if (!script) return;

  var project = script.getAttribute("data-project");
  if (!project) {
    console.error("[ProofTaker] data-project é obrigatório no embed.");
    return;
  }

  var type = script.getAttribute("data-type") || "wall";
  var count = script.getAttribute("data-count") || "6";
  var stars = script.getAttribute("data-stars") || "true";
  var accent = script.getAttribute("data-accent") || "";

  var src = new URL(script.src);
  var base = src.origin;
  var params = new URLSearchParams({
    type: type,
    count: count,
    stars: stars,
  });
  if (accent) params.set("accent", accent);

  var iframe = document.createElement("iframe");
  iframe.src = base + "/embed/" + encodeURIComponent(project) + "?" + params.toString();
  iframe.title = "Depoimentos ProofTaker — Wall of Love";
  iframe.loading = "lazy";
  iframe.style.width = "100%";
  iframe.style.border = "0";
  iframe.style.display = "block";
  iframe.style.minHeight = type === "single" ? "320px" : "480px";
  iframe.setAttribute("scrolling", "no");
  iframe.setAttribute("allowtransparency", "true");

  function onMessage(event) {
    if (!event.data || event.data.source !== "prooftaker-embed") return;
    if (event.data.type === "resize" && typeof event.data.height === "number") {
      iframe.style.height = Math.max(event.data.height, 120) + "px";
    }
  }

  window.addEventListener("message", onMessage);

  iframe.addEventListener("load", function () {
    try {
      iframe.contentWindow.postMessage({ source: "prooftaker-parent", type: "ping" }, "*");
    } catch (_) {}
  });

  script.parentNode.insertBefore(iframe, script.nextSibling);
})();
