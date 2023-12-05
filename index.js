const path = require("path");
const express = require("express");
const pg = require("pg");

const bcrypt = require("bcrypt");
const session = require("express-session");
const crypto = require("crypto");
const secret = crypto.randomBytes(64).toString("hex");
let username;
let password;
const saltRounds = 10;
const app = express();

app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 500, // Session expires after 12 hours
    },
  })
);

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
    .from("accountManager")
    .then((countrys) => {
      res.render("index", { mycountrys: countrys });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err });
    });
});

app.post("/login", async (req, res) => {
  try {
    username = req.body.username;
    password = req.body.password;
    console.log("Username:", username, "Password:", password);

    const user = await knex
      .select("username", "password")
      .from("accountManager")
      .where("username", username)
      .then(user);

    if (user.rows.length > 0) {
      const validPassword = await bcrypt.compare(
        password,
        user.rows[0].password
      );
      if (validPassword) {
        req.session.user = {
          username: user.rows[0].username,
        };
        res.render("home");
      } else {
        res.status(400).send("Invalid username or password");
      }
    } else {
      res.status(400).send("Invalid username or password");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

app.post("/register", async (req, res) => {
  try {
    const new_username = req.body.newusername;
    const new_password = req.body.newpassword;
    const passwordConf = req.body.passwordConf;

    // console.log("Username:", new_username, "Password:", new_password);

    if (!new_password) {
      return res.status(400).send("Password is required");
    }

    if (new_password != passwordConf) {
      return res.status(400).send("Passwords need to match");
    }

    const userExists = await knex
      .select("username", "password")
      .from("accountManager")
      .where("username", new_username);

    // console.log(userExists);
    if (userExists == "[]") {
      return res.status(400).send("Username already taken.");
    }

    const hashPass = await bcrypt.hash(new_password, saltRounds);

    const newUser = await knex("accountManager")
      .insert({
        username: new_username,
        password: hashPass,
      })
      .returning("*");

    res.status(201).send("User created successfully");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error registering new user");
  }
});

function checkAuthentication(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.render("index");
  }
}

app.get("/social", (req, res) => {
  res.render("social_media");
});

app.get("/loginpage", (req, res) => {
  res.render("login");
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
