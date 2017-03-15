/*!
 * mysql.js : mysql utils
 * Author : Zhong Ming <zhongming10@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

var mysql = require('mysql');
var mysql_conf = require('./../conf').mysql_conf;
var STATUS_CODES = require('http').STATUS_CODES;

exports.mysqlpool = mysql.createPool({
		connectionLimit : 10,
		multipleStatements : true,
		host : mysql_conf.host,
		database : mysql_conf.database,
		user : mysql_conf.user,
		password : mysql_conf.password
	});

exports.commit = function (conn, code, ret, rollback) {
	conn.commit(function (err) {
		if (err) {
			handleError(err, conn, rollback);
		} else {
			conn.release();
			if (!ret)
				ret = {
					msg : STATUS_CODES[code]
				};
		}
	});
}

exports.handleError = function (err, conn, rollback) {
	console.log('Mysql error: ', err);
	if (rollback) {
		conn.rollback(function () {
			conn.release();
		});
	} else {
		if (conn)
			conn.release();
	}
}

exports.transaction = function (pool, cb) {
	pool.getConnection(function (err, conn) {
		if (err)
			handleError(err, null, false);
		else
			conn.beginTransaction(function (err) {
				if (err)
					handleError(err, conn, false);
				else
					cb(conn);
			});
	});
}
