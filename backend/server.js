const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");

const app = express();

app.use(cors());
app.use(bodyParser.json());

const mysqlConfig = {
  host: process.env.DB_HOST || "db",
  port: process.env.DB_PORT || "3306",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "pass123",
  database: process.env.DB_NAME || "appdb",
};

let con = null;

// Connect to MySQL
const databaseInit = () => {
  con = mysql.createConnection(mysqlConfig);

  con.connect((err) => {
    if (err) {
      console.error("Error connecting to the database:", err);
      return;
    }

    console.log("Connected to the database");
  });
};

// Create database
const createDatabase = () => {
  con.query(
    "CREATE DATABASE IF NOT EXISTS appdb",
    (err, results) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("Database created successfully");
    }
  );
};

// Create table
const createTable = () => {
  con.query(
    `CREATE TABLE IF NOT EXISTS apptb (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    )`,
    (err, results) => {
      if (err) {
        console.error(err);
        return;
      }

      console.log("Table created successfully");
    }
  );
};

// ============================
// READ - Get all users
// ============================
app.get("/user", (req, res) => {
  databaseInit();

  con.query(
    "SELECT * FROM apptb",
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Error retrieving data from database");
      }

      res.json(results);
    }
  );
});

// ============================
// CREATE - Add a user
// ============================
app.post("/user", (req, res) => {
  const { data } = req.body;

  if (!data) {
    return res.status(400).send("Name is required");
  }

  if (!con) {
    databaseInit();
  }

  con.query(
    "INSERT INTO apptb (name) VALUES (?)",
    [data],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Error inserting data into database");
      }

      res.json({
        message: "User created successfully",
        id: results.insertId,
        name: data,
      });
    }
  );
});

// ============================
// UPDATE - Update a user
// ============================
app.put("/user/:id", (req, res) => {
  const { id } = req.params;
  const { data } = req.body;

  if (!data) {
    return res.status(400).send("Name is required");
  }

  if (!con) {
    databaseInit();
  }

  con.query(
    "UPDATE apptb SET name = ? WHERE id = ?",
    [data, id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Error updating data in database");
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("User not found");
      }

      res.json({
        message: "User updated successfully",
        id: id,
        name: data,
      });
    }
  );
});

// ============================
// DELETE - Delete a user
// ============================
app.delete("/user/:id", (req, res) => {
  const { id } = req.params;

  if (!con) {
    databaseInit();
  }

  con.query(
    "DELETE FROM apptb WHERE id = ?",
    [id],
    (err, results) => {
      if (err) {
        console.error(err);
        return res
          .status(500)
          .send("Error deleting data from database");
      }

      if (results.affectedRows === 0) {
        return res.status(404).send("User not found");
      }

      res.json({
        message: "User deleted successfully",
        id: id,
      });
    }
  );
});

// ============================
// Database initialization
// ============================
app.post("/dbinit", (req, res) => {
  databaseInit();
  createDatabase();

  res.json("Database created successfully");
});

// ============================
// Table initialization
// ============================
app.post("/tbinit", (req, res) => {
  if (!con) {
    databaseInit();
  }

  createTable();

  res.json("Table created successfully");
});

// ============================
// Start server
// ============================
app.listen(3000, () => {
  console.log("Server running on port 3000");
});