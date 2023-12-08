// Index 2023 Project
// Evan Neff, Thomas Nielsen, Zach Edgerton, Tristan McLaughlin
// Section 04 - Group 14
// ProvoMediaHealth.com
////////////////////////////////////////////////
// This is the main hub for our website. This code handles all the requests that
// come into the site and directs them to anywhere they need to go. This code is made up
// of various routes that allow for the website to direct users where they need / want
// to go.
////////////////////////////////////////////////

// Importing required modules
const path = require("path");
const express = require("express");
const pg = require("pg");
const bcrypt = require("bcrypt");
const session = require("express-session");
const crypto = require("crypto");

// Generating a secret for the session
const secret = crypto.randomBytes(64).toString("hex");

// Variables for storing username and password
let username;
let password;

// Number of rounds for bcrypt salt
const saltRounds = 10;

// Creating an Express app
const app = express();

// Middleware to parse JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(
  session({
    secret: secret,
    resave: false,
    saveUninitialized: true,
    cookie: {
      secure: false,
      maxAge: 24 * 60 * 60 * 500,
    },
  })
);

// Serving static files from 'public' directory
app.use(express.static("public"));

// Setting the port for the server
const port = process.env.PORT || 3000;

// Setting EJS as the view engine
app.set("view engine", "ejs");

// Middleware for checking if a user is authenticated
function checkAuthentication(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.render("login");
  }
}

// Middleware to enforce HTTPS in production
app.use((req, res, next) => {
  if (!req.secure && req.get("x-forwarded-proto") !== "https") {
    return res.redirect("https://" + req.get("host") + req.url);
  }
  next();
});

// Configuring knex for PostgreSQL database access
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

// Route for the home page
app.get("/", (req, res) => {
  if (req.session.user) {
    res.render("admin");
  } else {
    res.render("index");
  }
});

// Route for handling login
app.post("/login", async (req, res) => {
  try {
    username = req.body.username;
    password = req.body.password;
    const result = await knex
      .select("username", "password")
      .from("accountManager")
      .where("username", username);

    if (result.length > 0) {
      const user = result[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        req.session.user = {
          username: user.username,
        };
        res.render("admin");
      } else {
        res.render("login", { message: "Incorrect password" });
      }
    } else {
      res.render("login", { message: "Incorrect username or password" });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});

// Route for handling logout
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send("Could not log out");
    } else {
      res.render("index");
    }
  });
});

// Route for handling creation of new account
app.post("/register", checkAuthentication, async (req, res) => {
  try {
    const new_username = req.body.new_username;
    const new_password = req.body.new_password;
    const passwordConf = req.body.passwordConf;

    console.log("Username:", new_username, "Password:", new_password);

    if (!new_password) {
      res.render("account", { message: "Password is required" });
      // return res.status(400).send("Password is required");
    }

    if (new_password != passwordConf) {
      res.render("account", { message: "Passwords need to match" });
      // return res.status(400).send("Passwords need to match");
    }

    const userExists = await knex
      .select("username", "password")
      .from("accountManager")
      .where("username", new_username);

    // console.log(userExists);
    if (userExists == "[]") {
      res.render("account", { message: "Username already taken" });
      // return res.status(400).send("Username already taken.");
    }

    const hashPass = await bcrypt.hash(new_password, saltRounds);

    const newUser = await knex("accountManager").insert({
      username: new_username,
      password: hashPass,
    });
    res.redirect("/accountview");
    // res.render("accountview");
  } catch (error) {
    console.error(error);
    res.render("account", { message: "Error registering new user" });
    // res.status(500).send("Error registering new user");
  }
});

// Additional routes for various functionalities like survey submission, account management, etc.
app.get("/success", (req, res) => {
  res.render("thankyou");
});

app.get("/error", (req, res) => {
  res.render("error");
});

