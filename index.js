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

app.use(express.static("public"));

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

    const result = await knex
      .select("username", "password")
      .from("accountManager")
      .where("username", username);

    console.log(result);
    if (result.length > 0) {
      const user = result[0];
      const validPassword = await bcrypt.compare(password, user.password);
      if (validPassword) {
        req.session.user = {
          username: user.username,
        };
        res.render("report");
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
    const new_username = req.body.new_username;
    const new_password = req.body.new_password;
    const passwordConf = req.body.passwordConf;

    console.log("Username:", new_username, "Password:", new_password);

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

    const newUser = await knex("accountManager").insert({
      username: new_username,
      password: hashPass,
    });

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
app.post("/submit-survey", async (req, res) => {
  try {
    const {
      Age,
      Gender,
      RelationshipStatus,
      OccuStatus,
      OrgAffiliation,
      SMUse,
      platforms,
      AvgTime,
      UseWOPurpose,
      SMDistraction,
      Restless,
      GenDisctracted,
      BotheredWorries,
      Concentration,
      Comparison,
      CompFeelings,
      Validation,
      Depressed,
      DailyInterestFluctuation,
      SleepIssues,
    } = req.body;

    const platformsArray = Array.isArray(platforms) ? platforms : [platforms];

    await knex.transaction(async (trx) => {
      const insertResult = await trx("main")
        .insert({
          timestamp: trx.raw("current_timestamp"),
          age: Age,
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
      const anonID = insertResult[0].anonymousID; // Adjust based on actual structure

      console.log(anonID);
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
    res.send("Survey response submitted successfully");
  } catch (error) {
    console.error("Error submitting survey response:", error);
    res.status(500).send("Error submitting survey response");
  }
});

app.get("/loginpage", (req, res) => {
  res.render("login");
});

app.get("/accounts", (req, res) => {
  res.render("accounts");
});

app.get("/report", (req, res) => {
  knex
    .select()
    .from("main")
    .then((items) => {
      res.render("report", { intex_db: items });
    })
    .catch((err) => {
      console.log(err);
      res.status(500).json({ err });
    });
});

app.get("/survey", (req, res) => {
  res.render("survey");
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
