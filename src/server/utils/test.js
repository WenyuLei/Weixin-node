var request = require('request');

var token = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpcCI6IjU5LjEwOC42MC41OCIsImp0aSI6IjU1MTIwNDNiYzY4My85ODAwLzIwLzE0ODM1MTgwMzA5MzUvMTQxIiwiaWF0IjoxNDg0MDMxOTQ3LCJzdWIiOjM0M30.XdKthAmFBv8gzcbKL8oix_GNcEFMByZ3iqu8NdYRTdM';
var options = {
    url : 'http://101.200.123.36:7100/tongzhis/336?zuoyever=1000&timeout=60000',
    json : true,
    method : 'GET',
    headers : {
        Authorization : 'Bearer ' + token
    }
}
var start1 = Date.now();
request(options, function (err, res, body) {
    console.log('duration: ', (Date.now() - start1)/1000 + ' s')
    console.log('body: ', body);
});