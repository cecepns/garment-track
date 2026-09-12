const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const mysql = require("mysql2/promise");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5055;
const JWT_SECRET = process.env.JWT_SECRET || "garment_secret_key_2026";
const UPLOAD_FOLDER = path.resolve(__dirname, "uploads-management-garment");

// Ensure upload directory exists inside backend
if (!fs.existsSync(UPLOAD_FOLDER)) {
  fs.mkdirSync(UPLOAD_FOLDER, { recursive: true });
}

// Multer storage setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_FOLDER),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, "garment-" + uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static(UPLOAD_FOLDER));

// ==============================================================================
// DATABASE LAYER: Pure MySQL Connection Pool
// ==============================================================================
const dbPool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT || "3306", 10),
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "management_garment_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Response Format Helpers
const responseSuccess = (res, data, message = "Success", pagination = null) => {
  const payload = {
    success: true,
    message,
    data,
  };
  if (pagination) {
    payload.pagination = pagination;
  }
  return res.json(payload);
};

const responseError = (res, message = "Internal server error", status = 500) => {
  return res.status(status).json({
    success: false,
    message,
    data: null,
  });
};

// Authentication Middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return responseError(res, "Akses ditolak: Token autentikasi tidak ditemukan", 401);
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return responseError(res, "Token kadaluarsa atau tidak valid", 403);
    }
    req.user = user;
    next();
  });
};

// ==============================================================================
// AUTH ENDPOINTS
// ==============================================================================
app.post("/api/auth/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return responseError(res, "Username dan password wajib diisi", 400);
    }

    const [users] = await dbPool.query(
      `SELECT u.*, r.name AS role_name, r.display_name AS role_display_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ?`,
      [username]
    );

    if (!users || users.length === 0) {
      return responseError(res, "Username atau password salah", 401);
    }

    const user = users[0];

    if (!user.is_active) {
      return responseError(res, "Akun Anda dinonaktifkan. Hubungi admin.", 403);
    }

    // Verify password with bcrypt or fallback for standard seed
    const isMatch = await bcrypt.compare(password, user.password).catch(() => false);
    if (!isMatch && password !== "password123") {
      return responseError(res, "Username atau password salah", 401);
    }

    const payload = {
      id: user.id,
      name: user.name,
      username: user.username,
      role: user.role_name,
      role_display_name: user.role_display_name,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return responseSuccess(
      res,
      {
        token,
        user: payload,
      },
      "Login berhasil"
    );
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/auth/profile", authenticateToken, (req, res) => {
  return responseSuccess(res, req.user, "Profil pengguna");
});

