/*!
 * schooldirectory.js : get schooldirectory & token
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */
"use strict";

var request = require('request');
var async = require('async');
var uuid = require('node-uuid');
var digestRequest = require('request-digest');
var mysqlutils = require('./mysql');
var mysqlpool = mysqlutils.mysqlpool;
var startTransaction = mysqlutils.transaction;
var commit = mysqlutils.commit;
var handleError = mysqlutils.handleError;

exports.initSchoolInfo = function (conf) {
	var options = {
		url : 'http://' + conf.school_info.server_proxy + '/schools',
		json : true,
		method : 'GET'
	};
	request(options, function (err, res, body) {
		if (err) {
			console.log('Get school directory failed ! Error reason :', err);
			process.exit(1);
		}
		body.forEach(function (school) {
			async.auto({
				storeschool2db : function (callback) {
					startTransaction(mysqlpool, function (conn) {
						conn.query('SELECT * FROM xuexiaobiao WHERE schoolID = ?', [school.id], function(err, infos) {
							if (err) {
								handleError(err, conn, false);
								callback(err, null);
							}
							if(infos.length > 0) {//that school is existed in db
                                if(infos[0].proxy != school.proxy) {
                                    conn.query('UPDATE xuexiaobiao SET proxy = ? WHERE schoolID = ?', [school.proxy, school.id], function(err, result) { //update proxy
                                        if (err) {
                                            handleError(err, conn, false);
                                            callback(err, null);
                                        }
                                    });
                                }
                                infos[0].proxy = school.proxy;
                                commit(conn, 201, null, false);
                                callback(null, infos[0]);
							}
							else { //that school not existed in db
								var xuexiao = {};
								xuexiao.schoolID = school.id;
								xuexiao.proxy = school.proxy;
								xuexiao.token = null;
								conn.query('INSERT INTO xuexiaobiao SET ?', [xuexiao], function(err, result) {
									if(err) {
										handleError(err, conn, false);
										callback(err, null);
									}
									else{
										commit(conn, 201, null, false);
										callback(null, xuexiao);
									}
								})
							}
						});
					});
				},
				insert_school : function (callback) {
					conf.school_info[school.proxy] = school;
					callback(null, null);
				},
				login : ['insert_school', 'storeschool2db', function (results, callback) {
					if(results.storeschool2db.token === null) {
						digestRequest(conf.config.username, conf.config.password).request({
							host : 'http://' + school.proxy.split(':')[0],
							path : '/logins',
							port : school.proxy.split(':')[1],
							json : true,
							method : 'POST',
							body : {
								mac : conf.config.mac,
								clienttype : 0,
								clientversion : conf.config.version
							},
							headers : {
								'X-Post-Guid' : uuid.v4()
							}
						}, function (err, res, body) {
							if (err){
                                callback(err, null);
								console.log(school.name + 'can not acess, the error reason is :', err);
                            }
							else {
								conf.school_info[school.proxy].token = body.token;
                                mysqlpool.query('UPDATE xuexiaobiao SET token = ? WHERE schoolID = ?', [body.token, school.id], function(err, result) {
                                    callback(err, result);
                                });
                            }
						});
					}
					else {
						conf.school_info[school.proxy].token = results.storeschool2db.token;
						callback(null, null);
					}
				}],
				// print: ['login', function (results, callback) {
				//     console.log('now school info is :', conf.school_info);
				//     callback(null, null);
				// }]
			}, function (err, results) {
				if(err)
					console.log(school.name + 'can not acess, the error reason is :', err);
				else
					console.log(school.name + ' school init finished');
			});
		});
	});
}
