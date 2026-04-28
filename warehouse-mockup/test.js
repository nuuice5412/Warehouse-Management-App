
    const screenConfig = [
      { key: "auth", title: "เข้าสู่ระบบ/ลงทะเบียน", icon: "🔐" },
      { key: "dashboard", title: "แดชบอร์ด", icon: "📊" },
      { key: "users", title: "ผู้ใช้งาน", icon: "👥" },
      { key: "inventory", title: "สินค้าในคลัง", icon: "📦" },
      { key: "vendors", title: "ผู้จำหน่าย", icon: "🏭" },
      { key: "purchases", title: "สั่งซื้อ", icon: "🧾" },
      { key: "receiving", title: "รับสินค้าเข้า", icon: "📥" },
      { key: "search", title: "ค้นหาสินค้า", icon: "🔎" },
      { key: "issue", title: "เบิกสินค้า", icon: "📤" },
      { key: "reports", title: "รายงาน", icon: "📄" }
    ];
    const authScreen = "auth";
    const screenMap = Object.fromEntries(screenConfig.map(s => [s.key, s]));
    const rolePermissions = {
      "Warehouse Manager": ["dashboard", "users", "inventory", "vendors", "purchases", "receiving", "search", "issue", "reports"],
      "Warehouse Staff": ["dashboard", "inventory", "vendors", "search", "issue"],
      "Purchasing Officer": ["dashboard", "vendors", "purchases", "receiving", "search", "reports"],
      "Employee": ["dashboard", "search", "issue"],
      "Accountant": ["dashboard", "search", "reports"]
    };
    let currentUser = null;
    let authMessage = "";
    let authMessageType = "";

    const storageKey = "warehouse_rnp_state_v1";
    const backendUrlStorageKey = "warehouse_backend_url_v1";
    const syncIntervalMs = 5000;
    const defaultBackendBaseUrl = "http://localhost:4000";
    let backendBaseUrl = localStorage.getItem(backendUrlStorageKey) || defaultBackendBaseUrl;
    const fieldLabels = {
      users: { username: "ชื่อผู้ใช้", role: "สิทธิ์", status: "สถานะ" },
      inventory: { code: "รหัส", name: "ชื่อสินค้า", category: "หมวดหมู่", stock: "คงคลัง", reorder: "จุดสั่งซื้อขั้นต่ำ", price: "ราคา" },
      vendors: { name: "ชื่อบริษัท", contact: "ช่องทางติดต่อ", items: "สินค้าที่จำหน่าย" },
      purchases: { ref: "เลขที่อ้างอิง", date: "วันที่", item: "สินค้า", qty: "จำนวน", cost: "ต้นทุน/หน่วย" },
      receiving: { poRef: "เลขที่ PO", item: "สินค้า", qty: "จำนวน", receiver: "ผู้รับสินค้า", date: "วันที่" },
      issues: { issueNo: "เลขที่เอกสารเบิก", item: "สินค้า", qty: "จำนวน", reason: "เหตุผล", date: "วันที่" }
    };
    const db = {
      users: [
        { username: "admin", password: "123456", role: "Warehouse Manager", status: "Active" },
        { username: "manager01", password: "1234", role: "Warehouse Manager", status: "Active" },
        { username: "stock01", password: "1234", role: "Warehouse Staff", status: "Active" },
        { username: "buy01", password: "1234", role: "Purchasing Officer", status: "Active" }
      ],
      inventory: [
        { code: "HYD-001", name: "Hydraulic Pump", category: "Hydraulic", stock: 25, reorder: 10, price: 4500 },
        { code: "BRA-004", name: "Brass Valve", category: "Brass", stock: 4, reorder: 6, price: 300 }
      ],
      vendors: [
        { name: "Thai Hydro Supplier", contact: "02-000-0001", items: "Pump, Seal Kit" }
      ],
      purchases: [
        { ref: "PO-1001", date: "2026-04-25", item: "Brass Valve", qty: 20, cost: 240 }
      ],
      receiving: [],
      issues: []
    };
    const counters = { issue: 1 };

    let syncTimer = null;
    let syncInFlight = false;
    let lastRemoteUpdatedAt = 0;
    let editingInventoryCode = null;
    let editingUsername = null;
    let editingVendorName = null;
    let editingPurchaseRef = null;
    let editingReceivingIdx = -1;
    let editingIssueNo = null;

    const menu = document.getElementById("menu");
    const screen = document.getElementById("screen");
    const title = document.getElementById("screenTitle");
    const topbarActions = document.getElementById("topbarActions");

    screenConfig.forEach(item => {
      const b = document.createElement("button");
      b.dataset.screen = item.key;
      b.textContent = `${item.icon} ${item.title}`;
      b.onclick = () => openScreen(item.key, b);
      menu.appendChild(b);
    });
    openScreen(authScreen, menu.children[0]);

    function setActive(btn) {
      [...menu.children].forEach(x => x.classList.remove("active"));
      if (btn) btn.classList.add("active");
    }

    function isAuthenticated() {
      return !!currentUser;
    }

    function updateMenuAccess() {
      [...menu.children].forEach(x => {
        const screenKey = x.dataset.screen;
        const isAuthButton = screenKey === authScreen;
        const hasAccess = isAuthButton || hasScreenAccess(screenKey);
        x.disabled = !hasAccess;
        x.style.opacity = x.disabled ? "0.5" : "1";
        x.style.cursor = x.disabled ? "not-allowed" : "pointer";
      });
      renderTopbarActions();
    }

    function renderTopbarActions() {
      if (!isAuthenticated()) {
        topbarActions.innerHTML = `<span class="badge">Sync: ${backendBaseUrl}</span>`;
        return;
      }
      topbarActions.innerHTML = `
        <span class="badge">ผู้ใช้: ${currentUser.username} (${currentUser.role})</span>
        <span class="badge">Sync: ${backendBaseUrl}</span>
        <button class="btn" onclick="logoutUser()">ออกจากระบบ</button>
      `;
    }

    const fetchWithTimeout = async (url, options = {}, timeoutMs = 1500) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
      } finally {
        clearTimeout(id);
      }
    };

    function normalizeBackendUrl(urlText) {
      const input = String(urlText || "").trim().replace(/\/+$/, "");
      if (!input) return "";
      if (input.startsWith("http://") || input.startsWith("https://")) return input;
      return `http://${input}`;
    }

    async function saveBackendUrl() {
      const input = document.getElementById("backendUrlInput");
      const normalized = normalizeBackendUrl(input?.value);
      if (!normalized) return alert("กรุณาระบุ URL ของ backend เช่น 192.168.1.10:4000");

      try {
        const response = await fetchWithTimeout(`${normalized}/health`);
        if (!response.ok) throw new Error("backend not healthy");
      } catch (err) {
        return alert("เชื่อมต่อ backend ไม่สำเร็จ ตรวจสอบ IP/Port แล้วลองใหม่");
      }

      backendBaseUrl = normalized;
      localStorage.setItem(backendUrlStorageKey, backendBaseUrl);
      updateMenuAccess();
      alert(`เปลี่ยน backend เป็น ${backendBaseUrl} แล้ว`);
    }

    function setAuthMessage(message = "", type = "") {
      authMessage = message;
      authMessageType = type;
      const node = document.getElementById("authMessage");
      if (!node) return;
      node.textContent = authMessage;
      node.className = `auth-message ${authMessageType}`.trim();
    }

    function focusLoginFields() {
      const userInput = document.getElementById("loginUser");
      const passInput = document.getElementById("loginPass");
      if (!userInput || !passInput) return;
      if (userInput.value.trim()) {
        passInput.focus();
        passInput.select();
      } else {
        userInput.focus();
      }
    }

    function hasScreenAccess(screenKey) {
      if (!isAuthenticated()) return false;
      const allowed = rolePermissions[currentUser.role] || [];
      return allowed.includes(screenKey);
    }

    function hydrateState() {
      try {
        const raw = localStorage.getItem(storageKey);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        Object.keys(db).forEach(k => {
          if (Array.isArray(parsed[k])) db[k] = parsed[k];
        });
        if (parsed.counters) Object.assign(counters, parsed.counters);
      } catch (err) {
        console.error("Failed to load local state", err);
      }
    }

    function persistState() {
      localStorage.setItem(storageKey, JSON.stringify({ ...db, counters }));
      pushStateToBackend().catch(err => console.warn("Push state failed", err));
    }

    function applyStateFromPayload(payload) {
      if (!payload || !payload.db || !payload.counters) return false;
      const previousUpdatedAt = lastRemoteUpdatedAt;
      Object.keys(db).forEach(key => {
        if (Array.isArray(payload.db[key])) db[key] = payload.db[key];
      });
      Object.assign(counters, payload.counters);
      if (typeof payload.updatedAt === "number") lastRemoteUpdatedAt = payload.updatedAt;
      localStorage.setItem(storageKey, JSON.stringify({ ...db, counters }));
      return payload.updatedAt !== previousUpdatedAt;
    }

    async function fetchStateFromBackend() {
      const response = await fetchWithTimeout(`${backendBaseUrl}/state`);
      if (!response.ok) throw new Error("state fetch failed");
      const payload = await response.json();
      if (!payload.ok) throw new Error(payload.error || "state fetch invalid");
      payload._changed = applyStateFromPayload(payload);
      return payload;
    }

    function isUserTypingInForm() {
      const active = document.activeElement;
      if (!active) return false;
      const tag = active.tagName?.toUpperCase();
      if (!["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return false;
      return screen.contains(active);
    }

    async function pushStateToBackend() {
      if (syncInFlight) return;
      syncInFlight = true;
      try {
        const response = await fetchWithTimeout(`${backendBaseUrl}/state`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ db, counters })
        });
        if (!response.ok) throw new Error("state push failed");
        const payload = await response.json();
        if (payload.updatedAt) lastRemoteUpdatedAt = payload.updatedAt;
      } finally {
        syncInFlight = false;
      }
    }

    async function pullLatestState() {
      try {
        const payload = await fetchStateFromBackend();
        if (!payload._changed) return;
        if (isUserTypingInForm()) return;
        const activeBtn = [...menu.children].find(b => b.classList.contains("active"));
        if (activeBtn) openScreen(activeBtn.dataset.screen, activeBtn);
      } catch (err) {
        // Keep using local state while backend is temporarily offline.
      }
    }

    function startSyncLoop() {
      if (syncTimer) clearInterval(syncTimer);
      syncTimer = setInterval(() => {
        pullLatestState();
      }, syncIntervalMs);
    }

    async function hashPassword(text) {
      const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
      return Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, "0")).join("");
    }

    async function normalizeUserPasswords() {
      for (const u of db.users) {
        if (!u.password || u.password.startsWith("sha256:")) continue;
        const hashed = await hashPassword(u.password);
        u.password = `sha256:${hashed}`;
      }
      persistState();
    }

    async function ensureTestAdminUser() {
      const exists = db.users.some(u => u.username === "admin");
      if (exists) return;
      db.users.push({
        username: "admin",
        password: `sha256:${await hashPassword("123456")}`,
        role: "Warehouse Manager",
        status: "Active"
      });
      persistState();
    }

    function generateIssueNo() {
      const d = new Date();
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const seq = String(counters.issue++).padStart(3, "0");
      return `ISS-${y}${m}${day}-${seq}`;
    }

    async function requestIssueNo() {
      try {
        const response = await fetchWithTimeout(`${backendBaseUrl}/issue/generate-no`, { method: "POST" });
        if (!response.ok) throw new Error("issue number API failed");
        const payload = await response.json();
        if (payload.issueNo) return payload.issueNo;
      } catch (err) {
        console.warn("Fallback to local issue number", err);
      }
      return generateIssueNo();
    }

    async function validateUserWithBackend(username, role) {
      try {
        const response = await fetchWithTimeout(`${backendBaseUrl}/users/validate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, role })
        });
        if (!response.ok) return false;
        const payload = await response.json();
        return !!payload.ok;
      } catch (err) {
        // Offline backend should not block mockup usage.
        return true;
      }
    }

    async function checkScreenAccessWithBackend(screenKey) {
      if (!currentUser) return false;
      try {
        const query = new URLSearchParams({
          username: currentUser.username,
          role: currentUser.role,
          screen: screenKey
        });
        const response = await fetchWithTimeout(`${backendBaseUrl}/authz/check?${query.toString()}`);
        if (!response.ok) return true;
        const payload = await response.json();
        return !!payload.allowed;
      } catch (err) {
        // If backend is offline, keep local permission behavior.
        return true;
      }
    }

    async function loginWithBackend(username, password) {
      try {
        const response = await fetchWithTimeout(`${backendBaseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password })
        });
        if (!response.ok) return null;
        const payload = await response.json();
        if (!payload.ok || !payload.user) return null;
        return payload.user;
      } catch (err) {
        // Backend offline: allow local fallback login for desktop demo use.
        return null;
      }
    }

    async function openScreen(screenKey, btn) {
      if (screenKey !== authScreen && !isAuthenticated()) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        title.textContent = screenMap[authScreen].title;
        setActive(menu.children[0]);
        renderAuth();
        return;
      }
      if (screenKey !== authScreen && !hasScreenAccess(screenKey)) {
        alert("สิทธิ์ไม่เพียงพอสำหรับเมนูนี้");
        return;
      }
      if (screenKey !== authScreen) {
        const backendAllowed = await checkScreenAccessWithBackend(screenKey);
        if (!backendAllowed) {
          alert("สิทธิ์ใช้งานไม่ตรงกับระบบกลาง กรุณาติดต่อผู้ดูแล");
          return;
        }
      }
      title.textContent = screenMap[screenKey].title;
      setActive(btn);
      if (screenKey === "auth") renderAuth();
      if (screenKey === "dashboard") renderDashboard();
      if (screenKey === "users") renderUsers();
      if (screenKey === "inventory") renderInventory();
      if (screenKey === "vendors") renderVendors();
      if (screenKey === "purchases") renderPurchases();
      if (screenKey === "receiving") renderReceiving();
      if (screenKey === "search") renderSearch();
      if (screenKey === "issue") renderIssue();
      if (screenKey === "reports") renderReports();
    }

    function renderAuth() {
      const canRegister = currentUser && currentUser.role === "Warehouse Manager";
      screen.innerHTML = `
        <div class="card">
          <h3>เข้าสู่ระบบ</h3>
          <div class="grid">
            <div><label>ชื่อผู้ใช้</label><input id="loginUser" autocomplete="username"></div>
            <div><label>รหัสผ่าน</label><input type="password" id="loginPass" autocomplete="current-password"></div>
          </div>
          <br>
          <button class="btn primary" onclick="loginUser()">เข้าสู่ระบบ</button>
          <span class="muted">${currentUser ? `ผู้ใช้ปัจจุบัน: ${currentUser.username} (${currentUser.role})` : "โหมดทดสอบ: admin / 123456"}</span>
          <div id="authMessage" class="auth-message"></div>
        </div>
        <div class="card">
          <h3>ตั้งค่าเซิร์ฟเวอร์ซิงก์ (ใช้เหมือนกันทุกเครื่อง)</h3>
          <div class="grid">
            <div><label>Backend URL</label><input id="backendUrlInput" value="${backendBaseUrl}" placeholder="เช่น http://192.168.1.10:4000"></div>
          </div>
          <br>
          <button class="btn" onclick="saveBackendUrl()">บันทึก URL เซิร์ฟเวอร์</button>
        </div>
        ${canRegister ? `
        <div class="card">
          <h3>ลงทะเบียนผู้ใช้งาน (เฉพาะผู้จัดการคลัง)</h3>
          <div class="grid">
            <div><label>ชื่อผู้ใช้</label><input id="regUser"></div>
            <div><label>รหัสผ่าน</label><input id="regPass" type="password"></div>
            <div><label>สิทธิ์การใช้งาน</label><select id="regRole"><option>Warehouse Manager</option><option>Warehouse Staff</option><option>Purchasing Officer</option><option>Employee</option><option>Accountant</option></select></div>
          </div>
          <br>
          <button class="btn success" onclick="registerUser()">สร้างผู้ใช้งาน</button>
        </div>` : `
        <div class="card">
          <h3>ลงทะเบียนผู้ใช้งาน</h3>
          <div class="muted">เพื่อความปลอดภัย การสร้างบัญชีผู้ใช้ทำได้เฉพาะ Warehouse Manager ที่เข้าสู่ระบบแล้ว</div>
        </div>`}
      `;
      updateMenuAccess();
      setAuthMessage(authMessage, authMessageType);
      focusLoginFields();
    }

    async function loginUser() {
      const username = document.getElementById("loginUser").value.trim();
      const password = document.getElementById("loginPass").value;
      if (!username || !password) {
        setAuthMessage("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน", "error");
        focusLoginFields();
        return;
      }
      const backendUser = await loginWithBackend(username, password);
      if (backendUser) {
        setAuthMessage("", "");
        currentUser = { username: backendUser.username, role: backendUser.role };
        updateMenuAccess();
        const dashboardBtn = [...menu.children].find(b => b.dataset.screen === "dashboard");
        openScreen("dashboard", dashboardBtn);
        return;
      }
      const passwordHash = `sha256:${await hashPassword(password)}`;
      const user = db.users.find(u => u.username === username && u.password === passwordHash && u.status === "Active");
      if (!user) {
        setAuthMessage("เข้าสู่ระบบไม่สำเร็จ: ชื่อผู้ใช้/รหัสผ่านไม่ถูกต้อง หรือบัญชีถูกระงับ", "error");
        const passInput = document.getElementById("loginPass");
        if (passInput) passInput.value = "";
        focusLoginFields();
        return;
      }
      setAuthMessage("", "");
      currentUser = { username: user.username, role: user.role };
      updateMenuAccess();
      const dashboardBtn = [...menu.children].find(b => b.dataset.screen === "dashboard");
      openScreen("dashboard", dashboardBtn);
    }

    function logoutUser() {
      currentUser = null;
      authMessage = "";
      authMessageType = "";
      updateMenuAccess();
      const authBtn = [...menu.children].find(b => b.dataset.screen === authScreen);
      openScreen(authScreen, authBtn);
    }

    async function registerUser() {
      if (!currentUser || currentUser.role !== "Warehouse Manager") {
        return alert("สิทธิ์ไม่เพียงพอ: เฉพาะ Warehouse Manager เท่านั้นที่สร้างผู้ใช้ได้");
      }
      const u = document.getElementById("regUser").value.trim();
      const p = document.getElementById("regPass").value;
      const r = document.getElementById("regRole").value;
      if (!u || !p) return alert("กรุณากรอกชื่อผู้ใช้และรหัสผ่าน");
      const valid = await validateUserWithBackend(u, r);
      if (!valid) return alert("รูปแบบชื่อผู้ใช้หรือสิทธิ์ไม่ถูกต้อง");
      const exists = db.users.some(x => x.username === u);
      if (exists) return alert("ชื่อผู้ใช้นี้มีอยู่แล้ว");
      db.users.push({ username: u, password: `sha256:${await hashPassword(p)}`, role: r, status: "Active" });
      persistState();
      alert("เพิ่มผู้ใช้งานเรียบร้อย");
      renderAuth();
    }

    function renderDashboard() {
      const lowStock = db.inventory.filter(i => i.stock <= i.reorder).length;
      const totalStock = db.inventory.reduce((a, b) => a + Number(b.stock), 0);
      screen.innerHTML = `
        <div class="card">
          <h3>แดชบอร์ดวิเคราะห์</h3>
          <div class="grid">
            <div class="kpi"><div class="muted">จำนวนชนิดสินค้า</div><div class="v">${db.inventory.length}</div></div>
            <div class="kpi"><div class="muted">จำนวนคงคลังรวม</div><div class="v">${totalStock}</div></div>
            <div class="kpi"><div class="muted">รายการใกล้หมด</div><div class="v">${lowStock}</div></div>
            <div class="kpi"><div class="muted">รายการสั่งซื้อวันนี้</div><div class="v">${db.purchases.length}</div></div>
          </div>
          <br>
          <div class="muted">เงื่อนไขแจ้งเตือน: จำนวนคงคลัง <= จุดสั่งซื้อขั้นต่ำ</div>
        </div>`;
    }

    function renderUsers() {
      screen.innerHTML = `
        <div class="card">
          <h3>สร้าง / แก้ไข ผู้ใช้งาน</h3>
          <div class="grid">
            <div><label>ชื่อผู้ใช้</label><input id="uName"></div>
            <div><label>รหัสผ่าน (กรอกเมื่อสร้างใหม่ หรือเมื่อต้องการเปลี่ยน)</label><input id="uPass" type="password"></div>
            <div><label>สิทธิ์</label><select id="uRole"><option>Warehouse Manager</option><option>Warehouse Staff</option><option>Purchasing Officer</option><option>Employee</option><option>Accountant</option></select></div>
            <div><label>สถานะ</label><select id="uStatus"><option>Active</option><option>Suspended</option></select></div>
          </div>
          <br>
          <button class="btn success" onclick="saveUser()">บันทึก</button>
        </div>
        ${renderTable("users", ["username", "role", "status"])}
      `;
    }

    async function saveUser() {
      const username = document.getElementById("uName").value.trim();
      const plainPassword = document.getElementById("uPass").value;
      const role = document.getElementById("uRole").value;
      const status = document.getElementById("uStatus").value;
      if (!username) return alert("ต้องระบุชื่อผู้ใช้");
      const idx = db.users.findIndex(x => x.username === username);
      if (idx >= 0) {
        db.users[idx] = { ...db.users[idx], username, role, status };
        if (plainPassword) db.users[idx].password = `sha256:${await hashPassword(plainPassword)}`;
      } else {
        if (!plainPassword) return alert("ผู้ใช้ใหม่ต้องกำหนดรหัสผ่าน");
        db.users.push({ username, password: `sha256:${await hashPassword(plainPassword)}`, role, status });
      }
      persistState();
      renderUsers();
    }

    function renderUserEditForm(user) {
      const selected = user || {};
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขข้อมูลผู้ใช้งาน</h3>
          <div class="grid">
            <div><label>ชื่อผู้ใช้</label><input id="euName" value="${selected.username || ""}" ${editingUsername ? "readonly" : ""}></div>
            <div><label>รหัสผ่านใหม่ (เว้นว่างถ้าไม่เปลี่ยน)</label><input id="euPass" type="password"></div>
            <div><label>สิทธิ์</label><select id="euRole"><option>Warehouse Manager</option><option>Warehouse Staff</option><option>Purchasing Officer</option><option>Employee</option><option>Accountant</option></select></div>
            <div><label>สถานะ</label><select id="euStatus"><option>Active</option><option>Suspended</option></select></div>
          </div>
          <br>
          <button class="btn primary" onclick="saveUserEdit()">บันทึกข้อมูล</button>
          <button class="btn danger" onclick="cancelUserEdit()">ยกเลิก</button>
        </div>
      `;
      document.getElementById("euRole").value = selected.role || "Employee";
      document.getElementById("euStatus").value = selected.status || "Active";
    }

    async function saveUserEdit() {
      const username = document.getElementById("euName").value.trim();
      const plainPassword = document.getElementById("euPass").value;
      const role = document.getElementById("euRole").value;
      const status = document.getElementById("euStatus").value;
      if (!username) return alert("ต้องระบุชื่อผู้ใช้");

      const idx = db.users.findIndex(x => x.username === editingUsername || x.username === username);
      if (idx < 0) return alert("ไม่พบผู้ใช้งานที่ต้องการแก้ไข");
      db.users[idx] = { ...db.users[idx], username, role, status };
      if (plainPassword) db.users[idx].password = `sha256:${await hashPassword(plainPassword)}`;
      persistState();
      editingUsername = null;
      renderUsers();
    }

    function cancelUserEdit() {
      editingUsername = null;
      renderUsers();
    }

    function renderInventory() {
      editingInventoryCode = null;
      screen.innerHTML = `
        <div class="card">
          <h3>จัดการสินค้า</h3>
          <div class="grid">
            <div><label>รหัสสินค้า</label><input id="iCode"></div>
            <div><label>ชื่อสินค้า</label><input id="iName"></div>
            <div><label>หมวดหมู่</label><input id="iCat"></div>
            <div><label>คงคลัง</label><input id="iStock" type="number" min="0"></div>
            <div><label>จุดสั่งซื้อขั้นต่ำ</label><input id="iReorder" type="number" min="0"></div>
            <div><label>ราคา</label><input id="iPrice" type="number" min="0"></div>
          </div>
          <br>
          <button class="btn success" onclick="saveInventory()">บันทึก</button>
        </div>
        ${renderTable("inventory", ["code", "name", "category", "stock", "reorder", "price"])}
      `;
    }

    function renderInventoryEditForm(item) {
      const selected = item || {};
      const totalValue = Number(selected.stock || 0) * Number(selected.price || 0);
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขข้อมูลสินค้า</h3>
          <div class="grid">
            <div><label>ชื่อสินค้า</label><input id="eName" value="${selected.name || ""}"></div>
            <div><label>สินค้าจากตัวแทนจำหน่าย</label><input id="eSupplierItem" value="${selected.supplierItem || ""}"></div>
            <div><label>รหัสสินค้า</label><input id="eCode" value="${selected.code || ""}" ${editingInventoryCode ? "readonly" : ""}></div>
            <div><label>จำนวนคงคลัง</label><input id="eStock" type="number" min="0" value="${selected.stock ?? 0}"></div>
            <div><label>หมวดหมู่สินค้า</label><input id="eCategory" value="${selected.category || ""}"></div>
            <div><label>จำนวนคงคลังขั้นต่ำ</label><input id="eReorder" type="number" min="0" value="${selected.reorder ?? 0}"></div>
            <div><label>ราคาปัจจุบัน</label><input id="ePrice" type="number" min="0" value="${selected.price ?? 0}"></div>
          </div>
          <br>
          <div><label>รายละเอียดสินค้า</label><textarea id="eDetails">${selected.details || ""}</textarea></div>
          <br>
          <div class="muted">ราคารวมปัจจุบัน: <strong>${totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</strong></div>
          <br>
          <button class="btn primary" onclick="saveInventoryEdit()">บันทึกสินค้า</button>
          <button class="btn danger" onclick="cancelInventoryEdit()">ยกเลิก</button>
        </div>
      `;
    }

    function saveInventoryEdit() {
      const code = document.getElementById("eCode").value.trim();
      if (!code) return alert("ต้องระบุรหัสสินค้า");
      const item = {
        code,
        name: document.getElementById("eName").value.trim(),
        supplierItem: document.getElementById("eSupplierItem").value.trim(),
        category: document.getElementById("eCategory").value.trim(),
        stock: Math.max(0, Number(document.getElementById("eStock").value || 0)),
        reorder: Math.max(0, Number(document.getElementById("eReorder").value || 0)),
        price: Math.max(0, Number(document.getElementById("ePrice").value || 0)),
        details: document.getElementById("eDetails").value.trim()
      };

      const idx = db.inventory.findIndex(x => x.code === editingInventoryCode || x.code === code);
      if (idx >= 0) {
        db.inventory[idx] = { ...db.inventory[idx], ...item };
      } else {
        db.inventory.push(item);
      }
      persistState();
      editingInventoryCode = null;
      renderInventory();
    }

    function cancelInventoryEdit() {
      editingInventoryCode = null;
      renderInventory();
    }

    function saveInventory() {
      const code = document.getElementById("iCode").value.trim();
      if (!code) return alert("ต้องระบุรหัสสินค้า");
      const item = {
        code,
        name: document.getElementById("iName").value.trim(),
        category: document.getElementById("iCat").value.trim(),
        stock: Math.max(0, Number(document.getElementById("iStock").value || 0)),
        reorder: Math.max(0, Number(document.getElementById("iReorder").value || 0)),
        price: Math.max(0, Number(document.getElementById("iPrice").value || 0))
      };
      const idx = db.inventory.findIndex(x => x.code === code);
      if (idx >= 0) db.inventory[idx] = item;
      else db.inventory.push(item);
      persistState();
      renderInventory();
    }

    function renderVendors() {
      screen.innerHTML = `
        <div class="card">
          <h3>ทะเบียนผู้จำหน่าย</h3>
          <div class="grid">
            <div><label>ชื่อบริษัท</label><input id="vName"></div>
            <div><label>ช่องทางติดต่อ</label><input id="vContact"></div>
            <div><label>สินค้าที่จำหน่าย</label><input id="vItems"></div>
          </div>
          <br>
          <button class="btn success" onclick="saveVendor()">บันทึก</button>
        </div>
        ${renderTable("vendors", ["name", "contact", "items"])}
      `;
    }

    function saveVendor() {
      const name = document.getElementById("vName").value.trim();
      if (!name) return alert("ต้องระบุชื่อผู้จำหน่าย");
      const obj = { name, contact: document.getElementById("vContact").value.trim(), items: document.getElementById("vItems").value.trim() };
      const idx = db.vendors.findIndex(x => x.name === name);
      if (idx >= 0) db.vendors[idx] = obj;
      else db.vendors.push(obj);
      persistState();
      renderVendors();
    }

    function renderVendorEditForm(vendor) {
      const selected = vendor || {};
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขข้อมูลผู้จำหน่าย</h3>
          <div class="grid">
            <div><label>ชื่อบริษัท</label><input id="evName" value="${selected.name || ""}" ${editingVendorName ? "readonly" : ""}></div>
            <div><label>ช่องทางติดต่อ</label><input id="evContact" value="${selected.contact || ""}"></div>
            <div><label>สินค้าที่จำหน่าย</label><input id="evItems" value="${selected.items || ""}"></div>
          </div>
          <br>
          <button class="btn primary" onclick="saveVendorEdit()">บันทึกข้อมูล</button>
          <button class="btn danger" onclick="cancelVendorEdit()">ยกเลิก</button>
        </div>
      `;
    }

    function saveVendorEdit() {
      const name = document.getElementById("evName").value.trim();
      if (!name) return alert("ต้องระบุชื่อผู้จำหน่าย");
      const obj = {
        name,
        contact: document.getElementById("evContact").value.trim(),
        items: document.getElementById("evItems").value.trim()
      };
      const idx = db.vendors.findIndex(x => x.name === editingVendorName || x.name === name);
      if (idx < 0) return alert("ไม่พบผู้จำหน่ายที่ต้องการแก้ไข");
      db.vendors[idx] = obj;
      persistState();
      editingVendorName = null;
      renderVendors();
    }

    function cancelVendorEdit() {
      editingVendorName = null;
      renderVendors();
    }

    function renderPurchases() {
      screen.innerHTML = `
        <div class="card">
          <h3>บันทึกใบสั่งซื้อ</h3>
          <div class="grid">
            <div><label>เลขที่เอกสาร PO</label><input id="pRef"></div>
            <div><label>วันที่</label><input type="date" id="pDate"></div>
            <div><label>สินค้า</label><input id="pItem"></div>
            <div><label>จำนวน</label><input id="pQty" type="number" min="0"></div>
            <div><label>ราคาต้นทุน/หน่วย</label><input id="pCost" type="number" min="0"></div>
          </div>
          <br>
          <button class="btn success" onclick="savePurchase()">บันทึก</button>
        </div>
        ${renderTable("purchases", ["ref", "date", "item", "qty", "cost"])}
      `;
    }

    function savePurchase() {
      const ref = document.getElementById("pRef").value.trim();
      if (!ref) return alert("ต้องระบุเลขที่ PO");
      const obj = {
        ref,
        date: document.getElementById("pDate").value,
        item: document.getElementById("pItem").value.trim(),
        qty: Math.max(0, Number(document.getElementById("pQty").value || 0)),
        cost: Math.max(0, Number(document.getElementById("pCost").value || 0))
      };
      const idx = db.purchases.findIndex(x => x.ref === ref);
      if (idx >= 0) db.purchases[idx] = obj;
      else db.purchases.push(obj);
      persistState();
      renderPurchases();
    }

    function renderPurchaseEditForm(purchase) {
      const selected = purchase || {};
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขใบสั่งซื้อ</h3>
          <div class="grid">
            <div><label>เลขที่เอกสาร PO</label><input id="epRef" value="${selected.ref || ""}" ${editingPurchaseRef ? "readonly" : ""}></div>
            <div><label>วันที่</label><input type="date" id="epDate" value="${selected.date || ""}"></div>
            <div><label>สินค้า</label><input id="epItem" value="${selected.item || ""}"></div>
            <div><label>จำนวน</label><input id="epQty" type="number" min="0" value="${selected.qty ?? 0}"></div>
            <div><label>ราคาต้นทุน/หน่วย</label><input id="epCost" type="number" min="0" value="${selected.cost ?? 0}"></div>
          </div>
          <br>
          <button class="btn primary" onclick="savePurchaseEdit()">บันทึกข้อมูล</button>
          <button class="btn danger" onclick="cancelPurchaseEdit()">ยกเลิก</button>
        </div>
      `;
    }

    function savePurchaseEdit() {
      const ref = document.getElementById("epRef").value.trim();
      if (!ref) return alert("ต้องระบุเลขที่ PO");
      const obj = {
        ref,
        date: document.getElementById("epDate").value,
        item: document.getElementById("epItem").value.trim(),
        qty: Math.max(0, Number(document.getElementById("epQty").value || 0)),
        cost: Math.max(0, Number(document.getElementById("epCost").value || 0))
      };
      const idx = db.purchases.findIndex(x => x.ref === editingPurchaseRef || x.ref === ref);
      if (idx < 0) return alert("ไม่พบใบสั่งซื้อที่ต้องการแก้ไข");
      db.purchases[idx] = obj;
      persistState();
      editingPurchaseRef = null;
      renderPurchases();
    }

    function cancelPurchaseEdit() {
      editingPurchaseRef = null;
      renderPurchases();
    }

    function renderReceiving() {
      const options = db.purchases.map(p => `<option value="${p.ref}">${p.ref} - ${p.item}</option>`).join("");
      screen.innerHTML = `
        <div class="card">
          <h3>รับสินค้าตาม PO</h3>
          <div class="grid">
            <div><label>เลขที่ PO</label><select id="rRef">${options}</select></div>
            <div><label>จำนวนที่รับเข้า</label><input id="rQty" type="number" min="0"></div>
            <div><label>ผู้รับสินค้า</label><input id="rBy"></div>
          </div>
          <br>
          <button class="btn success" onclick="confirmReceive()">ยืนยันรับสินค้า</button>
        </div>
        ${renderTable("receiving", ["poRef", "item", "qty", "receiver", "date"])}
      `;
    }

    function confirmReceive() {
      const poRef = document.getElementById("rRef").value;
      const qty = Math.max(0, Number(document.getElementById("rQty").value || 0));
      const receiver = document.getElementById("rBy").value.trim();
      const po = db.purchases.find(x => x.ref === poRef);
      if (!po) return alert("ไม่พบเลขที่ PO");
      db.receiving.push({ poRef, item: po.item, qty, receiver, date: new Date().toISOString().slice(0, 10) });
      const idx = db.inventory.findIndex(x => x.name === po.item);
      if (idx >= 0) db.inventory[idx].stock += qty;
      persistState();
      renderReceiving();
    }

    function renderReceivingEditForm(receiving) {
      const selected = receiving || {};
      const options = db.purchases.map(p => `<option value="${p.ref}">${p.ref} - ${p.item}</option>`).join("");
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขรายการรับสินค้า</h3>
          <div class="grid">
            <div><label>เลขที่ PO</label><select id="erRef">${options}</select></div>
            <div><label>สินค้า</label><input id="erItem" value="${selected.item || ""}"></div>
            <div><label>จำนวนที่รับเข้า</label><input id="erQty" type="number" min="0" value="${selected.qty ?? 0}"></div>
            <div><label>ผู้รับสินค้า</label><input id="erBy" value="${selected.receiver || ""}"></div>
            <div><label>วันที่รับ</label><input type="date" id="erDate" value="${selected.date || ""}"></div>
          </div>
          <br>
          <button class="btn primary" onclick="saveReceivingEdit()">บันทึกข้อมูล</button>
          <button class="btn danger" onclick="cancelReceivingEdit()">ยกเลิก</button>
        </div>
      `;
      document.getElementById("erRef").value = selected.poRef || "";
    }

    function saveReceivingEdit() {
      if (editingReceivingIdx < 0 || editingReceivingIdx >= db.receiving.length) {
        return alert("ไม่พบรายการรับสินค้าที่ต้องการแก้ไข");
      }
      const poRef = document.getElementById("erRef").value;
      db.receiving[editingReceivingIdx] = {
        poRef,
        item: document.getElementById("erItem").value.trim(),
        qty: Math.max(0, Number(document.getElementById("erQty").value || 0)),
        receiver: document.getElementById("erBy").value.trim(),
        date: document.getElementById("erDate").value || new Date().toISOString().slice(0, 10)
      };
      persistState();
      editingReceivingIdx = -1;
      renderReceiving();
    }

    function cancelReceivingEdit() {
      editingReceivingIdx = -1;
      renderReceiving();
    }

    function renderSearch() {
      screen.innerHTML = `
        <div class="card">
          <h3>ค้นหาสินค้า</h3>
          <div class="grid">
            <div><label>ค้นหาด้วยชื่อ/หมวดหมู่</label><input id="sKey" oninput="doSearch()"></div>
          </div>
          <table id="searchTable"></table>
        </div>`;
      doSearch();
    }

    function doSearch() {
      const key = (document.getElementById("sKey")?.value || "").toLowerCase();
      const rows = db.inventory.filter(x => [x.name, x.category].join(" ").toLowerCase().includes(key));
      const table = document.getElementById("searchTable");
      table.innerHTML = `
        <tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวดหมู่</th><th>คงคลัง</th><th>ราคา</th></tr>
        ${rows.map(r => `<tr><td>${r.code}</td><td>${r.name}</td><td>${r.category}</td><td>${r.stock}</td><td>${r.price}</td></tr>`).join("")}
      `;
    }

    function renderIssue() {
      const options = db.inventory.map(i => `<option>${i.name}</option>`).join("");
      screen.innerHTML = `
        <div class="card">
          <h3>บันทึกการเบิกสินค้า</h3>
          <div class="grid">
            <div><label>เลขที่เอกสารเบิก</label><input id="isOrder"></div>
            <div><label>สินค้า</label><select id="isItem">${options}</select></div>
            <div><label>จำนวน</label><input type="number" id="isQty" min="0"></div>
            <div><label>เหตุผลการเบิก</label><input id="isReason"></div>
          </div>
          <br>
          <button class="btn warn" onclick="saveIssue()">เบิกสินค้า</button>
        </div>
        ${renderTable("issues", ["issueNo", "item", "qty", "reason", "date"])}
      `;
    }

    async function saveIssue() {
      const orderNo = document.getElementById("isOrder").value.trim();
      const item = document.getElementById("isItem").value;
      const qty = Math.max(0, Number(document.getElementById("isQty").value || 0));
      const reason = document.getElementById("isReason").value.trim();
      const inv = db.inventory.find(x => x.name === item);
      if (!inv) return alert("ไม่พบรายการสินค้า");
      if (qty <= 0 || qty > inv.stock) return alert("จำนวนเบิกไม่ถูกต้อง");
      inv.stock -= qty;
      const issueNo = orderNo || await requestIssueNo();
      db.issues.push({ issueNo, item, qty, reason, date: new Date().toISOString().slice(0, 10) });
      persistState();
      renderIssue();
    }

    function renderIssueEditForm(issue) {
      const selected = issue || {};
      const options = db.inventory.map(i => `<option>${i.name}</option>`).join("");
      screen.innerHTML = `
        <div class="card">
          <h3>แก้ไขรายการเบิกสินค้า</h3>
          <div class="grid">
            <div><label>เลขที่เอกสารเบิก</label><input id="eiNo" value="${selected.issueNo || ""}" ${editingIssueNo ? "readonly" : ""}></div>
            <div><label>สินค้า</label><select id="eiItem">${options}</select></div>
            <div><label>จำนวน</label><input type="number" id="eiQty" min="0" value="${selected.qty ?? 0}"></div>
            <div><label>เหตุผลการเบิก</label><input id="eiReason" value="${selected.reason || ""}"></div>
            <div><label>วันที่</label><input type="date" id="eiDate" value="${selected.date || ""}"></div>
          </div>
          <br>
          <button class="btn primary" onclick="saveIssueEdit()">บันทึกข้อมูล</button>
          <button class="btn danger" onclick="cancelIssueEdit()">ยกเลิก</button>
        </div>
      `;
      document.getElementById("eiItem").value = selected.item || "";
    }

    function saveIssueEdit() {
      const issueNo = document.getElementById("eiNo").value.trim();
      if (!issueNo) return alert("ต้องระบุเลขที่เอกสารเบิก");
      const idx = db.issues.findIndex(x => x.issueNo === editingIssueNo || x.issueNo === issueNo);
      if (idx < 0) return alert("ไม่พบรายการเบิกที่ต้องการแก้ไข");
      db.issues[idx] = {
        issueNo,
        item: document.getElementById("eiItem").value,
        qty: Math.max(0, Number(document.getElementById("eiQty").value || 0)),
        reason: document.getElementById("eiReason").value.trim(),
        date: document.getElementById("eiDate").value || new Date().toISOString().slice(0, 10)
      };
      persistState();
      editingIssueNo = null;
      renderIssue();
    }

    function cancelIssueEdit() {
      editingIssueNo = null;
      renderIssue();
    }

    function renderReports() {
      const invRows = db.inventory.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.category}</td><td>${i.stock}</td><td>${i.reorder}</td><td>${i.stock <= i.reorder ? "ควรสั่งซื้อ" : "ปกติ"}</td></tr>`).join("");
      const issueRows = db.issues.map(i => `<tr><td>${i.date}</td><td>${i.issueNo || i.orderNo}</td><td>${i.item}</td><td>${i.qty}</td><td>${i.reason}</td></tr>`).join("");
      const purchaseRows = db.purchases.map(p => `<tr><td>${p.ref}</td><td>${p.date}</td><td>${p.item}</td><td>${p.qty}</td><td>${p.cost}</td></tr>`).join("");
      screen.innerHTML = `
        <div class="card" style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0;">ส่งออกข้อมูลรายงาน</h3>
            <div class="muted" style="margin-top: 4px;">ดาวน์โหลดข้อมูลทั้งหมดเป็นไฟล์ Excel (CSV) เพื่อนำไปใช้งานต่อ</div>
          </div>
          <button class="btn success" onclick="exportReportsToExcel()">ดาวน์โหลด Excel</button>
        </div>
        <div class="card">
          <h3>รายงานสรุปสินค้าคงคลัง</h3>
          <table>
            <tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวดหมู่</th><th>คงคลัง</th><th>จุดสั่งซื้อขั้นต่ำ</th><th>สถานะ</th></tr>
            ${invRows}
          </table>
        </div>
        <div class="card">
          <h3>รายงานประวัติเบิกสินค้า</h3>
          <table>
            <tr><th>วันที่</th><th>เลขที่เอกสาร</th><th>สินค้า</th><th>จำนวน</th><th>เหตุผล</th></tr>
            ${issueRows}
          </table>
        </div>
        <div class="card">
          <h3>รายงานสรุปการสั่งซื้อรายวัน</h3>
          <table>
            <tr><th>เลขที่อ้างอิง</th><th>วันที่</th><th>สินค้า</th><th>จำนวน</th><th>ต้นทุน/หน่วย</th></tr>
            ${purchaseRows}
          </table>
        </div>`;
    }

    function escapeCSV(val) {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    async function exportReportsToExcel() {
      try {
        let csv = "\uFEFF"; // UTF-8 BOM so Excel opens Thai chars properly

        csv += "รายงานสรุปสินค้าคงคลัง\n";
        csv += "รหัส,ชื่อสินค้า,หมวดหมู่,คงคลัง,จุดสั่งซื้อขั้นต่ำ,สถานะ\n";
        db.inventory.forEach(i => {
          const status = i.stock <= i.reorder ? "ควรสั่งซื้อ" : "ปกติ";
          csv += [i.code, i.name, i.category, i.stock, i.reorder, status].map(escapeCSV).join(",") + "\n";
        });
        csv += "\n\n";

        csv += "รายงานประวัติเบิกสินค้า\n";
        csv += "วันที่,เลขที่เอกสาร,สินค้า,จำนวน,เหตุผล\n";
        db.issues.forEach(i => {
          csv += [i.date, i.issueNo || i.orderNo, i.item, i.qty, i.reason].map(escapeCSV).join(",") + "\n";
        });
        csv += "\n\n";

        csv += "รายงานสรุปการสั่งซื้อรายวัน\n";
        csv += "เลขที่อ้างอิง,วันที่,สินค้า,จำนวน,ต้นทุน/หน่วย\n";
        db.purchases.forEach(p => {
          csv += [p.ref, p.date, p.item, p.qty, p.cost].map(escapeCSV).join(",") + "\n";
        });

        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `warehouse_report_${new Date().toISOString().slice(0,10)}.csv`,
              types: [{
                description: 'CSV File (Excel)',
                accept: {'text/csv': ['.csv']}
              }]
            });
            const writable = await handle.createWritable();
            await writable.write(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
            await writable.close();
            return;
          } catch (err) {
            if (err.name !== 'AbortError') console.warn('SaveFilePicker error, falling back', err);
            else return;
          }
        }

        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `warehouse_report_${new Date().toISOString().slice(0,10)}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (error) {
        customAlert("เกิดข้อผิดพลาดในการส่งออกไฟล์");
        console.error("Export error:", error);
      }
    }

    function renderTable(entity, cols) {
      const labels = fieldLabels[entity] || {};
      return `
        <div class="card">
          <h3>ข้อมูล ${entity}</h3>
          <table>
            <tr>${cols.map(c => `<th>${labels[c] || c}</th>`).join("")}<th>การจัดการ</th></tr>
            ${db[entity].map((row, idx) => `<tr>${cols.map(c => `<td>${row[c] ?? ""}</td>`).join("")}<td><button class="btn" onclick="editRow('${entity}', ${idx})">แก้ไข</button><button class="btn danger" onclick="delRow('${entity}', ${idx})">ลบ</button></td></tr>`).join("")}
          </table>
        </div>`;
    }

    function editRow(entity, idx) {
      const row = db[entity]?.[idx];
      if (!row) return;

      if (entity === "users") {
        editingUsername = row.username || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "users");
        setActive(btn);
        title.textContent = "แก้ไขผู้ใช้งาน";
        renderUserEditForm(row);
        return;
      }

      if (entity === "inventory") {
        editingInventoryCode = row.code || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "inventory");
        setActive(btn);
        title.textContent = "แก้ไขสินค้า";
        renderInventoryEditForm(row);
        return;
      }

      if (entity === "vendors") {
        editingVendorName = row.name || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "vendors");
        setActive(btn);
        title.textContent = "แก้ไขผู้จำหน่าย";
        renderVendorEditForm(row);
        return;
      }

      if (entity === "purchases") {
        editingPurchaseRef = row.ref || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "purchases");
        setActive(btn);
        title.textContent = "แก้ไขใบสั่งซื้อ";
        renderPurchaseEditForm(row);
        return;
      }

      if (entity === "receiving") {
        editingReceivingIdx = idx;
        const btn = [...menu.children].find(b => b.dataset.screen === "receiving");
        setActive(btn);
        title.textContent = "แก้ไขรายการรับสินค้า";
        renderReceivingEditForm(row);
        return;
      }

      if (entity === "issues") {
        editingIssueNo = row.issueNo || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "issue");
        setActive(btn);
        title.textContent = "แก้ไขรายการเบิกสินค้า";
        renderIssueEditForm(row);
        return;
      }

      alert("รายการนี้ยังไม่รองรับการแก้ไขโดยตรง");
    }

    async function delRow(entity, idx) {
      const labels = {
        users: "ผู้ใช้งาน",
        inventory: "สินค้า",
        vendors: "ผู้จำหน่าย",
        purchases: "ใบสั่งซื้อ",
        receiving: "รายการรับสินค้า",
        issues: "รายการเบิกสินค้า"
      };
      const entityLabel = labels[entity] || entity;
      const confirmed = await customConfirm(`ยืนยันการลบ${entityLabel}รายการนี้ใช่หรือไม่?`);
      if (!confirmed) return;

      if (entity === "users") {
        const row = db.users[idx];
        if (row?.role === "Warehouse Manager") {
          const managerCount = db.users.filter(u => u.role === "Warehouse Manager").length;
          if (managerCount <= 1) {
            customAlert("ต้องมีผู้จัดการคลังอย่างน้อย 1 บัญชี");
            return;
          }
        }
      }
      db[entity].splice(idx, 1);
      persistState();
      
      if (entity === "users") renderUsers();
      else if (entity === "inventory") renderInventory();
      else if (entity === "vendors") renderVendors();
      else if (entity === "purchases") renderPurchases();
      else if (entity === "receiving") renderReceiving();
      else if (entity === "issues") renderIssue();
    }

    async function initializeAppState() {
      hydrateState();
      await ensureTestAdminUser();
      await normalizeUserPasswords();
      try {
        await fetchStateFromBackend();
      } catch (err) {
        // Backend unavailable: continue with local cache.
      }
      updateMenuAccess();
      startSyncLoop();
    }

    initializeAppState();

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") return;
      if (title.textContent !== screenMap[authScreen].title) return;
      const active = document.activeElement;
      if (active?.id === "loginUser" || active?.id === "loginPass") {
        loginUser();
      }
    });

    function customAlert(msg) {
      return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
        const box = document.createElement("div");
        box.className = "card";
        box.style.cssText = "min-width:300px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
        box.innerHTML = `<h3 style="margin-bottom:20px;">${msg}</h3>
                         <button class="btn primary" id="customAlertOk">ตกลง</button>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        document.getElementById("customAlertOk").onclick = () => {
          if (document.body.contains(overlay)) document.body.removeChild(overlay);
          resolve();
        };
      });
    }

    function customConfirm(msg) {
      return new Promise(resolve => {
        const overlay = document.createElement("div");
        overlay.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:9999;display:flex;align-items:center;justify-content:center;";
        const box = document.createElement("div");
        box.className = "card";
        box.style.cssText = "min-width:300px;text-align:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);";
        box.innerHTML = `<h3 style="margin-bottom:20px;">${msg}</h3>
                         <button class="btn success" id="customConfirmYes">ตกลง</button>
                         <button class="btn danger" id="customConfirmNo">ยกเลิก</button>`;
        overlay.appendChild(box);
        document.body.appendChild(overlay);
        
        document.getElementById("customConfirmYes").onclick = () => {
          if (document.body.contains(overlay)) document.body.removeChild(overlay);
          resolve(true);
        };
        document.getElementById("customConfirmNo").onclick = () => {
          if (document.body.contains(overlay)) document.body.removeChild(overlay);
          resolve(false);
        };
      });
    }

    window.alert = function(msg) {
      customAlert(msg);
    };
  