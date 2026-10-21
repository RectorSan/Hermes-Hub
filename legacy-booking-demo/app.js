const DB_KEY = "hermesHubDB";
const SESSION_KEY = "hermesSession";

const seed = {
  users: [
    { id: "admin-1", name: "Hermes Admin", email: "admin@hermeshub.app", phone: "000", role: "admin" },
    { id: "cust-1", name: "Ada Customer", email: "ada@example.com", phone: "08011111111", role: "customer" },
    {
      id: "pro-1",
      name: "Kunle Sparks",
      email: "kunle@fix.com",
      phone: "08022222222",
      role: "provider",
      category: "Carpenter",
      location: "Lagos",
      business: "Kunle Craftworks",
      bio: "I handle custom furniture, repairs and complete carpentry projects.",
      kycId: "KYC-1044",
      kycStatus: "approved",
      unavailableDays: ["Sunday"],
      earnings: 25000,
      completedJobs: 4,
      acceptedJobs: 5,
    },
  ],
  catalog: [
    {
      id: "svc-1",
      providerId: "pro-1",
      itemName: "General Carpentry Works",
      itemDescription: "Wardrobes, shelving, doors, and custom fitting jobs.",
      tiers: [
        { name: "Quick Fix", minPrice: 80000, maxPrice: 150000, description: "Minor repairs and small installations" },
        { name: "Standard", minPrice: 180000, maxPrice: 350000, description: "Most renovation and custom carpentry tasks" },
      ],
      acceptsNegotiation: true,
      optimalPrice: 350000,
    },
  ],
  bookings: [],
  reviews: [
    { id: "rev-1", providerId: "pro-1", customerId: "cust-1", rating: 5, comment: "Fast and professional." },
  ],
  transactions: [],
};

const $ = (id) => document.getElementById(id);
const authCard = $("authCard");
const app = $("app");
const loginForm = $("loginForm");
const signupForm = $("signupForm");
const logoutBtn = $("logoutBtn");
const roleSelect = $("roleSelect");
const providerFields = $("providerFields");
const showLoginBtn = $("showLoginBtn");
const showSignupBtn = $("showSignupBtn");
const notificationPanel = $("notificationPanel");
const globalSort = $("globalSort");

