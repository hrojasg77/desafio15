require('dotenv').config();
const express = require('express')
const session = require('express-session')
const { create } = require('express-handlebars')
const cookieParser = require('cookie-parser')
const cluster = require('cluster')

const { Server: HttpServer } = require('http')
const { Server: Socket } = require('socket.io')

const routerApi = express.Router()

const mongo = require('connect-mongodb-session')(session);

const minimist = require('minimist')
const args = minimist(process.argv.slice(2))



const PORT = args._[0] || 8080
const MODOINICIOSERVER = args._[1] || 'FORK'

/*
const PORT = 8080
const MODOINICIOSERVER = 'FORK'
*/

console.log(MODOINICIOSERVER)
console.log(PORT)

const NOMBRECOLECCION = process.env.COLLECTIONMONGO

const numCPUs = require('os').cpus().length

const ContenedorMemoria = require('../contenedores/ContenedorMemoria.js')
const ContenedorArchivo = require('../contenedores/ContenedorArchivo.js')
const { Store } = require('express-session')
const { remainder_task } = require('moongose/models/index.js')

const fork = require( 'child_process').fork

const app = express()

advancedOptions = {useNewUrlParser : true, useUnifiedTopology: true}
//--------------------------------------------
// instancio servidor, socket y api

const httpServer = new HttpServer(app)
const io = new Socket(httpServer)

const productosApi = new ContenedorMemoria()
const mensajesApi = new ContenedorArchivo('mensajes.json')

//--------------------------------------------
// configuro el socket

io.on('connection', async socket => {
    console.log('Nuevo cliente conectado!');

    // carga inicial de productos
    socket.emit('productos', productosApi.listarAll());

    // actualizacion de productos
    socket.on('update', producto => {
        productosApi.guardar(producto)
        io.sockets.emit('productos', productosApi.listarAll());
    })

    // carga inicial de mensajes
    socket.emit('mensajes', await mensajesApi.listarAll());

    // actualizacion de mensajes
    socket.on('nuevoMensaje', async mensaje => {
        mensaje.fyh = new Date().toLocaleString()
        await mensajesApi.guardar(mensaje)
        io.sockets.emit('mensajes', await mensajesApi.listarAll());
    })
});

//--------------------------------------------
// agrego middlewares

const hbs = create({ extname : ".hbs",}) 

app.engine(".hbs",hbs.engine)
app.set('view engine', 'hbs');
app.set("views", "./views");

app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

//--------------------------------------------
// Almacenar la sesion

/*
var store = new mongo({
    uri:  'mongodb://localhost:27017/?readPreference=primary&ssl=false&directConnection=true',
    collection: NOMBRECOLECCION
  });
*/

app.post('/login',(req, res) =>{
    session.user = req.body.login;

    app.use(require('express-session')({
        secret: 'muysecreta',
        cookie: {
          maxAge: (1000 * 60 * 60) 
        },
        store: store,
        resave: true,
        saveUninitialized: false
      }));
      
    const datos = {nombre : req.body.login}
    res.render('principal',datos)
})


app.post('/logout',(req, res) =>{
    const datos = {nombre : session.user}
    res.render('logout',datos)
})

app.get('/info',(req, res) =>{  
    const memoria = process.memoryUsage()
    const numCPUs = require('os').cpus().length
    const respuesta = 
    'Número de CPUs        : ' + numCPUs + '<br>' +    
    '<br>' +    
    'Argumentos de entrada : ' + process.argv + '<br>' +
    'Sistema Operativo     : ' + process.platform + '<br>' +
    'Versión node.js       : ' + process.version + '<br>' +
    'Memoria reservada rss : ' + memoria['rss']  + '<br>' +
    'Ruta ejecución        : ' + process.execPath + '<br>' +
    'Process ID            : ' + process.ppid  + '<br>' +
    'Carpeta del proyecto  : ' + process.cwd()  + '<br>' 

     res.send( respuesta )
})

function controllerCalcula(req,res){
    let limite
    if(!req.query.cant)
    {
        limite = 100000000
    }
    else
    {
        limite = req.query.cant        
    }

    const computo = fork('src/computo.js')
    computo.send({ limite: limite });

    computo.on('message', msg => {
        if (msg === 'listo') {
            
        } 
        else
        {
            res.send(msg)
        }
    })
}

routerApi.get('/ramdoms',controllerCalcula)

app.use('/api',routerApi)
// app.use(express.static('public'))
//--------------------------------------------
// inicio el servidor


    if (MODOINICIOSERVER == 'CLUSTER') {
        if (cluster.isPrimary) {
            console.log(`PID PRIMARIO ${process.pid}`)

            for (let i = 0; i < numCPUs; i++) {
                cluster.fork()
            }

            cluster.on('exit', (worker, code, signal) => {
                console.log(`Worker ${worker.process.pid} died`)
                cluster.fork()
            })
        } else {
            // crearServidor(8000)
            const connectedServer = httpServer.listen(PORT, () => {
                console.log(`Servidor http escuchando en el puerto ${connectedServer.address().port}`)
            })
            connectedServer.on('error', error => console.log(`Error en servidor ${error}`))   
        }
    }
    else
    {
        const connectedServer = httpServer.listen(PORT, () => {
            console.log(`Servidor http escuchando en el puerto ${connectedServer.address().port}`)
        })
        connectedServer.on('error', error => console.log(`Error en servidor ${error}`))   
    }    


