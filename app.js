const http = require('http');
const express = require('express');
const path = require('path');
const crypto = require('crypto'); //to generate the file names
const mongoose = require('mongoose');
const multer = require('multer');
const {GridFsStorage} = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const methodOverride = require('method-override');

const app = express();

//MiddleWare
app.use(express.json());
// app.use(methodOverride('_method'));

app.use((req, res, next)=>{
    res.setHeader('Access-Control-Allow-Origin','*');
    res.setHeader('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.setHeader('Access-Control-Allow-Methods','GET, POST, PUT, PATCH, DELETE, OPTIONS');
    next()
});

//Setting View Engine
// app.set('view engine', 'ejs');

//Mongo URI
// const MongoURI = "mongodb+srv://meqadeem:MeEdAqEm2615@cluster0.ofzj9.mongodb.net/mongouploads";
const MongoURI = "mongodb+srv://moinmedrec:e4qYtTe3je3C4fBp@cluster0.0la7q.mongodb.net/mUploads";
//Create Mongo connection
const conn = mongoose.createConnection(MongoURI,{  useUnifiedTopology: true ,useNewUrlParser: true});//,{  useUnifiedTopology: true ,useNewUrlParser: true}
// const connection = mongoose.connect('mongodb://host:27017/database');

//Initialize gfs - ref: https://github.com/aheckmann/gridfs-stream
let gfs;
conn.once('open', () => {
    //Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads');
    console.log("Connected to DataBase")
    // all set!
})

//Create Storage Engine - ref: https://github.com/devconcept/multer-gridfs-storage
var storage = new GridFsStorage({
    url: MongoURI,
    file: (req, file) => {
      return new Promise((resolve, reject) => {
        crypto.randomBytes(16, (err, buf) => {
          if (err) {
            return reject(err);
          }
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            bucketName: 'uploads'
          };
          resolve(fileInfo);
        });
      });
    }
  });
  const upload = multer({ storage });
  
//https://www.bezkoder.com/node-js-upload-store-images-mongodb/
// @route GET /
// @desc Loads form
// app.get('/', (req, res) => {
//     // res.render('index');
//     gfs.files.find().toArray((err, files)=>{
//         //Check if files
//         if(!files || files.length === 0){
//             return res.status(404).json({err:'No files exists'});
//             // res.render('index',{files:false});
//         }else{
//             files.map(file=>{
//                 if(file.contentType==='image/jpeg'|| file.contentType==='image/png'){
//                     file.isImage=true;
//                 }else{
//                     file.isImage=false;
//                 }
//             });
//             return res.status(200).json({files:files});
//             // res.render('index',{files:files});
//         }

//     });
// });

// @route POST /upload
// @desc Uploads file to DB - upload.single('file') -> middleware with field name as file
app.post('/upload',upload.single('file'), (req, res)=>{
    // console.log(req.body)
    // console.log(req.file)
    if(req.file.chunkSize>0){
    res.status(200).json({message:"Image uploaded successfully.",fileName:req.file.filename});
    }else{
        res.status(500).json({message:'Failed to upload Image!'})
    }

    // res.redirect('/');
})

// @route GET /files
// @desc Display all files in JSON
app.get('/files', (req, res)=>{
    gfs.files.find().toArray((err, files)=>{
        //Check if files
        if(!files || files.length === 0){
            return res.status(404).json({err:'No files exists'});
        }
        // console.log(files);
        let filesAr=files.map((fl)=>fl.filename)
        // console.log(filesAr)
        //Files exists
        return res.json({filesAr});
    });
});

// @route GET /files/:filename
// @desc Display single file in JSON
app.get('/files/:filename', (req, res)=>{
    gfs.files.findOne({filename:req.params.filename},(err,file)=>{
        //Check if file
        if(!file || file.length === 0){
            return res.status(404).json({err:'No file exists'});
        }

        //File exists
        // console.log(file);
        let fileName=file.filename
        // console.log(fileName)
        return res.json({fileName});
    });
});

// @route GET /image/:filename
// @desc Display Image
app.get('/image/:filename', (req, res)=>{
    console.log('image')
    console.log(typeof(req.params.filename))
    if(typeof(req.params.filename)!=='undefined'){
        gfs.files.findOne({filename:req.params.filename},(err,file)=>{
            //Check if file
            console.log("file")
            console.log(file)

            if(!file || file.length === 0){
                return res.status(404).json({err:'No file exists'});
            }
    
            //When file exist - check if image
            if(file.contentType==='image/jpeg' || file.contentType === 'image/png'){
                //Read Output to browser
                const readstream = gfs.createReadStream(file.filename);
                readstream.pipe(res);
                // gfs.openDownloadStreamByName(req.params.filename).pipe(res)
                // streaming from gridfs
                // var readstream = gfs.createReadStream({
                //     filename: file.filename
                // });
                
                // //error handling, e.g. file does not exist
                // readstream.on('error', function (err) {
                //     console.log('An error occurred!', err);
                //     throw err;
                // });
                
                // readstream.pipe(res);
            }else{
                res.status(404).json({
                    err:"Not an image."
                });
            }
        });
    }else{
        res.status(404).json({
            err:"Invalide Image Id."
        });
    }
});

// @route DELETE /files/:id
// @desc delete file

app.delete('/files/:secretCode/:filename', (req, res)=>{
    // console.log(req.params.id)
    gfs.remove({filename:req.params.filename, 'metadata.secretCode':req.params.secretCode,root:'uploads'}, (err, gridStore)=> {
        if (err) {
            return res.status(404).json({err:err});
        }
        res.json({message:'File deleted successfully'});
    });
});

// @route PUT /files/:filename
// @desc update metadata of a file

app.put('/files/:filename', (req,res) => {
    gfs.files.updateOne({filename:req.params.filename},{$inc:{'metadata.views':1}}, function(err, result){
        if(err){
            console.log('got some error');
            return res.status(404).json({err:err});
        }
        res.json('successfully updated')
    });
})

const port = process.env.PORT || 3501;

app.listen(port, () => console.log(`Server started on port ${port}`));


