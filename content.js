console.log("[content.js] injected on:", location.href);

chrome.storage.local.get("enabled", data => {
  if (data.enabled === false) {
    console.log("[content.js] Protection OFF – skipping detection");
    return;
  }

  // 👇 YOUR EXISTING CODE GOES INSIDE HERE
  (function () {
    let detected = false;

    function detectLogin() {
      if (detected) return;

      const pwd = document.querySelector('input[type="password"]');
      if (!pwd) return;

      detected = true;
      console.log("[content.js] password field detected");

      try {
        const port = chrome.runtime.connect({ name: "scan-port" });
        port.postMessage({
          type: "SCAN_URL",
          url: location.href
        });
        console.log("[content.js] SCAN_URL sent");
      } catch (e) {
        console.error("[content.js] connect failed:", e);
      }
    }

    // 🔥 IMPORTANT: run immediately
    detectLogin();

    // 🔁 Watch for SPA pages
    const observer = new MutationObserver(detectLogin);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });
  })();
});