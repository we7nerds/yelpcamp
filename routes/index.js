var express         = require("express"),
    router          = express.Router(),
    Campground      = require("../models/campground"),
    // comment = require("../models/comment"),
    passport        = require("passport"),
    User            = require("../models/user"),
    async           = require("async"),
    nodemailer      = require("nodemailer"),
    request         = require("request"),
    crypto          = require("crypto");

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
    const captcha = req.body["g-recaptcha-response"];
    if (!captcha) {
      req.flash("error", "Please select captcha");
      return res.redirect("back");
    }
    // secret key
    var secretKey = process.env.GOOGLE_CAPCHA_CODE;
    // Verify URL
    var verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${captcha}&remoteip=${req
      .connection.remoteAddress}`;
    // Make request to Verify URL
    request.get(verifyURL, (err, response, body) => {
      if (err) {
        console.log(err);
        return res.redirect("/register");
      }
      // if not successful
      if (body.success !== undefined && !body.success) {
        req.flash("error", "Captcha Failed");
        return res.redirect("/register");
      }
    });
    
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

// forgot password
router.get('/forgot', function(req, res) {
    res.render("forgot");
});

// forgot password logic
router.post("/forgot", function(req, res, next) {
    async.waterfall([
        function(done) {
            crypto.randomBytes(20, function(err, buf) {
                var token = buf.toString('hex');
                done(err, token);
            });
        }, 
        function(token, done) {
            User.findOne({email: req.body.email}, function(err, user) {
                if (!user) {
                    req.flash("error", "No matching email found.");
                    return res.redirect("/forgot");
                }
                if (err) {
                    console.log(err);
                } else {
                    user.resetPasswordToken = token;
                    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                    
                    user.save(function(err){
                        done(err, token, user);
                    });
                }
            });
        },
        function(token, user, done) {
            var smtpTransport = nodemailer.createTransport({
                service: 'Gmail',
                auth: {
                    user: 'we7nerds@gmail.com',
                    pass: process.env.GMAILPW
                }
            });
            var mailOptions = {
                to: user.email,
                from: 'we7nerds@gmail.com',
                subject: "YelpCamp Password Reset",
                text: 'You are receiving this because you requested the reset of the password of your account' + 
                    'Please click on the following link, or past this into your browser to complete the reset process. ' +
                    'http://' + req.headers.host + '/reset/' + token + '\n\n' + 
                    'If you did not request this, please ignore this email and your password will remain unchanged'
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('mail sent');
                    req.flash("success", "An e-mail was sent to " + user.email + ' with further instructions.');
                    done(err, 'done');
                }
            });
        }
    ], function(err) {
        if (err) return next(err);
        res.redirect("/forgot");
    });
});

// RESET Route
router.get('/reset/:token', function(req, res) {
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
            req.flash("error", "Password reset token is invalid or expired.");
            return res.redirect("/forgot");
        }
        if (err) {
            console.log(err);
        } else {
            res.render('reset', {token: req.params.token});
        }
    });
});

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          });
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'we7nerds@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'we7nerds@mail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/campgrounds');
  });
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