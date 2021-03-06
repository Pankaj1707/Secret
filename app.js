require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//const encrypt = require("mongoose-encryption");      /// Required for 2nd Level Authentication ////
//const md5 = require("md5");            /// Required for 3rd level of Authentication     ///// Just adding md5 for 3rd level security 
//const bcrypt = require("bcrypt");       /// Required for 4rth level of Authentication
// const saltRounds = 10;                  /// Required for 4rth level of Authentication

const session = require("express-session");              /// Required for 5th level of Authentication
const passport = require("passport");                  /// Required for 5th level of Authentication
const passportLocalMongoose = require("passport-local-mongoose");         /// Required for 5th level of Authentication

// const { Session } = require("inspector");
// const { resolveSoa } = require("dns");
const app = express();
 const GoogleStrategy = require("passport-google-oauth20").Strategy;
 const findOrCreate = require("mongoose-findorcreate");
app.use(bodyParser.urlencoded({ extended: true }));




app.set("view engine", "ejs");

app.use(express.static("public"));



app.use(session({
    secret:"WhoamI",
    resave:false,
    saveUninitialized:false
    
}))

app.use(passport.initialize());
app.use(passport.session());






mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser:true, useUnifiedTopology: true })
mongoose.set("useCreateIndex",true);

const userSchema  = new mongoose.Schema(
    {
       username : String,
       password : String,
       googleId: String,
       secret:  String
    }
)




///////////////////////////2nd Level Authentication with Mongoose Encryption and Environment Variable/////////////////

//userSchema.plugin(encrypt, {secret:process.env.secret, encryptedFields: ["password"]});


////////////////////////////////////////////////////////////////////////////////////////////////////////////////





userSchema.plugin(passportLocalMongoose);  
userSchema.plugin(findOrCreate);


const User = mongoose.model("User", userSchema);

 passport.use(User.createStrategy());

 /////////////// this is only valid for local strategizing //////////////////////////////////////////////////

 //   passport.serializeUser(User.serializeUser());
//   passport.deserializeUser(User.deserializeUser());

//////////////////////////////////////////////////////////////////////////////////////////////

//////// this is valid for all kind of strategizing//////////////////////////////////////////////

passport.serializeUser(function(user, done) {
    done(null, user.id);
  });
  
  passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
      done(err, user);
    });
  });
//////////////////////////////////////////////////////////////////////////////////////////////////////////////


////////////////////////////////////Google Auth using passport//////////////////////////////////////////////////

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] }));

app.get('/auth/google/secrets', 
passport.authenticate('google', { failureRedirect: '/login' }),
function(req, res) {
    // Successful authentication, redirect sectrets.
    res.redirect("/secrets");
});

////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////


app.get("/", function(req, res)
{
    res.render("home");
});

app.get("/login", function(req, res)
{
    res.render("login");
});


app.get("/register", function(req, res)
{
    res.render("register");
});


///////////////////////////4rth Level Authentication with Hashing and Salting using bcrypt /////////////////

// app.post("/register", function(req, res)
// {
      

//       bcrypt.hash(req.body.password,saltRounds, function(err, hash)
//       {
//           if(err)
//           {
//               console.log(err);
//           }
//           else{
//             const user = new User({
//                 email : req.body.username,
//                 password : hash    
//               })
//               user.save(function(err)
//               {
//                   if(err)
//                   {
//                       res.send(err)
//                   }
//                   else{
//                       res.render("secrets")
//                   }
//               })
//           }
//       })

      
// })

// app.post("/login", function(req, res)
// {

//     User.findOne({email:req.body.username}, function(err, result)
//     {
//         if(err)
//         {
//             console.log(err);
//         }
//      else 
//      {
//         bcrypt.compare(req.body.password, result.password, function(err, result)
//         {
//             if(err)
//             {
//                 console.log(err);
//             }
//             else
//             {
//                 if(result)
//                 {
//                     res.render("secrets")
//                 }
//             }
//         })
//      }
      
       
//     })
      
// })


////////////////////////////////////////////////////////////////////////////////////////////////////////////////




//////////////////////////////5th and 6th level of security with passport///////////////////////////////////////////////



app.get("/logout", function(req, res)
{
    req.logOut();
    res.redirect("/");
})



app.post("/register", function(req, res)
{

   User.register({username: req.body.username}, req.body.password, function(err, user)
   {
       if(err)
       {
           console.log(err);
           console.log(req.body.username);
           console.log(req.body.password);
           res.redirect("/register");
       }
       else{
           passport.authenticate("local")(req, res, function()
           {
               res.redirect("/secrets");
           })
       }
   })
})

app.post("/login", function(req, res)
{
    const user = new User({
        username : req.body.username,
        password: req.body.password
    })

   req.login(user, function(err, result)
   {
       if(err)
       {
           console.log(err);
           res.redirect("/register")
       }
       else
       {
           passport.authenticate("local")(req, res, function()
           {
             res.redirect("/secrets")
           })
       }
   })
})

/////////////////////////////////////////////////////////////////////////////////////////////////////////////////

/////////////////////////////////submiiting a secret ////////////////////////////////////////////////////////////

app.get("/secrets", function(req, res)
{
    
   User.find({secret:{$ne:null}}, function(err, foundSecrets)
   {
       if(err)
       {
           console.log(err);
       }
       else{
        res.render("secrets", {foundSecrets:foundSecrets})
       }
   })


   
})


app.get("/submit", function(req, res)
{ 
    if(req.isAuthenticated())
    {
        res.render("submit");
    }

    else{
        res.redirect("/login");
    }
})

app.post("/submit", function(req, res)
{
    
    User.findById(req.user.id, function(err, foundUser)
    {
        foundUser.secret = req.body.secret;
        foundUser.save(function(err)
        {
            res.redirect("/secrets")
        })
     
    })
})


///////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////






app.listen("3000", function()
{
    console.log("Server is running on port 3000");
})