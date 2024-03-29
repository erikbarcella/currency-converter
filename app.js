const express = require('express');
const app = express();
const path = require ('path');
const request = require('request');
const mongoose = require("mongoose");
const passport = require("passport");
const LocalStrategy = require("passport-local");
const expressSession = require("express-session");
const User = require('./models/user');
const Currency = require('./models/currency');
const methodOverride = require('method-override');
const connectDatabase = require('./database/db')
require('dotenv').config();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride('_method'));

app.use(expressSession({
    secret: "meu_segredo...",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

passport.use(new LocalStrategy(User.authenticate()));

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());



const isLoggedIn = (req, res, next) => {
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect("/login");
}

let resposta = {};
let ret = [""];
let values
let idUser;

app.get('/', async(req,res)=>{

    await request("https://economia.awesomeapi.com.br/last/USD-BRL", (error,response,body)=>{

        if(!error && response.statusCode==200){
            resposta = JSON.parse(body);
            ret[1] = resposta;
            let arr = ret.map(function(obj){
                return Object.keys(obj).map(function(key){
                    return obj[key] 
                })
            })
            values = arr[1].find(element => element)
        }
        res.render('home', {values});
    })
})
        
app.get('/cotacao', async(req,res)=>{
    const{selectOne,selectTwo,quantidade } = req.query;
    await request(`https://economia.awesomeapi.com.br/last/${selectOne+"-"+selectTwo}`, (error,response,body)=>{

        if(!error && response.statusCode==200){
            resposta = JSON.parse(body);
            ret[1] = resposta;
            let arr = ret.map(function(obj){
                return Object.keys(obj).map(function(key){
                    return obj[key] 
                })
            })
            values = arr[1].find(element => element)
            console.log( values )
        }
        res.render('resultado', {values,quantidade,selectTwo,selectOne});
    })
    }
)

app.get("/cotacoes",  isLoggedIn, async (req, res) => {
    idUser=req.user.id;
    const cotacoes = await Currency.find({userId: idUser});
    res.render("cotacoes/index", {cotacoes});
});

app.post("/cotacoes/:id",isLoggedIn, async(req,res)=>{
    const {id}=req.params;
   
   let currencyLocated = await Currency.find({paridade: id})
   if (currencyLocated.length == 0){
        const newCurrency= new Currency({paridade: id, userId: idUser });
        await newCurrency.save();
        console.log("Cotacao salva " + newCurrency);
   } else{
        console.log("Cotacao já esta na lista de favoritos")
   }
    res.redirect('/')
})

app.get("/cotacoes/:id",isLoggedIn, async(req,res)=>{
    const {id} = req.params;  
    const currency = await Currency.find({paridade: id, userId: idUser });
    let resp = {};
    let r = [""];
    let valores;
    await request(`https://economia.awesomeapi.com.br/last/${currency[0].paridade}`, (error,response,body)=>{

        if(!error && response.statusCode==200){
            resp = JSON.parse(body);
            r[1] = resp;
            let arr = r.map(function(obj){
                return Object.keys(obj).map(function(key){
                    return obj[key] 
                })
            })
            valores = arr[1].find(element => element)
        }
        let paridade = currency[0].paridade;
        res.render("cotacoes/show",{valores,paridade});
    })
})

app.delete("/cotacoes/:id", async (req,res)=>{
    const {id} = req.params;
    const currencyId = await Currency.find({paridade: id, userId: idUser });
    if(await Currency.findByIdAndDelete(currencyId)){
        console.log("excluido do banco com sucesso  "+ id);
        res.redirect('/cotacoes');
    } else{
        console.log("erro ao delatar do banco ")
    }
})

app.get("/register", (req, res) => {
    res.render("register");
});

app.post("/register", (req, res) => {
    User.register(new User({username: req.body.username}), req.body.password, (err, user) => {
        if(err){
            console.log(err);
            res.render("register");
        } else {
            passport.authenticate("local")(req, res, ()=>{
                res.redirect("/cotacoes");
            });
        }
    })
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", passport.authenticate("local", {
    successRedirect: "/cotacoes",
    failureRedirect: "/login"
}));

app.get('/logout', function(req, res, next) {
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
});
connectDatabase();

app.listen(process.env.APP_PORT, () =>{
    console.log("Server running on port: "+ process.env.APP_PORT);
})