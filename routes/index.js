var express = require("express");
var router = express.Router();
// var campground = require("../models/campground");
// var comment = require("../models/comment");
var passport = require("passport");
var User = require("../models/user");

// ROOT ROUTE
router.get("/", function(req, res) {
   res.render("landing");
});

// =========================================
// AUTH ROUTES
// =========================================

// show the register form
router.get("/register", function(req, res) {
    res.render("register");
});

// handle sign up logic
router.post("/register", function(req, res) {
    var newUser = new User({username: req.body.username});
    if (req.body.adminCode === process.env.ADMINCODE){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            req.flash("error", err.message);
            return res.redirect("register");
        } else {
            passport.authenticate("local")(req, res, function() {
                req.flash("success", "Signed up successfully Welcome aboard!!");
                res.redirect("/campgrounds");
            });
        }
    });
});

// =========================================
// LOGIN ROUTES
// =========================================

// show the login form
router.get("/login", function(req, res) {
    res.render("login");
});

// handle login logic
router.post("/login", passport.authenticate("local", 
    {
        successRedirect: "/campgrounds", 
        failureRedirect: "/login"
    }), function(req, res) {
    
});

// logout logic route
router.get("/logout", function(req, res) {
    req.logout();
    req.flash("success", "You were logged out successfully!");
    res.redirect('/campgrounds');
});


module.exports = router;