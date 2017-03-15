/*!
 * wechat.js : wechat process file
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

var wechat = require('wechat');
var conf = require('../conf');
var crypto = require("crypto");
var zhaiyao = require('../utils/zhaiyao');
var request = require('request');
var mysqlutils = require('./../utils/mysql');
var mysqlpool = mysqlutils.mysqlpool;
var startTransaction = mysqlutils.transaction;
var commit = mysqlutils.commit;
var handleError = mysqlutils.handleError;
var NodeRSA = require('node-rsa');
var api = require('../utils/api').api;
var CryptoJS = require("crypto-js");

var reply = function (res, content, type) {
	if (content == null || type == null)
		res.reply('');
	else {
		res.reply({
			content : content,
			type : type
		});
	}
};

var query = function (res, message, type) {
	if (type == 'weijiao') {
		mysqlpool.query('SELECT * FROM jiazhangbiao WHERE shanchu = 0 AND weijiao = 1 AND parentID = \'' + message.FromUserName + '\';', function (err, jiazhang) {
			if (err) {
                handleError(err, null, false);
                reply(res, 'query failed !', 'text');
            }

			if (jiazhang.length == 0)
				reply(res, '请先与学生进行绑定', 'text');
			else {
				zhaiyao.weijiao(jiazhang);
				reply(res, null, null); //点击成功或消息放送成功后后用户会发送成功的消息给公众号服务器
			}
		});
	} else if (type == 'bunded') {
        mysqlpool.query('SELECT * FROM jiazhangbiao WHERE shanchu = 0 AND parentID = ?', [message.FromUserName], function(err, results) {
            if (err) {
                handleError(err, null, false);
                reply(res, 'query failed !', 'text');
            }
            var msg = '您已绑定的学生: \n';
            if(results.length == 0)
                msg += '无';
            else {
                results.forEach(function(result) {
                    msg += conf.school_info[result.ip + ':' + result.port].name + result.banji + result.xueshengName + '同学, 他的学号是：' + result.username + '\n\n';
                });
                msg += '\n如果要取消关注某个学生，回复 "解除绑定：学生的学号"\n例如要解除绑定的学生的学号是1150，则回复 解除绑定：1150'
            }
            api.sendText(message.FromUserName, msg, function(err, result) {
                if(err)
                    console.log('send text err: ', err);
                else
                    console.log('send text success');
            });
            reply(res, null, null); //点击成功或消息放送成功后后用户会发送成功的消息给公众号服务器            
        })
    } else {
		mysqlpool.query('SELECT * FROM jiazhangbiao WHERE shanchu = 0 AND zhaiyao = 1 AND parentID = \'' + message.FromUserName + '\';', function (err, jiazhang) {
			if (err) {
                handleError(err, null, false);
                reply(res, 'query failed !', 'text');
            }

			if (jiazhang.length == 0)
				reply(res, '请先与学生进行绑定', 'text');
			else {
				if (type == 'pigai')
					zhaiyao.zhaiyao(jiazhang, 'pigai');
				else
					zhaiyao.zhaiyao(jiazhang, 'newHomework');
				reply(res, null, null); //点击成功或消息放送成功后后用户会发送成功的消息给公众号服务器
			}
		});
	}
};

exports.checkSignature = function (req, res, next) {
	var array = new Array();
	var signature = req.query.signature;
	var timestamp = req.query.timestamp;
	var nonce = req.query.nonce;
	var echostr = req.query.echostr;

	array[0] = timestamp;
	array[1] = nonce;
	array[2] = conf.config.token;
	array.sort();
	var hash = crypto.createHash('sha1');
	var msg = array[0] + array[1] + array[2];
	hash.update(msg);
	var hashResult = hash.digest('hex'); //计算SHA1值
	if (hashResult == signature)
		res.send(echostr);
	else {
		console.log('接入认证失败');
		res.send('access failed');
	}

};

exports.process = wechat(conf.config, wechat.text(function (message, req, res, next) {
			console.log('text');
			if (message.Content == '作业' || message.Content == '新作业' || message.Content == '今日作业') {
				query(res, message, 'newHomework');
			} else if (message.Content == '昨日批改' || message.Content == '昨日成绩') {
				query(res, message, 'pigai');
			} else if (message.Content == '未交' || message.Content == '未交作业') {
				query(res, message, 'weijiao');
			} else if (/解除绑定[:：].*/.test(message.Content)) {
                var id = message.Content.split(':')[1] 
                if (id === undefined)
                    id = message.Content.split('：')[1]
                if(id === '')
                    reply(res, '请输入学号', 'text');
                startTransaction(mysqlpool, function (conn) {
                    conn.query('SELECT * FROM jiazhangbiao WHERE username = ? AND parentID = ? AND shanchu = 0', [id, message.FromUserName], function(err, result) {
                        if(err) {
                            handleError(err, null, false);
                            reply(res, '解绑失败', 'text');
                        }
                        if(result.length === 0) {
                            commit(conn, 201, null, false);
                            reply(res, '您没有绑定该学生', 'text');
                        }
                        else {
                            conn.query('UPDATE jiazhangbiao SET shanchu = 1 WHERE username = ? AND parentID = ? AND shanchu = 0', [id, message.FromUserName], function(err, results) {
                                if(err) {
                                    handleError(err, null, false);
                                    reply(res, '解绑失败', 'text');
                                }
                                commit(conn, 201, null, false);
                                reply(res, '解绑成功', 'text');
                            });
                        }
                    });
                });
            } else if (message.Content == '客服上线') {
                startTransaction(mysqlpool, function (conn) {
                    conn.query('SELECT * FROM kefubiao WHERE openID = ?', [message.FromUserName], function(err, results) {
                        if(err)
                            return handleError(err, conn, false);
                        if(results.length > 0) {
                            conn.query('UPDATE kefubiao set zhiban = 1 WHERE openID = ?', [message.FromUserName], function(err, result) {
                                if(err)
                                    return handleError(err, null, false);
                                else {
                                    commit(conn, 201, null, false);
                                    reply(res, '客服上线成功，开始值班', 'text');
                                }
                            });
                        }
                        else {
                            commit(conn, 201, null, false);
                            reply(res, null, null);
                        }
                    });
                });
			} else if (message.Content == '客服下线') {
                startTransaction(mysqlpool, function (conn) {
                    conn.query('SELECT * FROM kefubiao WHERE openID = ?', [message.FromUserName], function(err, results) {
                        if(err)
                            return handleError(err, conn, false);
                        if(results.length > 0) {
                            conn.query('UPDATE kefubiao set zhiban = 0 WHERE openID = ?', [message.FromUserName], function(err, result) {
                                if(err)
                                    return handleError(err, null, false);
                                else {
                                    commit(conn, 201, null, false);
                                    reply(res, '客服下线成功', 'text');
                                }
                            });
                        }
                        else {
                            commit(conn, 201, null, false);
                            reply(res, null, null);
                        }
                    });
                });
            } else {
                console.log('From: ' + message.FromUserName + ' msg: ' + message.Content)
                reply(res, null, null); //点击成功或消息放送成功后后用户会发送成功的消息给公众号服务器
            }
			
            startTransaction(mysqlpool, function (conn) {
				conn.query('SELECT * FROM kefubiao', function(err, kefus) {
                    if(err)
                        return handleError(err, conn, false);
                    if(kefus.length > 0) {
                        var msgFromKefu = false;
                        for(var i in kefus) {
                            if(message.FromUserName == kefus[i].openID) {
                                msgFromKefu = true;
                                break;
                            }
                        }
                        if(!msgFromKefu) { //msg from jiazhang
                            kefus.forEach(function(kefu) {
                                var msg = '该家长绑定的学生: '
                                if(kefu.zhiban == 1) { //that kefu is working
                                    conn.query('SELECT banji,xueshengName,ip,port FROM jiazhangbiao WHERE parentID = ? AND shanchu = 0', [message.FromUserName], function(err, fields) {
                                        if(err)
                                            return handleError(err, conn, false);
                                        if(fields.length == 0) {
                                            msg += '无';
                                        } else {
                                            fields.forEach(function(field) {
                                                msg += conf.school_info[field.ip + ':' + field.port].name + field.banji + field.xueshengName + '同学\n';
                                            });
                                        }
                                        var content = {
                                            "first" : {
                                                "value" : message.Content,
                                                "color" : "#173177"
                                            },
                                            "keyword1" : { //班级
                                                "value" : '',
                                                "color" : "#173177"
                                            },
                                            "keyword2" : { //姓名
                                                "value" : '',
                                                "color" : "#173177"
                                            },
                                            "keyword3" : { //未完成作业
                                                "value" : '',
                                                "color" : "#173177"
                                            },
                                            "remark" : {
                                                "value" : '\n' + msg,
                                                "color" : "#173177"
                                            }
                                        }
                                        api.sendTemplate(kefu.openID, 'TxT_2eGIQZrDKgLEevXWkSVIplOW6Nj0BmoOxjRBkhg', conf.template.weijiao.url, content, function (err, result) { //发送模板消息
                                            if(err) 
                                                console.log('给客服 ' + kefu.openID + ' 的客服消息转发失败，原因是： ', err);
                                            else
                                                console.log('给客服 ' + kefu.openID + ' 的客服消息转发成功');
                                        });
                                    });
                                }
                            });
                        } 
                    }
                    commit(conn, 201, null, false);
                });
            });

		}).image(function (message, req, res, next) {
			reply(res, conf.hint.content, 'text');

		}).link(function (message, req, res, next) {
			reply(res, conf.hint.content, 'text');

		}).location(function (message, req, res, next) {
			reply(res, conf.hint.content, 'text');

		}).video(function (message, req, res, next) {
			reply(res, conf.hint.content, 'text');

		}).voice(function (message, req, res, next) {
			reply(res, conf.hint.content, 'text');

		}).event(function (message, req, res, next) {
			if (message.Event == 'scancode_waitmsg') { //扫码

				var OpenID = message.FromUserName;
				var QRCodeError = false;
                var encrypted = message.ScanCodeInfo.ScanResult;
				try {
                    var key = new NodeRSA(conf.QR_KEY);
                    key.setOptions({encryptionScheme: 'pkcs1'});
                    var QRcodeInfo = key.decrypt(encrypted, 'json');
                    console.log('QRcodeInfo:', QRcodeInfo);
				} catch (err) {
					QRCodeError = true;
					console.log('NodeRSA decrypt Err: ', err);
				}

                if(QRCodeError) {
                    try {
                        var uncrypted = CryptoJS.AES.decrypt(encrypted, "ssestudent");
                        uncrypted = uncrypted.toString(CryptoJS.enc.Utf8);
                        var QRcodeInfo = JSON.parse(uncrypted);
                        console.log('QRcodeInfo:', QRcodeInfo);
                        QRCodeError = false;
                    } catch (err) {
                        QRCodeError = true;
                        console.log('CryptoJS AES decrypt Err: ', err);
                    }
                }

				if (QRCodeError || (!(QRcodeInfo.hasOwnProperty('ip') && QRcodeInfo.hasOwnProperty('id')))) {
					reply(res, '您扫描的二维码不正确，请尝试重新启动（清除后台程序再启动）作业家学生平板上的‘作业家学生端’程序，重新生成二维码再试一次', 'text');
				} else {
					var parent = {};
					parent.xueshengID = QRcodeInfo.id;
					parent.parentID = OpenID;
					parent.ip = QRcodeInfo.ip;
					parent.port = QRcodeInfo.port;
					parent.xueshengName = QRcodeInfo.name;
					parent.banji = QRcodeInfo.banji;
					parent.username = QRcodeInfo.xueshengID;

					startTransaction(mysqlpool, function (conn) {
						conn.query('SELECT id FROM jiazhangbiao WHERE xueshengID = ? AND parentID = ? AND ip = ? AND shanchu = 0', [parent.xueshengID, parent.parentID, parent.ip], function (err, result) {
							if (err) {
								handleError(err, conn, false);
                                reply(res, '绑定失败！ ', 'text');
                            }

							if (result.length > 0) {
								commit(conn, 201, null, false);
								reply(res, '您已经和这个学生绑定过了', 'text');
							} else {
								conn.query('INSERT INTO jiazhangbiao SET ?', parent, function (err, fields) {
									if (err) {
										handleError(err, conn, true);
										reply(res, '绑定失败！ ', 'text');
									} else {
										commit(conn, 201, null, true);
										reply(res, '与' + parent.banji + parent.xueshengName + '同学绑定成功！ ', 'text');
									}
								});
							}
						});
					});
				}
			}
			if (message.Event == 'CLICK') {
				if (message.EventKey == 'jinrizuoye') {
					query(res, message, 'newHomework');
				}
				if (message.EventKey == 'zuoripigai') {
					query(res, message, 'pigai');
				}
				if (message.EventKey == 'weijiaozuoye') {
					query(res, message, 'weijiao');
				}
				if (message.EventKey == 'bunded') {
                    query(res, message, 'bunded')
				}
			}
			if (message.Event == 'TEMPLATESENDJOBFINISH') {
				console.log('模板消息发送成功');
				reply(res, null, null); //模板消息发送成功后微信会发送成功的消息给公众号服务器
			}
			if (message.Event == 'subscribe') {
				reply(res, '感谢您关注本公众号，我们将为您提供孩子的学习作业信息 ', 'text');
			}
			if (message.Event == 'unsubscribe') {
				startTransaction(mysqlpool, function (conn) {
					conn.query('SELECT id FROM jiazhangbiao WHERE parentID = ? AND shanchu = 0', message.FromUserName, function (err, result) {
						if (err)
							return handleError(err, conn, false);

						if (result.length < 0) //家长没有绑定学生
							commit(conn, 201, null, false);
						else {
							conn.query('UPDATE jiazhangbiao SET shanchu = 1 WHERE parentID = ?', message.FromUserName, function (err, fields) {
								if (err) {
									console.log('Mysql error: ', err);
									handleError(err, conn, true);
								} else
									commit(conn, 201, null, true);
							});
						}
					});
				});
			}
		}));
