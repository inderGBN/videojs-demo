// ======================================================
// 🎬 VIDEO.JS PLAYER SETUP
// ======================================================
const player = videojs("my-video");
const videoContainer = document.querySelector(".video-container");

// ======================================================
// 📐 ASPECT RATIO HANDLING
// ======================================================
function setAspectRatio(ratio) {
  player.aspectRatio(ratio);

  if (ratio === "9:16") {
    videoContainer.classList.add("vertical");
  } else {
    videoContainer.classList.remove("vertical");
  }
}

setAspectRatio("16:9");

// ======================================================
// 🎛️ BUTTON ELEMENTS
// ======================================================
const vodBtn = document.getElementById("vodBtn");
const liveBtn = document.getElementById("liveBtn");
const ratio169Btn = document.getElementById("ratio169Btn");
const ratio916Btn = document.getElementById("ratio916Btn");

// ======================================================
// 🔗 VIDEO SOURCES
// ======================================================
const vodUrl = { src: "https://vjs.zencdn.net/v/oceans.mp4", type: "video/mp4" };
const livestreamUrl = {
  src: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8",
  type: "application/x-mpegURL",
};

function switchSource(srcObj, poster = "") {
  player.src(srcObj);
  player.poster(poster);
  player.play();
}

// ======================================================
// 📺 MODE TOGGLE (VOD / LIVE)
// ======================================================
vodBtn.addEventListener("click", () => {
  if (!vodBtn.classList.contains("active")) {
    vodBtn.classList.add("active");
    liveBtn.classList.remove("active");
    switchSource(vodUrl, "https://vjs.zencdn.net/v/oceans.png");
  }
});

liveBtn.addEventListener("click", () => {
  if (!liveBtn.classList.contains("active")) {
    liveBtn.classList.add("active");
    vodBtn.classList.remove("active");
    switchSource(livestreamUrl);
  }
});

// ======================================================
// 🔳 ASPECT RATIO TOGGLE
// ======================================================
ratio169Btn.addEventListener("click", () => {
  if (!ratio169Btn.classList.contains("active")) {
    ratio169Btn.classList.add("active");
    ratio916Btn.classList.remove("active");
    setAspectRatio("16:9");
  }
});

ratio916Btn.addEventListener("click", () => {
  if (!ratio916Btn.classList.contains("active")) {
    ratio916Btn.classList.add("active");
    ratio169Btn.classList.remove("active");
    setAspectRatio("9:16");
  }
});

// ======================================================
// ⏩ CUSTOM FORWARD / REWIND BUTTONS
// ======================================================
function createCustomButton(className, label, clickHandler) {
  const btn = document.createElement("div");
  btn.className = className;
  btn.innerText = label;
  btn.addEventListener("click", clickHandler);
  player.el().appendChild(btn);
  return btn;
}

createCustomButton("vjs-rewind-button", "⏪ 15", () => {
  player.currentTime(Math.max(player.currentTime() - 15, 0));
});

createCustomButton("vjs-forward-button", "15 ⏩", () => {
  player.currentTime(Math.min(player.currentTime() + 15, player.duration()));
});

// ======================================================
// 🧩 PREBID.JS — VIDEO HEADER BIDDING
// ======================================================

// Define ad units with multiple bidders
var adUnits = [{
  code: 'video1',
  mediaTypes: {
    video: {
      context: 'instream',
      playerSize: [640, 480],
      mimes: ['video/mp4', 'video/webm']
    }
  },
  bids: [
    { bidder: 'appnexus', params: { placementId: 13232385 } },
    {
      bidder: 'rubicon',
      params: { accountId: 14062, siteId: 70608, zoneId: 498816 }
    },
    {
      bidder: 'openx',
      params: { unit: '539124057', delDomain: 'openx-d.openx.net' }
    }
  ]
}];

// Initialize Prebid queue if not already defined
window.pbjs = window.pbjs || {};
pbjs.que = pbjs.que || [];

pbjs.que.push(function () {
  pbjs.addAdUnits(adUnits);

  pbjs.setConfig({
    debug: true,
    cache: {
      url: 'https://prebid.adnxs.com/pbc/v1/cache'
    },
    enableSendAllBids: true,
    // Try disabling TCF enforcement for testing (only in dev!)
    consentManagement: {
      gdpr: {
        cmpApi: 'static',
        consentData: {
          getTCData: {
            gdprApplies: false
          }
        },
        allowAuctionWithoutConsent: true
      }
    }
  });


  pbjs.requestBids({
    timeout: 1500,
    bidsBackHandler: function (bidResponses) {
      console.log('💰 Prebid bids:', bidResponses);

      const targeting = pbjs.getAdserverTargetingForAdUnitCode('video1');
      console.log('🎯 Targeting:', targeting);

      let vastUrl = '';
      let winningBid = null;
      const t = targeting['video1'] || {};

      // If Prebid returned a winning bid, use its cached VAST
      if (t.hb_cache_id) {
        vastUrl = `https://prebid.adnxs.com/pbc/v1/cache?uuid=${t.hb_cache_id}`;
        winningBid = {
          bidder: t.hb_bidder || 'unknown',
          cpm: t.hb_pb || '0.00'
        };
      } else {
        // Fallback to a GAM sample ad if no bids
        vastUrl =
          'https://pubads.g.doubleclick.net/gampad/ads?' +
          'iu=/21775744923/external/single_ad_samples&' +
          'sz=640x480&cust_params=sample_ct%3Dlinear&' +
          'ciu_szs=300x250&gdfp_req=1&env=vp&output=vast&' +
          'unviewed_position_start=1&correlator=' +
          Date.now();
        winningBid = { bidder: 'GAM fallback', cpm: '—' };
      }

      // Show overlay and initialize IMA
      showWinningBidOverlay(winningBid);
      initIMA(vastUrl);
    }
  });
});

// ======================================================
// 🎯 IMA INITIALIZATION (AFTER PREBID)
// ======================================================
function initIMA(vastUrl) {
  console.log('📺 Using VAST URL:', vastUrl);

  player.ima({
    adTagUrl: vastUrl,
    debug: true // set false in production
  });

  // Required user interaction before ads
  document.body.addEventListener(
    "click",
    () => {
      player.ima.initializeAdDisplayContainer();
      player.play();
    },
    { once: true }
  );
}

// ======================================================
// 🏆 WINNING BID OVERLAY
// ======================================================
function showWinningBidOverlay(winningBid) {
  const overlay = document.createElement("div");
  overlay.id = "bid-overlay";
  overlay.style.position = "absolute";
  overlay.style.bottom = "10px";
  overlay.style.left = "10px";
  overlay.style.background = "rgba(0,0,0,0.7)";
  overlay.style.color = "white";
  overlay.style.padding = "6px 10px";
  overlay.style.borderRadius = "6px";
  overlay.style.fontSize = "14px";
  overlay.style.zIndex = "9999";
  overlay.innerHTML = `🏆 Winning bidder: <strong>${winningBid.bidder}</strong> (${winningBid.cpm} CPM)`;

  const container = document.querySelector(".video-js");
  container.style.position = "relative";
  container.appendChild(overlay);
}

// ======================================================
// ✅ END OF SCRIPT
// ======================================================