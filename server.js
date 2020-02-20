var express = require("express");

var server = express();

server.use("/", express.static(__dirname + "/"));

const port = process.env.PORT || 8000;
server.listen(port, () => console.log(`Server is running on port ${port}`));