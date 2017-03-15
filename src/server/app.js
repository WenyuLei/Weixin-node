/*!
 * app.js : sseweixin server application version 2.0
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var schedule = require('node-schedule');
var conf = require('./conf');
var weixin = require('./routes/wechat');
var app = express();
var menu = require('./utils/menu');
var schedule = require('node-schedule');
var zhaiyao = require('./utils/zhaiyao');
var schoolInit = require('./utils/schoolnit');
var mysqlutils = require('./utils/mysql');
var mysqlpool = mysqlutils.mysqlpool;
var handleError = mysqlutils.handleError;

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//menu init
menu.initMenu(conf.menu);

//school init
schoolInit.initSchoolInfo(conf);

//每日推送
var rule = new schedule.RecurrenceRule();
rule.hour = conf.informTime.hour;
rule.minute = conf.informTime.minute;
rule.second = conf.informTime.second;

var j = schedule.scheduleJob(rule, function () {
		mysqlpool.query('SELECT * FROM jiazhangbiao WHERE shanchu = 0 AND zhaiyao = 1', function (err, jiazhang) {
			if (err)
				return handleError(err, null, false);
			else {
				zhaiyao.zhaiyao(jiazhang, 'pigai');
				zhaiyao.zhaiyao(jiazhang, 'newHomework');
			}
		});
        mysqlpool.query('UPDATE kefubiao SET zhiban = 0', function(err, result) {
            if (err)
				return handleError(err, null, false);
			else 
				console.log('所有客服下班')
        });
	});

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
		extended : false
	}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.query());

app.get('/wechat', weixin.checkSignature);
app.post('/wechat', weixin.process);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
	var err = new Error('Not Found');
	err.status = 404;
	next(err);
});

// error handlers

// development error handler
// will print stacktrace
if (app.get('env') === 'development') {
	app.use(function (err, req, res, next) {
		res.status(err.status || 500);
		res.render('error', {
			message : err.message,
			error : err
		});
	});
}

// production error handler
// no stacktraces leaked to user
app.use(function (err, req, res, next) {
	res.status(err.status || 500);
	res.render('error', {
		message : err.message,
		error : {}
	});
});

var server = app.listen(conf.port, function () {
		var host = server.address().address;
		var port = server.address().port;
		console.log('listening at http://%s:%s', host, port);
	});

module.exports = app;
