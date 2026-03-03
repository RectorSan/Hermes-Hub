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
      category: "Electrician",
      location: "Lagos",
      business: "Sparks NG",
      kycId: "KYC-1044",
      kycStatus: "approved",
      availability: ["Mon 10:00", "Tue 14:00", "Wed 16:00"],
      earnings: 25000,
      completedJobs: 4,
      acceptedJobs: 5,
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
  return JSON.parse(localStorage.getItem(DB_KEY) || "null") || structuredClone(seed);
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

function completionRate(provider) {
  if (!provider.acceptedJobs) return 0;
  return Math.round((provider.completedJobs / provider.acceptedJobs) * 100);
}

function stars(value) {
  return "★".repeat(Math.round(value)) + "☆".repeat(5 - Math.round(value));
}

function renderCustomer(db, user) {
  const target = $("customerView");
  target.classList.remove("hidden");
  const providers = db.users.filter((u) => u.role === "provider" && u.kycStatus === "approved");
  const categories = [...new Set(providers.map((p) => p.category))];
  const fallbackCategories = ["Electronics", "Home Services", "Beauty", "Fashion", "Automotive", "Groceries"];
  const displayCategories = (categories.length ? categories : fallbackCategories).slice(0, 6);

  if (!db.catalog || !db.catalog.length) {
    db.catalog = providers.map((provider, index) => ({
      id: `prod-${provider.id}`,
      providerId: provider.id,
      name: `${provider.category} Pro Service`,
      category: provider.category,
      price: 5000 + index * 1500,
      image: `https://picsum.photos/seed/${provider.id}/400/300`,
    }));
    saveDB(db);
  }

  if (!db.carts) db.carts = {};
  if (!db.carts[user.id]) db.carts[user.id] = [];

  const categorySelect = $("globalCategory");
  const searchInput = $("globalSearch");
  const cartCount = $("cartCount");

  categorySelect.innerHTML = ['<option value="">All Categories</option>', ...displayCategories.map((category) => `<option>${category}</option>`)].join("");
  categorySelect.value = "";
  searchInput.value = "";

  let viewMode = "marketplace";
  let selectedProviderId = null;

  const ratingOptions = [5, 4, 3];
  let priceLimit = 20000;
  let ratingFilter = "";
  let locationFilter = "";
  let availabilityFilter = "";

  const getCartItems = () => db.carts[user.id] || [];
  const updateCartCount = () => {
    cartCount.textContent = getCartItems().reduce((sum, item) => sum + item.quantity, 0);
  };

  const productData = db.catalog.map((product) => {
    const provider = providers.find((p) => p.id === product.providerId);
    return {
      ...product,
      provider,
      rating: provider ? providerRating(db, provider.id) : 0,
      reviewCount: provider ? db.reviews.filter((r) => r.providerId === provider.id).length : 0,
      location: provider?.location || "Lagos",
      inStock: true,
    };
  });

  const drawBookingPage = () => {
    const provider = providers.find((p) => p.id === selectedProviderId);
    if (!provider) {
      alert("Provider is no longer available.");
      viewMode = "marketplace";
      drawMarketplace();
      return;
    }

    target.innerHTML = `
      <h2>Order Service</h2>
      <p class="muted">Set your appointment date/time and tell the seller what you need.</p>
      <article class="item">
        <strong>${provider.name}</strong> — ${provider.category}
        <div class="badges">
          <span class="badge">${provider.location}</span>
          <span class="badge">Availability ${provider.availability?.join(", ") || "Not set"}</span>
        </div>
      </article>
      <form id="orderForm" class="stack">
        <label>
          Date
          <input required id="bookingDate" type="date" min="${new Date().toISOString().split("T")[0]}" />
        </label>
        <label>
          Time
          <input required id="bookingTime" type="time" />
        </label>
        <label>
          Message / Order description (optional)
          <textarea id="bookingMessage" rows="4" placeholder="Describe what you want the seller to do..."></textarea>
        </label>
        <div class="actions-row">
          <button type="button" id="backToSearch" class="ghost">Back</button>
          <button type="submit">Confirm booking</button>
        </div>
      </form>
    `;

    $("backToSearch").onclick = () => {
      viewMode = "marketplace";
      drawMarketplace();
    };

    $("orderForm").onsubmit = (event) => {
      event.preventDefault();
      const date = $("bookingDate").value;
      const time = $("bookingTime").value;
      const message = $("bookingMessage").value.trim();

      if (!date || !time) {
        alert("Please choose both date and time.");
        return;
      }

      db.bookings.push({
        id: uid("book"),
        customerId: user.id,
        providerId: provider.id,
        date,
        time,
        message,
        status: "Pending",
      });
      db.transactions.push({ id: uid("txn"), bookingId: db.bookings.at(-1).id, amount: 5000, status: "Held" });
      saveDB(db);
      viewMode = "marketplace";
      drawMarketplace();
    };
  };

  const drawCartPage = () => {
    const cartItems = getCartItems();
    const deliveryFee = cartItems.length ? 1500 : 0;
    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const total = subtotal + deliveryFee;

    target.innerHTML = `
      <section class="cart-page">
        <div>
          <h2>Your Cart</h2>
          <div class="list">
            ${cartItems.length
              ? cartItems
                  .map(
                    (item) => `
                <article class="item cart-item">
                  <img src="${item.image}" alt="${item.name}" class="cart-thumb" />
                  <div>
                    <strong>${item.name}</strong>
                    <p class="muted">${item.storeName}</p>
                    <p class="price">₦${item.price.toLocaleString()}</p>
                  </div>
                  <label>
                    Qty
                    <input type="number" min="1" value="${item.quantity}" data-qty="${item.id}" />
                  </label>
                  <button class="warn" data-remove="${item.id}">Remove</button>
                </article>`
                  )
                  .join("")
              : '<p class="item">Your cart is empty.</p>'}
          </div>
        </div>
        <aside class="card order-summary">
          <h3>Order Summary</h3>
          <p><span>Subtotal</span><strong>₦${subtotal.toLocaleString()}</strong></p>
          <p><span>Delivery fee</span><strong>₦${deliveryFee.toLocaleString()}</strong></p>
          <p class="grand-total"><span>Total</span><strong>₦${total.toLocaleString()}</strong></p>
          <button id="checkoutBtn" ${!cartItems.length ? "disabled" : ""}>Proceed to Checkout</button>
          <button id="continueShopping" class="ghost">Continue Shopping</button>
        </aside>
      </section>
    `;

    target.querySelectorAll("[data-remove]").forEach((btn) => {
      btn.onclick = () => {
        db.carts[user.id] = getCartItems().filter((item) => item.id !== btn.getAttribute("data-remove"));
        saveDB(db);
        updateCartCount();
        drawCartPage();
      };
    });

    target.querySelectorAll("[data-qty]").forEach((input) => {
      input.onchange = () => {
        const id = input.getAttribute("data-qty");
        const nextQty = Math.max(1, Number(input.value) || 1);
        db.carts[user.id] = getCartItems().map((item) => (item.id === id ? { ...item, quantity: nextQty } : item));
        saveDB(db);
        updateCartCount();
        drawCartPage();
      };
    });

    $("continueShopping").onclick = () => {
      viewMode = "marketplace";
      drawMarketplace();
    };

    $("checkoutBtn").onclick = () => {
      alert("Checkout flow demo: proceed to payment gateway.");
    };
  };

  const drawMarketplace = () => {
    const query = searchInput.value.trim().toLowerCase();
    const selectedCategory = categorySelect.value;

    const filteredProducts = productData.filter((product) => {
      const matchesQuery = !query || product.name.toLowerCase().includes(query) || product.provider?.name.toLowerCase().includes(query);
      const matchesCategory = !selectedCategory || product.category === selectedCategory;
      const matchesPrice = product.price <= priceLimit;
      const matchesRating = !ratingFilter || product.rating >= Number(ratingFilter);
      const matchesAvailability = !availabilityFilter || (availabilityFilter === "available" && product.inStock);
      const matchesLocation = !locationFilter || product.location.toLowerCase().includes(locationFilter.toLowerCase());
      return matchesQuery && matchesCategory && matchesPrice && matchesRating && matchesAvailability && matchesLocation;
    });

    const recommendedProducts = filteredProducts.slice(0, 12);
    const myBookings = db.bookings.filter((b) => b.customerId === user.id).slice(-4).reverse();

    target.innerHTML = `
      <section class="marketplace-layout">
        <aside class="filters-panel card">
          <h3>Filters</h3>
          <div class="filter-item"><span>📦</span><label>Category<select id="sideCategory"><option value="">All</option>${displayCategories.map((c) => `<option ${c === selectedCategory ? "selected" : ""}>${c}</option>`).join("")}</select></label></div>
          <div class="filter-item"><span>💲</span><label>Price Range<input id="priceRange" type="range" min="3000" max="20000" value="${priceLimit}" /></label></div>
          <div class="filter-item"><span>⭐</span><label>Ratings<select id="ratingFilter"><option value="">All</option>${ratingOptions.map((r) => `<option value="${r}" ${String(r) === ratingFilter ? "selected" : ""}>${r}+ stars</option>`).join("")}</select></label></div>
          <div class="filter-item"><span>✅</span><label>Availability<select id="availabilityFilter"><option value="">Any</option><option value="available" ${availabilityFilter === "available" ? "selected" : ""}>In stock</option></select></label></div>
          <div class="filter-item"><span>📍</span><label>Location<input id="locationFilter" placeholder="e.g. Lagos" value="${locationFilter}" /></label></div>
        </aside>

        <main class="market-content">
          <section class="promo-banner">
            <h2>Clearance Sales</h2>
            <p>Limited-time discounts from trusted sellers across HermesHub.</p>
          </section>

          <section>
            <h3>Categories for You</h3>
            <div class="category-row">
              ${displayCategories.map((category) => `<article class="category-card">${category}</article>`).join("")}
            </div>
          </section>

          <section>
            <h3>Recommended for You</h3>
            <div class="products-grid">
              ${recommendedProducts
                .map((product) => `
                  <article class="product-card" data-provider="${product.providerId}">
                    <div class="image-wrap">
                      <img src="${product.image}" alt="${product.name}" />
                      <button class="quick-view" data-quick="${product.providerId}">Quick View</button>
                    </div>
                    <h4>${product.name}</h4>
                    <p class="muted">${product.provider?.name || "Marketplace Store"}</p>
                    <p class="price">₦${product.price.toLocaleString()}</p>
                    <p><span class="stars">${stars(product.rating)}</span> (${product.reviewCount})</p>
                    <button data-add="${product.id}">Add to cart</button>
                  </article>`)
                .join("") || '<p class="item">No products found for selected filters.</p>'}
            </div>
          </section>

          <section>
            <h3>My Recent Bookings</h3>
            <div class="list">
              ${myBookings.length
                ? myBookings
                    .map((booking) => {
                      const provider = db.users.find((u) => u.id === booking.providerId);
                      return `<article class="item"><strong>${provider?.name || "Store"}</strong><p>${booking.date} ${booking.time} · ${booking.status}</p></article>`;
                    })
                    .join("")
                : '<p class="item">No bookings yet.</p>'}
            </div>
          </section>
        </main>

        <aside class="right-sidebar card">
          <h3>Trending Stores</h3>
          <ul>
            ${providers.slice(0, 3).map((p) => `<li>${p.business || p.name}</li>`).join("") || "<li>Local Essentials</li>"}
          </ul>
          <h3>Recently Viewed</h3>
          <ul>
            ${recommendedProducts.slice(0, 3).map((p) => `<li>${p.name}</li>`).join("") || "<li>No recent items</li>"}
          </ul>
          <h3>Flash Deals</h3>
          <p class="badge">Up to 30% off selected services</p>
        </aside>
      </section>
    `;

    $("sideCategory").onchange = (event) => {
      categorySelect.value = event.target.value;
      drawMarketplace();
    };

    $("priceRange").oninput = (event) => {
      priceLimit = Number(event.target.value);
      drawMarketplace();
    };
    $("ratingFilter").onchange = (event) => {
      ratingFilter = event.target.value;
      drawMarketplace();
    };
    $("availabilityFilter").onchange = (event) => {
      availabilityFilter = event.target.value;
      drawMarketplace();
    };
    $("locationFilter").oninput = (event) => {
      locationFilter = event.target.value;
      drawMarketplace();
    };

    target.querySelectorAll("[data-add]").forEach((btn) => {
      btn.onclick = () => {
        const product = productData.find((item) => item.id === btn.getAttribute("data-add"));
        if (!product) return;
        const existing = getCartItems().find((item) => item.id === product.id);
        if (existing) {
          existing.quantity += 1;
        } else {
          getCartItems().push({
            id: product.id,
            name: product.name,
            image: product.image,
            price: product.price,
            quantity: 1,
            storeName: product.provider?.name || "Marketplace Store",
          });
        }
        saveDB(db);
        updateCartCount();
      };
    });

    target.querySelectorAll("[data-quick]").forEach((btn) => {
      btn.onclick = () => {
        selectedProviderId = btn.getAttribute("data-quick");
        viewMode = "order";
        drawBookingPage();
      };
    });
  };

  const renderView = () => {
    if (viewMode === "marketplace") drawMarketplace();
    if (viewMode === "cart") drawCartPage();
    if (viewMode === "order") drawBookingPage();
  };

  $("cartBtn").onclick = () => {
    viewMode = "cart";
    renderView();
  };
  $("profileBtn").onclick = () => alert(`Logged in as ${user.name}`);
  $("notifyBtn").onclick = () => alert("You are all caught up.");

  searchInput.oninput = () => {
    if (viewMode === "marketplace") drawMarketplace();
  };

  categorySelect.onchange = () => {
    if (viewMode === "marketplace") drawMarketplace();
  };

  updateCartCount();
  renderView();
}