function loadDB() {
  const db = JSON.parse(localStorage.getItem(DB_KEY) || "null") || structuredClone(seed);
  if (!db.users) db.users = [];
  if (!db.catalog) db.catalog = [];
  if (!db.bookings) db.bookings = [];
  if (!db.reviews) db.reviews = [];
  if (!db.transactions) db.transactions = [];
  if (!db.customerNotifications) db.customerNotifications = [];

  db.catalog = db.catalog.map((service) => {
    if (Array.isArray(service.tiers) && service.tiers.length) return service;

    const fallbackMin = Number(service.minPrice ?? service.price ?? 0);
    const fallbackMax = Number(service.maxPrice ?? service.price ?? fallbackMin);
    return {
      ...service,
      itemName: service.itemName || service.name || "Service listing",
      itemDescription: service.itemDescription || service.description || "",
      tiers: [
        {
          name: service.tierName || "Standard",
          minPrice: Number.isFinite(fallbackMin) ? fallbackMin : 0,
          maxPrice: Number.isFinite(fallbackMax) ? fallbackMax : 0,
          description: service.tierDescription || "",
        },
      ],
    };
  });

  return db;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
function setSession(userId) { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }

function getServiceMinPrice(service) {
  const tiers = Array.isArray(service?.tiers) ? service.tiers : [];
  const minTier = tiers.reduce((min, tier) => Math.min(min, Number(tier.minPrice) || Infinity), Infinity);
  return Number.isFinite(minTier) ? minTier : 0;
}

function getCustomerBookingSummary(db, customerId) {
  const bookings = db.bookings.filter((booking) => booking.customerId === customerId);
  return {
    total: bookings.length,
    active: bookings.filter((booking) => ["Pending", "Accepted", "Job Started", "Job Finished", "Countered", "Awaiting Delivery Confirmation"].includes(booking.status)).length,
    delivered: bookings.filter((booking) => booking.status === "Delivered").length,
    unread: getCustomerUnreadChatCount(db, customerId),
  };
}

function isFutureBooking(dateText, timeText) {
  if (!dateText || !timeText) return false;
  const slot = new Date(`${dateText}T${timeText}`);
  if (Number.isNaN(slot.getTime())) return false;
  return slot.getTime() > Date.now();
}

function providerRating(db, providerId) {
  const providerReviews = db.reviews.filter((r) => r.providerId === providerId);
  if (!providerReviews.length) return 0;
  return providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
}

function stars(value) {
  return "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value));
}

function activeJobsCount(db, providerId) {
  return db.bookings.filter((b) => b.providerId === providerId && ["Pending", "Accepted", "Job Started", "Job Finished", "Countered", "Awaiting Delivery Confirmation"].includes(b.status)).length;
}

function getDayName(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
}

function getCustomerUnreadChatCount(db, customerId) {
  return db.customerNotifications.filter((notification) => notification.customerId === customerId && !notification.read).length;
}

function addCustomerNotification(db, customerId, text) {
  db.customerNotifications.push({
    id: uid("notif"),
    customerId,
    text,
    at: new Date().toISOString(),
    read: false,
  });
}

function formatNotificationTime(isoText) {
  if (!isoText) return "";
  const stamp = new Date(isoText);
  if (Number.isNaN(stamp.getTime())) return "";
  return stamp.toLocaleString();
}

function closeNotificationPanel() {
  if (!notificationPanel) return;
  notificationPanel.classList.add("hidden");
  notificationPanel.innerHTML = "";
}

function ensureNotificationPanelClosed() {
  closeNotificationPanel();
}

function ensureDateTimePickerExperience(dateInput, timeInput) {
  [dateInput, timeInput].forEach((input) => {
    if (!input) return;
    const openPicker = () => {
      if (typeof input.showPicker === "function") input.showPicker();
    };
    input.closest(".clickable-picker")?.addEventListener("click", openPicker);
    input.addEventListener("focus", openPicker);
  });
}

function renderCustomer(db, user) {
  const target = $("customerView");
  target.classList.remove("hidden");
  const providers = db.users.filter((u) => u.role === "provider" && u.kycStatus === "approved");

  let viewMode = "marketplace";
  let selectedProviderId = null;
  let selectedServiceId = null;

  const searchInput = $("globalSearch");
  const categorySelect = $("globalCategory");
  const sortSelect = globalSort;
  const categories = [...new Set(providers.map((p) => p.category).filter(Boolean))];
  categorySelect.innerHTML = ['<option value="">All Categories</option>', ...categories.map((category) => `<option>${category}</option>`)].join("");

  const drawMarketplace = () => {
    const q = searchInput.value.trim().toLowerCase();
    const chosenCategory = categorySelect.value;
    const sortMode = sortSelect?.value || "recommended";
    const summary = getCustomerBookingSummary(db, user.id);
    const serviceCards = db.catalog
      .map((service) => {
        const provider = providers.find((p) => p.id === service.providerId);
        return provider ? { service, provider } : null;
      })
      .filter(Boolean)
      .filter(({ service, provider }) => {
        const matchesText = !q || service.itemName.toLowerCase().includes(q) || provider.name.toLowerCase().includes(q) || (service.itemDescription || "").toLowerCase().includes(q) || (provider.location || "").toLowerCase().includes(q);
        const matchesCategory = !chosenCategory || provider.category === chosenCategory;
        return matchesText && matchesCategory;
      })
      .sort((left, right) => {
        const leftRating = providerRating(db, left.provider.id);
        const rightRating = providerRating(db, right.provider.id);
        const leftReviews = db.reviews.filter((r) => r.providerId === left.provider.id).length;
        const rightReviews = db.reviews.filter((r) => r.providerId === right.provider.id).length;
        const leftPrice = getServiceMinPrice(left.service);
        const rightPrice = getServiceMinPrice(right.service);

        if (sortMode === "price-asc") return leftPrice - rightPrice;
        if (sortMode === "price-desc") return rightPrice - leftPrice;
        if (sortMode === "rating-desc") return rightRating - leftRating || rightReviews - leftReviews;
        if (sortMode === "reviews-desc") return rightReviews - leftReviews || rightRating - leftRating;
        return rightRating - leftRating || rightReviews - leftReviews || leftPrice - rightPrice;
      });

    target.innerHTML = `
      <h2>Find Sellers & Services</h2>
      <div class="summary-strip">
        <article class="summary-card"><p class="label">Active orders</p><p class="value">${summary.active}</p></article>
        <article class="summary-card"><p class="label">Delivered orders</p><p class="value">${summary.delivered}</p></article>
        <article class="summary-card"><p class="label">Unread updates</p><p class="value">${summary.unread}</p></article>
        <article class="summary-card"><p class="label">Total orders</p><p class="value">${summary.total}</p></article>
      </div>
      <div class="products-grid">
        ${serviceCards.map(({ service, provider }) => {
          const reviewCount = db.reviews.filter((r) => r.providerId === provider.id).length;
          const minTier = getServiceMinPrice(service);
          return `
            <article class="product-card">
              <h4>${service.itemName}</h4>
              <p class="muted">${provider.name} · ${provider.location || "Unknown"}</p>
              <p>${service.itemDescription || "No description yet."}</p>
              <p class="price">From ₦${Number.isFinite(minTier) ? minTier.toLocaleString() : "0"}</p>
              <p><span class="stars">${stars(providerRating(db, provider.id))}</span> (${reviewCount})</p>
              <button data-provider="${provider.id}" data-service="${service.id}">View seller profile</button>
            </article>`;
        }).join("") || '<p class="item">No sellers found for your search.</p>'}
      </div>

      <h3>My recent orders</h3>
      <div class="list">
        ${db.bookings.filter((b) => b.customerId === user.id).slice(-5).reverse().map((booking) => {
          const provider = db.users.find((u) => u.id === booking.providerId);
          const canConfirm = ["Job Finished", "Awaiting Delivery Confirmation"].includes(booking.status) && !booking.customerDelivered;
          const canRespondToCounter = booking.status === "Countered";
          const currentOffer = Math.min(Math.max(Number(booking.offerPrice || 0), Number(booking.minPrice || 0)), Number(booking.maxPrice || 0));
          return `<article class="item"><b>${provider?.name || "Seller"}</b><p>${booking.date} ${booking.time} · ${booking.status} · ₦${(booking.offerPrice || 0).toLocaleString()}</p>${canConfirm ? `<button data-customer-delivered="${booking.id}">Confirm delivered (client)</button>` : ""}
          ${canRespondToCounter
            ? `<div class="stack"><p><b>Counter received:</b> Use slider to accept or revise.</p><label>Revised offer (₦${Number(booking.minPrice || 0).toLocaleString()} - ₦${Number(booking.maxPrice || 0).toLocaleString()})
            <input data-buyer-slider="${booking.id}" type="range" min="${Number(booking.minPrice || 0)}" max="${Number(booking.maxPrice || 0)}" value="${currentOffer}" step="1000" />
            <small>Selected: ₦<span data-buyer-slider-value="${booking.id}">${currentOffer.toLocaleString()}</span></small></label>
            <button data-buyer-response="accept" data-booking-response="${booking.id}">Accept counter offer</button>
            <button class="ghost" data-buyer-response="revise" data-booking-response="${booking.id}">Send revised offer</button>
            <button class="warn" data-buyer-response="reject" data-booking-response="${booking.id}">Reject counter offer</button></div>`
            : ""}</article>`;
        }).join("") || '<p class="item">No orders yet.</p>'}
      </div>
    `;

    target.querySelectorAll("[data-customer-delivered]").forEach((btn) => {
      btn.onclick = () => {
        const booking = db.bookings.find((b) => b.id === btn.getAttribute("data-customer-delivered"));
        if (!booking) return;
        booking.customerDelivered = true;
        booking.status = booking.sellerDelivered ? "Delivered" : "Awaiting Delivery Confirmation";

        if (booking.status === "Delivered" && !booking.payoutReleased) {
          const provider = db.users.find((u) => u.id === booking.providerId);
          if (provider) provider.earnings = (provider.earnings || 0) + Number(booking.offerPrice || 0);
          const txn = db.transactions.find((t) => t.bookingId === booking.id);
          if (txn) {
            txn.status = "Released";
            txn.amount = Number(booking.offerPrice || txn.amount);
          }
          booking.payoutReleased = true;
        }

        saveDB(db);
        renderView();
      };
    });

    target.querySelectorAll("[data-buyer-slider]").forEach((slider) => {
      slider.oninput = () => {
        const bookingId = slider.getAttribute("data-buyer-slider");
        const valueNode = target.querySelector(`[data-buyer-slider-value="${bookingId}"]`);
        if (!valueNode) return;
        valueNode.textContent = Number(slider.value || 0).toLocaleString();
      };
    });

    target.querySelectorAll("[data-booking-response]").forEach((btn) => {
      btn.onclick = () => {
        const booking = db.bookings.find((b) => b.id === btn.getAttribute("data-booking-response"));
        if (!booking || booking.status !== "Countered") return;
        const response = btn.getAttribute("data-buyer-response");
        const provider = db.users.find((u) => u.id === booking.providerId);

        booking.chat = booking.chat || [];
        if (response === "accept") {
          booking.status = "Accepted";
          booking.chat.push({ from: user.id, text: `I accepted your counter offer at ₦${Number(booking.offerPrice || 0).toLocaleString()}.`, at: new Date().toISOString() });
          if (provider) provider.acceptedJobs = (provider.acceptedJobs || 0) + 1;
        }
        if (response === "reject") {
          booking.status = "Rejected";
          booking.chat.push({ from: user.id, text: "I rejected the counter offer.", at: new Date().toISOString() });
        }
        if (response === "revise") {
          const slider = target.querySelector(`[data-buyer-slider="${booking.id}"]`);
          const revisedAmount = Number(slider?.value || 0);
          booking.offerPrice = revisedAmount;
          booking.status = "Pending";
          booking.chat.push({ from: user.id, text: `Revised offer from buyer: ₦${revisedAmount.toLocaleString()}`, at: new Date().toISOString() });
        }

        saveDB(db);
        renderView();
      };
    });

    target.querySelectorAll("[data-provider]").forEach((btn) => {
      btn.onclick = () => {
        selectedProviderId = btn.getAttribute("data-provider");
        selectedServiceId = btn.getAttribute("data-service");
        viewMode = "profile";
        renderView();
      };
    });
  };

  const drawSellerProfile = () => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    const service = db.catalog.find((c) => c.id === selectedServiceId);
    if (!provider || !service) {
      viewMode = "marketplace";
      drawMarketplace();
      return;
    }

    const providerReviews = db.reviews.filter((r) => r.providerId === provider.id);
    const busyCount = activeJobsCount(db, provider.id);

    target.innerHTML = `
      <button id="backToMarket" class="ghost">← Back to marketplace</button>
      <h2>${provider.name}</h2>
      <p class="muted">${provider.business || "Independent Seller"} · ${provider.category || "General"} · ${provider.location || "Unknown"}</p>
      <p>${provider.bio || "No seller bio yet."}</p>
      <div class="badges">
        <span class="badge">Rating ${providerRating(db, provider.id).toFixed(1)} (${providerReviews.length} reviews)</span>
        <span class="badge">Currently handling ${busyCount} active jobs</span>
        <span class="badge">Unavailable days: ${(provider.unavailableDays || []).join(", ") || "None"}</span>
      </div>

      <h3>${service.itemName}</h3>
      <p>${service.itemDescription || "No description."}</p>
      <div class="list">
        ${(service.tiers || []).map((tier) => `<article class="item"><b>${tier.name}</b><p>${tier.description || "No details"}</p><p>₦${Number(tier.minPrice).toLocaleString()} - ₦${Number(tier.maxPrice).toLocaleString()}</p></article>`).join("")}
      </div>
      <button id="bookSeller">Place order / negotiate</button>

      <h3>Reviews</h3>
      <div class="list">
        ${providerReviews.map((r) => `<article class="item"><span class="stars">${stars(r.rating)}</span> ${r.comment || ""}</article>`).join("") || '<p class="item">No reviews yet.</p>'}
      </div>
    `;

    $("backToMarket").onclick = () => { viewMode = "marketplace"; renderView(); };
    $("bookSeller").onclick = () => { viewMode = "order"; renderView(); };
  };

  const drawBookingPage = () => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    const service = db.catalog.find((c) => c.id === selectedServiceId);
    if (!provider || !service) {
      viewMode = "marketplace";
      drawMarketplace();
      return;
    }

    target.innerHTML = `
      <button id="backToSeller" class="ghost">← Back to seller profile</button>
      <h2>Order from ${provider.name}</h2>
      <p class="muted">Select date/time and propose a price in seller range.</p>
      <p class="inline-message">Tip: booking time must be in the future, and sellers can still renegotiate before accepting.</p>
      <form id="orderForm" class="stack">
        <label>Service package
          <select id="tierSelect">${(service.tiers || []).map((tier, index) => `<option value="${index}">${tier.name} (₦${Number(tier.minPrice).toLocaleString()} - ₦${Number(tier.maxPrice).toLocaleString()})</option>`).join("")}</select>
        </label>
        <label>Suggested budget with slider (₦)
          <input id="offerPrice" type="range" required step="1000" />
          <small>Selected offer: ₦<span id="offerPriceValue"></span></small>
        </label>
        <div class="picker-grid">
          <label class="clickable-picker">Date
            <input required id="bookingDate" type="date" min="${new Date().toISOString().split("T")[0]}" />
          </label>
          <label class="clickable-picker">Time
            <input required id="bookingTime" type="time" />
          </label>
        </div>
        <label>Job details
          <textarea id="bookingMessage" rows="4" required minlength="10" placeholder="Briefly explain your requirement (at least 10 characters)..."></textarea>
        </label>
        <button type="submit">Send order request</button>
      </form>
    `;

    ensureDateTimePickerExperience($("bookingDate"), $("bookingTime"));

    const tierSelect = $("tierSelect");
    const offerSlider = $("offerPrice");
    const offerPriceValue = $("offerPriceValue");

    const syncOfferSlider = () => {
      const tier = (service.tiers || [])[Number(tierSelect.value)];
      if (!tier) return;
      offerSlider.min = Number(tier.minPrice || 0);
      offerSlider.max = Number(tier.maxPrice || 0);
      const nextValue = Math.min(Math.max(Number(offerSlider.value || tier.minPrice), Number(tier.minPrice)), Number(tier.maxPrice));
      offerSlider.value = String(nextValue);
      offerPriceValue.textContent = nextValue.toLocaleString();
    };

    tierSelect.onchange = syncOfferSlider;
    offerSlider.oninput = () => {
      offerPriceValue.textContent = Number(offerSlider.value || 0).toLocaleString();
    };
    syncOfferSlider();

    $("backToSeller").onclick = () => { viewMode = "profile"; renderView(); };

    $("orderForm").onsubmit = (event) => {
      event.preventDefault();
      const tier = (service.tiers || [])[Number($("tierSelect").value)];
      if (!tier) {
        alert("This listing has no valid pricing tiers yet. Please contact the seller.");
        return;
      }
      const offerPrice = Number($("offerPrice").value);
      const date = $("bookingDate").value;
      const time = $("bookingTime").value;
      const dayName = getDayName(date);
      const message = $("bookingMessage").value.trim();

      if (message.length < 10) {
        alert("Please provide a brief order description (at least 10 characters).");
        return;
      }

      if ((provider.unavailableDays || []).includes(dayName)) {
        alert(`${provider.name} is unavailable on ${dayName}. Please pick another day.`);
        return;
      }

      if (!isFutureBooking(date, time)) {
        alert("Please choose a booking time in the future.");
        return;
      }

      db.bookings.push({
        id: uid("book"),
        customerId: user.id,
        providerId: provider.id,
        serviceId: service.id,
        tierName: tier.name,
        minPrice: Number(tier.minPrice),
        maxPrice: Number(tier.maxPrice),
        offerPrice,
        date,
        time,
        message,
        status: "Pending",
        chat: [{ from: user.id, text: "Hi, I just sent this order request.", at: new Date().toISOString() }],
      });
      db.transactions.push({ id: uid("txn"), bookingId: db.bookings.at(-1).id, amount: offerPrice, status: "Held" });
      saveDB(db);
      alert("Order sent. Seller can accept, decline, or renegotiate.");
      viewMode = "marketplace";
      renderView();
    };
  };

  const renderView = () => {
    if (viewMode === "marketplace") drawMarketplace();
    if (viewMode === "profile") drawSellerProfile();
    if (viewMode === "order") drawBookingPage();
  };

  $("profileBtn").onclick = () => alert(`Logged in as ${user.name}`);
  $("notifyBtn").onclick = () => {
    if (!notificationPanel) return;

    const isOpen = !notificationPanel.classList.contains("hidden");
    if (isOpen) {
      closeNotificationPanel();
      return;
    }

    const allUpdates = db.customerNotifications
      .filter((notification) => notification.customerId === user.id)
      .slice()
      .reverse();

    if (!allUpdates.length) {
      notificationPanel.innerHTML = '<p class="muted">You are all caught up.</p>';
      notificationPanel.classList.remove("hidden");
      return;
    }

    notificationPanel.innerHTML = allUpdates
      .map((notification) => `<article class="notification-item ${notification.read ? "" : "unread"}"><p>${notification.text}</p><p class="notification-time">${formatNotificationTime(notification.at)}</p></article>`)
      .join("");
    notificationPanel.classList.remove("hidden");

    db.customerNotifications
      .filter((notification) => notification.customerId === user.id)
      .forEach((notification) => {
        notification.read = true;
      });
    saveDB(db);
    const notifyBtn = $("notifyBtn");
    notifyBtn.classList.remove("has-alert");
    notifyBtn.setAttribute("aria-label", "Notifications");
  };
  searchInput.oninput = () => viewMode === "marketplace" && renderView();
  categorySelect.onchange = () => viewMode === "marketplace" && renderView();
  if (sortSelect) sortSelect.onchange = () => viewMode === "marketplace" && renderView();

  renderView();
}

