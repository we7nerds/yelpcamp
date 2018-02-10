var express     = require("express"),
    router      = express.Router(),
    Campground  = require("../models/campground"),
    middleware  = require("../middleware"),
    multer      = require("multer"),
    cloudinary  = require("cloudinary"),
    geocoder    = require("geocoder");
    
// App Setup
var storage     = multer.diskStorage({
    filename: function(req, file, callback) {
        callback(null, Date.now() + file.originalname);
    }
});
var imageFilter = function(req, file, cb) {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error("Only image files are allowed."), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter });

cloudinary.config({
    cloud_name: 'we7nerds',
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// =========================================
// CAMPGROUND ROUTES
// =========================================

// INDEX - show all campgrounds
router.get("/", function(req, res) {
    // get all campgrounds from the DB
    Campground.find({}, function(err, allCampgrounds){
        if(err) {
            console.log(err);
        } else {
            res.render("campgrounds/index", {campgrounds: allCampgrounds});
        }
    });
    
});

// CREATE - add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) {
    // get data from form and add to campgrounds array
    var name = req.body.campground.name;
    var price = req.body.campground.price;
    var desc = req.body.campground.description;
    var author = {
        id: req.user._id,
        username: req.user.username
    };
    cloudinary.uploader.upload(req.file.path, function(result) {
        // add cloudinary url for the image to the campground under image property
        var image = result.secure_url;
        // eval(require("locus"));
        // add autor to campground
        geocoder.geocode(req.body.campground.location, function(err, data) {
            if (err) {
                console.log(err);
            } else {
                var lat = data.results[0].geometry.location.lat;
                var lng = data.results[0].geometry.location.lng;
                var location = data.results[0].formatted_address;
                var newCampground = {name: name, price: price, image: image, description: desc, author: author, location: location, lat: lat, lng: lng};
                // Create a new campground and save to DB
                Campground.create(newCampground, function(err, newlyCreated){
                    if(err){
                        console.log(err);
                    } else {
                        // redirect back to campgrounds url
                        res.redirect("/campgrounds");
                    }
                });
            }
        });
    
    });
    
});

// NEW - Displays form to make a new campground
router.get("/new", middleware.isLoggedIn, function(req, res) {
   res.render("campgrounds/new.ejs") ;
});

// SHOW - show more info about one campground
router.get("/:id", function(req, res) {
    // find the campground with the provided ID
    // render show template with that campground
    Campground.findById(req.params.id).populate('comments').exec(function(err, foundCampground){
        if(err || !foundCampground){
            console.log(err);
            req.flash("error", "Sorry, that campground does not exist!");
            return res.redirect("/campgrounds");
        } else {
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});

// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findById(req.params.id, function(err, foundCampground) {
        if (err || !foundCampground) {
            req.flash("error", "That campground does not exist");
            res.redirect("/campgrounds");
        } else {
            // does the user own the campground
            res.render("campgrounds/edit", {campground: foundCampground});   
        }
    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    geocoder.geocode(req.body.campground.location, function(err, data) {
        if (err && err.length != 0) {
            console.log(err);
        } else {
            var lat = data.results[0].geometry.location.lat;
            var lng = data.results[0].geometry.location.lng;
            var location = data.results[0].formatted_address;
            // find and update the correct campground
            var campgroundToEdit = req.body.campground;
            campgroundToEdit.lat = lat;
            campgroundToEdit.lng = lng;
            campgroundToEdit.location = location;
            campgroundToEdit.editor = {id: req.user._id, username: req.user.username};
            Campground.findByIdAndUpdate(req.params.id, campgroundToEdit, function(err, updatedCampground) {
                if (err) {
                    req.flash("error", err.message);
                    res.redirect('/campgrounds');
                } else {
                    req.flash("success", "Successfully updated campground!");
                    // redirect somewhere (show page)
                    res.redirect("/campgrounds/" + req.params.id);
                }
            });
        }
    });
    
});

// DESTROY CAMPGROUND ROUTE
router.delete("/:id", middleware.checkCampgroundOwnership, function(req, res) {
    Campground.findByIdAndRemove(req.params.id, function(err) {
        if (err) {
            req.flash("error", err.message);
            res.redirect("/campgrounds");
        } else {
            req.flash("success", "Successfully removed campground!");
            res.redirect("/campgrounds");
        }
    });
});


module.exports = router;