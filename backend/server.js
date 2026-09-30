const express = require("express");
const mysql = require("mysql2/promise");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// MySQL configuration
const dbConfig = {
  host: process.env.DB_HOST || "db",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "pass123",
  database: process.env.DB_NAME || "appdb",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// MySQL connection pool
const pool = mysql.createPool(dbConfig);

// Health check endpoint
app.get("/health", async (req, res) => {
  try {
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    res.status(200).json({
      status: "OK",
      message: "API and database are healthy"
    });
  } catch (error) {
    console.error("Health check failed:", error);

    res.status(500).json({
      status: "ERROR",
      message: "Database connection failed"
    });
  }
});

// Get all employees
app.get("/user", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM apptb");
    res.status(200).json(rows);
  } catch (error) {
    console.error("GET /user error:", error);
    res.status(500).json({
      error: "Failed to fetch employees",
      details: error.message
    });
  }
});

// Create employee
app.post("/user", async (req, res) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "name is required"
      });
    }

    const [result] = await pool.query(
      "INSERT INTO apptb (name) VALUES (?)",
      [name]
    );

    res.status(201).json({
      message: "Employee created successfully",
      id: result.insertId
    });
  } catch (error) {
    console.error("POST /user error:", error);

    res.status(500).json({
      error: "Failed to create employee",
      details: error.message
    });
  }
});

// Update employee
app.put("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({
        error: "name is required"
      });
    }

    const [result] = await pool.query(
      "UPDATE apptb SET name = ? WHERE id = ?",
      [name, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Employee not found"
      });
    }

    res.status(200).json({
      message: "Employee updated successfully"
    });
  } catch (error) {
    console.error("PUT /user/:id error:", error);

    res.status(500).json({
      error: "Failed to update employee",
      details: error.message
    });
  }
});

// Delete employee
app.delete("/user/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.query(
      "DELETE FROM apptb WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        error: "Employee not found"
      });
    }

    res.status(200).json({
      message: "Employee deleted successfully"
    });
  } catch (error) {
    console.error("DELETE /user/:id error:", error);
    res.status(500).json({
      error: "Failed to delete employee",
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
