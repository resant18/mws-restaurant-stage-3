var express = require("express");

var server = express();

server.use("/", express.static(__dirname + "/"));

const port = process.env.PORT || 8000;
console.log(`port is ${port}`);
server.listen(port, () => console.log(`Server is running on port ${port}`));