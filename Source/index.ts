import Express, { Request, Response } from "express";
import Logger, { LogLevel} from './Logger';
import { Server } from "ws";
import * as config from "./config.json";
import * as fs from 'fs';
import multer from "multer";
import getPixels from "get-pixels";
import { rgbToHex } from "./Helpers";
import { config as dotenv, DotenvParseOutput } from "dotenv"

const upload = multer({ dest: `${ __dirname}/uploads/` });
const app = Express();
const logger = new Logger(config.logPath);

const server = app.listen(config.port);
const wsServer = new Server({ server, path: config.paths.websocket });

type envType = {
    PASSWORD: string;
};

const env: envType = dotenv().parsed as envType;

app.use(Express.static("Static"));
app.use("/maps", Express.static("Maps", {extensions: ['png']}));

let currentMap = 'blank.png'
const mapHistory = [
    {file: 'blank.png', reason: 'Initial Map', date: Date.now()}
]

app.use((_, res, next) => { 
    res.header("Access-Control-Allow-Origin", "*");
    next();
})

app.get("/api/stats", (req, res) => {
    res.json({
        connectionCount: wsServer.clients.size,
        mapHistory,
        date: Date.now(),
    });
});

app.post("/updateorders", upload.single("image"), async (req, res) => {
    const requestFilePath = req.file?.path;
    if (requestFilePath == null) {
        return;
    } //todo: error handling

    if (
        !req.body.reason ||
        !req.body.password ||
        !req.file ||
        req.body.password != env.PASSWORD
    ) {
        res.send("Špatné heslo!");
        fs.unlinkSync(requestFilePath);
        return;
    }

    if (req.file.mimetype !== "image/png") {
        res.send("Soubor musí být PNG!");
        fs.unlinkSync(requestFilePath);
        return;
    }

    getPixels(requestFilePath, "image/png", function (err, pixels) {
        if (err) {
            res.send("Chyba čtení souboru!");
            console.log(err);
            fs.unlinkSync(requestFilePath);
            return;
        }

        if (pixels.data.length !== 8000000) {
            res.send("Soubor musí být 2000x1000 pixelů!");
            fs.unlinkSync(requestFilePath);
            return;
        }

        for (var i = 0; i < 2000000; i++) {
            const r = pixels.data[i * 4];
            const g = pixels.data[i * 4 + 1];
            const b = pixels.data[i * 4 + 2];

            const hex = rgbToHex(r, g, b);
            if (config.valid_colors.indexOf(hex) === -1) {
                res.send(
                    `Pixel na ${i % 1000}, ${Math.floor(
                        i / 2000
                    )} má špatnou barvu.`
                );
                fs.unlinkSync(requestFilePath);
                return;
            }
        }

        const file = `${Date.now()}.png`;
        fs.copyFileSync(requestFilePath, `maps/${file}`);
        fs.unlinkSync(requestFilePath);
        currentMap = file;
        mapHistory.push({
            file,
            reason: req.body.reason,
            date: Date.now(),
        });
        wsServer.clients.forEach((client) =>
            client.send(
                JSON.stringify({
                    type: "map",
                    data: file,
                    reason: req.body.reason,
                })
            )
        );
        fs.writeFileSync(`${__dirname}/data.json`, JSON.stringify(mapHistory));
        res.redirect("/");
    });
});


wsServer.on('connection', socket => { 
    logger.Log("Klient připojen", LogLevel.INFO);
    
    socket.on('close', () => { 
        logger.Log("Klient odpojen", LogLevel.INFO);
    })

    socket.on('message', message => { 
        let data;
        try {
            data = JSON.parse(message.toString());
        } catch (error) {
            logger.Log(`Nepodařilo se přečíst zprávu: ${message}, odpojuji klienta.`, LogLevel.WARN);
            socket.close();
            return;
        }

        if (!data.type) { 
            logger.Log(`Nepodařilo se přečíst typ zprávy: ${message}, odpojuji klienta.`, LogLevel.WARN);
            socket.close();
            return;
        }

        switch (data.type) {
            case "getmap":
                socket.send(
                    JSON.stringify({
                        type: "map",
                        data: currentMap,
                        reason: mapHistory[mapHistory.length - 1].reason,
                    })
                );
                break;
            case "ping":
                socket.send(JSON.stringify({ type: "pong", time: Date.now() }));
                break;
            case "placepixel":
                const { x, y, color } = data;
                if (
                    x === undefined ||
                    y === undefined ||
                    (color === undefined && x < 0) ||
                    x > 1999 ||
                    y < 0 ||
                    y > 1999 ||
                    color < 0 ||
                    color > 32
                )
                logger.Log(`Pixel placed: ${x}, ${y}: ${color}`, LogLevel.INFO);
                break;
            default:
                socket.send(
                    JSON.stringify({ type: "error", data: "Unknown command!" })
                );
                break;
        }
        
    });
}) 

