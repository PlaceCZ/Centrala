import Express, { json, Request, Response } from "express";
import Logger, { LogLevel } from "./Logger";
import { Server } from "ws";
import * as config from "./config.json";
import * as fs from "fs";
import multer from "multer";
import getPixels from "get-pixels";
import { rgbToHex } from "./Helpers";
import { config as dotenv, DotenvParseOutput } from "dotenv";
import TokenManager from "./Tokman";

const upload = multer({ dest: `${__dirname}/uploads/` });
const app = Express();
const logger = new Logger(config.logPath);

const server = app.listen(config.port, () =>
    logger.Log("Server běří na portu " + config.port, LogLevel.INFO)
);
const wsServer = new Server({ server, path: config.paths.websocket });
const TokMan = new TokenManager();

type envType = {
    PASSWORD: string;
};

const env: envType = dotenv().parsed as envType;

app.use(Express.static("Static"));
app.use("/maps", Express.static("Maps", { extensions: ["png"] }));

let currentMap = "blank.png";
const mapHistory = [
    { file: "blank.png", reason: "Initial Map", date: Date.now() },
];

app.use((_, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    next();
});

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

app.post("/token", json(), (req, res) => {
    // Token bude v body asi, kdyz uz mame ten post request
    console.log(req.body);
    if (req.body && req.body.token && req.body.session) {
        const token = req.body.token;
        const session = req.body.session;

        TokMan.addToken(token, session);
    }
    res.status(200).send();
});

logger.Log("Centrála zapnuta", LogLevel.INFO);
