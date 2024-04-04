module.exports = function (RED) {
    function hexStringToFloat(hexString) {
        const hex = parseInt(hexString, 16);
        const sign = hex >> 31 ? -1 : 1;
        const exponent = (hex >> 23) & 0xFF;
        return sign * (hex & 0x7fffff | 0x800000) * 1.0 / Math.pow(2, 23) * Math.pow(2, (exponent - 127));
    }

    function padWithZero(number) {
        return number < 10 ? '0' + number : number;
    }

    function GetValue(config) {
        RED.nodes.createNode(this, config);
        var node = this;

        let ip = config.ip;
        let portStr = "/iolinkmaster/port[" + config.port + "]/iolinkdevice/pdin/getdata";

        let requestObj = { "code": "request", "cid": 4, "adr": portStr };

        let requestJSON = JSON.stringify(requestObj);

        const https = require('http');

        if (config.refreshRate < 0.01)
            config.refreshRate = 0.01;

        setInterval(function () {
            let options =
            {
                hostname: ip,
                port: 80,
                method: 'POST',
                headers:
                {
                    'Content-Type': 'application/json',
                    'Content-Length': requestJSON.length,
                }
            }

            let request = https.request(options, function (result) {
                result.on('data', function (data) {
                    try {
                        var newJson = JSON.parse(data);

                        let now = new Date();
                        let formattedDate = `${now.getFullYear()}-${padWithZero(now.getMonth() + 1)}-${padWithZero(now.getDate())}`;
                        let formattedTime = `${padWithZero(now.getHours())}:${padWithZero(now.getMinutes())}:${padWithZero(now.getSeconds())}.${now.getMilliseconds()}`;

                        let msg = {};
                        msg.payload =
                        {
                            rawValue: newJson.data.value,
                            temperature: hexStringToFloat(newJson.data.value.substring(0, 8)),
                            rmsZ: hexStringToFloat(newJson.data.value.substring(8, 16)),
                            rmsY: hexStringToFloat(newJson.data.value.substring(16, 24)),
                            rmsX: hexStringToFloat(newJson.data.value.substring(24, 32)),
                            notImplementedYet: newJson.data.value.substring(32, 40),
                            timestamp: `${formattedDate} ${formattedTime}` // Date and Time

                        }
                        node.send(msg);
                    }
                    catch (e) {
                        console.log(e);
                    }
                })
            });

            request.on('error', function (error) {
                //avoid ECONNRESET due to Node-Red bug
            })

            request.write(requestJSON);
            request.end();
        }, config.refreshrate * 1000);

        node.on('input', function (msg) {

        });
    }

    RED.nodes.registerType("iolink-SICK-MPB10", GetValue);
}
