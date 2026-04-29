    const menu = document.getElementById("menu");
    const screen = document.getElementById("screen");
    const title = document.getElementById("screenTitle");
    const topbarActions = document.getElementById("topbarActions");

    screenConfig.forEach(item => {
      if (item.key === settingsScreen) return;
      const b = document.createElement("button");
      b.dataset.screen = item.key;
      b.textContent = `${item.icon} ${item.title}`;
      b.onclick = () => openScreen(item.key, b);
      menu.appendChild(b);
    });

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
        const isSettingsButton = screenKey === settingsScreen;
        const hasAccess = isSettingsButton || hasScreenAccess(screenKey);
        x.disabled = !hasAccess;
        x.style.display = hasAccess ? "block" : "none";
      });
      renderTopbarActions();
    }

    function renderTopbarActions() {
      if (!isAuthenticated()) {
        topbarActions.innerHTML = `<span class="badge">Sync: ${backendBaseUrl}</span>`;
        return;
      }

      const firstLetter = currentUser.username.charAt(0).toUpperCase();

      topbarActions.innerHTML = `
        <span class="badge" style="margin-right: 20px;">Sync: ${backendBaseUrl}</span>
        <div class="profile-dropdown" id="profileDropdown">
          <div class="profile-avatar" onclick="toggleProfileMenu(event)">${firstLetter}</div>
          <div class="profile-menu" id="profileMenu">
            <div class="profile-menu-header">
              <div class="profile-menu-name">${currentUser.username}</div>
              <div class="profile-menu-role">${currentUser.role}</div>
            </div>
            <div class="profile-menu-item" onclick="toggleTheme()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
              สลับโหมดหน้าจอ
            </div>
            <div class="profile-menu-item" onclick="openSettingsScreen()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
              การตั้งค่า
            </div>
            <div class="profile-menu-item logout" onclick="logoutUser()">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
              ออกจากระบบ
            </div>
          </div>
        </div>
      `;
    }

    function toggleProfileMenu(e) {
      e.stopPropagation();
      const menu = document.getElementById("profileMenu");
      if (menu) menu.classList.toggle("show");
    }

    function openSettingsScreen() {
      const menu = document.getElementById("profileMenu");
      if (menu) menu.classList.remove("show");
      openScreen(settingsScreen, null);
    }

    let currentTheme = localStorage.getItem("warehouse_theme") || "dark";
    if (currentTheme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    }

    function toggleTheme() {
      currentTheme = currentTheme === "dark" ? "light" : "dark";
      if (currentTheme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      localStorage.setItem("warehouse_theme", currentTheme);

      const menu = document.getElementById("profileMenu");
      if (menu) menu.classList.remove("show");
    }

    window.addEventListener('click', function (e) {
      const dropdown = document.getElementById("profileDropdown");
      const menu = document.getElementById("profileMenu");
      if (menu && dropdown && !dropdown.contains(e.target)) {
        menu.classList.remove('show');
      }
    });

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
      if (screenKey !== settingsScreen && !isAuthenticated()) {
        alert("กรุณาเข้าสู่ระบบก่อนใช้งาน");
        return;
      }
      if (screenKey !== settingsScreen && !hasScreenAccess(screenKey)) {
        alert("สิทธิ์ไม่เพียงพอสำหรับเมนูนี้");
        return;
      }
      if (screenKey !== settingsScreen) {
        const backendAllowed = await checkScreenAccessWithBackend(screenKey);
        if (!backendAllowed) {
          alert("สิทธิ์ใช้งานไม่ตรงกับระบบกลาง กรุณาติดต่อผู้ดูแล");
          return;
        }
      }
      title.textContent = screenMap[screenKey].title;
      setActive(btn);
      if (screenKey === "settings") renderSettings();
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

    function renderSettings() {
      screen.innerHTML = `
        <div class="card">
          <h3>ตั้งค่าเซิร์ฟเวอร์ซิงก์ (ใช้เหมือนกันทุกเครื่อง)</h3>
          <div class="grid">
            <div><label>Backend URL</label><input id="backendUrlInput" value="${backendBaseUrl}" placeholder="เช่น http://192.168.1.10:4000"></div>
          </div>
          <br>
          <button class="btn" onclick="saveBackendUrl()">บันทึก URL เซิร์ฟเวอร์</button>
        </div>
        <div class="card" style="margin-top: 20px; border: 1px solid var(--danger);">
          <h3 style="color: var(--danger);">⚠️ ล้างข้อมูลในเครื่องนี้</h3>
          <p class="muted" style="margin: 8px 0 16px 0;">ลบข้อมูลทั้งหมดที่จัดเก็บใน LocalStorage ของเครื่องนี้ออก แล้วโหลดข้อมูลเริ่มต้นใหม่<br>ใช้เมื่อข้อมูลในเครื่องไม่ตรงกับระบบ หรือต้องการเริ่มใหม่ทั้งหมด</p>
          <button class="btn danger" onclick="clearLocalData()">🗑️ ล้างข้อมูลในเครื่อง</button>
        </div>
      `;
      updateMenuAccess();
      setAuthMessage(authMessage, authMessageType);
    }

    async function clearLocalData() {
      const confirmed = await customConfirm("ยืนยันการล้างข้อมูลทั้งหมดในเครื่องนี้ใช่หรือไม่?\nข้อมูลที่ยังไม่ได้ sync กับ server จะหายไป");
      if (!confirmed) return;
      localStorage.removeItem(storageKey);
      location.reload();
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
        setAuthMessage("เข้าสู่ระบบไม่สำเร็จ: ชื่อผู้ใช้/รหัสผ่านไม่ถูกต้อง หรือ บัญชีถูกปิดใช้งาน", "error");
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

    function renderDashboard() {
      const username = currentUser ? currentUser.username : 'Peter';
      const totalInventoryValue = db.inventory.reduce((sum, item) => sum + ((Number(item.stock) || 0) * (Number(item.price) || 0)), 0);
      const totalItems = db.inventory.length;
      const lowStockItems = db.inventory.filter(i => i.stock <= i.reorder);
      const lowStockCount = lowStockItems.length;
      const vendorCount = db.vendors.length;

      // Data for Top 5 Stock Items (Bar Chart)
      const sortedInventory = [...db.inventory].sort((a, b) => b.stock - a.stock);
      const top5Items = sortedInventory.slice(0, 5);
      const top5Labels = top5Items.map(i => (i.name || "ไม่มีชื่อ").substring(0, 15) + ((i.name || "").length > 15 ? '...' : ''));
      const top5Data = top5Items.map(i => i.stock);

      // Data for Category (Doughnut Chart)
      const categoryMap = {};
      db.inventory.forEach(i => {
        const cat = i.category || 'อื่นๆ';
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      const categoryLabels = Object.keys(categoryMap);
      const categoryData = Object.values(categoryMap);

      screen.innerHTML = `
        <div class="dashboard-header">
          <h1>ภาพรวมระบบ, ${username}</h1>
          <p>ข้อมูลสรุปการทำงานของคลังสินค้าแบบเรียลไทม์</p>
        </div>

        <div class="kpi-grid">
          <div class="kpi-card">
            <div class="title">มูลค่าคงคลังรวม (Total Value)</div>
            <div class="value">฿${totalInventoryValue.toLocaleString()}</div>
            <div class="change up"><span class="change-badge">อัปเดตล่าสุด</span></div>
          </div>
          <div class="kpi-card">
            <div class="title">จำนวนรายการสินค้า (Total Items)</div>
            <div class="value">${totalItems}</div>
            <div class="change up"><span class="change-badge">Active</span></div>
          </div>
          <div class="kpi-card">
            <div class="title">สินค้าถึงจุดสั่งซื้อ (Low Stock)</div>
            <div class="value" style="color: ${lowStockCount > 0 ? 'var(--danger)' : 'inherit'};">${lowStockCount}</div>
            <div class="change ${lowStockCount > 0 ? 'down' : 'up'}"><span class="change-badge" style="${lowStockCount > 0 ? 'background:rgba(214,69,80,0.2); color:var(--danger);' : ''}">${lowStockCount > 0 ? 'ควรสั่งซื้อเพิ่ม' : 'ปกติ'}</span></div>
          </div>
          <div class="kpi-card">
            <div class="title">ผู้จำหน่าย (Active Vendors)</div>
            <div class="value">${vendorCount}</div>
            <div class="change up"><span class="change-badge">คู่ค้าทั้งหมด</span></div>
          </div>
        </div>

        <div class="charts-grid">
          <div class="chart-card">
            <h3>สินค้าคงคลังสูงสุด 5 อันดับแรก</h3>
            <div style="position: relative; height: 250px; width: 100%;">
              <canvas id="barChart"></canvas>
            </div>
          </div>
          <div class="chart-card">
            <h3>สัดส่วนรายการสินค้าตามหมวดหมู่</h3>
            <div style="position: relative; height: 250px; width: 100%;">
              <canvas id="doughnutChart"></canvas>
            </div>
          </div>
        </div>

        <div class="bottom-grid">
          <div class="chart-card table-container">
            <h3>รายการสินค้าควรสั่งซื้อเพิ่ม (Low Stock)</h3>
            <table style="width:100%; font-size:13px;">
              <thead>
                <tr>
                  <th>รหัส</th>
                  <th>ชื่อสินค้า</th>
                  <th>คงเหลือ</th>
                  <th>ขั้นต่ำ</th>
                </tr>
              </thead>
              <tbody>
                ${lowStockItems.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">ไม่มีสินค้าใกล้หมด</td></tr>' :
          lowStockItems.map(item => `
                  <tr>
                    <td>${item.code}</td>
                    <td>${item.name}</td>
                    <td style="color: var(--danger); font-weight: bold;">${item.stock}</td>
                    <td>${item.reorder}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
          <div class="chart-card table-container">
            <h3>ประวัติการเบิกสินค้าล่าสุด</h3>
            <table style="width:100%; font-size:13px;">
              <thead>
                <tr>
                  <th>วันที่</th>
                  <th>เลขที่อ้างอิง</th>
                  <th>สินค้า</th>
                  <th>จำนวน</th>
                </tr>
              </thead>
              <tbody>
                ${db.issues.length === 0 ? '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--muted);">ยังไม่มีประวัติการเบิก</td></tr>' :
          [...db.issues].reverse().slice(0, 5).map(issue => `
                  <tr>
                    <td>${issue.date}</td>
                    <td>${issue.issueNo || '-'}</td>
                    <td>${issue.item}</td>
                    <td>${issue.qty}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;

      setTimeout(() => {
        Chart.defaults.font.family = "'Inter', 'Prompt', sans-serif";
        const barCtx = document.getElementById('barChart');
        if (barCtx) {
          new Chart(barCtx, {
            type: 'bar',
            data: {
              labels: top5Labels,
              datasets: [{
                label: 'จำนวนคงเหลือ',
                data: top5Data,
                backgroundColor: 'rgba(79, 140, 255, 0.7)',
                borderColor: '#4f8cff',
                borderWidth: 1,
                borderRadius: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: { legend: { display: false } },
              scales: {
                y: { beginAtZero: true, grid: { color: '#26314a' }, ticks: { color: '#9cb1cf' } },
                x: { grid: { display: false }, ticks: { color: '#9cb1cf' } }
              }
            }
          });
        }

        const doughnutCtx = document.getElementById('doughnutChart');
        if (doughnutCtx) {
          const baseColors = ['#4f8cff', '#1fa971', '#ef9d2e', '#d64550', '#9cb1cf', '#35518a'];
          const bgColors = categoryLabels.map((_, i) => baseColors[i % baseColors.length]);

          new Chart(doughnutCtx, {
            type: 'doughnut',
            data: {
              labels: categoryLabels,
              datasets: [{
                data: categoryData,
                backgroundColor: bgColors,
                borderWidth: 0,
                hoverOffset: 4
              }]
            },
            options: {
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'right', labels: { color: '#9cb1cf', font: { size: 12 }, padding: 15 } }
              },
              cutout: '70%'
            }
          });
        }
      }, 0);
    }

    function logoutUser() {
      currentUser = null;
      authMessage = "";
      authMessageType = "";

      const splashPass = document.getElementById("splashPass");
      if (splashPass) splashPass.value = "";

      document.getElementById("login-splash").style.display = "flex";
      document.getElementById("app-wrapper").style.display = "none";

      updateMenuAccess();
    }



    function filterTable(input) {
      const filter = input.value.toLowerCase();
      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        let text = trs[i].textContent.toLowerCase();
        if (text.includes(filter)) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    function renderUsers() {
      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center;">
          <div><input type="text" placeholder="ค้นหาชื่อผู้ใช้..." style="width: 250px; background:var(--panel-2);" oninput="filterTable(this)"></div>
          <button class="btn primary" onclick="renderUserEditForm()">+ เพิ่มผู้ใช้งานใหม่</button>
        </div>
        ${renderTable("users", ["username", "role", "status"])}
      `;
    }

    function renderUserEditForm(user) {
      const selected = user || {};
      editingUsername = selected.username || null;
      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>${editingUsername ? "แก้ไขข้อมูลผู้ใช้งาน" : "สร้างผู้ใช้งานใหม่"}</h3>
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label>ชื่อผู้ใช้</label><input id="euName" value="${selected.username || ""}" ${editingUsername ? "readonly" : ""}></div>
            <div><label>รหัสผ่าน</label><input id="euPass" type="password"></div>
            <div><label>สิทธิ์</label><select id="euRole"><option>Warehouse Manager</option><option>Warehouse Staff</option><option>Purchasing Officer</option><option>Employee</option><option>Accountant</option></select></div>
            <div><label>สถานะ</label><select id="euStatus"><option>Active</option><option>Suspended</option></select></div>
          </div>
          <br>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:10px;">
            <button class="btn primary" onclick="saveUserEdit()">${editingUsername ? "อัปเดตข้อมูล" : "เพิ่มผู้ใช้งาน"}</button>
            <button class="btn danger" onclick="cancelUserEdit()">ยกเลิก</button>
          </div>
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

      const engRegex = /^[A-Za-z0-9_.-]+$/;
      if (!engRegex.test(username)) {
        return alert("ชื่อผู้ใช้ต้องเป็นภาษาอังกฤษ ตัวเลข หรือเครื่องหมาย (_ . -) เท่านั้น");
      }

      const idx = db.users.findIndex(x => x.username === editingUsername || x.username === username);
      if (idx < 0) {
        if (!plainPassword) return alert("ผู้ใช้ใหม่ต้องกำหนดรหัสผ่าน");
        db.users.push({ username, password: `sha256:${await hashPassword(plainPassword)}`, role, status });
      } else {
        db.users[idx] = { ...db.users[idx], username, role, status };
        if (plainPassword) db.users[idx].password = `sha256:${await hashPassword(plainPassword)}`;
      }
      persistState();
      editingUsername = null;
      renderUsers();
    }

    function cancelUserEdit() {
      editingUsername = null;
      renderUsers();
    }

    function filterInventory() {
      const searchInput = document.getElementById("invSearch")?.value.toLowerCase() || "";
      const categoryFilter = document.getElementById("invCategory")?.value || "";
      const statusFilter = document.getElementById("invStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const tds = trs[i].getElementsByTagName("td");
        if (!tds || tds.length < 8) continue; // Skip header

        const textContent = trs[i].textContent.toLowerCase();
        const category = trs[i].dataset.category || tds[2].textContent;
        const stock = Number(tds[3].textContent);
        const reorder = Number(tds[4].textContent);
        const isLowStock = stock <= reorder;
        const mappedStatus = isLowStock ? "ควรสั่งซื้อ" : "ปกติ";

        const matchSearch = textContent.includes(searchInput);
        const matchCategory = categoryFilter === "" || category === categoryFilter;
        const matchStatus = statusFilter === "" || mappedStatus === statusFilter;

        if (matchSearch && matchCategory && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    function renderInventory() {
      const categories = [...new Set(db.inventory.map(i => i.category))];
      const svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;

      const trs = db.inventory.map((item, idx) => {
        const isLowStock = item.stock <= item.reorder;
        const statusHtml = isLowStock ?
          `<span style="color:var(--danger); font-weight:bold;">⚠️ ควรสั่งซื้อ</span>` :
          `<span style="color:var(--ok); font-weight:bold;">🟢 ปกติ</span>`;

        return `
          <tr data-category="${item.category}">
            <td>${item.code}</td>
            <td>${item.name}</td>
            <td>${item.category}</td>
            <td>${item.stock}</td>
            <td>${item.reorder}</td>
            <td>${item.price}</td>
            <td>${statusHtml}</td>
            <td>
              <span style="cursor:pointer; margin-right:15px; font-size:18px;" onclick="editRow('inventory', ${idx})" title="แก้ไข">✏️</span>
              <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="delRow('inventory', ${idx})" title="ลบ">🗑️</span>
            </td>
          </tr>
        `;
      }).join("");

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center;">
            <input id="invSearch" type="text" placeholder="ค้นหาสินค้า..." style="width: 250px; background:var(--panel-2);" oninput="filterInventory()">
            
            <div style="position:relative;">
              ${svgIcon}
              <select id="invCategory" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterInventory()">
                <option value="">หมวดหมู่สินค้าทั้งหมด</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div style="position:relative;">
              ${svgIcon}
              <select id="invStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterInventory()">
                <option value="">สถานะสินค้าทั้งหมด</option>
                <option value="ปกติ">🟢 ปกติ</option>
                <option value="ควรสั่งซื้อ">⚠️ ควรสั่งซื้อ (Low Stock)</option>
              </select>
            </div>
          </div>
          <button class="btn primary" onclick="renderInventoryEditForm()">+ เพิ่มสินค้าใหม่</button>
        </div>
        <div class="card table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align:left;">รหัส</th>
                <th style="text-align:left;">ชื่อสินค้า</th>
                <th style="text-align:left;">หมวดหมู่</th>
                <th style="text-align:left;">คงคลัง</th>
                <th style="text-align:left;">ขั้นต่ำ</th>
                <th style="text-align:left;">ราคา</th>
                <th style="text-align:left;">สถานะ</th>
                <th style="text-align:left;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${trs}
            </tbody>
          </table>
        </div>
      `;
    }

    function renderInventoryEditForm(item) {
      const selected = item || {};
      editingInventoryCode = selected.code || null;
      const totalValue = Number(selected.stock || 0) * Number(selected.price || 0);
      const vendorOptions = db.vendors.filter(v => v.status === "Active").map(v => `<option value="${v.name}" ${v.name === selected.supplierItem ? "selected" : ""}>${v.name}</option>`).join("");
      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>${editingInventoryCode ? "แก้ไขข้อมูลสินค้า" : "เพิ่มสินค้าใหม่"}</h3>
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label>รหัสสินค้า</label><input id="eCode" value="${selected.code || ""}" ${editingInventoryCode ? "readonly" : ""}></div>
            <div><label>ชื่อสินค้า</label><input id="eName" value="${selected.name || ""}"></div>
            <div><label>หมวดหมู่สินค้า</label><input id="eCategory" value="${selected.category || ""}"></div>
            <div><label>จำนวนคงคลัง</label><input id="eStock" type="number" min="0" value="${selected.stock ?? 0}"></div>
            <div><label>จำนวนคงคลังขั้นต่ำ</label><input id="eReorder" type="number" min="0" value="${selected.reorder ?? 0}"></div>
            <div><label>ราคาปัจจุบัน</label><input id="ePrice" type="number" min="0" value="${selected.price ?? 0}"></div>
            <div style="grid-column: span 2;">
              <label>สินค้าจากตัวแทนจำหน่าย</label>
              <select id="eSupplierItem" style="width:100%; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:8px; margin-top:5px;">
                <option value="">-- เลือกตัวแทนจำหน่าย --</option>
                ${vendorOptions}
              </select>
            </div>
          </div>
          <br>
          <div><label>รายละเอียดสินค้า</label><textarea id="eDetails" style="min-height:60px;">${selected.details || ""}</textarea></div>
          ${editingInventoryCode ? `<div class="muted" style="margin-top:10px;">ราคารวมปัจจุบัน: <strong>${totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} บาท</strong></div>` : ""}
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button class="btn primary" onclick="saveInventoryEdit()">${editingInventoryCode ? "อัปเดตข้อมูล" : "เพิ่มสินค้า"}</button>
            <button class="btn danger" onclick="cancelInventoryEdit()">ยกเลิก</button>
          </div>
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

    function filterVendors() {
      const searchInput = document.getElementById("searchVendor")?.value.toLowerCase() || "";
      const statusFilter = document.getElementById("filterVendorStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const textContent = trs[i].textContent.toLowerCase();
        const rowStatus = trs[i].dataset.status || "";

        const matchSearch = textContent.includes(searchInput);
        const matchStatus = statusFilter === "" || rowStatus === statusFilter;

        if (matchSearch && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    let editingVendorCode = null;

    function renderVendors() {
      const trs = db.vendors.map((v, idx) => {
        const statusHtml = v.status === "Active"
          ? `<span style="color:var(--ok);">✅ ใช้งานปกติ</span>`
          : `<span style="color:var(--danger);">❌ ระงับการติดต่อ</span>`;
        return `
          <tr data-status="${v.status || ""}">
            <td>${v.code || ""}</td>
            <td>${v.name || ""}</td>
            <td>${v.contactName || ""}</td>
            <td>${v.phone || ""}</td>
            <td>${statusHtml}</td>
            <td>
              <span style="cursor:pointer; margin-right:15px; font-size:18px;" onclick="editRow('vendors', ${idx})" title="แก้ไข">✏️</span>
              <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="delRow('vendors', ${idx})" title="ลบ">🗑️</span>
            </td>
          </tr>
        `;
      }).join("");

      const svgFilterIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
      const svgSearchIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center;">
            <div style="position:relative;">
              ${svgSearchIcon}
              <input type="text" id="searchVendor" placeholder="ค้นหาตัวแทนจำหน่าย..." style="width: 250px; padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; outline:none;" oninput="filterVendors()">
            </div>
            <div style="position:relative;">
              ${svgFilterIcon}
              <select id="filterVendorStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterVendors()">
                <option value="">สถานะทั้งหมด</option>
                <option value="Active">✅ ใช้งานปกติ</option>
                <option value="Suspended">❌ ระงับการติดต่อ</option>
              </select>
            </div>
          </div>
          <button class="btn primary" onclick="renderVendorEditForm()">+ เพิ่มตัวแทนจำหน่าย</button>
        </div>
        <div class="card">
          <table style="width:100%; text-align:left;">
            <tr>
              <th>รหัสตัวแทน</th>
              <th>ชื่อบริษัท/ร้านค้า</th>
              <th>ชื่อผู้ติดต่อ</th>
              <th>เบอร์โทรศัพท์</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
            ${trs}
          </table>
        </div>
      `;
    }

    function renderVendorEditForm(vendor) {
      const selected = vendor || {};
      editingVendorCode = selected.code || null;
      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>${editingVendorCode ? "แก้ไขข้อมูลตัวแทนจำหน่าย" : "เพิ่มตัวแทนจำหน่ายใหม่"}</h3>
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label>รหัสตัวแทน</label><input id="evCode" value="${selected.code || ""}" ${editingVendorCode ? "readonly" : ""}></div>
            <div><label>ชื่อบริษัท/ร้านค้า</label><input id="evName" value="${selected.name || ""}"></div>
            <div><label>ชื่อผู้ติดต่อ</label><input id="evContactName" value="${selected.contactName || ""}"></div>
            <div><label>เบอร์โทรศัพท์</label><input id="evPhone" value="${selected.phone || ""}"></div>
            <div><label>สถานะ</label>
              <select id="evStatus" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border); background:var(--panel-2); color:var(--text);">
                <option value="Active" ${selected.status !== "Suspended" ? "selected" : ""}>ใช้งานปกติ</option>
                <option value="Suspended" ${selected.status === "Suspended" ? "selected" : ""}>ระงับการติดต่อ</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button class="btn primary" onclick="saveVendorEdit()">${editingVendorCode ? "อัปเดตข้อมูล" : "เพิ่มตัวแทนจำหน่าย"}</button>
            <button class="btn danger" onclick="cancelVendorEdit()">ยกเลิก</button>
          </div>
        </div>
      `;
    }

    function saveVendorEdit() {
      const code = document.getElementById("evCode").value.trim();
      if (!code) return alert("ต้องระบุรหัสตัวแทน");
      const obj = {
        code,
        name: document.getElementById("evName").value.trim(),
        contactName: document.getElementById("evContactName").value.trim(),
        phone: document.getElementById("evPhone").value.trim(),
        status: document.getElementById("evStatus").value
      };
      const idx = db.vendors.findIndex(x => x.code === editingVendorCode || x.code === code);
      if (idx < 0) {
        db.vendors.push(obj);
      } else {
        db.vendors[idx] = obj;
      }
      persistState();
      editingVendorCode = null;
      renderVendors();
    }

    function cancelVendorEdit() {
      editingVendorCode = null;
      renderVendors();
    }

    function filterPurchases() {
      const searchInput = document.getElementById("searchPurchase")?.value.toLowerCase() || "";
      const statusFilter = document.getElementById("filterPurchaseStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const textContent = trs[i].textContent.toLowerCase();
        const rowStatus = trs[i].dataset.status || "";

        const matchSearch = textContent.includes(searchInput);
        const matchStatus = statusFilter === "" || rowStatus === statusFilter;

        if (matchSearch && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    function renderPurchases() {
      const trs = db.purchases.map((p, idx) => {
        let statusHtml = "";
        if (p.status === "เสร็จสิ้น" || p.status === "จัดส่งแล้ว") statusHtml = `<span style="color:var(--ok); font-weight:bold;">✅ จัดส่งแล้ว</span>`;
        else if (p.status === "กำลังดำเนินการ") statusHtml = `<span style="color:#ef9d2e; font-weight:bold;">⏳ กำลังดำเนินการ</span>`;
        else if (p.status === "ยกเลิก" || p.status === "สินค้าถูกยกเลิก") statusHtml = `<span style="color:var(--danger); font-weight:bold;">❌ สินค้าถูกยกเลิก</span>`;
        else statusHtml = p.status || "";

        const itemCount = p.items ? p.items.length : 0;
        const totalAmount = p.items ? p.items.reduce((sum, itm) => sum + (Number(itm.qty || 0) * Number(itm.cost || 0)), 0) : 0;

        return `
          <tr data-status="${p.status || ""}">
            <td>${p.ref || ""}</td>
            <td>${p.date || ""}</td>
            <td>${p.vendor || "-"}</td>
            <td>${itemCount} รายการ</td>
            <td>${totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${statusHtml}</td>
            <td>
              <span style="cursor:pointer; margin-right:15px; font-size:18px;" onclick="editRow('purchases', ${idx})" title="แก้ไข">✏️</span>
              <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="delRow('purchases', ${idx})" title="ลบ">🗑️</span>
            </td>
          </tr>
        `;
      }).join("");

      const svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center;">
            <input type="text" id="searchPurchase" placeholder="ค้นหาใบสั่งซื้อ..." style="width: 250px; background:var(--panel-2);" oninput="filterPurchases()">
            <div style="position:relative;">
              ${svgIcon}
              <select id="filterPurchaseStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterPurchases()">
                <option value="">สถานะทั้งหมด</option>
                <option value="เสร็จสิ้น">✅ จัดส่งแล้ว (เสร็จสิ้น)</option>
                <option value="กำลังดำเนินการ">⏳ กำลังดำเนินการ</option>
                <option value="ยกเลิก">❌ ยกเลิก</option>
              </select>
            </div>
          </div>
          <button class="btn primary" onclick="renderPurchaseEditForm()">+ สร้างใบสั่งซื้อ</button>
        </div>
        <div class="card">
          <table style="width:100%; text-align:left;">
            <tr>
              <th>เลขที่อ้างอิง</th>
              <th>วันที่</th>
              <th>ตัวแทนจำหน่าย</th>
              <th>จำนวนรายการ</th>
              <th>ราคารวม</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
            ${trs}
          </table>
        </div>
      `;
    }

    function renderPurchaseEditForm(purchase) {
      const selected = purchase || {};
      editingPurchaseRef = selected.ref || null;
      const items = selected.items && selected.items.length > 0 ? selected.items : [{}];
      const totalAmount = items.reduce((sum, itm) => sum + (Number(itm.qty || 0) * Number(itm.cost || 0)), 0);
      const totalPrice = totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const currentVendor = selected.vendor || (selected.item ? selected.item + " (บริษัทผู้ผลิต)" : "");
      const vendorOptions = db.vendors.filter(v => v.status === "Active").map(v => `<option value="${v.name}" ${v.name === currentVendor ? "selected" : ""}>${v.name}</option>`).join("");

      const poRefValue = selected.ref || "";

      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>${editingPurchaseRef ? "รายละเอียดใบสั่งซื้อ" : "สร้างใบสั่งซื้อใหม่"}</h3>
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div>
              <label>ตัวแทนจำหน่าย</label>
              <select id="epVendor" onchange="updateVendorPhone(this.value)" style="width:100%; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:5px; margin-top:5px;">
                <option value="">-- เลือกตัวแทนจำหน่าย --</option>
                ${vendorOptions}
              </select>
            </div>
            <div><label>เลขที่เอกสาร PO</label><input id="epRef" value="${poRefValue}" ${editingPurchaseRef ? "readonly" : ""} style="margin-top:5px;"></div>
            <div><label>วันที่สั่งซื้อ</label><input type="date" id="epDate" onclick="this.showPicker()" value="${selected.date || new Date().toISOString().slice(0, 10)}"></div>
            <div><label>เบอร์ติดต่อ</label><input id="epPhone" value="${selected.phone || ""}" placeholder="ระบุเบอร์ติดต่อ"></div>
          </div>
          
          <div style="margin-top:20px;">
            <label>รายการสินค้า</label>
            <div style="background:var(--panel-2); margin-top:5px; border-radius:4px; padding:10px; border:1px solid var(--border); overflow-x:auto;">
              <table style="width:100%; text-align:center;">
                <thead>
                  <tr>
                    <th style="text-align:left; width:50px;">รายการ</th>
                    <th style="text-align:left; width:120px;">รหัสสินค้า</th>
                    <th style="text-align:left;">ชื่อสินค้า</th>
                    <th style="width:100px;">ราคา/หน่วย</th>
                    <th style="width:100px;">จำนวนที่สั่ง</th>
                    <th style="width:50px;">จัดการ</th>
                  </tr>
                </thead>
                <tbody id="poItemsBody">
                  ${items.map((itm, i) => {
        const invOptions = db.inventory.map(inv => `<option value="${inv.code}" data-price="${inv.price}" data-name="${inv.name}" ${inv.code === itm.code ? "selected" : ""}>${inv.name}</option>`).join("");
        return `
                    <tr class="po-item-row">
                      <td style="text-align:left;" class="po-item-index">${i + 1}.</td>
                      <td style="text-align:left;" class="po-item-code">${itm.code || "-"}</td>
                      <td style="text-align:left;">
                        <select class="po-item-select" onchange="poItemChanged(this)" style="width:100%; max-width:250px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:5px;">
                          <option value="">-- เลือกสินค้า --</option>
                          ${invOptions}
                        </select>
                      </td>
                      <td>
                        <input type="number" class="po-item-cost" value="${itm.cost ?? 0}" min="0" oninput="updatePOTotal()" style="width:80px; text-align:center;">
                      </td>
                      <td>
                        <input type="number" class="po-item-qty" value="${itm.qty ?? 0}" min="0" oninput="updatePOTotal()" style="width:80px; text-align:center;">
                      </td>
                      <td>
                        <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="removePurchaseItemRow(this)" title="ลบรายการ">🗑️</span>
                      </td>
                    </tr>
                    `;
      }).join("")}
                </tbody>
              </table>
              <button class="btn secondary" style="margin-top:10px; font-size:12px;" onclick="addPurchaseItemRow()">+ เพิ่มรายการสินค้า</button>
            </div>
          </div>

          <div style="margin-top:20px;">
            <label>ราคารวม: <strong style="color:var(--primary); font-size:20px;" id="epTotalPrice">${totalPrice} บาท</strong></label>
          </div>

          <div style="margin-top:20px; display:flex; flex-wrap:wrap; gap:20px;">
            <div style="flex:1; min-width:200px;">
              <label>สถานะ</label>
              <select id="epStatus" style="width:100%; margin-top:5px;">
                <option value="กำลังดำเนินการ" ${selected.status === "กำลังดำเนินการ" || !selected.status ? "selected" : ""}>กำลังดำเนินการ</option>
                <option value="เสร็จสิ้น" ${selected.status === "เสร็จสิ้น" ? "selected" : ""}>เสร็จสิ้น</option>
                <option value="ยกเลิก" ${selected.status === "ยกเลิก" ? "selected" : ""}>ยกเลิก</option>
              </select>
            </div>
            <div style="flex:2; min-width:200px;">
              <label>หมายเหตุ</label>
              <textarea id="epRemarks" placeholder="สำหรับบันทึกปัญหา" style="min-height:40px; width:100%; margin-top:5px;">${selected.remarks || ""}</textarea>
            </div>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            <button class="btn primary" onclick="savePurchaseEdit()">บันทึก</button>
            <button class="btn danger" onclick="cancelPurchaseEdit()">ยกเลิก</button>
          </div>
        </div>
      `;
    }

    window.updateVendorPhone = function (vendorName) {
      const vendor = db.vendors.find(v => v.name === vendorName);
      if (vendor) {
        const phoneInput = document.getElementById("epPhone");
        if (phoneInput) phoneInput.value = vendor.phone || "";
      }
    };

    window.poItemChanged = function (selectEl) {
      const row = selectEl.closest("tr");
      const codeTd = row.querySelector(".po-item-code");
      const costInput = row.querySelector(".po-item-cost");
      const qtyInput = row.querySelector(".po-item-qty");

      const option = selectEl.options[selectEl.selectedIndex];
      if (option.value) {
        codeTd.textContent = option.value;
        costInput.value = option.dataset.price || 0;
        if (Number(qtyInput.value) === 0) qtyInput.value = 1;
      } else {
        codeTd.textContent = "-";
        costInput.value = 0;
        qtyInput.value = 0;
      }
      updatePOTotal();
    };

    window.addPurchaseItemRow = function () {
      const tbody = document.getElementById("poItemsBody");
      const rowCount = tbody.querySelectorAll("tr").length;

      const invOptions = db.inventory.map(inv => `<option value="${inv.code}" data-price="${inv.price}" data-name="${inv.name}">${inv.name}</option>`).join("");

      const tr = document.createElement("tr");
      tr.className = "po-item-row";
      tr.innerHTML = `
        <td style="text-align:left;" class="po-item-index">${rowCount + 1}.</td>
        <td style="text-align:left;" class="po-item-code">-</td>
        <td style="text-align:left;">
          <select class="po-item-select" onchange="poItemChanged(this)" style="width:100%; max-width:250px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; padding:5px;">
            <option value="">-- เลือกสินค้า --</option>
            ${invOptions}
          </select>
        </td>
        <td>
          <input type="number" class="po-item-cost" value="0" min="0" oninput="updatePOTotal()" style="width:80px; text-align:center;">
        </td>
        <td>
          <input type="number" class="po-item-qty" value="0" min="0" oninput="updatePOTotal()" style="width:80px; text-align:center;">
        </td>
        <td>
          <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="removePurchaseItemRow(this)" title="ลบรายการ">🗑️</span>
        </td>
      `;
      tbody.appendChild(tr);
      updatePOTotal();
    };

    window.removePurchaseItemRow = function (btn) {
      const tbody = document.getElementById("poItemsBody");
      if (tbody.querySelectorAll("tr").length <= 1) {
        return alert("ต้องมีอย่างน้อย 1 รายการ");
      }
      btn.closest("tr").remove();
      // Update indices
      const rows = tbody.querySelectorAll("tr");
      rows.forEach((row, i) => {
        row.querySelector(".po-item-index").textContent = (i + 1) + ".";
      });
      updatePOTotal();
    };

    window.updatePOTotal = function () {
      const rows = document.querySelectorAll(".po-item-row");
      let total = 0;
      rows.forEach(row => {
        const qty = Number(row.querySelector(".po-item-qty").value || 0);
        const cost = Number(row.querySelector(".po-item-cost").value || 0);
        total += qty * cost;
      });
      const el = document.getElementById("epTotalPrice");
      if (el) el.textContent = total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " บาท";
    };

    function savePurchaseEdit() {
      const ref = document.getElementById("epRef").value.trim();
      if (!ref) return alert("ต้องระบุเลขที่ PO");

      const rows = document.querySelectorAll(".po-item-row");
      const items = [];
      let hasError = false;
      rows.forEach(row => {
        const selectEl = row.querySelector(".po-item-select");
        const code = selectEl.value;
        if (!code) {
          hasError = true;
          return;
        }
        const option = selectEl.options[selectEl.selectedIndex];
        items.push({
          code: code,
          name: option.dataset.name,
          qty: Math.max(0, Number(row.querySelector(".po-item-qty").value || 0)),
          cost: Math.max(0, Number(row.querySelector(".po-item-cost").value || 0))
        });
      });

      if (hasError) return alert("กรุณาเลือกสินค้าให้ครบทุกรายการ หรือลบรายการที่ว่างออก");
      if (items.length === 0) return alert("ต้องมีอย่างน้อย 1 รายการ");

      const obj = {
        ref,
        date: document.getElementById("epDate").value,
        vendor: document.getElementById("epVendor").value,
        phone: document.getElementById("epPhone").value,
        items: items,
        status: document.getElementById("epStatus").value,
        remarks: document.getElementById("epRemarks").value
      };
      const idx = db.purchases.findIndex(x => x.ref === editingPurchaseRef || x.ref === ref);
      if (idx < 0) {
        db.purchases.push(obj);
      } else {
        db.purchases[idx] = obj;
      }
      persistState();
      editingPurchaseRef = null;
      renderPurchases();
    }

    function cancelPurchaseEdit() {
      editingPurchaseRef = null;
      renderPurchases();
    }

    function cancelPurchaseEdit() {
      editingPurchaseRef = null;
      renderPurchases();
    }

    function filterReceiving() {
      const searchInput = document.getElementById("searchReceiving")?.value.toLowerCase() || "";
      const statusFilter = document.getElementById("filterReceivingStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const textContent = trs[i].textContent.toLowerCase();
        const rowStatus = trs[i].dataset.status || "";

        const matchSearch = textContent.includes(searchInput);
        const matchStatus = statusFilter === "" || rowStatus === statusFilter;

        if (matchSearch && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    async function delRowReceiving(idx) {
      const confirmed = await customConfirm('ยืนยันการลบรายการรับสินค้านี้ใช่หรือไม่?');
      if (!confirmed) return;
      db.purchases.splice(idx, 1);
      persistState();
      renderReceiving();
    }

    function renderReceiving() {
      const trs = db.purchases.map((p, idx) => {
        let statusHtml = "";
        let mappedStatus = "";
        if (p.status === "เสร็จสิ้น" || p.status === "จัดส่งแล้ว") {
          mappedStatus = "รับเรียบร้อยแล้ว";
          statusHtml = `<span style="color:var(--ok); font-weight:bold;">🟢 จัดส่งเรียบร้อย</span>`;
        } else if (p.status === "ยกเลิก" || p.status === "สินค้าถูกยกเลิก") {
          mappedStatus = "พบปัญหา/ไม่ครบ";
          statusHtml = `<span style="color:var(--danger); font-weight:bold;">❌ ไม่ครบ/มีปัญหา</span>`;
        } else {
          mappedStatus = "รอดำเนินการ";
          statusHtml = `<span style="color:#ef9d2e; font-weight:bold;">⏳ รอดำเนินการ</span>`;
        }

        const totalAmount = p.items ? p.items.reduce((sum, itm) => sum + (Number(itm.qty || 0) * Number(itm.cost || 0)), 0) : 0;
        const totalPrice = totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        // Mock delivery date
        const deliveryDate = p.date;

        return `
          <tr data-status="${mappedStatus}">
            <td>${p.date || ""}</td>
            <td><a href="#" onclick="viewReceivingDetails(${idx}); return false;" style="color:var(--accent); font-weight:bold; text-decoration:none;">${p.ref || ""}</a></td>
            <td><a href="#" onclick="viewReceivingDetails(${idx}); return false;" style="color:inherit; text-decoration:none; border-bottom:1px dashed var(--muted);">${p.vendor || "-"}</a></td>
            <td>${p.receiveDate || "-"}</td>
            <td>${statusHtml}</td>
            <td>${totalPrice}</td>
            <td>
              <span style="cursor:pointer; color:var(--danger); font-size:18px; margin-right:15px;" onclick="delRowReceiving(${idx})" title="ลบ">🗑️</span>
              <span style="cursor:pointer; color:var(--accent); font-size:18px;" onclick="receiveGoods(${idx})" title="รับสินค้า">📥</span>
            </td>
          </tr>
        `;
      }).join("");

      const svgFilterIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
      const svgSearchIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center;">
            <div style="position:relative;">
              ${svgSearchIcon}
              <input type="text" id="searchReceiving" placeholder="ค้นหาชื่อบริษัท หรือ รหัส PO" style="width: 250px; padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; outline:none;" oninput="filterReceiving()" maxlength="20">
            </div>
            <div style="position:relative;">
              ${svgFilterIcon}
              <select id="filterReceivingStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterReceiving()">
                <option value="">สถานะสินค้าทั้งหมด</option>
                <option value="รอดำเนินการ">⏳ รอดำเนินการ</option>
                <option value="รับเรียบร้อยแล้ว">🟢 รับเรียบร้อยแล้ว</option>
                <option value="พบปัญหา/ไม่ครบ">❌ พบปัญหา/ไม่ครบ</option>
              </select>
            </div>
          </div>
        </div>
        <div class="table-container">
          <table style="width: 100%;">
            <thead>
              <tr>
                <th style="text-align:left;">วันที่สั่ง</th>
                <th style="text-align:left;">รหัส PO</th>
                <th style="text-align:left;">ตัวแทนจำหน่าย</th>
                <th style="text-align:left;">วันที่รับสินค้า</th>
                <th style="text-align:left;">สถานะ</th>
                <th style="text-align:left;">ราคารวม</th>
                <th style="text-align:left;">จัดการ</th>
              </tr>
            </thead>
            <tbody>
              ${trs}
            </tbody>
          </table>
        </div>
      `;
    }

    function viewReceivingDetails(poIdx) {
      renderReceivingEditForm(poIdx, true);
    }

    function receiveGoods(poIdx) {
      renderReceivingEditForm(poIdx, false);
    }

    function renderReceivingEditForm(poIdx, isReadOnly) {
      const po = db.purchases[poIdx];
      if (!po) return;

      editingReceivingIdx = poIdx; // track which PO we are working with

      const grNo = "GR-" + new Date().getFullYear() + "-" + String(Math.floor(Math.random() * 10000)).padStart(4, "0");

      const items = po.items && po.items.length > 0 ? po.items : [{}];
      const totalAmount = items.reduce((sum, itm) => sum + (Number(itm.qty || 0) * Number(itm.cost || 0)), 0);
      const totalPrice = totalAmount.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      const mockVendorName = po.vendor || "-";
      const mockAddress = po.address || "ไม่ระบุที่อยู่ / ไม่มีอีเมลติดต่อในระบบ";
      const mockPhone = po.phone || "-";

      const tbodyHtml = items.map((itm, i) => {
        const orderQty = itm.qty || 0;
        const pricePerUnit = itm.cost || 0;
        return `
          <tr>
            <td style="text-align:left;">${i + 1}.</td>
            <td style="text-align:left;">${itm.code || "-"}</td>
            <td style="text-align:left;">${itm.name || "-"}</td>
            <td>${Number(pricePerUnit).toLocaleString()}</td>
            <td>${orderQty}</td>
            <td>
              <input type="number" class="r-recv-qty" data-price="${pricePerUnit}" data-order-qty="${orderQty}" value="${orderQty}" min="0" 
                style="width:80px; text-align:center;"
                oninput="updateRecvTotal()" ${isReadOnly ? 'disabled' : ''}>
            </td>
          </tr>
        `;
      }).join("");

      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>รายละเอียดการตรวจรับสินค้า</h3>
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label>ชื่อผู้จำหน่าย / ผู้ผลิต</label><input value="${mockVendorName}" readonly></div>
            <div><label>รหัส PO</label><input id="rPO" value="${po.ref}" readonly></div>
            <div><label>รหัส GR</label><input id="rGR" value="${grNo}" readonly></div>
            <div><label>วันที่รับสินค้า</label><input type="date" id="rDate" value="${po.receiveDate || new Date().toISOString().slice(0, 10)}" ${isReadOnly ? 'disabled' : ''} onclick="this.showPicker()"></div>
            <div style="grid-column: span 2;"><label>เบอร์ติดต่อ</label><input value="${mockPhone}" readonly></div>
          </div>
          
          <div style="margin-top:20px;">
            <label>รายการสินค้า</label>
            <div style="background:var(--panel-2); margin-top:5px; border-radius:4px; padding:10px; border:1px solid var(--border); overflow-x:auto;">
              <table style="width:100%; text-align:center;">
                <thead>
                  <tr>
                    <th style="text-align:left;">รายการ</th>
                    <th style="text-align:left;">รหัสสินค้า</th>
                    <th style="text-align:left;">ชื่อสินค้า</th>
                    <th>ราคา/หน่วย</th>
                    <th>จำนวนที่สั่ง</th>
                    <th>จำนวนที่รับ</th>
                  </tr>
                </thead>
                <tbody>
                  ${tbodyHtml}
                </tbody>
              </table>
            </div>
          </div>

          <div style="margin-top:20px;">
            <label>ราคาปัจจุบัน: <strong style="color:var(--primary); font-size:20px;" id="rTotalPrice">${totalPrice} บาท</strong></label>
          </div>

          <div style="margin-top:20px;">
            <label>หมายเหตุ</label>
            <textarea id="rRemarks" placeholder="สำหรับบันทึกปัญหา" style="min-height:80px; width:100%; margin-top:5px;" ${isReadOnly ? 'readonly' : ''}>${po.remarks || ""}</textarea>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            ${isReadOnly ? '' : `<button class="btn primary" onclick="saveReceivingEdit()">บันทึก</button>`}
            <button class="btn danger" onclick="cancelReceivingEdit()">${isReadOnly ? 'กลับ' : 'ยกเลิก'}</button>
          </div>
        </div>
      `;
    }

    // Called when the input field for received quantity changes
    window.updateRecvTotal = function () {
      const inputs = document.querySelectorAll(".r-recv-qty");
      let total = 0;
      inputs.forEach(input => {
        const qty = Number(input.value || 0);
        const price = Number(input.dataset.price || 0);
        total += qty * price;
      });
      const el = document.getElementById("rTotalPrice");
      if (el) el.textContent = total.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + " บาท";
    };

    function saveReceivingEdit() {
      const receiveDate = document.getElementById("rDate").value;
      const remarks = document.getElementById("rRemarks").value.trim();
      const po = db.purchases[editingReceivingIdx];

      po.receiveDate = receiveDate;

      const inputs = document.querySelectorAll(".r-recv-qty");
      let allMatch = true;
      let hasError = false;

      inputs.forEach((input, idx) => {
        const recvQty = Number(input.value || 0);
        const orderQty = Number(input.dataset.orderQty || 0);
        if (!Number.isInteger(recvQty) || recvQty < 0) {
          hasError = true;
        }
        if (recvQty !== orderQty) {
          allMatch = false;
        }
        if (po.items && po.items[idx]) {
          po.items[idx].qty = recvQty; // Update actual received qty
        }
      });

      if (hasError) {
        return alert("จำนวนที่รับต้องเป็นตัวเลขจำนวนเต็มที่มากกว่าหรือเท่ากับ 0");
      }

      if (!allMatch && remarks === "") {
        return alert("กรุณาระบุเหตุผลในช่อง 'หมายเหตุ' เนื่องจากจำนวนที่รับไม่ตรงกับจำนวนที่สั่ง");
      }

      // Update PO status based on receiving validation
      if (allMatch) {
        po.status = "เสร็จสิ้น"; // Success -> จัดส่งเรียบร้อย
      } else {
        po.status = "สินค้าถูกยกเลิก"; // Error/Warning -> ไม่ครบ/มีปัญหา
      }

      if (remarks) {
        po.remarks = remarks;
      }

      persistState();
      editingReceivingIdx = -1;
      renderReceiving();
    }

    function cancelReceivingEdit() {
      editingReceivingIdx = -1;
      renderReceiving();
    }

    function filterSearch() {
      const searchInput = document.getElementById("searchKey")?.value.toLowerCase() || "";
      const categoryFilter = document.getElementById("searchCategory")?.value || "";
      const statusFilter = document.getElementById("searchStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const rowCode = trs[i].dataset.code;
        if (!rowCode) continue;

        const item = db.inventory.find(x => x.code === rowCode);
        if (!item) continue;

        const codeNameStr = (item.code + " " + item.name).toLowerCase();
        const status = item.stock <= item.reorder ? "ควรสั่งซื้อ" : "ปกติ";

        const matchSearch = codeNameStr.includes(searchInput);
        const matchCategory = categoryFilter === "" || item.category === categoryFilter;
        const matchStatus = statusFilter === "" || status === statusFilter;

        if (matchSearch && matchCategory && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    function renderSearch() {
      const categories = [...new Set(db.inventory.map(i => i.category))];
      const svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;
      const searchIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`;

      const trs = db.inventory.map(item => {
        const status = item.stock <= item.reorder ? "ควรสั่งซื้อ" : "ปกติ";
        return `
          <tr data-code="${item.code}">
            <td>${item.name || ""}</td>
            <td>${item.code || ""}</td>
            <td>${item.category || ""}</td>
            <td>${item.stock || 0}</td>
            <td>${status}</td>
            <td>${Number(item.price || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.details || item.supplierItem || "-"}</td>
            <td style="text-align:center;">
              <span style="cursor:pointer; font-size:18px; color:#4f8cff;" onclick="renderSearchDetails('${item.code}')" title="ดูรายละเอียด">👁️</span>
            </td>
          </tr>
        `;
      }).join("");

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center; width: 100%;">
            <div style="position:relative; flex-grow:1; max-width:500px;">
              ${searchIcon}
              <input id="searchKey" type="text" placeholder="ค้นหาสินค้าด้วยชื่อหรือรหัสสินค้า" style="width:100%; padding-left:35px; background:var(--panel-2);" oninput="filterSearch()">
            </div>
            
            <div style="position:relative;">
              ${svgIcon}
              <select id="searchCategory" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterSearch()">
                <option value="">หมวดหมู่สินค้าทั้งหมด</option>
                ${categories.map(c => `<option value="${c}">${c}</option>`).join("")}
              </select>
            </div>

            <div style="position:relative;">
              ${svgIcon}
              <select id="searchStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterSearch()">
                <option value="">สถานะสินค้าทั้งหมด</option>
                <option value="ปกติ">ปกติ</option>
                <option value="ควรสั่งซื้อ">ควรสั่งซื้อ</option>
              </select>
            </div>
          </div>
        </div>
        <div class="card">
          <table style="width:100%; text-align:left;">
            <tr>
              <th>ชื่อ</th>
              <th>รหัส</th>
              <th>หมวดหมู่</th>
              <th>จำนวน</th>
              <th>สถานะ</th>
              <th>ราคาปัจจุบัน</th>
              <th>รายละเอียดสินค้า</th>
              <th style="text-align:center;">จัดการ</th>
            </tr>
            ${trs}
          </table>
        </div>
      `;
    }

    function renderSearchDetails(code) {
      const item = db.inventory.find(x => x.code === code);
      if (!item) return;

      const totalValue = Number(item.stock || 0) * Number(item.price || 0);
      const status = item.stock <= item.reorder ? "ควรสั่งซื้อ" : "ปกติ";

      screen.innerHTML = `
        <div style="margin-bottom: 20px; display:flex; align-items:center;">
          <button class="btn" style="background:#ef9d2e; color:#fff; border:none; padding:8px 24px; font-weight:bold; cursor:pointer; border-radius:4px; font-size:16px;" onclick="renderSearch()">
             < ย้อนกลับ
          </button>
        </div>
        <div class="card" style="padding: 30px;">
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 30px;">
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">ชื่อสินค้า :</div>
              <div style="font-size:16px; font-weight:bold;">${item.name || "-"}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">สินค้าจากตัวแทนจำหน่าย :</div>
              <div style="font-size:16px; font-weight:bold;">${item.supplierItem || "-"}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">รหัสสินค้า :</div>
              <div style="font-size:16px; font-weight:bold;">${item.code || "-"}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">จำนวนคงคลัง :</div>
              <div style="font-size:16px; font-weight:bold;">${item.stock ?? 0}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">หมวดหมู่สินค้า :</div>
              <div style="font-size:16px; font-weight:bold;">${item.category || "-"}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">จำนวนคงคลังขั้นต่ำ :</div>
              <div style="font-size:16px; font-weight:bold;">${item.reorder ?? 0}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">ราคาปัจจุบัน :</div>
              <div style="font-size:16px; font-weight:bold;">${Number(item.price || 0).toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px;">
              <div class="muted" style="margin-bottom:10px;">ราคารวมปัจจุบัน :</div>
              <div style="font-size:16px; font-weight:bold;">${totalValue.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px; grid-column: 1;">
              <div class="muted" style="margin-bottom:10px;">รายละเอียดสินค้า :</div>
              <div style="font-size:16px; font-weight:bold;">${item.details || "-"}</div>
            </div>
            <div style="background:var(--panel-2); padding:20px; border-radius:8px; display:flex; flex-direction:column; justify-content:center;">
              <div class="muted" style="margin-bottom:10px;">สถานะ :</div>
              <div style="font-size:16px; font-weight:bold; color:${status === 'ปกติ' ? 'var(--ok)' : 'var(--danger)'};">${status}</div>
            </div>
          </div>
        </div>
      `;
    }

    function filterIssues() {
      const searchInput = document.getElementById("searchIssue")?.value.toLowerCase() || "";
      const statusFilter = document.getElementById("filterIssueStatus")?.value || "";

      const table = screen.querySelector("table");
      if (!table) return;
      const trs = table.getElementsByTagName("tr");
      for (let i = 1; i < trs.length; i++) {
        const textContent = trs[i].textContent.toLowerCase();
        const rowStatus = trs[i].dataset.status || "";

        const matchSearch = textContent.includes(searchInput);
        const matchStatus = statusFilter === "" || rowStatus === statusFilter;

        if (matchSearch && matchStatus) {
          trs[i].style.display = "";
        } else {
          trs[i].style.display = "none";
        }
      }
    }

    function renderIssue() {
      const trs = db.issues.map((iss, idx) => {
        let statusHtml = "";
        if (iss.status === "จัดส่งแล้ว") statusHtml = `<span style="color:var(--ok); font-weight:bold;">✅ จัดส่งแล้ว</span>`;
        else if (iss.status === "อนุมัติแล้ว") statusHtml = `<span style="color:var(--accent); font-weight:bold;">✔️ อนุมัติแล้ว</span>`;
        else if (iss.status === "รออนุมัติ" || !iss.status) statusHtml = `<span style="color:var(--warn); font-weight:bold;">⏳ รออนุมัติ</span>`;
        else if (iss.status === "คืนสินค้า") statusHtml = `<span style="color:#ef9d2e; font-weight:bold;">↩️ คืนสินค้า</span>`;
        else if (iss.status === "ยกเลิก") statusHtml = `<span style="color:var(--danger); font-weight:bold;">❌ ยกเลิก</span>`;
        else statusHtml = iss.status || "";

        return `
          <tr data-status="${iss.status || ""}">
            <td>${iss.issueNo || ""}</td>
            <td>${iss.item || ""}</td>
            <td>${iss.qty || 0}</td>
            <td>${iss.reason || ""}</td>
            <td>${iss.date || ""}</td>
            <td>${statusHtml}</td>
            <td>
              <span style="cursor:pointer; margin-right:15px; font-size:18px;" onclick="editRow('issues', ${idx})" title="แก้ไข">✏️</span>
              <span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="delRow('issues', ${idx})" title="ลบ">🗑️</span>
            </td>
          </tr>
        `;
      }).join("");

      const svgIcon = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px; height:16px; position:absolute; left:10px; top:50%; transform:translateY(-50%); pointer-events:none; color:var(--muted);"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>`;

      screen.innerHTML = `
        <div style="display:flex; justify-content:space-between; margin-bottom:15px; align-items:center; flex-wrap: wrap; gap: 10px;">
          <div style="display:flex; gap:10px; flex-wrap: wrap; align-items:center;">
            <input type="text" id="searchIssue" placeholder="ค้นหารายการเบิก..." style="width: 250px; background:var(--panel-2);" oninput="filterIssues()">
            <div style="position:relative;">
              ${svgIcon}
              <select id="filterIssueStatus" style="padding-left:35px; background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:4px; height:35px; cursor:pointer; outline:none;" onchange="filterIssues()">
                <option value="">สถานะทั้งหมด</option>
                <option value="จัดส่งแล้ว">✅ จัดส่งแล้ว</option>
                <option value="อนุมัติแล้ว">✔️ อนุมัติแล้ว</option>
                <option value="รออนุมัติ">⏳ รออนุมัติ</option>
                <option value="คืนสินค้า">↩️ คืนสินค้า</option>
                <option value="ยกเลิก">❌ ยกเลิก</option>
              </select>
            </div>
          </div>
          <button class="btn primary" onclick="renderIssueEditForm()">+ เบิกสินค้า</button>
        </div>
        <div class="card">
          <table style="width:100%; text-align:left;">
            <tr>
              <th>เลขที่เอกสารเบิก</th>
              <th>สินค้า</th>
              <th>จำนวน</th>
              <th>เหตุผล</th>
              <th>วันที่</th>
              <th>สถานะ</th>
              <th>จัดการ</th>
            </tr>
            ${trs}
          </table>
        </div>
      `;
    }

    function renderIssueEditForm(issue) {
      const selected = issue || {};
      if (!issue) editingIssueNo = null;
      
      const isManager = currentUser?.role === "Warehouse Manager";
      const currentStatus = selected.status || "รออนุมัติ";
      const isNew = !editingIssueNo;
      
      // If not manager and not new, certain fields might be locked
      const canEditStatus = isManager;
      const canEditContent = isManager || (isNew || currentStatus === "รออนุมัติ");

      const options = db.inventory.map(i => `<option>${i.name}</option>`).join("");
      
      screen.innerHTML = `
        <div class="card" style="padding: 20px;">
          <h3>${editingIssueNo ? "แก้ไขรายการเบิกสินค้า" : "บันทึกการเบิกสินค้า"}</h3>
          ${!isManager && !isNew && currentStatus !== "รออนุมัติ" ? `<div class="auth-message error" style="margin-bottom:15px;">⚠️ รายการนี้ได้รับการอนุมัติหรือดำเนินการแล้ว คุณไม่สามารถแก้ไขข้อมูลได้ (สิทธิ์เฉพาะ Manager)</div>` : ""}
          <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 20px;">
            <div><label>เลขที่เอกสารเบิก</label><input id="eiNo" value="${selected.issueNo || ""}" ${editingIssueNo || !canEditContent ? "readonly" : ""}></div>
            <div><label>สินค้า</label>
              <select id="eiItem" ${!canEditContent ? "disabled" : ""}>${options}</select>
            </div>
            <div><label>จำนวน</label><input type="number" id="eiQty" min="0" value="${selected.qty ?? 0}" ${!canEditContent ? "readonly" : ""}></div>
            <div><label>เหตุผลการเบิก</label><input id="eiReason" value="${selected.reason || ""}" ${!canEditContent ? "readonly" : ""}></div>
            <div><label>วันที่</label><input type="date" id="eiDate" onclick="this.showPicker()" value="${selected.date || ""}" ${!canEditContent ? "readonly" : ""}></div>
            <div><label>สถานะ ${!canEditStatus ? "(เฉพาะ Manager ที่แก้ไขได้)" : ""}</label>
              <select id="eiStatus" style="width:100%; padding:8px; border-radius:4px; border:1px solid var(--border); background:var(--panel-2); color:var(--text);" ${!canEditStatus ? "disabled" : ""}>
                <option value="รออนุมัติ" ${currentStatus === "รออนุมัติ" ? "selected" : ""}>⏳ รออนุมัติ</option>
                <option value="อนุมัติแล้ว" ${currentStatus === "อนุมัติแล้ว" ? "selected" : ""}>✔️ อนุมัติแล้ว</option>
                <option value="จัดส่งแล้ว" ${currentStatus === "จัดส่งแล้ว" ? "selected" : ""}>✅ จัดส่งแล้ว</option>
                <option value="คืนสินค้า" ${currentStatus === "คืนสินค้า" ? "selected" : ""}>↩️ คืนสินค้า</option>
                <option value="ยกเลิก" ${currentStatus === "ยกเลิก" ? "selected" : ""}>❌ ยกเลิก</option>
              </select>
            </div>
          </div>
          <div style="display:flex; justify-content:flex-end; gap:10px; margin-top:20px;">
            ${canEditContent || canEditStatus ? `<button class="btn primary" onclick="saveIssueEdit()">${editingIssueNo ? "อัปเดตข้อมูล" : "ยืนยันการเบิก"}</button>` : ""}
            <button class="btn danger" onclick="cancelIssueEdit()">ยกเลิก</button>
          </div>
        </div>
      `;
      if (selected.item) document.getElementById("eiItem").value = selected.item;
    }

    async function saveIssueEdit() {
      const issueNoInput = document.getElementById("eiNo").value.trim();
      const item = document.getElementById("eiItem").value;
      const qty = Math.max(0, Number(document.getElementById("eiQty").value || 0));
      const reason = document.getElementById("eiReason").value.trim();
      const date = document.getElementById("eiDate").value || new Date().toISOString().slice(0, 10);
      const statusSelect = document.getElementById("eiStatus");
      const status = statusSelect ? statusSelect.value : "รออนุมัติ";
      const inv = db.inventory.find(x => x.name === item);

      if (!editingIssueNo) {
        if (!inv) return alert("ไม่พบรายการสินค้า");
        if (qty <= 0 || qty > inv.stock) return alert("จำนวนเบิกไม่ถูกต้อง");
        inv.stock -= qty;
        const issueNo = issueNoInput || await requestIssueNo();
        db.issues.push({ issueNo, item, qty, reason, date, status });
      } else {
        if (!issueNoInput) return alert("ต้องระบุเลขที่เอกสารเบิก");
        const idx = db.issues.findIndex(x => x.issueNo === editingIssueNo || x.issueNo === issueNoInput);
        if (idx < 0) return alert("ไม่พบรายการเบิกที่ต้องการแก้ไข");
        db.issues[idx] = { issueNo: issueNoInput, item, qty, reason, date, status };
      }

      persistState();
      editingIssueNo = null;
      renderIssue();
    }

    function cancelIssueEdit() {
      editingIssueNo = null;
      renderIssue();
    }

    function renderReports() {
      screen.innerHTML = `
        <div class="card">
          <div style="display:flex; gap:15px; align-items:flex-end; flex-wrap:wrap;">
            <div style="flex:1; min-width:250px;">
              <label>ประเภทรายงาน</label>
              <select id="reportType" onchange="updateReportView()" style="background:var(--panel-2); color:var(--text); border:1px solid var(--border); border-radius:8px; padding:8px; width:100%; height:40px;">
                <option value="">-- กรุณาเลือกรายงานที่ต้องการดู --</option>
                <option value="inventory">📦 รายงานสรุปสินค้าคงคลัง</option>
                <option value="issues">📝 รายงานประวัติเบิกสินค้า</option>
                <option value="purchases">💰 รายงานสรุปการสั่งซื้อ (ระบุช่วงวันที่)</option>
              </select>
            </div>
            <div id="dateRangeContainer" style="display:none; gap:10px; align-items:flex-end;">
              <div style="width:160px;">
                <label>จากวันที่</label>
                <input type="date" id="reportStartDate" onclick="this.showPicker()" style="height:40px;">
              </div>
              <div style="width:160px;">
                <label>ถึงวันที่</label>
                <input type="date" id="reportEndDate" onclick="this.showPicker()" style="height:40px;">
              </div>
              <button class="btn primary" onclick="updateReportView()" style="height:40px;">กรองข้อมูล</button>
            </div>
            <div style="margin-left:auto;">
              <button class="btn success" onclick="exportReportsToExcel()" style="height:40px; padding: 0 20px;">📥 ดาวน์โหลด Excel (CSV)</button>
            </div>
          </div>
        </div>
        <div id="reportDisplay">
          <div class="card" style="text-align:center; padding:50px; color:var(--muted);">
             <div style="font-size:40px; margin-bottom:15px;">📊</div>
             <div>กรุณาเลือกประเภทรายงานด้านบนเพื่อดูข้อมูล</div>
          </div>
        </div>`;
    }

    window.updateReportView = function() {
      const type = document.getElementById("reportType").value;
      const display = document.getElementById("reportDisplay");
      const dateRange = document.getElementById("dateRangeContainer");
      
      if (type === "purchases") {
        dateRange.style.display = "flex";
      } else {
        dateRange.style.display = "none";
      }

      if (!type) {
        display.innerHTML = `
          <div class="card" style="text-align:center; padding:50px; color:var(--muted);">
             <div style="font-size:40px; margin-bottom:15px;">📊</div>
             <div>กรุณาเลือกประเภทรายงานด้านบนเพื่อดูข้อมูล</div>
          </div>`;
        return;
      }

      let content = "";
      if (type === "inventory") {
        const rows = db.inventory.map(i => `<tr><td>${i.code}</td><td>${i.name}</td><td>${i.category}</td><td>${i.stock}</td><td>${i.reorder}</td><td>${i.stock <= i.reorder ? '<span style="color:var(--danger)">ควรสั่งซื้อ</span>' : "ปกติ"}</td></tr>`).join("");
        content = `
          <div class="card">
            <h3>รายงานสรุปสินค้าคงคลัง</h3>
            <table style="width:100%;">
              <thead><tr><th>รหัส</th><th>ชื่อสินค้า</th><th>หมวดหมู่</th><th>คงคลัง</th><th>จุดสั่งซื้อขั้นต่ำ</th><th>สถานะ</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } else if (type === "issues") {
        const rows = db.issues.map(i => `<tr><td>${i.date}</td><td>${i.issueNo || "-"}</td><td>${i.item}</td><td>${i.qty}</td><td>${i.reason}</td></tr>`).join("");
        content = `
          <div class="card">
            <h3>รายงานประวัติเบิกสินค้า</h3>
            <table style="width:100%;">
              <thead><tr><th>วันที่</th><th>เลขที่เอกสาร</th><th>สินค้า</th><th>จำนวน</th><th>เหตุผล</th></tr></thead>
              <tbody>${rows}</tbody>
            </table>
          </div>`;
      } else if (type === "purchases") {
        const start = document.getElementById("reportStartDate").value;
        const end = document.getElementById("reportEndDate").value;
        
        let filtered = db.purchases;
        if (start && end) {
          filtered = db.purchases.filter(p => p.date >= start && p.date <= end);
        }

        const rows = filtered.flatMap(p =>
          (p.items && p.items.length > 0)
            ? p.items.map(itm => `<tr><td>${p.ref}</td><td>${p.date}</td><td>${p.vendor || "-"}</td><td>${itm.code || "-"}</td><td>${itm.name || "-"}</td><td>${itm.qty}</td><td>${Number(itm.cost || 0).toLocaleString()}</td><td>${p.status || ""}</td></tr>`)
            : [`<tr><td>${p.ref}</td><td>${p.date}</td><td>${p.vendor || "-"}</td><td>-</td><td>-</td><td>-</td><td>-</td><td>${p.status || ""}</td></tr>`]
        ).join("");

        content = `
          <div class="card">
            <h3>รายงานสรุปการสั่งซื้อ ${start && end ? `(ระหว่างวันที่ ${start} ถึง ${end})` : "(ทั้งหมด)"}</h3>
            <table style="width:100%;">
              <thead><tr><th>เลขที่อ้างอิง</th><th>วันที่</th><th>ตัวแทนจำหน่าย</th><th>รหัสสินค้า</th><th>ชื่อสินค้า</th><th>จำนวน</th><th>ต้นทุน/หน่วย</th><th>สถานะ</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="8" style="text-align:center; padding:20px;">ไม่พบข้อมูลในช่วงวันที่เลือก</td></tr>'}</tbody>
            </table>
          </div>`;
      }
      display.innerHTML = content;
    };

    function escapeCSV(val) {
      if (val === null || val === undefined) return "";
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    }

    async function exportReportsToExcel() {
      const type = document.getElementById("reportType")?.value;
      if (!type) return alert("กรุณาเลือกประเภทรายงานก่อนส่งออกข้อมูล");

      try {
        let csv = "\uFEFF"; // UTF-8 BOM
        let fileName = "report";

        if (type === "inventory") {
          fileName = "inventory_report";
          csv += "รายงานสรุปสินค้าคงคลัง\n";
          csv += "รหัส,ชื่อสินค้า,หมวดหมู่,คงคลัง,จุดสั่งซื้อขั้นต่ำ,สถานะ\n";
          db.inventory.forEach(i => {
            const status = i.stock <= i.reorder ? "ควรสั่งซื้อ" : "ปกติ";
            csv += [i.code, i.name, i.category, i.stock, i.reorder, status].map(escapeCSV).join(",") + "\n";
          });
        } else if (type === "issues") {
          fileName = "issue_history_report";
          csv += "รายงานประวัติเบิกสินค้า\n";
          csv += "วันที่,เลขที่เอกสาร,สินค้า,จำนวน,เหตุผล\n";
          db.issues.forEach(i => {
            csv += [i.date, i.issueNo || "-", i.item, i.qty, i.reason].map(escapeCSV).join(",") + "\n";
          });
        } else if (type === "purchases") {
          const start = document.getElementById("reportStartDate").value;
          const end = document.getElementById("reportEndDate").value;
          fileName = `purchase_report_${start || "all"}_to_${end || "all"}`;
          
          let filtered = db.purchases;
          if (start && end) {
            filtered = db.purchases.filter(p => p.date >= start && p.date <= end);
          }

          csv += "รายงานสรุปการสั่งซื้อ\n";
          if (start && end) csv += `ระหว่างวันที่ ${start} ถึง ${end}\n`;
          csv += "เลขที่อ้างอิง,วันที่,ตัวแทนจำหน่าย,รหัสสินค้า,ชื่อสินค้า,จำนวน,ต้นทุน/หน่วย,สถานะ\n";
          filtered.forEach(p => {
            if (p.items && p.items.length > 0) {
              p.items.forEach(itm => {
                csv += [p.ref, p.date, p.vendor, itm.code, itm.name, itm.qty, itm.cost, p.status].map(escapeCSV).join(",") + "\n";
              });
            } else {
              csv += [p.ref, p.date, p.vendor, "-", "-", "-", "-", p.status].map(escapeCSV).join(",") + "\n";
            }
          });
        }

        if (window.showSaveFilePicker) {
          try {
            const handle = await window.showSaveFilePicker({
              suggestedName: `warehouse_report_${new Date().toISOString().slice(0, 10)}.csv`,
              types: [{
                description: 'CSV File (Excel)',
                accept: { 'text/csv': ['.csv'] }
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
        a.download = `warehouse_report_${new Date().toISOString().slice(0, 10)}.csv`;
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
            <tr>${cols.map(c => `<th>${labels[c] || c}</th>`).join("")}<th>จัดการ</th></tr>
            ${db[entity].map((row, idx) => `<tr>${cols.map(c => `<td>${row[c] ?? ""}</td>`).join("")}<td><span style="cursor:pointer; margin-right:15px; font-size:18px;" onclick="editRow('${entity}', ${idx})" title="แก้ไข">✏️</span><span style="cursor:pointer; color:var(--danger); font-size:18px;" onclick="delRow('${entity}', ${idx})" title="ลบ">🗑️</span></td></tr>`).join("")}
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
        editingVendorCode = row.code || null;
        const btn = [...menu.children].find(b => b.dataset.screen === "vendors");
        setActive(btn);
        title.textContent = "แก้ไขตัวแทนจำหน่าย";
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

    window.alert = function (msg) {
      customAlert(msg);
    };
