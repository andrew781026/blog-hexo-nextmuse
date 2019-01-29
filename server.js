const express = require('express');
const favicon = require('express-favicon');
const path = require('path');
const port = process.env.PORT || 80;
const app = express();

// the __dirname is the current directory from where the script is running
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

app.listen(port, () => {
    console.log('start server listen on 80');
});