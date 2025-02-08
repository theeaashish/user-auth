const express = require("express");
const cookieParser = require("cookie-parser");
const jwt = require("jsonwebtoken");
const userModel = require("./models/user");
const postModel = require("./models/post");
const path = require("path");
const bcrypt = require("bcrypt");
const app = express();

app.set("view engine", "ejs");
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/register", async (req, res) => {
  let { username, password, name, email, age } = req.body;
  let user = await userModel.findOne({ email });
  if (user) return res.status(500).send("user already exists");

  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(password, salt, async (err, hash) => {
      // console.log(hash)
      let user = await userModel.create({
        username,
        name,
        email,
        password: hash,
        age,
      });
      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      res.cookie("token", token);
      res.send("user created");
    });
  });
});

app.post("/login", async (req, res) => {
  let { email, password } = req.body;
  let user = await userModel.findOne({ email });

  if (!user) return res.status(500).send("something went wrong");

  bcrypt.compare(password, user.password, (err, result) => {
    // console.log(result);
    // if (password != result.password) res.send("wrong credentials!");
    console.log(result);
    if (result) {
      let token = jwt.sign({ email: email, userid: user._id }, "secretkey");
      res.cookie("token", token);
      res.status(200).redirect("/profile");
    } else res.send("wrong credentials!");
  });
});

app.get("/logout", (req, res) => {
  res.cookie("token", "");
  res.redirect("/");
});

app.get("/profile", isLoggedIn, async (req, res) => {
  //   console.log(req.user);
  let user = await userModel.findOne({ email: req.user.email }).populate("posts");
  console.log(user)
//   console.log(user);
  res.render("profile", { user });
});

app.post("/post", isLoggedIn, async (req, res) => {
  let user = await userModel.findOne({ email: req.user.email });
  let { content } = req.body;

  let post = await postModel.create({
    user: user._id,
    content,
  });

  user.posts.push(post._id);
  await user.save();
  res.redirect("/profile");
});

function isLoggedIn(req, res, next) {
  let token = req.cookies.token;
  if (token === "") res.send("please login first");
  else {
    let data = jwt.verify(token, "secretkey");
    req.user = data;
  }
  next();
}

app.listen(3000);