function renderProvider(db, user) {
  const target = $("providerView");
  target.classList.remove("hidden");
  const incoming = db.bookings.filter((b) => b.providerId === user.id).slice().reverse();
  const rating = providerRating(db, user.id);

  target.innerHTML = `
    <h2>Seller Dashboard</h2>
    <div class="item stack">
      <p><b>KYC:</b> ${user.kycStatus || "pending"}</p>
      <p><b>Business:</b> ${user.business || "n/a"}</p>
      <p><b>Earnings:</b> ₦${(user.earnings || 0).toLocaleString()}</p>
      <p><b>Rating:</b> <span class="stars">${stars(rating)}</span></p>
      <label>Unavailable days (comma separated)
        <input id="unavailableInput" value="${(user.unavailableDays || []).join(", ")}" placeholder="Sunday, Tuesday" />
      </label>
      <button id="saveUnavailable">Save unavailable days</button>
    </div>

    <h3>Upload item/service for sale</h3>
    <form id="serviceForm" class="stack item">
      <label>Item / Service name<input id="itemName" required placeholder="Any carpentry works" /></label>
      <label>Description<textarea id="itemDescription" rows="3" placeholder="What do you offer?"></textarea></label>
      <label>Price tier name<input id="tierName" required placeholder="Standard tier" /></label>
      <label>Tier min price<input id="tierMin" type="number" required min="1" /></label>
      <label>Tier max price<input id="tierMax" type="number" required min="1" /></label>
      <label>Tier description<input id="tierDescription" placeholder="What this tier covers" /></label>
      <label>Optimal preferred pay (for negotiation)<input id="optimalPrice" type="number" min="1" placeholder="350000" /></label>
      <button type="submit">Save listing</button>
    </form>

    <h3>My listings</h3>
    <div class="list">
      ${db.catalog.filter((s) => s.providerId === user.id).map((service) => `
        <article class="item">
          <b>${service.itemName}</b>
          <p>${service.itemDescription || "No description"}</p>
          <p class="muted">Optimal: ₦${Number(service.optimalPrice || 0).toLocaleString()}</p>
          ${service.tiers.map((tier) => `<p>${tier.name}: ₦${Number(tier.minPrice).toLocaleString()} - ₦${Number(tier.maxPrice).toLocaleString()}</p>`).join("")}
        </article>`).join("") || '<p class="item">No listings yet.</p>'}
    </div>

    <h3>Orders & negotiation</h3>
    <div class="list" id="incomingBookings">
      ${incoming.map((b) => {
        const customer = db.users.find((u) => u.id === b.customerId);
        return `<article class="item">
          <p><b>Buyer:</b> ${customer?.name || b.customerId}</p>
          <div class="negotiation-chat-layout">
            <div class="stack item-section">
              <h4 class="subsection-title">Negotiation details</h4>
              <p><b>Date:</b> ${b.date}</p>
              <p><b>Time:</b> ${b.time}</p>
              <p><b>Status:</b> ${b.status}</p>
              <p><b>Tier:</b> ${b.tierName || "N/A"}</p>
              <p><b>Buyer offer:</b> ₦${Number(b.offerPrice || 0).toLocaleString()} (range ₦${Number(b.minPrice || 0).toLocaleString()} - ₦${Number(b.maxPrice || 0).toLocaleString()})</p>
              ${b.message ? `<p><b>Job:</b> ${b.message}</p>` : ""}
              <div class="stack">
            ${b.status === "Pending" ? `<button data-status="Accepted" data-booking="${b.id}">Accept</button>
            <button class="warn" data-status="Rejected" data-booking="${b.id}">Reject</button>` : ""}
            ${b.status === "Accepted" ? `<button data-status="Job Started" data-booking="${b.id}">Job started</button>` : ""}
            ${b.status === "Job Started" ? `<button data-status="Job Finished" data-booking="${b.id}">Job finished</button>` : ""}
            ${["Job Finished", "Awaiting Delivery Confirmation"].includes(b.status) && !b.sellerDelivered ? `<button data-status="SellerDelivered" data-booking="${b.id}">Mark delivered (seller)</button>` : ""}
            ${["Pending", "Countered"].includes(b.status)
              ? `<label>Renegotiate before accepting (₦${Number(b.minPrice || 0).toLocaleString()} - ₦${Number(b.maxPrice || 0).toLocaleString()})
              <input data-counter-slider="${b.id}" type="range" min="${Number(b.minPrice || 0)}" max="${Number(b.maxPrice || 0)}" value="${Math.min(Math.max(Number(b.offerPrice || 0), Number(b.minPrice || 0)), Number(b.maxPrice || 0))}" step="1000" />
              <small>Selected counter: ₦<span data-counter-value="${b.id}">${Math.min(Math.max(Number(b.offerPrice || 0), Number(b.minPrice || 0)), Number(b.maxPrice || 0)).toLocaleString()}</span></small>
            </label>
            <button class="ghost" data-status="Countered" data-booking="${b.id}">Send counter offer</button>`
              : ""}
            ${b.status === "Countered" ? `<p class="muted">Renegotiation in progress. Waiting for buyer response before you can accept/reject.</p>` : ""}
              </div>
            </div>
            <div class="stack item-section">
              <h4 class="subsection-title">Chat with buyer</h4>
              <label>Message
                <input data-chat="${b.id}" placeholder="Type a message" />
              </label>
              <button class="ghost" data-send-chat="${b.id}">Send chat</button>
              <details>
                <summary>Conversation (${(b.chat || []).length})</summary>
                ${(b.chat || []).map((m) => `<p><b>${m.from === user.id ? "You" : (customer?.name || "Buyer")}:</b> ${m.text}</p>`).join("") || "<p>No messages yet.</p>"}
              </details>
            </div>
          </div>
        </article>`;
      }).join("") || '<p class="item">No bookings assigned yet.</p>'}
    </div>
  `;

  $("saveUnavailable").onclick = () => {
    user.unavailableDays = $("unavailableInput").value.split(",").map((v) => v.trim()).filter(Boolean);
    saveDB(db);
    render();
  };

  $("serviceForm").onsubmit = (event) => {
    event.preventDefault();
    const itemName = $("itemName").value.trim();
    const itemDescription = $("itemDescription").value.trim();
    const tierName = $("tierName").value.trim();
    const tierMin = Number($("tierMin").value);
    const tierMax = Number($("tierMax").value);
    const tierDescription = $("tierDescription").value.trim();
    const optimalPrice = Number($("optimalPrice").value || 0);

    if (tierMin > tierMax) {
      alert("Tier minimum price cannot be greater than maximum price.");
      return;
    }

    db.catalog.push({
      id: uid("svc"),
      providerId: user.id,
      itemName,
      itemDescription,
      tiers: [{ name: tierName, minPrice: tierMin, maxPrice: tierMax, description: tierDescription }],
      acceptsNegotiation: true,
      optimalPrice,
    });

    saveDB(db);
    render();
  };

  target.querySelectorAll("[data-booking]").forEach((btn) => {
    btn.onclick = () => {
      const booking = db.bookings.find((b) => b.id === btn.getAttribute("data-booking"));
      if (!booking) return;
      const nextStatus = btn.getAttribute("data-status");

      if (nextStatus === "Countered") {
        if (!["Pending", "Countered"].includes(booking.status)) {
          alert("You can only renegotiate before accepting this order.");
          return;
        }
        const counterInput = target.querySelector(`[data-counter-slider="${booking.id}"]`);
        const counterAmount = Number(counterInput?.value || 0);
        if (!counterAmount) {
          alert("Enter a counter amount first.");
          return;
        }
        booking.offerPrice = counterAmount;
        booking.status = "Countered";
        booking.chat = booking.chat || [];
        booking.chat.push({ from: user.id, text: `Counter offer: ₦${counterAmount.toLocaleString()}`, at: new Date().toISOString() });
      } else if (nextStatus === "SellerDelivered") {
        booking.sellerDelivered = true;
        booking.status = booking.customerDelivered ? "Delivered" : "Awaiting Delivery Confirmation";
      } else {
        booking.status = nextStatus;
      }

      if (["Countered", "Accepted", "Rejected", "Job Started", "Job Finished", "Awaiting Delivery Confirmation", "Delivered"].includes(booking.status)) {
        const updateText = booking.status === "Countered"
          ? `Seller countered your order with ₦${Number(booking.offerPrice || 0).toLocaleString()}`
          : `Order update: ${booking.status}`;
        addCustomerNotification(db, booking.customerId, `${updateText} (${booking.date} ${booking.time})`);
      }

      if (booking.status === "Job Finished" && !booking.completionRecorded) {
        user.completedJobs = (user.completedJobs || 0) + 1;
        user.acceptedJobs = Math.max(user.acceptedJobs || 0, user.completedJobs);
        booking.completionRecorded = true;
      }

      if (booking.status === "Delivered" && !booking.payoutReleased) {
        user.earnings = (user.earnings || 0) + Number(booking.offerPrice || 0);
        const txn = db.transactions.find((t) => t.bookingId === booking.id);
        if (txn) {
          txn.status = "Released";
          txn.amount = Number(booking.offerPrice || txn.amount);
        }
        booking.payoutReleased = true;
      }

      if (booking.status === "Accepted") user.acceptedJobs = (user.acceptedJobs || 0) + 1;
      saveDB(db);
      render();
    };
  });

  target.querySelectorAll("[data-counter-slider]").forEach((slider) => {
    slider.oninput = () => {
      const bookingId = slider.getAttribute("data-counter-slider");
      const valueNode = target.querySelector(`[data-counter-value="${bookingId}"]`);
      if (!valueNode) return;
      valueNode.textContent = Number(slider.value || 0).toLocaleString();
    };
  });

  target.querySelectorAll("[data-send-chat]").forEach((btn) => {
    btn.onclick = () => {
      const bookingId = btn.getAttribute("data-send-chat");
      const booking = db.bookings.find((b) => b.id === bookingId);
      const input = target.querySelector(`[data-chat="${bookingId}"]`);
      const text = input?.value.trim();
      if (!booking || !text) return;
      booking.chat = booking.chat || [];
      booking.chat.push({ from: user.id, text, at: new Date().toISOString() });
      addCustomerNotification(db, booking.customerId, `New seller message from ${user.name}: "${text}"`);
      saveDB(db);
      render();
    };
  });
}

