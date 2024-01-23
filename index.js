
const express = require("express");
const app = express()
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");
const port = 10000



app.use(express.json());
app.use(cors());

// Database Connection w MongoDB
mongoose.connect("mongodb+srv://anestasiahoffmann:us96zBNuspcyutQS@cluster0.ctslc4v.mongodb.net/glow-store");

//API Creation

app.get("/",(req, res) => {
    res.send("Express App Is Running")
})

//Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename: (req, file, cb) => {
        return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

//Creating Upload Endpoint for Images
app.use('/images',express.static('upload/images'))

app.post("/upload",upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`https://glow-server.onrender.com/images/${req.file.filename}`
    })
})



// Schema for Creating Products

const Product = mongoose.model("Product",{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type: String,
        required:true,
    },
    image:{
        type: String,
        required:true,
    },
    category:{
        type: String,
        required:true,
    },
    new_price:{
        type: Number,
        required:true,
    },
    old_price: {
        type: Number,
        required: true,
    },
    date:{
        type: Date,
        default:Date.now,
    },
    available:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log("Saved");
    res.json({
        succes:true,
        name:req.body.name,
    });
})

// Creating API for Deleting Products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed.");
    res.json({
        success:true,
        name:req.body.name
    })
})

//Creating API for getting all products
app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products);
})

//Schema for User Model

const Users = mongoose.model('Users',{
    name:{
        type:String,
    },
    email:{
        type:String,
        unique:true,
    },
    password:{
        type:String,
    },
    cartData:{
        type:Object,
    },
    date:{
        type:Date,
        default:Date.now,
    }
})

//Endpoint for User Registration

app.post('/signup',async (req,res)=>{

    let check = await Users.findOne({email:req.body.email});
    if(check){
        return res.status(400).json({succes:false,errors:"Existing user found with same email address."})
    }
    let cart = {};
    for (let i = 0; i < 300; i++) {
        cart[i]=0;
    }
    const user = new Users({
        name:req.body.username,
        email:req.body.email,
        password:req.body.password,
        cartData:cart,
    })

    await user.save();

    const data = {
        user:{
            id:user.id
        }
    }

    const token = jwt.sign(data,'secret_ecom');
    res.json({succes:true,token})
})


//Endpoint for User Login
app.post('/login',async (req,res)=>{
    let user = await Users.findOne({email:req.body.email});
    if(user){
        const passCompare = req.body.password === user.password;
        if(passCompare){
            const data = {
                user:{
                    id:user.id
                }
            }
            const token = jwt.sign(data,'secret_ecom');
            res.json({succes:true,token});
        }
        else{
            res.json({succes:false,errors:"Wrong password."});
        }
    }
    else{
        res.json({success:false,errors:"Wrong Email Id."})
    }
})

//Endpoint for New Collection Data
app.get('/newcollection',async (req,res)=>{
    let products = await Product.find({});
    let newcollection = products.slice(1).slice(-4);
    console.log("New Collection Fetched");
    res.send(newcollection);
})

//Endpoint for Popular Data
app.get('/popular',async (req,res)=>{
    let products = await Product.find({category:"face"});
    let popular = products.slice(0,4);
    console.log("Popular Fetched");
    res.send(popular);
})

//Middleware toFetch User
    const fetchUser = async (req,res,next)=>{
        const token = req.header('auth-token');
        if (!token){
            res.status(401).send({errors:"Please authenticate using valid token."})
        }
        else{
            try{
                const data = jwt.verify(token,'secret_ecom');
                req.user = data.user;
                next();
            } catch (error) {
                response.status(401).send({errors:"Please authenticate using a valid token"})
            }
        }
    }

//Endpoint for Adding Products in Cart Data
app.post('/addtocart',fetchUser, async (req,res)=>{
    console.log("Added",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Added.")
})

//Endpoint To Remove Product From Cart Data
app.post('/removefromcart', fetchUser, async (req,res)=>{
    console.log("Removed",req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    userData.cartData[req.body.itemId] -= 1;
    await Users.findOneAndUpdate({_id:req.user.id},{cartData:userData.cartData});
    res.send("Removed.")
})

//Endpoint To Get Cart Data
app.post('/getcart',fetchUser,async (req,res)=>{
    console.log("Get cart.");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
})

app.listen(port,(error)=>{
    if ( !error ) {
        console.log("Server Running")
    }
    else
    {
        console.log("Error ; "+error)
    }
})