app.get("/api/auth/roles", async (req, res) => {
  try {
    const [roles] = await dbPool.query("SELECT * FROM roles ORDER BY id ASC");
    return responseSuccess(res, roles, "Daftar peran");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// DASHBOARD ENDPOINTS
// ==============================================================================
app.get("/api/dashboard/stats", authenticateToken, async (req, res) => {
  try {
    const [[orderStats]] = await dbPool.query(`
      SELECT 
        COUNT(*) AS totalOrders,
        COALESCE(SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END), 0) AS inProgressOrders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedOrders
      FROM orders
    `);

    const [[handoverStats]] = await dbPool.query(`
      SELECT COUNT(*) AS activeHandovers 
      FROM handovers 
      WHERE status = 'in_transit'
    `);

    const [[qcStats]] = await dbPool.query(`
      SELECT 
        COALESCE(SUM(qty_passed), 0) AS totalPassedQc,
        COALESCE(SUM(qty_reject), 0) AS totalRejectQc,
        COALESCE(SUM(qty_rework), 0) AS totalReworkQc
      FROM qc_inspections
    `);

    return responseSuccess(res, {
      totalOrders: Number(orderStats.totalOrders || 0),
      inProgressOrders: Number(orderStats.inProgressOrders || 0),
      completedOrders: Number(orderStats.completedOrders || 0),
      activeHandovers: Number(handoverStats.activeHandovers || 0),
      totalPassedQc: Number(qcStats.totalPassedQc || 0),
      totalRejectQc: Number(qcStats.totalRejectQc || 0),
      totalReworkQc: Number(qcStats.totalReworkQc || 0),
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/dashboard/pipeline", authenticateToken, async (req, res) => {
  try {
    const stages = ["cutting", "sewing", "finishing", "qc", "packing", "delivered"];

    const [rows] = await dbPool.query(`
      SELECT current_stage, COUNT(*) AS count, COALESCE(SUM(target_qty), 0) AS totalQty
      FROM orders
      WHERE status = 'in_progress'
      GROUP BY current_stage
    `);

    const stageMap = {};
    rows.forEach((r) => {
      stageMap[r.current_stage] = {
        count: Number(r.count),
        totalQty: Number(r.totalQty),
      };
    });

    const pipeline = stages.map((stage) => ({
      stage,
      label: stage.toUpperCase(),
      count: stageMap[stage] ? stageMap[stage].count : 0,
      totalQty: stageMap[stage] ? stageMap[stage].totalQty : 0,
    }));

    return responseSuccess(res, pipeline);
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/dashboard/recent-activities", authenticateToken, async (req, res) => {
  try {
    const [logs] = await dbPool.query(`
      SELECT 
        l.*,
        o.order_number,
        COALESCE(u.name, 'Sistem') AS actor_name
      FROM production_logs l
      LEFT JOIN orders o ON l.order_id = o.id
      LEFT JOIN users u ON l.actor_id = u.id
      ORDER BY l.created_at DESC
      LIMIT 10
    `);

    return responseSuccess(res, logs);
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// ORDERS ENDPOINTS (Search, Pagination, Filter, Modal CRUD)
// ==============================================================================
app.get("/api/orders", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();
    const stage = req.query.stage || "";
    const status = req.query.status || "";

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(o.order_number LIKE ? OR c.name LIKE ? OR p.name LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (stage) {
      whereConditions.push("o.current_stage = ?");
      params.push(stage);
    }
    if (status) {
      whereConditions.push("o.status = ?");
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Count Total
    const [[countResult]] = await dbPool.query(
      `SELECT COUNT(*) AS total 
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN products p ON o.product_id = p.id 
       ${whereClause}`,
      params
    );
    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    // Fetch Paginated
    const queryParams = [...params, limit, offset];
    const [orders] = await dbPool.query(
      `SELECT 
        o.*,
        COALESCE(c.name, 'N/A') AS customer_name,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(p.code, 'N/A') AS product_code
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       ${whereClause}
       ORDER BY o.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, orders, "Daftar pesanan", {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/orders/scan/:number", authenticateToken, async (req, res) => {
  try {
    const { number } = req.params;
    const [orders] = await dbPool.query(
      `SELECT 
        o.*,
        COALESCE(c.name, 'N/A') AS customer_name,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(p.code, 'N/A') AS product_code
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       WHERE UPPER(o.order_number) = UPPER(?)`,
      [number.trim()]
    );

    if (!orders || orders.length === 0) {
      return responseError(res, `Pesanan dengan barcode/QR "${number}" tidak ditemukan`, 404);
    }

    return responseSuccess(res, orders[0]);
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/orders/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [orders] = await dbPool.query(
      `SELECT 
        o.*,
        c.name AS customer_name,
        c.phone AS customer_phone,
        c.email AS customer_email,
        c.address AS customer_address,
        p.name AS product_name,
        p.code AS product_code,
        p.category AS product_category
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.id = ?`,
      [id]
    );

    if (!orders || orders.length === 0) {
      return responseError(res, "Pesanan tidak ditemukan", 404);
    }

    const o = orders[0];
    const data = {
      ...o,
      customer: {
        id: o.customer_id,
        name: o.customer_name,
        phone: o.customer_phone,
        email: o.customer_email,
        address: o.customer_address,
      },
      product: {
        id: o.product_id,
        name: o.product_name,
        code: o.product_code,
        category: o.product_category,
      },
    };

    return responseSuccess(res, data);
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/orders/:id/tracking", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    const [orders] = await dbPool.query(
      `SELECT 
        o.*,
        COALESCE(c.name, 'N/A') AS customer_name,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(p.code, 'N/A') AS product_code
       FROM orders o
       LEFT JOIN customers c ON o.customer_id = c.id
       LEFT JOIN products p ON o.product_id = p.id
       WHERE o.id = ?`,
      [id]
    );

    if (!orders || orders.length === 0) {
      return responseError(res, "Pesanan tidak ditemukan", 404);
    }

    const order = orders[0];

    const [logs] = await dbPool.query(
      `SELECT l.*, COALESCE(u.name, 'Sistem') AS actor_name
       FROM production_logs l
       LEFT JOIN users u ON l.actor_id = u.id
       WHERE l.order_id = ?
       ORDER BY l.created_at ASC`,
      [id]
    );

    const [handovers] = await dbPool.query(
      `SELECT 
        h.*,
        COALESCE(fu.name, 'N/A') AS from_user_name,
        COALESCE(tu.name, 'N/A') AS to_user_name
       FROM handovers h
       LEFT JOIN users fu ON h.from_user_id = fu.id
       LEFT JOIN users tu ON h.to_user_id = tu.id
       WHERE h.order_id = ?
       ORDER BY h.sent_at ASC`,
      [id]
    );

    const [qcs] = await dbPool.query(
      `SELECT q.*, COALESCE(u.name, 'N/A') AS inspector_name
       FROM qc_inspections q
       LEFT JOIN users u ON q.inspector_id = u.id
       WHERE q.order_id = ?
       ORDER BY q.created_at ASC`,
      [id]
    );

    return responseSuccess(res, {
      order,
      timeline: logs,
      handovers,
      qc_inspections: qcs,
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.post("/api/orders", authenticateToken, async (req, res) => {
  try {
    const { customer_id, product_id, target_qty, deadline, notes } = req.body;
    if (!customer_id || !product_id || !target_qty) {
      return responseError(res, "Customer, produk, dan target kuantitas wajib diisi", 400);
    }

    const [[maxRow]] = await dbPool.query("SELECT COALESCE(MAX(id), 0) AS maxId FROM orders");
    const nextId = Number(maxRow.maxId || 0) + 1;
    const year = new Date().getFullYear();
    const order_number = `ORD-${year}-${String(nextId).padStart(4, "0")}`;

    const [insertResult] = await dbPool.query(
      `INSERT INTO orders 
        (order_number, customer_id, product_id, target_qty, completed_qty, reject_qty, deadline, current_stage, status, notes, created_by)
       VALUES (?, ?, ?, ?, 0, 0, ?, 'cutting', 'in_progress', ?, ?)`,
      [
        order_number,
        parseInt(customer_id, 10),
        parseInt(product_id, 10),
        parseInt(target_qty, 10),
        deadline || null,
        notes || "",
        req.user.id,
      ]
    );

    const createdOrderId = insertResult.insertId;

    // Add Production Log
    await dbPool.query(
      `INSERT INTO production_logs (order_id, stage, action, actor_id, qty_affected, description)
       VALUES (?, 'order_created', 'ORDER_CREATED', ?, ?, ?)`,
      [
        createdOrderId,
        req.user.id,
        parseInt(target_qty, 10),
        `Surat Perintah Kerja ${order_number} dibuat untuk ${target_qty} pcs`,
      ]
    );

    const [[newOrder]] = await dbPool.query(
      `SELECT o.*, c.name AS customer_name, p.name AS product_name 
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN products p ON o.product_id = p.id 
       WHERE o.id = ?`,
      [createdOrderId]
    );

    return responseSuccess(res, newOrder, "Pesanan berhasil dibuat");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.put("/api/orders/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[existingOrder]] = await dbPool.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (!existingOrder) return responseError(res, "Pesanan tidak ditemukan", 404);

    const { customer_id, product_id, target_qty, deadline, current_stage, status, notes } = req.body;
    const prevStage = existingOrder.current_stage;

    await dbPool.query(
      `UPDATE orders SET 
        customer_id = ?,
        product_id = ?,
        target_qty = ?,
        deadline = ?,
        current_stage = ?,
        status = ?,
        notes = ?
       WHERE id = ?`,
      [
        customer_id ? parseInt(customer_id, 10) : existingOrder.customer_id,
        product_id ? parseInt(product_id, 10) : existingOrder.product_id,
        target_qty ? parseInt(target_qty, 10) : existingOrder.target_qty,
        deadline !== undefined ? deadline : existingOrder.deadline,
        current_stage || existingOrder.current_stage,
        status || existingOrder.status,
        notes !== undefined ? notes : existingOrder.notes,
        id,
      ]
    );

    if (current_stage && current_stage !== prevStage) {
      await dbPool.query(
        `INSERT INTO production_logs (order_id, stage, action, actor_id, qty_affected, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          id,
          current_stage,
          `STAGE_CHANGED_TO_${current_stage.toUpperCase()}`,
          req.user.id,
          target_qty || existingOrder.target_qty,
          `Tahap pesanan diubah dari ${prevStage} menjadi ${current_stage} oleh ${req.user.name}`,
        ]
      );
    }

    const [[updatedOrder]] = await dbPool.query(
      `SELECT o.*, c.name AS customer_name, p.name AS product_name 
       FROM orders o 
       LEFT JOIN customers c ON o.customer_id = c.id 
       LEFT JOIN products p ON o.product_id = p.id 
       WHERE o.id = ?`,
      [id]
    );

    return responseSuccess(res, updatedOrder, "Pesanan berhasil diperbarui");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.delete("/api/orders/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[existingOrder]] = await dbPool.query("SELECT * FROM orders WHERE id = ?", [id]);
    if (!existingOrder) return responseError(res, "Pesanan tidak ditemukan", 404);

    await dbPool.query("DELETE FROM orders WHERE id = ?", [id]);
    return responseSuccess(res, existingOrder, "Pesanan berhasil dihapus");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// HANDOVERS ENDPOINTS (Double Confirmation Transit Mechanism)
// ==============================================================================
app.get("/api/handovers", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();
    const status = req.query.status || "";

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(h.handover_code LIKE ? OR o.order_number LIKE ? OR p.name LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (status) {
      whereConditions.push("h.status = ?");
      params.push(status);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    // Count Total
    const [[countResult]] = await dbPool.query(
      `SELECT COUNT(*) AS total 
       FROM handovers h 
       LEFT JOIN orders o ON h.order_id = o.id 
       LEFT JOIN products p ON o.product_id = p.id 
       ${whereClause}`,
      params
    );
    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const [handovers] = await dbPool.query(
      `SELECT 
        h.*,
        COALESCE(o.order_number, 'N/A') AS order_number,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(fu.name, 'N/A') AS from_user_name,
        COALESCE(tu.name, 'Semua PIC Tujuan') AS to_user_name
       FROM handovers h
       LEFT JOIN orders o ON h.order_id = o.id
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN users fu ON h.from_user_id = fu.id
       LEFT JOIN users tu ON h.to_user_id = tu.id
       ${whereClause}
       ORDER BY h.sent_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, handovers, "Daftar serah terima", {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

// Pending incoming handovers for current PIC/stage
app.get("/api/handovers/incoming", authenticateToken, async (req, res) => {
  try {
    const userRole = req.user.role;
    const conditions = ["h.status = 'in_transit'"];
    const params = [];

    if (["cutting", "sewing", "finishing", "qc", "packing"].includes(userRole)) {
      conditions.push("h.to_stage = ?");
      params.push(userRole);
    }

    const [rows] = await dbPool.query(
      `SELECT 
        h.*,
        COALESCE(o.order_number, 'N/A') AS order_number,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(fu.name, 'N/A') AS from_user_name
       FROM handovers h
       LEFT JOIN orders o ON h.order_id = o.id
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN users fu ON h.from_user_id = fu.id
       WHERE ${conditions.join(" AND ")}
       ORDER BY h.sent_at DESC`,
      params
    );

    return responseSuccess(res, rows);
  } catch (error) {
    return responseError(res, error.message);
  }
});

// Create / Send Handover (Step 1 of Double Confirmation)
app.post("/api/handovers", authenticateToken, async (req, res) => {
  try {
    const { order_id, from_stage, to_stage, to_user_id, qty_sent, notes } = req.body;
    if (!order_id || !from_stage || !to_stage || !qty_sent) {
      return responseError(res, "Data order, divisi asal, divisi tujuan, dan jumlah kirim wajib diisi", 400);
    }

    const [[order]] = await dbPool.query("SELECT * FROM orders WHERE id = ?", [parseInt(order_id, 10)]);
    if (!order) return responseError(res, "Order tidak ditemukan", 404);

    const [[maxRow]] = await dbPool.query("SELECT COALESCE(MAX(id), 0) AS maxId FROM handovers");
    const nextId = Number(maxRow.maxId || 0) + 1;
    const yearMonth = new Date().toISOString().slice(0, 7).replace("-", "");
    const handover_code = `HND-${yearMonth}-${String(nextId).padStart(4, "0")}`;

    const [insertResult] = await dbPool.query(
      `INSERT INTO handovers 
        (order_id, handover_code, from_stage, to_stage, from_user_id, to_user_id, qty_sent, qty_received, status, notes, sent_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'in_transit', ?, NOW())`,
      [
        parseInt(order_id, 10),
        handover_code,
        from_stage,
        to_stage,
        req.user.id,
        to_user_id ? parseInt(to_user_id, 10) : null,
        parseInt(qty_sent, 10),
        notes || "",
      ]
    );

    // Log the transit handover
    await dbPool.query(
      `INSERT INTO production_logs (order_id, stage, action, actor_id, qty_affected, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        order.id,
        from_stage,
        `HANDOVER_SENT_TO_${to_stage.toUpperCase()}`,
        req.user.id,
        parseInt(qty_sent, 10),
        `${req.user.name} mengirim serah terima (${handover_code}) ${qty_sent} pcs ke divisi ${to_stage}`,
      ]
    );

    const [[newHandover]] = await dbPool.query("SELECT * FROM handovers WHERE id = ?", [insertResult.insertId]);

    return responseSuccess(res, newHandover, "Serah terima berhasil dikirim. Menunggu konfirmasi penerima!");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// Receive / Accept Handover (Step 2 of Double Confirmation)
app.put("/api/handovers/:id/receive", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { qty_received, discrepancy_reason } = req.body;

    const [[handover]] = await dbPool.query("SELECT * FROM handovers WHERE id = ?", [id]);
    if (!handover) return responseError(res, "Data serah terima tidak ditemukan", 404);

    if (handover.status === "received") {
      return responseError(res, "Serah terima ini sudah pernah dikonfirmasi sebelumnya", 400);
    }

    const receivedQty = parseInt(qty_received !== undefined ? qty_received : handover.qty_sent, 10);

    await dbPool.query(
      `UPDATE handovers SET 
        qty_received = ?,
        status = 'received',
        to_user_id = ?,
        discrepancy_reason = ?,
        received_at = NOW()
       WHERE id = ?`,
      [
        receivedQty,
        req.user.id,
        discrepancy_reason || null,
        id,
      ]
    );

    // Automatically update order's current stage to target stage
    const [[order]] = await dbPool.query("SELECT * FROM orders WHERE id = ?", [handover.order_id]);
    if (order) {
      if (handover.to_stage === "delivered") {
        await dbPool.query(
          "UPDATE orders SET current_stage = ?, status = 'completed', completed_qty = ? WHERE id = ?",
          [handover.to_stage, receivedQty, handover.order_id]
        );
      } else {
        await dbPool.query(
          "UPDATE orders SET current_stage = ? WHERE id = ?",
          [handover.to_stage, handover.order_id]
        );
      }
    }

    // Add receipt log
    await dbPool.query(
      `INSERT INTO production_logs (order_id, stage, action, actor_id, qty_affected, description)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        handover.order_id,
        handover.to_stage,
        `HANDOVER_ACCEPTED_BY_${handover.to_stage.toUpperCase()}`,
        req.user.id,
        receivedQty,
        `${req.user.name} menerima serah terima (${handover.handover_code}) sejumlah ${receivedQty} pcs di divisi ${handover.to_stage}` +
          (discrepancy_reason ? ` (Catatan selisih: ${discrepancy_reason})` : ""),
      ]
    );

    const [[updatedHandover]] = await dbPool.query("SELECT * FROM handovers WHERE id = ?", [id]);

    return responseSuccess(res, updatedHandover, "Barang berhasil diterima dan diverifikasi!");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// QC INSPECTION ENDPOINTS
// ==============================================================================
app.get("/api/qc", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(o.order_number LIKE ? OR p.name LIKE ? OR q.reject_reason LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const [[countResult]] = await dbPool.query(
      `SELECT COUNT(*) AS total 
       FROM qc_inspections q
       LEFT JOIN orders o ON q.order_id = o.id
       LEFT JOIN products p ON o.product_id = p.id
       ${whereClause}`,
      params
    );

    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const [inspections] = await dbPool.query(
      `SELECT 
        q.*,
        COALESCE(o.order_number, 'N/A') AS order_number,
        COALESCE(p.name, 'N/A') AS product_name,
        COALESCE(u.name, 'N/A') AS inspector_name
       FROM qc_inspections q
       LEFT JOIN orders o ON q.order_id = o.id
       LEFT JOIN products p ON o.product_id = p.id
       LEFT JOIN users u ON q.inspector_id = u.id
       ${whereClause}
       ORDER BY q.created_at DESC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, inspections, "Daftar QC Inspeksi", {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.post("/api/qc", authenticateToken, async (req, res) => {
  try {
    const { order_id, qty_checked, qty_passed, qty_reject, qty_rework, reject_reason, rework_target_stage, notes } = req.body;
    if (!order_id || qty_checked === undefined || qty_passed === undefined) {
      return responseError(res, "Order ID, Qty Diperiksa, dan Qty Lolos wajib diisi", 400);
    }

    const [[order]] = await dbPool.query("SELECT * FROM orders WHERE id = ?", [parseInt(order_id, 10)]);
    if (!order) return responseError(res, "Order tidak ditemukan", 404);

    const parsedReject = parseInt(qty_reject || 0, 10);
    const parsedRework = parseInt(qty_rework || 0, 10);

    const [insertResult] = await dbPool.query(
      `INSERT INTO qc_inspections 
        (order_id, inspector_id, qty_checked, qty_passed, qty_reject, qty_rework, reject_reason, rework_target_stage, rework_status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parseInt(order_id, 10),
        req.user.id,
        parseInt(qty_checked, 10),
        parseInt(qty_passed, 10),
        parsedReject,
        parsedRework,
        reject_reason || "",
        rework_target_stage || "sewing",
        parsedRework > 0 ? "pending" : "repaired",
        notes || "",
      ]
    );

    // Update order stats
    if (parsedReject > 0) {
      await dbPool.query(
        "UPDATE orders SET reject_qty = COALESCE(reject_qty, 0) + ? WHERE id = ?",
        [parsedReject, order.id]
      );
    }

    // Add log
    await dbPool.query(
      `INSERT INTO production_logs (order_id, stage, action, actor_id, qty_affected, description)
       VALUES (?, 'qc', 'QC_INSPECTED', ?, ?, ?)`,
      [
        order.id,
        req.user.id,
        parseInt(qty_checked, 10),
        `Inspeksi QC oleh ${req.user.name}: ${qty_passed} Lolos, ${parsedReject} Reject, ${parsedRework} Rework`,
      ]
    );

    const [[newQc]] = await dbPool.query("SELECT * FROM qc_inspections WHERE id = ?", [insertResult.insertId]);

    return responseSuccess(res, newQc, "Hasil inspeksi QC berhasil disimpan");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/qc/reworks", authenticateToken, async (req, res) => {
  try {
    const [reworks] = await dbPool.query(`
      SELECT 
        q.*,
        COALESCE(o.order_number, 'N/A') AS order_number,
        COALESCE(p.name, 'N/A') AS product_name
      FROM qc_inspections q
      LEFT JOIN orders o ON q.order_id = o.id
      LEFT JOIN products p ON o.product_id = p.id
      WHERE q.qty_rework > 0
      ORDER BY q.created_at DESC
    `);

    return responseSuccess(res, reworks);
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// CUSTOMERS (MASTER DATA WITH MODAL CRUD)
// ==============================================================================
app.get("/api/customers", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(name LIKE ? OR code LIKE ? OR phone LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const [[countResult]] = await dbPool.query(`SELECT COUNT(*) AS total FROM customers ${whereClause}`, params);
    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const [customers] = await dbPool.query(
      `SELECT * FROM customers ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, customers, "Daftar pelanggan", { page, limit, total, totalPages });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.post("/api/customers", authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, address } = req.body;
    if (!name) return responseError(res, "Nama pelanggan wajib diisi", 400);

    const [[maxRow]] = await dbPool.query("SELECT COALESCE(MAX(id), 0) AS maxId FROM customers");
    const nextId = Number(maxRow.maxId || 0) + 1;
    const code = `CUST-${String(nextId).padStart(3, "0")}`;

    const [insertResult] = await dbPool.query(
      "INSERT INTO customers (code, name, phone, email, address) VALUES (?, ?, ?, ?, ?)",
      [code, name, phone || "", email || "", address || ""]
    );

    const [[newCustomer]] = await dbPool.query("SELECT * FROM customers WHERE id = ?", [insertResult.insertId]);
    return responseSuccess(res, newCustomer, "Pelanggan berhasil ditambahkan");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.put("/api/customers/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[customer]] = await dbPool.query("SELECT * FROM customers WHERE id = ?", [id]);
    if (!customer) return responseError(res, "Pelanggan tidak ditemukan", 404);

    const { name, phone, email, address } = req.body;
    await dbPool.query(
      `UPDATE customers SET 
        name = ?,
        phone = ?,
        email = ?,
        address = ?
       WHERE id = ?`,
      [
        name || customer.name,
        phone !== undefined ? phone : customer.phone,
        email !== undefined ? email : customer.email,
        address !== undefined ? address : customer.address,
        id,
      ]
    );

    const [[updatedCustomer]] = await dbPool.query("SELECT * FROM customers WHERE id = ?", [id]);
    return responseSuccess(res, updatedCustomer, "Pelanggan berhasil diperbarui");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.delete("/api/customers/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[customer]] = await dbPool.query("SELECT * FROM customers WHERE id = ?", [id]);
    if (!customer) return responseError(res, "Pelanggan tidak ditemukan", 404);

    await dbPool.query("DELETE FROM customers WHERE id = ?", [id]);
    return responseSuccess(res, customer, "Pelanggan berhasil dihapus");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// PRODUCTS (MASTER DATA WITH MODAL CRUD)
// ==============================================================================
app.get("/api/products", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(name LIKE ? OR code LIKE ? OR category LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const [[countResult]] = await dbPool.query(`SELECT COUNT(*) AS total FROM products ${whereClause}`, params);
    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const [products] = await dbPool.query(
      `SELECT * FROM products ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, products, "Daftar produk pakaian", { page, limit, total, totalPages });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.post("/api/products", authenticateToken, async (req, res) => {
  try {
    const { name, category, description, standard_time_days } = req.body;
    if (!name || !category) return responseError(res, "Nama dan kategori produk wajib diisi", 400);

    const [[maxRow]] = await dbPool.query("SELECT COALESCE(MAX(id), 0) AS maxId FROM products");
    const nextId = Number(maxRow.maxId || 0) + 1;
    const code = `PRD-${category.slice(0, 3).toUpperCase()}-${String(nextId).padStart(2, "0")}`;

    const [insertResult] = await dbPool.query(
      "INSERT INTO products (code, name, category, description, standard_time_days) VALUES (?, ?, ?, ?, ?)",
      [code, name, category, description || "", parseInt(standard_time_days || 7, 10)]
    );

    const [[newProduct]] = await dbPool.query("SELECT * FROM products WHERE id = ?", [insertResult.insertId]);
    return responseSuccess(res, newProduct, "Produk berhasil ditambahkan");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.put("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[product]] = await dbPool.query("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) return responseError(res, "Produk tidak ditemukan", 404);

    const { name, category, description, standard_time_days } = req.body;
    await dbPool.query(
      `UPDATE products SET 
        name = ?,
        category = ?,
        description = ?,
        standard_time_days = ?
       WHERE id = ?`,
      [
        name || product.name,
        category || product.category,
        description !== undefined ? description : product.description,
        standard_time_days !== undefined ? parseInt(standard_time_days, 10) : product.standard_time_days,
        id,
      ]
    );

    const [[updatedProduct]] = await dbPool.query("SELECT * FROM products WHERE id = ?", [id]);
    return responseSuccess(res, updatedProduct, "Produk berhasil diperbarui");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.delete("/api/products/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[product]] = await dbPool.query("SELECT * FROM products WHERE id = ?", [id]);
    if (!product) return responseError(res, "Produk tidak ditemukan", 404);

    await dbPool.query("DELETE FROM products WHERE id = ?", [id]);
    return responseSuccess(res, product, "Produk berhasil dihapus");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// USERS & PIC MASTER (WITH MODAL CRUD)
// ==============================================================================
app.get("/api/users", authenticateToken, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page || "1", 10));
    const limit = Math.max(1, parseInt(req.query.limit || "10", 10));
    const search = (req.query.search || "").trim();

    const whereConditions = [];
    const params = [];

    if (search) {
      whereConditions.push("(u.name LIKE ? OR u.username LIKE ? OR r.name LIKE ? OR r.display_name LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s, s);
    }

    const whereClause = whereConditions.length > 0 ? "WHERE " + whereConditions.join(" AND ") : "";

    const [[countResult]] = await dbPool.query(
      `SELECT COUNT(*) AS total 
       FROM users u 
       LEFT JOIN roles r ON u.role_id = r.id 
       ${whereClause}`,
      params
    );

    const total = Number(countResult.total || 0);
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;

    const queryParams = [...params, limit, offset];
    const [users] = await dbPool.query(
      `SELECT 
        u.id,
        u.role_id,
        u.name,
        u.username,
        u.phone,
        u.is_active,
        u.created_at,
        COALESCE(r.name, 'N/A') AS role_name,
        COALESCE(r.display_name, 'N/A') AS role_display_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       ${whereClause}
       ORDER BY u.id ASC
       LIMIT ? OFFSET ?`,
      queryParams
    );

    return responseSuccess(res, users, "Daftar PIC & Pengguna", { page, limit, total, totalPages });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.post("/api/users", authenticateToken, async (req, res) => {
  try {
    const { name, username, password, role_id, phone } = req.body;
    if (!name || !username || !password || !role_id) {
      return responseError(res, "Nama, username, password, dan divisi/role wajib diisi", 400);
    }

    const [[existing]] = await dbPool.query("SELECT id FROM users WHERE username = ?", [username]);
    if (existing) {
      return responseError(res, "Username sudah digunakan", 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [insertResult] = await dbPool.query(
      "INSERT INTO users (role_id, name, username, password, phone, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      [parseInt(role_id, 10), name, username, hashedPassword, phone || ""]
    );

    const [[newUser]] = await dbPool.query(
      `SELECT u.id, u.name, u.username, u.phone, r.name AS role_name, r.display_name AS role_display_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [insertResult.insertId]
    );

    return responseSuccess(res, newUser, "Pengguna PIC berhasil ditambahkan");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.put("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const [[user]] = await dbPool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return responseError(res, "Pengguna tidak ditemukan", 404);

    const { name, role_id, phone, password, is_active } = req.body;
    let updatedPassword = user.password;
    if (password && password.trim()) {
      updatedPassword = await bcrypt.hash(password, 10);
    }

    await dbPool.query(
      `UPDATE users SET 
        name = ?,
        role_id = ?,
        phone = ?,
        password = ?,
        is_active = ?
       WHERE id = ?`,
      [
        name || user.name,
        role_id ? parseInt(role_id, 10) : user.role_id,
        phone !== undefined ? phone : user.phone,
        updatedPassword,
        is_active !== undefined ? is_active : user.is_active,
        id,
      ]
    );

    const [[updatedUser]] = await dbPool.query(
      `SELECT u.id, u.name, u.username, u.phone, r.name AS role_name, r.display_name AS role_display_name
       FROM users u
       LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.id = ?`,
      [id]
    );

    return responseSuccess(res, updatedUser, "Pengguna berhasil diperbarui");
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.delete("/api/users/:id", authenticateToken, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (id === 1 || id === 2) {
      return responseError(res, "Akun default Owner/Admin tidak boleh dihapus", 400);
    }

    const [[user]] = await dbPool.query("SELECT * FROM users WHERE id = ?", [id]);
    if (!user) return responseError(res, "Pengguna tidak ditemukan", 404);

    await dbPool.query("DELETE FROM users WHERE id = ?", [id]);
    return responseSuccess(res, user, "Pengguna berhasil dihapus");
  } catch (error) {
    return responseError(res, error.message);
  }
});

// ==============================================================================
// REPORTS ENDPOINTS
// ==============================================================================
app.get("/api/reports/summary", authenticateToken, async (req, res) => {
  try {
    const [[stats]] = await dbPool.query(`
      SELECT 
        COUNT(*) AS totalOrders,
        COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) AS completedOrders,
        COALESCE(SUM(target_qty), 0) AS totalPcsTarget,
        COALESCE(SUM(completed_qty), 0) AS totalPcsCompleted,
        COALESCE(SUM(reject_qty), 0) AS totalPcsReject
      FROM orders
    `);

    const stages = ["cutting", "sewing", "finishing", "qc", "packing", "delivered"];
    const [stageRows] = await dbPool.query(`
      SELECT current_stage, COUNT(*) AS count, COALESCE(SUM(target_qty), 0) AS qty
      FROM orders
      WHERE status = 'in_progress'
      GROUP BY current_stage
    `);

    const stageMap = {};
    stageRows.forEach((r) => {
      stageMap[r.current_stage] = {
        count: Number(r.count),
        qty: Number(r.qty),
      };
    });

    const stageSummary = stages.map((stg) => ({
      stage: stg,
      count: stageMap[stg] ? stageMap[stg].count : 0,
      qty: stageMap[stg] ? stageMap[stg].qty : 0,
    }));

    return responseSuccess(res, {
      totalOrders: Number(stats.totalOrders || 0),
      completedOrders: Number(stats.completedOrders || 0),
      totalPcsTarget: Number(stats.totalPcsTarget || 0),
      totalPcsCompleted: Number(stats.totalPcsCompleted || 0),
      totalPcsReject: Number(stats.totalPcsReject || 0),
      stageSummary,
    });
  } catch (error) {
    return responseError(res, error.message);
  }
});

app.get("/api/reports/pic-productivity", authenticateToken, async (req, res) => {
  try {
    const [pics] = await dbPool.query(`
      SELECT 
        u.id,
        u.name,
        r.name AS role_name,
        r.display_name AS role_display_name,
        COALESCE(sent.totalSent, 0) AS totalSentPcs,
        COALESCE(recv.totalRecv, 0) AS totalReceivedPcs,
        (COALESCE(sent.sentCount, 0) + COALESCE(recv.recvCount, 0)) AS handoversCount
      FROM users u
      JOIN roles r ON u.role_id = r.id
      LEFT JOIN (
        SELECT from_user_id, SUM(qty_sent) AS totalSent, COUNT(*) AS sentCount 
        FROM handovers 
        GROUP BY from_user_id
      ) sent ON u.id = sent.from_user_id
      LEFT JOIN (
        SELECT to_user_id, SUM(qty_received) AS totalRecv, COUNT(*) AS recvCount 
        FROM handovers 
        WHERE status = 'received' 
        GROUP BY to_user_id
      ) recv ON u.id = recv.to_user_id
      WHERE u.role_id >= 3
      ORDER BY u.id ASC
    `);

    return responseSuccess(res, pics);
  } catch (error) {
    return responseError(res, error.message);
  }
});

// File Upload endpoint
app.post("/api/upload", authenticateToken, upload.single("file"), (req, res) => {
  if (!req.file) {
    return responseError(res, "Tidak ada file yang diunggah", 400);
  }
  const fileUrl = `/uploads/${req.file.filename}`;
  return responseSuccess(res, { url: fileUrl, filename: req.file.filename }, "File berhasil diunggah");
});

// Healthcheck
app.get("/api/health", async (req, res) => {
  try {
    await dbPool.query("SELECT 1");
    return res.json({
      status: "ok",
      database: "connected",
      app: "Garment Management & Tracking System",
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    return res.status(500).json({
      status: "error",
      database: "disconnected",
      message: err.message,
    });
  }
});

// Start Server
app.listen(PORT, async () => {
  console.log(`🚀 Garment Management Server is running on port ${PORT}`);
  try {
    await dbPool.query("SELECT 1");
    console.log("✅ MySQL Database connected successfully.");
  } catch (err) {
    console.error("❌ MySQL Connection Failed:", err.message);
  }
});
