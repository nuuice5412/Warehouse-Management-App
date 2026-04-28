# Warehouse Backend (Minimal Step 3)

โครงสร้าง backend แบบพอดีสำหรับเริ่ม production architecture โดยไม่ overdo

## Included

- `server.js` - Node HTTP API skeleton (no external dependencies)
- `schema.sql` - MySQL schema เริ่มต้น
- `permissions.json` - role-permission matrix กลาง

## Why this design

- ลด error จาก environment เพราะไม่ต้องใช้ package manager ก่อน
- มี API จุดสำคัญสำหรับย้ายจาก mockup ไป backend จริง
- แยกสิทธิ์ใช้งานเป็นไฟล์กลาง ลดความเสี่ยง role mismatch

## API (current skeleton)

- `GET /health`
- `GET /authz/check?username=u&role=Warehouse%20Manager&screen=inventory`
- `POST /issue/generate-no`
- `POST /users/validate` with JSON body `{ "username": "...", "role": "..." }`

## Run

```bash
node server.js
```

Default port: `4000`

## Next small steps (safe)

1. ต่อ `warehouse-mockup/index.html` ให้เรียก `/authz/check` และ `/issue/generate-no`
2. เพิ่ม real auth endpoint + bcrypt hash
3. เชื่อม MySQL ด้วย connection pool และ transaction สำหรับ receive/issue flow
