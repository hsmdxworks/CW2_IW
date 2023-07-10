var express = require("express");
const cors = require("cors");
const morgan = require("morgan");
var path = require("path");
var fs = require("fs");


let propertiesReader = require("properties-reader");
let propertiesPath = path.resolve(__dirname, "conf/db.properties");
let properties = propertiesReader(propertiesPath);
let dbPprefix = properties.get("db.prefix");
//URL-Encoding of User and PWD
//for potential special characters
let dbUsername = properties.get("db.user");
let dbPwd = properties.get("db.pwd");
let dbName = properties.get("db.dbName");
let dbUrl = properties.get("db.dbUrl");
let dbParams = properties.get("db.params");
const uri = dbPprefix + dbUsername + ":" + dbPwd + dbUrl + dbParams;

const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
let db = client.db(dbName);
// db.serverConfig.isConnected();

// console.log(db.serverConfig);


let app = express();

const loggerPath = path.join(__dirname, 'logger');
var staticPath = path.resolve(__dirname, "static");
app.use("/images", express.static(staticPath));


app.set('json spaces', 3);
app.use(cors());

app.use(morgan("short"));

app.use(express.json());

app.param('collectionName', function(req, res, next, collectionName){
    req.collection = db.collection(collectionName);
    return next();
});


app.use(function(req, res, next){
    console.log("Incoming request: " + req.url);
    next();
});

app.get("/", function(req, res){
    res.send("select a collection e.g., /collections/lessons");
});


// All Lessons
app.get("/collections/:collectionName", function(req, res, next){
    req.collection.find({}).toArray(function(err, results){
        if(err){
            return next(err);
        }
        res.send(results);
    });
});

// Search Lessons
app.get("/collections/:collectionName/search/:search", function(req, res, next){

    req.collection.find({ subjectName: { $regex: req.params.search, $options: 'i' }}).toArray(function(err, results){
        if(err){
            return next(err);
        }
        res.send(results);
    });
});

// /collections/lessons/1:limit/subjectName/desc
app.get("/collections/:collectionName/:max/:sortAspect/:sortAscDesc", function(req, res, next){
    
    var max = parseInt(req.params.max, 10);
    
    let sortDirection = 1;
    if (req.params.sortAscDesc === "desc"){
        sortDirection = -1;
    }

    req.collection.find({}, {limit: max, sort: [[req.params.sortAspect, sortDirection]]}).toArray(function(err, results){
        if(err){
            return next(err);
        }
        res.send(results);
    });

});

// const ObjectId = require('mongodb').ObjectId;
app.get("/collections/:collectionName/:id", function(req, res, next){
    
    var id = parseInt(req.params.id, 10);

    req.collection.findOne({ id: id}, function(err, results){
    // req.collection.findOne({ id: new ObjectId(req.params.id)}, function(err, results){
        if(err){
            return next(err);
        }
        res.send(results);
    });
});

// Inserting Lesson - Api POST Methods
app.post("/collections/:collectionName", function(req, res, next){
    // req.body
    req.collection.insertOne(req.body, function(err, results){
    if(err){
        return next(err);
    }
    res.send(results);
    });
});

// Delete By new ObjectId(req.params.id) ID - Api
const ObjectId = require('mongodb').ObjectId;
app.delete("/collections/:collectionName/:id", function(req, res, next){
    req.collection.deleteOne(
        { _id: new ObjectId(req.params.id)}, function(err, result){
        if(err){
            return next(err);
        }else{
            res.send((result.deletedCount = 1) ? {msg: "success!!"} : {msg: "error"});    
        }
    });
});

// Delete Api
app.delete("/collections/:collectionName/lesson/:id", function(req, res, next){

    var id = parseInt(req.params.id, 10);

    req.collection.deleteOne(
        { id: id}, function(err, result){
        if(err){
            return next(err);
        }else{
            res.send((result.deletedCount = 1) ? {msg: "success!!"} : {msg: "error"});    
        }
    });
});

// Update
app.put("/collections/:collectionName/:id", function(req, res, next){
    var id = parseInt(req.params.id, 10);
    req.collection.updateOne({id: id},
    {$set: req.body},
    {safe: true, multi: false}, function(err, result){
    if(err){
        return next(err);
    }
    res.send((result.matchedCount === 1) ? {msg: "Updated Lesson"} : {msg: "error"});    
    });
});


app.put("/", function(req, res){
    res.send("Okay, let's update an element.");
});

app.delete("/", function(req, res){
    res.send("Are your sure? to delete an element.");
});

app.use(function(req, res){
    res.status(404).send("Resource not found!");
});




if (!fs.existsSync(loggerPath)) {
  fs.mkdirSync(loggerPath);
}

const loggingRequests = fs.createWriteStream(path.join(loggerPath, 'server_logs'), { flags: 'a' });

app.use( morgan( 'combined' , { stream: loggingRequests }) );


// http.createServer(app).listen(3000);
const port = process.env.PORT || 3000;
app.listen(port, function(){
    console.log("App is started on :"+port);
});
