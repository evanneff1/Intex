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
    host:
      process.env.DB_ENDPOINT ||
      "intexdb.cn3jygf26agk.us-east-1.rds.amazonaws.com",
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "2BacN966J1da5F1",
    database: process.env.DB_NAME || "intexDB",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_SSL ? { rejectUnauthorized: false } : false,
  },
});

// app.get("/", (req, res) => {
//   res.render("index");
// });

app.get("/", (req, res) => {
  knex
    .select()
    .from("users")
    .then((countrys) => {
      res.render("index", { mycountrys: countrys });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err });
    });
});

app.get("/account", (req, res) => {
  res.render("account");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
