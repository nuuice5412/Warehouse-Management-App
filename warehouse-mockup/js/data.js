    const screenConfig = [
      { key: "settings", title: "การตั้งค่าระบบ", icon: "⚙️" },
      { key: "dashboard", title: "แดชบอร์ด", icon: "📊" },
      { key: "users", title: "ผู้ใช้งาน", icon: "👥" },
      { key: "inventory", title: "การจัดการคลังสินค้า", icon: "📦" },
      { key: "vendors", title: "การจัดการทะเบียนตัวแทนจำหน่าย", icon: "🏭" },
      { key: "purchases", title: "สั่งซื้อสินค้า", icon: "🧾" },
      { key: "receiving", title: "รับสินค้าเข้า", icon: "📥" },
      { key: "search", title: "การสืบค้นข้อมูลสินค้า", icon: "🔎" },
      { key: "issue", title: "เบิกสินค้า", icon: "📤" },
      { key: "reports", title: "จัดพิมพ์รายงานสินค้า", icon: "📄" }
    ];
    const settingsScreen = "settings";
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

    async function splashLogin(e) {
      e.preventDefault();
      const email = document.getElementById("splashEmail").value.trim();
      const pass = document.getElementById("splashPass").value;

      if (!email || !pass) {
        document.getElementById("splashError").textContent = "กรุณากรอกข้อมูลให้ครบถ้วน";
        return;
      }

      document.getElementById("splashError").textContent = "";

      const backendUser = await loginWithBackend(email, pass);
      if (backendUser) {
        currentUser = { username: backendUser.username, role: backendUser.role };
        document.getElementById("login-splash").style.display = "none";
        document.getElementById("app-wrapper").style.display = "grid";
        updateMenuAccess();
        openScreen("dashboard", menu.children[0]);
        return;
      }

      const passwordHash = `sha256:${await hashPassword(pass)}`;
      const user = db.users.find(u =>
        u.username === email &&
        (u.password === passwordHash || u.password === pass) &&
        u.status === "Active"
      );

      if (!user) {
        document.getElementById("splashError").textContent = "เข้าสู่ระบบไม่สำเร็จ: ชื่อผู้ใช้/รหัสผ่านไม่ถูกต้อง หรือ บัญชีถูกปิดใช้งาน";
        return;
      }

      currentUser = { username: user.username, role: user.role };
      document.getElementById("login-splash").style.display = "none";
      document.getElementById("app-wrapper").style.display = "grid";

      updateMenuAccess();
      openScreen("dashboard", menu.children[0]);
    }

    function toggleSplashPassword() {
      const p = document.getElementById("splashPass");
      p.type = p.type === "password" ? "text" : "password";
    }

    const storageKey = "warehouse_rnp_state_v7";
    const backendUrlStorageKey = "warehouse_backend_url_v1";
    const syncIntervalMs = 5000;
    const defaultBackendBaseUrl = "http://localhost:4000";
    let backendBaseUrl = localStorage.getItem(backendUrlStorageKey) || defaultBackendBaseUrl;
    const fieldLabels = {
      users: { username: "ชื่อผู้ใช้", role: "สิทธิ์", status: "สถานะ" },
      inventory: { code: "รหัส", name: "ชื่อสินค้า", category: "หมวดหมู่", stock: "คงคลัง", reorder: "จุดสั่งซื้อขั้นต่ำ", price: "ราคา" },
      vendors: { code: "รหัสตัวแทน", name: "ชื่อบริษัท/ร้านค้า", contactName: "ชื่อผู้ติดต่อ", phone: "เบอร์โทรศัพท์", status: "สถานะ" },
      purchases: { ref: "เลขที่อ้างอิง", date: "วันที่", item: "สินค้า", qty: "จำนวน", cost: "ต้นทุน/หน่วย", status: "สถานะ" },
      receiving: { poRef: "เลขที่ PO", item: "สินค้า", qty: "จำนวน", receiver: "ผู้รับสินค้า", date: "วันที่" },
      issues: { issueNo: "เลขที่เอกสารเบิก", item: "สินค้า", qty: "จำนวน", reason: "เหตุผล", date: "วันที่", status: "สถานะ" }
    };
    const db = {
      users: [
        { username: "admin", password: "123456", role: "Warehouse Manager", status: "Active" },
        { username: "stock", password: "1234", role: "Warehouse Staff", status: "Active" },
        { username: "Buy", password: "1234", role: "Purchasing Officer", status: "Active" },
        { username: "user1", password: "1234", role: "Employee", status: "Active" },
        { username: "Accountant", password: "1234", role: "Accountant", status: "Active" },
        { username: "user2", password: "1234", role: "Employee", status: "Suspended" },
      ],
      inventory: [
        { code: "HYD-001", name: "ปั๊มไฮดรอลิก", category: "Hydraulic", stock: 25, reorder: 10, price: 4500 },
        { code: "BRA-004", name: "วาล์วทองเหลือง 1/2\"", category: "Brass", stock: 4, reorder: 15, price: 300 },
        { code: "SEL-012", name: "ชุดซีลยาง", category: "Seal", stock: 150, reorder: 50, price: 120 },
        { code: "MTR-102", name: "มอเตอร์ไฟฟ้า 2HP", category: "Motor", stock: 8, reorder: 5, price: 6500 },
        { code: "PIP-045", name: "ท่อพีวีซี 2\" (4m)", category: "Pipe", stock: 200, reorder: 100, price: 180 },
        { code: "FIT-088", name: "ข้อต่อข้องอ 90°", category: "Fitting", stock: 320, reorder: 100, price: 45 },
        { code: "CBL-201", name: "สายไฟ 3x2.5", category: "Electrical", stock: 50, reorder: 20, price: 2500 },
        { code: "SWT-304", name: "เบรกเกอร์เมน 50A", category: "Electrical", stock: 12, reorder: 10, price: 850 },
        { code: "LUB-005", name: "จาระบีหลอด 400g", category: "Lubricant", stock: 45, reorder: 20, price: 150 },
        { code: "GLV-010", name: "ถุงมือเซฟตี้", category: "Safety", stock: 80, reorder: 30, price: 65 },
        { code: "HLM-002", name: "หมวกนิรภัย", category: "Safety", stock: 15, reorder: 10, price: 250 },
        { code: "TOL-055", name: "ชุดประแจ (12 ชิ้น)", category: "Tools", stock: 6, reorder: 5, price: 1200 },
        { code: "PNT-001", name: "สีทาเหล็กกันสนิม 1 แกลลอน", category: "Paint", stock: 20, reorder: 10, price: 450 },
        { code: "PNT-002", name: "ทินเนอร์ผสมสี 3A", category: "Paint", stock: 35, reorder: 15, price: 180 },
        { code: "BLT-100", name: "น็อต M8x20 (กล่อง 100 ตัว)", category: "Fastener", stock: 40, reorder: 20, price: 150 },
        { code: "BLT-105", name: "น็อต M10x30 (กล่อง 50 ตัว)", category: "Fastener", stock: 25, reorder: 10, price: 200 },
        { code: "TPE-01", name: "เทปพันสายไฟ", category: "Electrical", stock: 120, reorder: 50, price: 25 },
        { code: "TPE-02", name: "เทปพันเกลียว", category: "Pipe", stock: 80, reorder: 30, price: 15 },
        { code: "LMP-01", name: "หลอดไฟ LED 18W", category: "Electrical", stock: 60, reorder: 20, price: 120 },
        { code: "FLT-01", name: "ไส้กรองอากาศเบอร์ 4", category: "Filter", stock: 3, reorder: 10, price: 850 }
      ],
      vendors: [
        { code: "V-001", name: "บริษัท โกลบอล ไอที จำกัด", contactName: "คุณวิชัย รักดี", phone: "02-333-4444", status: "Active" },
        { code: "V-002", name: "บริษัท สยามซัพพลาย จำกัด", contactName: "คุณสมชาย ใจดี", phone: "02-111-2222", status: "Active" },
        { code: "V-003", name: "หจก. เจริญรุ่งเรือง พาณิชย์", contactName: "คุณสมหญิง ยอดเยี่ยม", phone: "081-999-8888", status: "Suspended" },
        { code: "V-004", name: "หจก. เจริญรุ่งเรือง ฮาร์ดแวร์", contactName: "คุณสมศักดิ์ แซ่ตั้ง", phone: "02-999-8877", status: "Active" },
        { code: "V-005", name: "บริษัท สมาร์ท ออฟฟิศ ซัพพลาย จำกัด", contactName: "คุณณัฐพล ทองดี", phone: "081-444-5566", status: "Suspended" },
        { code: "V-006", name: "บริษัท พรีเมี่ยม อิเล็กทรอนิกส์ จำกัด", contactName: "คุณอารยา สุขใจ", phone: "02-777-6655", status: "Active" },
        { code: "V-007", name: "หจก. ธนบุรี เทรดดิ้ง", contactName: "คุณเอกราช ภักดี", phone: "086-987-6543", status: "Suspended" },
        { code: "V-008", name: "บริษัท โลจิสติกส์ พาร์ทเนอร์ จำกัด", contactName: "คุณจิราพร วงศ์สว่าง", phone: "02-222-3344", status: "Active" }
      ],
      purchases: [
        { ref: "PO-1001", date: "2026-04-20", vendor: "บริษัท โกลบอล ไอที จำกัด", items: [{ code: "BRA-004", name: "วาล์วทองเหลือง 1/2\"", qty: 50, cost: 240 }], status: "เสร็จสิ้น" },
        { ref: "PO-1002", date: "2026-04-21", vendor: "บริษัท สยามซัพพลาย จำกัด", items: [{ code: "SEL-012", name: "ชุดซีลยาง", qty: 200, cost: 100 }], status: "เสร็จสิ้น" },
        { ref: "PO-1003", date: "2026-04-22", vendor: "หจก. เจริญรุ่งเรือง พาณิชย์", items: [{ code: "MOT-001", name: "มอเตอร์ไฟฟ้า 2HP", qty: 10, cost: 6000 }], status: "เสร็จสิ้น" },
        { ref: "PO-1004", date: "2026-04-23", vendor: "หจก. เจริญรุ่งเรือง ฮาร์ดแวร์", items: [{ code: "PVC-020", name: "ท่อพีวีซี 2\" (4m)", qty: 300, cost: 150 }], status: "กำลังดำเนินการ" },
        { ref: "PO-1005", date: "2026-04-24", vendor: "บริษัท สมาร์ท ออฟฟิศ ซัพพลาย จำกัด", items: [{ code: "GLV-001", name: "ถุงมือเซฟตี้", qty: 100, cost: 50 }], status: "กำลังดำเนินการ" },
        { ref: "PO-1006", date: "2026-04-25", vendor: "บริษัท พรีเมี่ยม อิเล็กทรอนิกส์ จำกัด", items: [{ code: "TLS-005", name: "ชุดประแจ (12 ชิ้น)", qty: 10, cost: 1000 }], status: "ยกเลิก" },
        { ref: "PO-1007", date: "2026-04-26", vendor: "หจก. ธนบุรี เทรดดิ้ง", items: [{ code: "HYD-001", name: "ปั๊มไฮดรอลิก", qty: 15, cost: 4200 }], status: "เสร็จสิ้น" },
        { ref: "PO-1008", date: "2026-04-27", vendor: "บริษัท โลจิสติกส์ พาร์ทเนอร์ จำกัด", items: [{ code: "BRK-050", name: "เบรกเกอร์เมน 50A", qty: 20, cost: 800 }], status: "กำลังดำเนินการ" },
        { ref: "PO-1009", date: "2026-04-28", vendor: "บริษัท โกลบอล ไอที จำกัด", items: [{ code: "CBL-325", name: "สายไฟ 3x2.5", qty: 100, cost: 2400 }], status: "ยกเลิก" },
        { ref: "PO-1010", date: "2026-04-28", vendor: "บริษัท สยามซัพพลาย จำกัด", items: [{ code: "GRS-400", name: "จาระบีหลอด 400g", qty: 50, cost: 120 }], status: "เสร็จสิ้น" },
        { ref: "PO-1011", date: "2026-04-28", vendor: "หจก. เจริญรุ่งเรือง ฮาร์ดแวร์", items: [{ code: "TPE-01", name: "เทปพันสายไฟ", qty: 100, cost: 20 }], status: "เสร็จสิ้น" },
        { ref: "PO-1012", date: "2026-04-29", vendor: "บริษัท พรีเมี่ยม อิเล็กทรอนิกส์ จำกัด", items: [{ code: "PNT-001", name: "สีทาเหล็กกันสนิม 1 แกลลอน", qty: 10, cost: 400 }], status: "กำลังดำเนินการ" },
        { ref: "PO-1013", date: "2026-04-29", vendor: "หจก. ธนบุรี เทรดดิ้ง", items: [{ code: "PNT-002", name: "ทินเนอร์ผสมสี 3A", qty: 20, cost: 160 }], status: "เสร็จสิ้น" },
        { ref: "PO-1014", date: "2026-04-30", vendor: "บริษัท โลจิสติกส์ พาร์ทเนอร์ จำกัด", items: [{ code: "BLT-100", name: "น็อต M8x20 (กล่อง 100 ตัว)", qty: 30, cost: 130 }], status: "เสร็จสิ้น" },
        { ref: "PO-1015", date: "2026-04-30", vendor: "หจก. เจริญรุ่งเรือง พาณิชย์", items: [{ code: "LMP-01", name: "หลอดไฟ LED 18W", qty: 50, cost: 100 }], status: "ยกเลิก" }
      ],
      receiving: [
        { poRef: "PO-1001", item: "วาล์วทองเหลือง 1/2\"", qty: 50, receiver: "พนักงานคลัง1", date: "2026-04-22" },
        { poRef: "PO-1002", item: "ชุดซีลยาง", qty: 200, receiver: "พนักงานคลัง1", date: "2026-04-23" },
        { poRef: "PO-1003", item: "มอเตอร์ไฟฟ้า 2HP", qty: 10, receiver: "พนักงานคลัง1", date: "2026-04-24" },
        { poRef: "PO-1004", item: "ท่อพีวีซี 2\" (4m)", qty: 300, receiver: "พนักงานคลัง1", date: "2026-04-25" },
        { poRef: "PO-1005", item: "ถุงมือเซฟตี้", qty: 100, receiver: "พนักงานคลัง1", date: "2026-04-26" },
        { poRef: "PO-1006", item: "ชุดประแจ (12 ชิ้น)", qty: 10, receiver: "พนักงานคลัง1", date: "2026-04-27" },
        { poRef: "PO-1007", item: "ปั๊มไฮดรอลิก", qty: 15, receiver: "พนักงานคลัง1", date: "2026-04-28" },
        { poRef: "PO-1008", item: "เบรกเกอร์เมน 50A", qty: 20, receiver: "พนักงานคลัง1", date: "2026-04-29" },
        { poRef: "PO-1009", item: "สายไฟ 3x2.5", qty: 100, receiver: "พนักงานคลัง1", date: "2026-04-29" },
        { poRef: "PO-1010", item: "จาระบีหลอด 400g", qty: 50, receiver: "พนักงานคลัง1", date: "2026-04-30" },
        { poRef: "PO-1011", item: "เทปพันสายไฟ", qty: 100, receiver: "พนักงานคลัง1", date: "2026-04-30" }
      ],
      issues: [
        { issueNo: "IS-0001", item: "วาล์วทองเหลือง 1/2\"", qty: 2, reason: "ซ่อมบำรุงไลน์ A", date: "2026-04-23", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0002", item: "ชุดซีลยาง", qty: 5, reason: "เปลี่ยนซีลปั๊มน้ำ", date: "2026-04-24", status: "อนุมัติแล้ว" },
        { issueNo: "IS-0003", item: "ถุงมือเซฟตี้", qty: 10, reason: "แจกพนักงานใหม่", date: "2026-04-26", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0004", item: "ท่อพีวีซี 2\" (4m)", qty: 20, reason: "อัพเกรดระบบน้ำ", date: "2026-04-26", status: "ยกเลิก" },
        { issueNo: "IS-0005", item: "มอเตอร์ไฟฟ้า 2HP", qty: 1, reason: "เปลี่ยนมอเตอร์เสียที่ไลน์ B", date: "2026-04-27", status: "อนุมัติแล้ว" },
        { issueNo: "IS-0006", item: "ชุดประแจ (12 ชิ้น)", qty: 2, reason: "เบิกให้ทีมช่าง 1", date: "2026-04-27", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0007", item: "จาระบีหลอด 400g", qty: 5, reason: "อัดจาระบีประจำเดือน", date: "2026-04-28", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0008", item: "วาล์วทองเหลือง 1/2\"", qty: 3, reason: "งานซ่อมด่วนอาคาร 2", date: "2026-04-28", status: "คืนสินค้า" },
        { issueNo: "IS-0009", item: "ปั๊มไฮดรอลิก", qty: 1, reason: "ติดตั้งเครื่องจักรใหม่", date: "2026-04-28", status: "อนุมัติแล้ว" },
        { issueNo: "IS-0010", item: "ชุดซีลยาง", qty: 10, reason: "สต๊อกสำรองหน้างาน", date: "2026-04-28", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0011", item: "สายไฟ 3x2.5", qty: 10, reason: "เดินสายไฟเครื่องจักรใหม่", date: "2026-04-29", status: "ยกเลิก" },
        { issueNo: "IS-0012", item: "เทปพันสายไฟ", qty: 5, reason: "เดินสายไฟเครื่องจักรใหม่", date: "2026-04-29", status: "อนุมัติแล้ว" },
        { issueNo: "IS-0013", item: "สีทาเหล็กกันสนิม 1 แกลลอน", qty: 2, reason: "ทาสีโครงเหล็กหลังคา", date: "2026-04-30", status: "คืนสินค้า" },
        { issueNo: "IS-0014", item: "ทินเนอร์ผสมสี 3A", qty: 4, reason: "ผสมสีทาโครงเหล็ก", date: "2026-04-30", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0015", item: "น็อต M8x20 (กล่อง 100 ตัว)", qty: 1, reason: "งานประกอบชั้นวางของ", date: "2026-04-30", status: "จัดส่งแล้ว" },
        { issueNo: "IS-0016", item: "หลอดไฟ LED 18W", qty: 5, reason: "เปลี่ยนหลอดไฟโกดัง 3", date: "2026-04-30", status: "อนุมัติแล้ว" }
      ]
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

