/*!
 * api.js : wechat-api Object
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

var WechatAPI = require('wechat-api');
var mysqlutils = require('./../utils/mysql');
var mysqlpool = mysqlutils.mysqlpool;
var conf = require('../conf');

var api = new WechatAPI(conf.config.appid, conf.config.appsecret);

function getToken(cb) {
	mysqlpool.query('SELECT * FROM tokenbiao ORDER BY id DESC LIMIT 1', function (err, result) {
		if (err)
			console.log('mysql err:', err);
		else {
			if (result.length > 0) {
				cb(null, JSON.parse(result[0].tokeninfo));
			} else
				cb(null);
		}
	});
}

function saveToken(token, cb) {
	var tokenmsg = {};
	try {
		tokenmsg.tokeninfo = JSON.stringify(token);
	} catch (err) {
		cb(err);
	}
	mysqlpool.query('INSERT INTO tokenbiao SET ?', [tokenmsg], function (err, result) {
		if (err)
			console.log('mysql err:', err);

		cb(null);
	});
}

exports.api = api;