function renderAdmin(db) {
  const target = $("adminView");
  target.classList.remove("hidden");
  const pendingProviders = db.users.filter((u) => u.role === "provider" && (u.kycStatus || "pending") === "pending");
  target.innerHTML = `
    <h2>Admin Console</h2>
    <h3>KYC Verification Queue</h3>
    <div class="list">
      ${pendingProviders
        .map(
          (p) => `<article class="item">
            <p><b>${p.name}</b> (${p.category || "No category"})</p>
            <p>ID: ${p.kycId || "Not submitted"} | ${p.business || "No business"}</p>
            <button data-kyc="approved" data-user="${p.id}">Approve</button>
            <button class="warn" data-kyc="rejected" data-user="${p.id}">Reject</button>
          </article>`
        )
        .join("") || '<p class="item">No pending KYC checks.</p>'}
    </div>
    <h3>Transactions</h3>
    <div class="list">
      ${db.transactions
        .map((t) => `<article class="item">${t.id} · Booking ${t.bookingId} · ₦${t.amount} · ${t.status}</article>`)
        .join("") || '<p class="item">No transactions yet.</p>'}
    </div>
  `;

  target.querySelectorAll("[data-user]").forEach((btn) => {
    btn.onclick = () => {
      const provider = db.users.find((u) => u.id === btn.getAttribute("data-user"));
      if (!provider) return;
      provider.kycStatus = btn.getAttribute("data-kyc");
      saveDB(db);
      render();
    };
  });
}

