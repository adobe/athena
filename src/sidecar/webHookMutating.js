const express = require("express");
const https = require('https');
const fs = require('fs');
const bodyParser = require("body-parser");
const privateKey = fs.readFileSync('/etc/webhook/certs/key.pem').toString();
const certificate = fs.readFileSync('/etc/webhook/certs/cert.pem').toString();
const options = {key: privateKey, cert: certificate};
const app = express();
const yaml = require("js-yaml");

const sidecarConfigFile = yaml.safeLoad(fs.readFileSync("/etc/webhook/config/sidecarconfig.yaml", "utf8"));
app.use(bodyParser.json());

function addContainers(data, containers) {
    let basePath = "/spec/containers";
    let idx = 0;
    containers.forEach((container) => {
        data.push({
            "op":"add",
            "path": basePath + "/-",
            "value": container
        })
    });
}

function addVolume(data, volumes) {
    let basePath = "/spec/volumes";
    let idx = 0;
    volumes.forEach((container) => {
        data.push({
            "op":"add",
            "path": basePath + "/-",
            "value": container
        })
    });
}
app.post('/mutate', (req, res) => {
    console.log("body is ", req.body);
    console.log("object is ", req.body.request.object);
    let data = [];
    console.log(sidecarConfigFile);
    addVolume(data, sidecarConfigFile.volumes || []);
    addContainers(data, sidecarConfigFile.containers || []);
    data.push({
        "op":"add",
        "path":"/metadata/annotations",
        "value":{
            "sidecar-injector-webhook.morven.me/status":"injected"
        }})
    console.log(JSON.stringify(data));
    let adminResp = {response:{
            uid: req.body.request.uid,
            allowed: true,
            patch: Buffer.from(JSON.stringify(data
            )).toString('base64'),
            patchType: "JSONPatch",
        }}
    console.log(adminResp);
    res.send(adminResp)
});

const server = https.createServer(options, app).listen(443);