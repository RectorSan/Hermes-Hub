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
const authForm = $("authForm");
const logoutBtn = $("logoutBtn");
const roleSelect = $("roleSelect");
const providerFields = $("providerFields");

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
  const options = [...new Set(providers.map((p) => p.category))]
    .map((c) => `<option>${c}</option>`)
    .join("");
  target.innerHTML = `
    <h2>Customer Portal</h2>
    <div class="stack">
      <label>Category <select id="filterCategory"><option value="">All</option>${options}</select></label>
      <label>Location <input id="filterLocation" placeholder="e.g. Lagos" /></label>
      <button id="searchBtn">Search Providers</button>
      <div id="providerList" class="list"></div>
      <h3>My Bookings</h3>
      <div id="myBookings" class="list"></div>
    </div>
  `;

  const drawProviders = () => {
    const cat = $("filterCategory").value;
    const loc = $("filterLocation").value.trim().toLowerCase();
    const filtered = providers.filter((p) => (!cat || p.category === cat) && (!loc || p.location.toLowerCase().includes(loc)));
    $("providerList").innerHTML = filtered.length
      ? filtered
          .map((p) => {
            const rating = providerRating(db, p.id);
            const count = db.reviews.filter((r) => r.providerId === p.id).length;
            return `
              <article class="item">
                <strong>${p.name}</strong> — ${p.category}
                <div class="badges">
                  <span class="badge">${p.location}</span>
                  <span class="badge">Completion ${completionRate(p)}%</span>
                  <span class="badge">Availability ${p.availability?.join(", ") || "Not set"}</span>
                </div>
                <p><span class="stars">${stars(rating)}</span> (${count} reviews)</p>
                <button data-book="${p.id}">Book service</button>
              </article>`;
          })
          .join("")
      : '<p class="item">No providers found.</p>';

    target.querySelectorAll("[data-book]").forEach((btn) => {
      btn.onclick = () => {
        const providerId = btn.getAttribute("data-book");
        const date = prompt("Enter date (YYYY-MM-DD)");
        const time = prompt("Enter time (HH:MM)");
        if (!date || !time) return;
        db.bookings.push({
          id: uid("book"),
          customerId: user.id,
          providerId,
          date,
          time,
          status: "Pending",
        });
        db.transactions.push({ id: uid("txn"), bookingId: db.bookings.at(-1).id, amount: 5000, status: "Held" });
        saveDB(db);
        render();
      };
    });
  };

  const drawBookings = () => {
    const mine = db.bookings.filter((b) => b.customerId === user.id);
    $("myBookings").innerHTML = mine.length
      ? mine
          .map((b) => {
            const provider = db.users.find((u) => u.id === b.providerId);
            const canReview = b.status === "Completed";
            return `
              <article class="item">
                <strong>${provider?.name || "Unknown"}</strong>
                <p>${b.date} ${b.time} — <b>${b.status}</b></p>
                ${canReview ? `<button data-review="${b.id}">Leave review</button>` : ""}
              </article>`;
          })
          .join("")
      : '<p class="item">No bookings yet.</p>';

    target.querySelectorAll("[data-review]").forEach((btn) => {
      btn.onclick = () => {
        const booking = db.bookings.find((b) => b.id === btn.getAttribute("data-review"));
        if (!booking) return;
        const rating = Number(prompt("Rating from 1 to 5"));
        const comment = prompt("Comment");
        if (!rating || rating < 1 || rating > 5) return;
        db.reviews.push({ id: uid("rev"), providerId: booking.providerId, customerId: user.id, rating, comment: comment || "" });
        saveDB(db);
        render();
      };
    });
  };

  $("searchBtn").onclick = drawProviders;
  drawProviders();
  drawBookings();
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

  if (user.role === "customer") renderCustomer(db, user);
  if (user.role === "provider") renderProvider(db, user);
  if (user.role === "admin") renderAdmin(db, user);
}

roleSelect.addEventListener("change", () => {
  providerFields.classList.toggle("hidden", roleSelect.value !== "provider");
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const data = new FormData(authForm);
  const db = loadDB();
  const email = String(data.get("email")).toLowerCase();

  let user = db.users.find((u) => u.email.toLowerCase() === email);
  if (!user) {
    user = {
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
  }

  // Simulated OTP gate
  const otp = prompt("Enter OTP sent to email/phone (use 123456)");
  if (otp !== "123456") {
    alert("Invalid OTP");
    return;
  }

  setSession(user.id);
  authForm.reset();
  providerFields.classList.add("hidden");
  render();
});

logoutBtn.onclick = () => {
  clearSession();
  render();
};

render();