function render() {
  const db = loadDB();
  const session = getSession();
  const customerView = $("customerView");
  const providerView = $("providerView");
  const adminView = $("adminView");
  [customerView, providerView, adminView].forEach((node) => {
    node.classList.add("hidden");
    node.innerHTML = "";
  });

  if (!session) {
    authCard.classList.remove("hidden");
    app.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    $("marketControls").classList.add("hidden");
    $("profileBtn").classList.add("hidden");
    $("notifyBtn").classList.add("hidden");
    ensureNotificationPanelClosed();
    return;
  }

  const user = db.users.find((u) => u.id === session.userId);
  if (!user) {
    clearSession();
    return render();
  }

  authCard.classList.add("hidden");
  app.classList.remove("hidden");
  logoutBtn.classList.remove("hidden");

  const marketControls = $("marketControls");
  const profileBtn = $("profileBtn");
  const notifyBtn = $("notifyBtn");

  const isCustomer = user.role === "customer";
  marketControls.classList.toggle("hidden", !isCustomer);
  profileBtn.classList.toggle("hidden", !isCustomer);
  notifyBtn.classList.toggle("hidden", !isCustomer);
  if (!isCustomer) ensureNotificationPanelClosed();
  const unreadCount = isCustomer ? getCustomerUnreadChatCount(db, user.id) : 0;
  notifyBtn.classList.toggle("has-alert", unreadCount > 0);
  notifyBtn.setAttribute("aria-label", unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications");

  if (user.role === "customer") renderCustomer(db, user);
  if (user.role === "provider") renderProvider(db, user);
  if (user.role === "admin") renderAdmin(db, user);
}

roleSelect.addEventListener("change", () => {
  providerFields.classList.toggle("hidden", roleSelect.value !== "provider");
});

function switchAuthView(view) {
  const loginMode = view === "login";
  loginForm.classList.toggle("hidden", !loginMode);
  signupForm.classList.toggle("hidden", loginMode);
  showLoginBtn.classList.toggle("active", loginMode);
  showSignupBtn.classList.toggle("active", !loginMode);
}

showLoginBtn.onclick = () => switchAuthView("login");
showSignupBtn.onclick = () => switchAuthView("signup");

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(loginForm);
  const db = loadDB();
  const email = String(data.get("email")).toLowerCase();
  const user = db.users.find((u) => u.email.toLowerCase() === email);

  if (!user) {
    alert("No account found. Please sign up first.");
    switchAuthView("signup");
    return;
  }

  const otp = prompt("Enter OTP sent to email/phone (use 123456)");
  if (otp !== "123456") {
    alert("Invalid OTP");
    return;
  }

  setSession(user.id);
  loginForm.reset();
  render();
});

signupForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(signupForm);
  const db = loadDB();
  const email = String(data.get("email")).toLowerCase();

  const existingUser = db.users.find((u) => u.email.toLowerCase() === email);
  if (existingUser) {
    alert("An account with this email already exists. Please login.");
    switchAuthView("login");
    return;
  }

  const user = {
    id: uid("usr"),
    name: data.get("name"),
    email,
    phone: data.get("phone"),
    role: data.get("role"),
  };

  if (user.role === "provider") {
    Object.assign(user, {
      category: data.get("category"),
      location: data.get("location"),
      business: data.get("business"),
      kycId: data.get("kycId"),
      kycStatus: "pending",
      unavailableDays: [],
      earnings: 0,
      completedJobs: 0,
      acceptedJobs: 0,
    });
  }

  const otp = prompt("Enter OTP sent to email/phone (use 123456)");
  if (otp !== "123456") {
    alert("Invalid OTP. Account was not created.");
    return;
  }

  db.users.push(user);
  saveDB(db);
  setSession(user.id);
  signupForm.reset();
  providerFields.classList.add("hidden");
  render();
});

logoutBtn.onclick = () => {
  clearSession();
  switchAuthView("login");
  render();
};


document.addEventListener("click", (event) => {
  const notifyBtn = $("notifyBtn");
  if (!notificationPanel || notificationPanel.classList.contains("hidden")) return;
  if (notificationPanel.contains(event.target) || notifyBtn.contains(event.target)) return;
  closeNotificationPanel();
});

switchAuthView("login");
render();
