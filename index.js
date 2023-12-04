const path = require("path");
const express = require("express");
const pg = require("pg");

const app = express();
app.set("view engine", "ejs");

const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.DB_ENDPOINT || "localhost",
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "mn4Fkv5qp8gcEne",
    database: process.env.DB_NAME || "bucketlist",
    port: process.env.RDS_PORT || 5432,
    // ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  },
});

app.get("/", (req, res) => {
  res.render("index");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
