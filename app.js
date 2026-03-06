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

function loadDB() {
  const db = JSON.parse(localStorage.getItem(DB_KEY) || "null") || structuredClone(seed);
  if (!db.catalog) db.catalog = [];
  if (!db.bookings) db.bookings = [];
  return db;
}
function saveDB(db) { localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function getSession() { return JSON.parse(localStorage.getItem(SESSION_KEY) || "null"); }
function setSession(userId) { localStorage.setItem(SESSION_KEY, JSON.stringify({ userId })); }
function clearSession() { localStorage.removeItem(SESSION_KEY); }
function uid(prefix) { return `${prefix}-${Math.random().toString(36).slice(2, 9)}`; }

function providerRating(db, providerId) {
  const providerReviews = db.reviews.filter((r) => r.providerId === providerId);
  if (!providerReviews.length) return 0;
  return providerReviews.reduce((sum, r) => sum + r.rating, 0) / providerReviews.length;
}

function stars(value) {
  return "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value));
}

function activeJobsCount(db, providerId) {
  return db.bookings.filter((b) => b.providerId === providerId && ["Pending", "Accepted", "In Progress", "Countered"].includes(b.status)).length;
}

function getDayName(dateText) {
  const date = new Date(`${dateText}T00:00:00`);
  return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][date.getDay()];
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
  const categories = [...new Set(providers.map((p) => p.category).filter(Boolean))];
  categorySelect.innerHTML = ['<option value="">All Categories</option>', ...categories.map((category) => `<option>${category}</option>`)].join("");

  const drawMarketplace = () => {
    const q = searchInput.value.trim().toLowerCase();
    const chosenCategory = categorySelect.value;
    const serviceCards = db.catalog
      .map((service) => {
        const provider = providers.find((p) => p.id === service.providerId);
        return provider ? { service, provider } : null;
      })
      .filter(Boolean)
      .filter(({ service, provider }) => {
        const matchesText = !q || service.itemName.toLowerCase().includes(q) || provider.name.toLowerCase().includes(q) || (service.itemDescription || "").toLowerCase().includes(q);
        const matchesCategory = !chosenCategory || provider.category === chosenCategory;
        return matchesText && matchesCategory;
      });

    target.innerHTML = `
      <h2>Find Sellers & Services</h2>
      <div class="products-grid">
        ${serviceCards.map(({ service, provider }) => {
          const reviewCount = db.reviews.filter((r) => r.providerId === provider.id).length;
          const minTier = service.tiers.reduce((min, tier) => Math.min(min, Number(tier.minPrice) || Infinity), Infinity);
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
          return `<article class="item"><b>${provider?.name || "Seller"}</b><p>${booking.date} ${booking.time} · ${booking.status} · ₦${(booking.offerPrice || 0).toLocaleString()}</p></article>`;
        }).join("") || '<p class="item">No orders yet.</p>'}
      </div>
    `;

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
        ${service.tiers.map((tier) => `<article class="item"><b>${tier.name}</b><p>${tier.description || "No details"}</p><p>₦${Number(tier.minPrice).toLocaleString()} - ₦${Number(tier.maxPrice).toLocaleString()}</p></article>`).join("")}
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
      <form id="orderForm" class="stack">
        <label>Service package
          <select id="tierSelect">${service.tiers.map((tier, index) => `<option value="${index}">${tier.name} (₦${Number(tier.minPrice).toLocaleString()} - ₦${Number(tier.maxPrice).toLocaleString()})</option>`).join("")}</select>
        </label>
        <label>Suggested budget (₦)
          <input id="offerPrice" type="number" min="1" required placeholder="e.g. 350000" />
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
          <textarea id="bookingMessage" rows="4" placeholder="Explain your requirement..."></textarea>
        </label>
        <button type="submit">Send order request</button>
      </form>
    `;

    ensureDateTimePickerExperience($("bookingDate"), $("bookingTime"));

    $("backToSeller").onclick = () => { viewMode = "profile"; renderView(); };

    $("orderForm").onsubmit = (event) => {
      event.preventDefault();
      const tier = service.tiers[Number($("tierSelect").value)];
      const offerPrice = Number($("offerPrice").value);
      const date = $("bookingDate").value;
      const time = $("bookingTime").value;
      const dayName = getDayName(date);

      if ((provider.unavailableDays || []).includes(dayName)) {
        alert(`${provider.name} is unavailable on ${dayName}. Please pick another day.`);
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
        message: $("bookingMessage").value.trim(),
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
  $("notifyBtn").onclick = () => alert("You are all caught up.");
  searchInput.oninput = () => viewMode === "marketplace" && renderView();
  categorySelect.onchange = () => viewMode === "marketplace" && renderView();

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
          <p><b>${b.date} ${b.time}</b> — ${b.status}</p>
          <p><b>Buyer:</b> ${customer?.name || b.customerId}</p>
          <p><b>Tier:</b> ${b.tierName || "N/A"}</p>
          <p><b>Buyer offer:</b> ₦${Number(b.offerPrice || 0).toLocaleString()} (range ₦${Number(b.minPrice || 0).toLocaleString()} - ₦${Number(b.maxPrice || 0).toLocaleString()})</p>
          ${b.message ? `<p><b>Job:</b> ${b.message}</p>` : ""}
          <div class="stack">
            <button data-status="Accepted" data-booking="${b.id}">Accept</button>
            <button data-status="In Progress" data-booking="${b.id}">Start job</button>
            <button data-status="Completed" data-booking="${b.id}">Mark complete</button>
            <button class="warn" data-status="Rejected" data-booking="${b.id}">Decline</button>
            <label>Counter offer (optional)
              <input data-counter="${b.id}" type="number" min="1" placeholder="Enter counter amount" />
            </label>
            <button class="ghost" data-status="Countered" data-booking="${b.id}">Send counter offer</button>
            <label>Chat with buyer
              <input data-chat="${b.id}" placeholder="Type a message" />
            </label>
            <button class="ghost" data-send-chat="${b.id}">Send chat</button>
          </div>
          <details>
            <summary>Conversation (${(b.chat || []).length})</summary>
            ${(b.chat || []).map((m) => `<p><b>${m.from === user.id ? "You" : (customer?.name || "Buyer")}:</b> ${m.text}</p>`).join("") || "<p>No messages yet.</p>"}
          </details>
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
        const counterInput = target.querySelector(`[data-counter="${booking.id}"]`);
        const counterAmount = Number(counterInput?.value || 0);
        if (!counterAmount) {
          alert("Enter a counter amount first.");
          return;
        }
        booking.offerPrice = counterAmount;
        booking.status = "Countered";
        booking.chat = booking.chat || [];
        booking.chat.push({ from: user.id, text: `Counter offer: ₦${counterAmount.toLocaleString()}`, at: new Date().toISOString() });
      } else {
        booking.status = nextStatus;
      }

      if (booking.status === "Completed") {
        user.completedJobs = (user.completedJobs || 0) + 1;
        user.acceptedJobs = Math.max(user.acceptedJobs || 0, user.completedJobs);
        user.earnings = (user.earnings || 0) + Number(booking.offerPrice || 0);
        const txn = db.transactions.find((t) => t.bookingId === booking.id);
        if (txn) {
          txn.status = "Released";
          txn.amount = Number(booking.offerPrice || txn.amount);
        }
      }
      if (booking.status === "Accepted") user.acceptedJobs = (user.acceptedJobs || 0) + 1;
      saveDB(db);
      render();
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

  db.users.push(user);
  saveDB(db);

  const otp = prompt("Enter OTP sent to email/phone (use 123456)");
  if (otp !== "123456") {
    alert("Invalid OTP");
    return;
  }

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

switchAuthView("login");
render();