app.post("/submit-survey", async (req, res) => {
  try {
    const {
      question1: Age,
      question2: Gender,
      question3: RelationshipStatus,
      question4: OccuStatus,
      question5: OrgAffiliation,
      question6: SMUse,
      question7: platforms,
      question8: AvgTime,
      question9: UseWOPurpose,
      question10: SMDistraction,
      question11: Restless,
      question12: GenDisctracted,
      question13: BotheredWorries,
      question14: Concentration,
      question15: Comparison,
      question16: CompFeelings,
      question17: Validation,
      question18: Depressed,
      question19: DailyInterestFluctuation,
      question20: SleepIssues,
    } = req.body;
    console.log("Validation Variable");
    console.log(Validation);
    console.log("Age Varibale");
    console.log(Age);
    console.log(parseInt(Age));

    const platformsArray = Array.isArray(platforms) ? platforms : [platforms];

    await knex.transaction(async (trx) => {
      const insertResult = await trx("main")
        .insert({
          timestamp: trx.raw("current_timestamp"),
          age: parseInt(Age),
          gender: Gender,
          relationshipStatus: RelationshipStatus,
          occupationStatus: OccuStatus,
          mediaUse: SMUse,
          mediaDailyAvg: AvgTime,
          mediaWOPurpose: UseWOPurpose,
          distractedBusy: SMDistraction,
          restlessness: Restless,
          distractedGeneral: GenDisctracted,
          botheredWorry: BotheredWorries,
          concentration: Concentration,
          comparison: Comparison,
          compFeelings: CompFeelings,
          validation: Validation,
          depressed: Depressed,
          dailyInterestFluctuations: DailyInterestFluctuation,
          sleepIssues: SleepIssues,
          Location: "Provo",
        })
        .returning("anonymousID");
      const anonID = insertResult[0].anonymousID;

      if (platformsArray && platformsArray.length > 0) {
        const platformInserts = platformsArray.map((platform) => ({
          anonID: parseInt(anonID),
          platformNum: platform,
        }));

        await trx("platformUser").insert(platformInserts);
      }
      await trx("organizationUser").insert({
        anonID: anonID,
        organizationNum: OrgAffiliation,
      });
    });
    res.json({ message: "Survey response submitted successfully" });
  } catch (error) {
    console.error("Error submitting survey response:", error);
    res.status(500).send("Error submitting survey response");
  }
});

app.get("/loginpage", (req, res) => {
  res.render("login");
});

app.get("/admin", checkAuthentication, (req, res) => {
  res.render("admin");
});

app.get("/accounts", checkAuthentication, (req, res) => {
  res.render("accounts");
});

app.get("/report", checkAuthentication, async (req, res) => {
  try {
    const drop = req.query.dropdown || "All Users";
    let intex_db;
    drop_db = await knex.select().from("main").orderBy("anonymousID", "desc");

    if (drop == "All Users") {
      intex_db = await knex
        .select()
        .from("main")
        .orderBy("anonymousID", "desc");
    } else {
      intex_db = await knex
        .select()
        .from("main")
        .where("anonymousID", drop)
        .orderBy("anonymousID", "desc");
    }
    drop_db.push("All Users");

    res.render("report", { intex_db: intex_db, drop_db: drop_db });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).send("Internal Server Error");
  }
});

app.get("/accountview", checkAuthentication, (req, res) => {
  knex
    .select()
    .from("accountManager")
    .then((thing) => {
      res.render("accountview", { myAccounts: thing });
    });
});

app.get("/editAccount/:id", checkAuthentication, (req, res) => {
  knex
    .select("username", "password")
    .from("accountManager")
    .where("username", req.params.id)
    .then((thing) => {
      res.render("editAccount", { myAccount: thing });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err });
    });
});

app.post(
  "/editAccountReal/:username",
  checkAuthentication,
  async (req, res) => {
    if (req.params.username != "admin") {
      const { password: update_password } = req.body;
      const newHashPass = await bcrypt.hash(update_password, saltRounds);
      knex("accountManager")
        .where("username", req.params.username)
        .update({
          password: newHashPass,
        })
        .then((rowsAffected) => {
          console.log("Rows affected:", rowsAffected);
          if (rowsAffected > 0) {
            res.redirect("/accountview");
          } else {
            res.status(404).send("Account not found or no changes made.");
          }
        })
        .catch((err) => {
          console.error(err);
          res.status(500).send("Error updating account. Please try again.");
        });
    } else {
      res.status(404).send("You cannot edit admin username or password");
    }
  }
);

app.post("/deleteAccount/:username", checkAuthentication, (req, res) => {
  const username = req.params.username;
  knex("accountManager")
    .where("username", username)
    .del()
    .then(() => {
      res.redirect("/accountview");
    })
    .catch((err) => {
      console.error(err);
      res.status(500).send("Internal Server Error");
    });
});

app.get("/survey", (req, res) => {
  res.render("survey");
});

// Starting the server on the port 3000
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