function renderProvider(db, user) {
  const target = $("providerView");
  target.classList.remove("hidden");
  const incoming = db.bookings.filter((b) => b.providerId === user.id);
  const rating = providerRating(db, user.id);

  target.innerHTML = `
    <h2>Service Provider Portal</h2>
    <div class="item">
      <p><b>KYC:</b> ${user.kycStatus || "pending"}</p>
      <p><b>Business:</b> ${user.business || "n/a"}</p>
      <p><b>Earnings:</b> ₦${(user.earnings || 0).toLocaleString()}</p>
      <p><b>Rating:</b> <span class="stars">${stars(rating)}</span></p>
      <label>Availability slots (comma separated)
        <input id="availabilityInput" value="${(user.availability || []).join(", ")}" />
      </label>
      <button id="saveAvailability">Save availability</button>
    </div>
    <h3>Bookings</h3>
    <div class="list" id="incomingBookings">
      ${incoming
        .map(
          (b) => `<article class="item">
            <p><b>${b.date} ${b.time}</b> — ${b.status}</p>
            <div class="badges"><span class="badge">Customer ${b.customerId}</span></div>
            ${b.message ? `<p><b>Customer message:</b> ${b.message}</p>` : ""}
            <div class="stack">
              <button data-status="Accepted" data-booking="${b.id}">Accept</button>
              <button data-status="In Progress" data-booking="${b.id}">Start job</button>
              <button data-status="Completed" data-booking="${b.id}">Mark complete</button>
              <button class="warn" data-status="Rejected" data-booking="${b.id}">Reject</button>
            </div>
          </article>`
        )
        .join("") || '<p class="item">No bookings assigned yet.</p>'}
    </div>
    <h3>Recent reviews</h3>
    <div class="list">
      ${db.reviews
        .filter((r) => r.providerId === user.id)
        .map((r) => `<article class="item"><span class="stars">${stars(r.rating)}</span> ${r.comment || ""}</article>`)
        .join("") || '<p class="item">No reviews yet.</p>'}
    </div>
  `;

  $("saveAvailability").onclick = () => {
    user.availability = $("availabilityInput").value.split(",").map((v) => v.trim()).filter(Boolean);
    saveDB(db);
    render();
  };

  target.querySelectorAll("[data-booking]").forEach((btn) => {
    btn.onclick = () => {
      const booking = db.bookings.find((b) => b.id === btn.getAttribute("data-booking"));
      if (!booking) return;
      booking.status = btn.getAttribute("data-status");
      if (booking.status === "Completed") {
        user.completedJobs = (user.completedJobs || 0) + 1;
        user.acceptedJobs = Math.max(user.acceptedJobs || 0, user.completedJobs);
        user.earnings = (user.earnings || 0) + 5000;
        const txn = db.transactions.find((t) => t.bookingId === booking.id);
        if (txn) txn.status = "Released";
      }
      if (booking.status === "Accepted") user.acceptedJobs = (user.acceptedJobs || 0) + 1;
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
    <h3>Fraud & Account Actions</h3>
    <p class="item">Suspend accounts by setting KYC to rejected or by deleting user records in storage (demo).</p>
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
    $("cartBtn").classList.add("hidden");
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
  const cartBtn = $("cartBtn");
  const profileBtn = $("profileBtn");
  const notifyBtn = $("notifyBtn");

  const isCustomer = user.role === "customer";
  marketControls.classList.toggle("hidden", !isCustomer);
  cartBtn.classList.toggle("hidden", !isCustomer);
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
      availability: [],
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
