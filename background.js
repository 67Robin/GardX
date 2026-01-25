chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get("enabled", data => {
    if (data.enabled === undefined) {
      chrome.storage.local.set({ enabled: true });
      console.log("[GuardX] Default protection set to ON");
    }
  });
});
chrome.tabs.onRemoved.addListener(tabId => {
  chrome.storage.local.remove(`scanResult_${tabId}`);
});

chrome.runtime.onConnect.addListener(port => {
  if (port.name !== "scan-port") return;

  port.onMessage.addListener(message => {
    console.log("Message received:", message);

    if (message.type !== "SCAN_URL") return;
    chrome.storage.local.get("enabled", state => {
      if (state.enabled === false) {
        console.log("Protection OFF – scan skipped");
        return;
      }
    });

    const url = message.url;

    fetch("https://login-api-z8xu.onrender.com/scan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    })
      .then(res => {
        if (!res.ok) {
          throw new Error("API returned non-200 status");
        }
        return res.json();
      })
      .then(data => {
        console.log("Scan result:", data);

        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (!tabs.length) return;

          const tab = tabs[0];

          chrome.storage.local.set({
            [`scanResult_${tab.id}`]: data
          }, () => {
            chrome.runtime.sendMessage({
              type: "SCAN_UPDATED",
              tabId: tab.id
              });
          });
        });
        // Get active tab (sender tab may not exist in MV3)
        chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
          if (!tabs || !tabs.length) return;

          const tab = tabs[0];
          if (!tab.id || !tab.url || !tab.url.startsWith("http")) return;

          // Remove old banner if exists
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
              const old = document.getElementById("__login_banner__");
              if (old) old.remove();
            }
          });

          // Decide using BACKEND verdict only
          const isPhishing = data.verdict === "PHISHING";

          // Inject banner
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: showBanner,
            args: [
              isPhishing
                ? "⚠️ Fake / Phishing Login Page"
                : "✅ Genuine Login Page",
              isPhishing ? "#b71c1c" : "#1b5e20",
              data
            ]
          });
        });
      })
      .catch(err => {
        console.error("Scan failed:", err);
      });
  });
});

// Function injected into page context
function showBanner(text, color, data) {
  if (document.getElementById("__login_banner__")) return;

  const banner = document.createElement("div");
  banner.id = "__login_banner__";

  banner.innerHTML = `
    <b>${text}</b><br>
    Risk Score: ${data.score}<br>
    ${data.openphish ? "🚨 Confirmed by OpenPhish<br>" : ""}
  `;

  banner.style.position = "fixed";
  banner.style.top = "0";
  banner.style.left = "0";
  banner.style.width = "100%";
  banner.style.background = color;
  banner.style.color = "white";
  banner.style.padding = "12px";
  banner.style.zIndex = "999999";
  banner.style.fontSize = "14px";
  banner.style.fontFamily = "Arial, sans-serif";
  banner.style.textAlign = "center";

  document.body.prepend(banner);
}