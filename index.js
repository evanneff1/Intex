const path = require("path");
const express = require("express");
const pg = require("pg");

const app = express();
app.set("view engine", "ejs");

const port = process.env.PORT || 3000;
app.use(express.urlencoded({ extended: true }));

app.use((req, res, next) => {
  if (!req.secure && req.get("x-forwarded-proto") !== "https") {
    return res.redirect("https://" + req.get("host") + req.url);
  }
  next();
});

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.DB_ENDPOINT || "localhost",
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "mn4Fkv5qp8gcEne",
    database: process.env.DB_NAME || "bucketlist",
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
    .from("accountManager")
    .then((countrys) => {
      res.render("index", { mycountrys: countrys });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err });
    });
});

app.get("/social", (req, res) => {
  res.render("social_media");
});

app.get("/accounts", (req, res) => {
  res.render("accounts");
});

app.get("/report", (req, res) => {
  res.render("report");
});

app.get("/survey", (req, res) => {
  res.render("survey");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
