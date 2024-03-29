if (process.env.NODE_ENV !== "production") {
    require('dotenv').config()
}

const express = require("express");
const app = express();
const path = require("path")
const engine = require('ejs-mate')
const helmet = require("helmet")
const mongoSanitize = require('express-mongo-sanitize');
const methodOverride = require("method-override")
const mongoose = require("mongoose")
const campgroundRoute = require("./routes/campgroundRoutes")
const userRoute = require("./routes/userRoutes")
const ExpressError = require("./utils/ExpressError")
const passport = require("passport")
const catchAsync = require("./utils/CatchAsync")
const passportLocalStrategy = require("passport-local")
const flash = require("connect-flash");
const User = require("./models/user")
// const MongoStore = require('connect-mongo');
const session = require("express-session");
const MongoStore = require('connect-mongo');

const store=MongoStore.create({
    mongoUrl:"mongodb://127.0.0.1:27017/yelp-camp",
    secret:"thisismysecretkey",
    touchAfter:24*60*7
})

const cloudinary_secret=process.env.CLOUDINARY_CLOUDNAME
const sessionOptions = {
    store,
    name: "session",
    secret: "thisismysecretkey",
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        secure:true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionOptions));
app.use(flash());
app.use(helmet());

const scriptSrcUrls = [
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.min.js",
    "https://api.tiles.mapbox.com/",
    "https://api.mapbox.com/",
    "https://kit.fontawesome.com/",
    "https://cdnjs.cloudflare.com/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js",
];
const styleSrcUrls = [
    "https://kit-free.fontawesome.com/",
    "https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css",
    "https://api.mapbox.com/",
    "https://api.tiles.mapbox.com/",
    "https://fonts.googleapis.com/",
    "https://use.fontawesome.com/",
];
const connectSrcUrls = [
    "https://api.mapbox.com/",
    "https://a.tiles.mapbox.com/",
    "https://b.tiles.mapbox.com/",
    "https://events.mapbox.com/",
];
const fontSrcUrls = [];
app.use(
    helmet.contentSecurityPolicy({
        directives: {
            defaultSrc: [],
            connectSrc: ["'self'", ...connectSrcUrls],
            scriptSrc: ["'unsafe-inline'", "'self'", ...scriptSrcUrls],
            styleSrc: ["'self'", "'unsafe-inline'", ...styleSrcUrls],
            workerSrc: ["'self'", "blob:"],
            objectSrc: [],
            imgSrc: [
                `https://res.cloudinary.com/${cloudinary_secret}/`, //SHOULD MATCH YOUR CLOUDINARY ACCOUNT! 
                "https://images.unsplash.com/",
            ],
            fontSrc: ["'self'", ...fontSrcUrls],
        },
    })
);
 const db_url=process.env.DB_URL||"mongodb://127.0.0.1:27017/yelp-camp"
app.use(passport.initialize())
app.use(passport.session())
passport.use(new passportLocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
mongoose.connect(db_url)
    .then(() => {
        console.log("connected to mongoose")
    }).catch((err) => {
        console.log(`connection fail:${err}`)
    })

app.use(
    mongoSanitize({
        replaceWith: '_',
    }),
);
app.engine('ejs', engine);
app.use(methodOverride('_method'))
app.set("view engine", "ejs")
app.set("views", path.join(__dirname, "views"))
app.use(express.urlencoded({ extended: true }))
app.use(express.static(path.join(__dirname, 'public')))
app.use((req, res, next) => {
    res.locals.currentUser = req.user
    res.locals.messages = req.flash("success"),
        res.locals.errors = req.flash("errors")
    next();
})

app.use("/", userRoute)
app.use("/", campgroundRoute)



app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found', 404))
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!'
    res.status(statusCode).render('campgrounds/error.ejs', { err })
})

const connection_url=process.env.PORT||3000

app.listen(connection_url, (req, res) => {
    console.log(`connected to port ${connection_url}`)
})