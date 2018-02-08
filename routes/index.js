var express = require("express");
var router = express.Router();
var Campground = require("../models/campground");
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
    var newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
    });
    if (req.body.adminCode === process.env.ADMINCODE){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user) {
        if (err) {
            // console.log("in the error route. why?");
            req.flash("error", err.message);
            return res.redirect("register");
        } else {
            passport.authenticate("local")(req, res, function() {
                // console.log("we're in the success route. now what?");
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

// =========================================
// USER ROUTES
// =========================================

// USER PROFILE
router.get("/users/:id", function(req, res) {
   User.findById(req.params.id, function(err, foundUser){
       if (err) {
           req.flash("error", "Something went wrong");
           res.redirect("/");
       } else {
           Campground.find().where('author.id').equals(foundUser._id).exec(function(err, campgrounds) {
               if (err) {
                   req.flash("error", "Something went wrong");
                   res.redirect("/");
               } else {
                   res.render("users/show", {user: foundUser, campgrounds: campgrounds});
               }
           });
       }
   })
});

module.exports = router;