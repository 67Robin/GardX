const toggle = document.getElementById("toggle");
const status = document.getElementById("status");
const progressBar = document.getElementById("progressBar");
const signalsDiv = document.getElementById("signals");
const openphishDiv = document.getElementById("openphish");

// Load toggle state (default ON)
chrome.storage.local.get("enabled", data => {
  toggle.checked = data.enabled !== false;
  render();
});

// Save toggle state
toggle.addEventListener("change", () => {
  chrome.storage.local.set({ enabled: toggle.checked });
  render();
});

chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === "SCAN_UPDATED") {
    render(); // 🔥 re-render popup instantly
  }
});
chrome.storage.onChanged.addListener((changes) => {
  if (changes) {
    render();
  }
});

// Main render logic
function render() {
  if (!toggle.checked) {
    status.innerText = "Protection is OFF";
    status.className = "status unknown";
    progressBar.style.width = "0%";
    signalsDiv.innerHTML = "";
    openphishDiv.style.display = "none";
    return;
  }

  chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
    if (!tabs.length) return;

    const key = `scanResult_${tabs[0].id}`;

    chrome.storage.local.get(key, data => {
      if (!data || !data[key]) {
        status.className = "status unknown";
        status.innerText = "No login page detected";
        progressBar.style.width = "0%";
        signalsDiv.innerHTML = "";
        openphishDiv.style.display = "none";
        return;
      }

      const r = data[key];

      if (r.verdict === "PHISHING") {
        status.className = "status phishing";
        status.innerText = "⚠️ Fake / Phishing Login Page";
        progressBar.className = "progress-bar progress-risk";
      } else {
        status.className = "status safe";
        status.innerText = "✅ Genuine Login Page";
        progressBar.className = "progress-bar progress-safe";
      }

      const score = Math.min(Math.max(r.score || 0, 0), 100);
      progressBar.style.width = score + "%";

      signalsDiv.innerHTML = "";
      if (Array.isArray(r.signals)) {
        r.signals.forEach(sig => {
          const tag = document.createElement("div");
          tag.className = "tag";
          tag.innerText = sig.replace(/_/g, " ");
          signalsDiv.appendChild(tag);
        });
      }

      openphishDiv.style.display = r.openphish ? "block" : "none";
    });
  });
}
chrome.tabs.onActivated.addListener(() => {
  render();
});

// Initial render
render();