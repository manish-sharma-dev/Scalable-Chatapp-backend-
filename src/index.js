const http = require('http')
const express = require('express')
const { Server } = require('socket.io')
const path = require('path')
require('dotenv').config('./.env');
const {Redis} = require('ioredis');


const app = express()
const httpServer = http.createServer(app)

// upgrading an http Connection to webSocket Connection
const io = new Server(httpServer)

app.use(express.static(path.resolve('./public'))) //middleware to add file

app.get('/',(req,res) => {
    res.sendFile('./public/index.html')
})

const PORT = process.env.PORT || 8000;

// redis interaction or sending msg to redis servers
const pub = Redis.createClient({
    url : 'redis://localhost:6379'
})

const sub = Redis.createClient({
    url : `redis://localhost:6379`
})

//-------------------------------------------------------------------------------------

io.on('connection', async (socket) => {
    console.log(`A new socket Connection is established with connection id ${socket?.id}`)

    socket.on('user-msg',async (usermsg) => {
        // if there was only one server than i can send the message to the client directly is msg from the user then i send vpais that msg 

        // io.emit('server-msg',usermsg)
        
        // is there are multiple server than i need to send the msg to the redis server then redis server will send msg to the all the server

        // for publishing msg to the redis Server

        await pub.publish('MSG',JSON.stringify({ usermsg }))
        .then(() => {
            console.log("msg published to the redis Server : ",usermsg)
        })
        .catch((error) => {
            console.log("An error Ocuured while conneccting to the redis Server : ",error)
        })
        

        await pub.quit() //quitting pub client from redis server  

        console.log("Successfully quitting from the redis server")
    })

    // for suscribing Channel to get msg from the users

    (sub.subscribe('MSG', (usermsg) => {
        console.log(`type of mgs received from redis server is: ${typeof(usermsg)}`)

        const msg_from_redis_server = JSON.parse(usermsg)

        console.log(`type of mgs received from redis server is: ${typeof(msg_from_redis_server)}`)
        console.log(`Redis-server-msg : ${msg_from_redis_server}`)
        io.emit('redis-server-msg',msg_from_redis_server) //Emitting msg to clent from redis server
    })
    .then(() => {
        console.log("msg sent to user connected with other clients: Success")
    })
    .catch((error) => {
        console.log("An error Occurred while receiving msg from the redis Server",error)
    }))()

    setTimeout(async () => {
       await sub.quit() //quitting sub client from redis server
        console.log("subscriber quitting from the rediss server")
    }, 5000);


})


httpServer.listen(PORT,() => console.log(`Server Started at PORT ${PORT}`))
