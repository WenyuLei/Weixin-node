/*!
 * zhaiyao.js : sseweixin will inform parent everyday
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

var request = require('request');
var conf = require('../conf');
var async = require('async');
var api = require('./api').api;
var mysqlutils = require('./mysql');
var mysqlpool = mysqlutils.mysqlpool;

var constructTimu = function (timuParentHash, zuoyeqingdan, qingdan) {
	zuoyeqingdan.timus.forEach(function (timu) {
		if (timuParentHash[timu.id] !== undefined) { //说明是大题
			var timuParent = {};
			timuParent.id = timu.id;
			timuParent.childTimu = timuParentHash[timu.id];
			qingdan.timus.push(timuParent);
		}
	});
};

var cacuFenshu = function (qingdan, datijilus) {
	var fenshuSum = 0;
	qingdan.timus.forEach(function (timu) {
		timu.fenshuMin = 100;
		var hasanswer = false;
		timu.childTimu.forEach(function (childID) {
			datijilus.forEach(function (datijilu) {
				if (datijilu.zuoyeqingdan == qingdan.id && datijilu.timu == childID) {
					var childfenshu = (datijilu.pigaijieguo != null) ? parseFloat(datijilu.pigaijieguo.split(',').sort(function (a, b) {
							return a - b
						})[0]) : 0;
					timu.fenshuMin = Math.min(timu.fenshuMin, childfenshu);
					hasanswer = true;
				}
			})
		})
		if (!hasanswer)
			timu.fenshuMin = 0;
		fenshuSum += timu.fenshuMin;
	});
	qingdan.fenshuAverage = fenshuSum / qingdan.timus.length;
};

var constructQingdan = function (qingdan, zuoyeqingdan, timuParentHash, datijilus) {
	qingdan.id = zuoyeqingdan.id;
	qingdan.name = zuoyeqingdan.name;
	qingdan.timucount = zuoyeqingdan.timus.length;
	qingdan.beizhu = (zuoyeqingdan.beizhu == '') ? '无' : zuoyeqingdan.beizhu;
	qingdan.fenshuAverage = 0;
	qingdan.timus = [];

	//组织大小题
	if (timuParentHash != null)
		constructTimu(timuParentHash, zuoyeqingdan, qingdan);

	//计算每个大题的最低分 & 作业清单的平均分
	if (datijilus != null && qingdan.timucount != 0)
		cacuFenshu(qingdan, datijilus);
};

var zuoyeqingdanProcess = function (kechengHash, timuParentHash, zuoyeqingdans, datijilus) {
	var homeworks = []; //所有作业，课程相同的合并在一起
	var kechengs = {}; //出现过的课程id
	zuoyeqingdans.forEach(function (zuoyeqingdan) {
		if (kechengs[zuoyeqingdan.kecheng] == undefined) {
			kechengs[zuoyeqingdan.kecheng] = zuoyeqingdan.kecheng;
			var zuoye = {};
			zuoye.kecheng = zuoyeqingdan.kecheng;
			zuoye.qingdans = [];
			var qingdan = {};
			//组织作业清单
			constructQingdan(qingdan, zuoyeqingdan, timuParentHash, datijilus);
			zuoye.qingdans.push(qingdan);
			homeworks.push(zuoye);
		} else {
			homeworks.forEach(function (homework) {
				if (homework.kecheng == zuoyeqingdan.kecheng) {
					var qingdan = {};
					//组织作业清单
					constructQingdan(qingdan, zuoyeqingdan, timuParentHash, datijilus);
					homework.qingdans.push(qingdan);
				}
			})
		}
	});
	//现在homeworks形如： [{
	//                          kecheng: 2，
	//                          qingdans: [
	//                              {
	//                                  id: 3,
	//                                  name: '有理数的加法'，
	//                                  timucount：5，
	//                                  beihzu： '明天之前完成',
	//                                  fenshuAverage: 50,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 103,
	//                                       childTimu: [103, 2, 13, 5],
	//                                       fenshuMin: 20
	//                                      },
	//                                      {
	//                                       id: 453,
	//                                       childTimu: [453, 3, 4],
	//                                       fenshuMin: 80},
	//                                      }
	//                                  ]
	//                              },
	//                              {
	//                                  id: 4,
	//                                  name: '有理数的乘法'，
	//                                  timucount：7，
	//                                  beihzu： '后天之前完成',
	//                                  fenshuAverage: 90,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 11,
	//                                       childTimu: [11，87],
	//                                       fenshuMin: 90
	//                                      }
	//                                  ]
	//                              }
	//                           ]
	//                          },
	//                         {
	//                          kecheng: 4，
	//                          qingdans: [
	//                              {
	//                                  id: 3,
	//                                  name: '古诗默写'，
	//                                  timucount：2，
	//                                  beihzu： '明天之前完成'，
	//                                  fenshuAverage: 88,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 45,
	//                                       childTimu: [45，96],
	//                                       fenshuMin: 88
	//                                      }
	//                                  ]
	//                              }
	//                          ]
	//                         },
	//                        ....]
	//ps:每个作业清单的平均分是清单下所有答题的分数求平均；每个大题的分数取该大题下面分数最低的小题

	homeworks.forEach(function (homework) {
		homework.kecheng = kechengHash[homework.kecheng];
		/*homework.qingdans.forEach(function(qingdan){
		console.log('清单id:', qingdan.id);
		console.log('清单name:', qingdan.name);
		qingdan.timus.forEach(function(timu) {
		console.log('清单timu:', timu);
		})
		});
		 */
	});
	//现在homeworks形如： [{
	//                          kecheng: 数学，
	//                          qingdans: [
	//                              {
	//                                  id: 3,
	//                                  name: '有理数的加法'，
	//                                  timucount：5，
	//                                  beihzu： '明天之前完成',
	//                                  fenshuAverage: 50,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 103,
	//                                       childTimu: [103, 2, 13, 5],
	//                                       fenshuMin: 20
	//                                      },
	//                                      {
	//                                       id: 453,
	//                                       childTimu: [453, 3, 4],
	//                                       fenshuMin: 80},
	//                                      }
	//                                  ]
	//                              },
	//                              {
	//                                  id: 4,
	//                                  name: '有理数的乘法'，
	//                                  timucount：7，
	//                                  beihzu： '后天之前完成',
	//                                  fenshuAverage: 90,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 11,
	//                                       childTimu: [11，87],
	//                                       fenshuMin: 90
	//                                      }
	//                                  ]
	//                              }
	//                           ]
	//                          },
	//                         {
	//                          kecheng: 语文，
	//                          qingdans: [
	//                              {
	//                                  id: 3,
	//                                  name: '古诗默写'，
	//                                  timucount：2，
	//                                  beihzu： '明天之前完成'，
	//                                  fenshuAverage: 88,
	//                                  timus: [
	//                                      { //每个大题
	//                                       id: 45,
	//                                       childTimu: [45，96],
	//                                       fenshuMin: 88
	//                                      }
	//                                  ]
	//                              }
	//                          ]
	//                         },
	//                        ....]
	return homeworks;
};

var getDate = function (now) {
	var oneDay = 24 * 60 * 60 * 1000;
	var value = now - oneDay;
	var yDate = new Date(value);
	var month = (yDate.getMonth() + 1);
	month = month < 10 ? '0' + month : month;
	var day = yDate.getDate();
	day = day < 10 ? '0' + day : day;
	return {
		yesterday : yDate.getFullYear() + '-' + month + '-' + day,
		today : yDate.getFullYear() + '-' + month + '-' + (parseInt(day) + 1 + ''),
		value : value
	}
};

var get0ClockMilliSeconds = function (when) {
	if (when == 'today') {
		var nowDate = new Date();
		var year = nowDate.getFullYear();
		var month = nowDate.getMonth() + 1;
		var day = nowDate.getDate();
		return new Date(year + '-0' + month + '-' + day).getTime();
	} else if (when == 'yesterday')
		return new Date(getDate(Date.now()).yesterday).getTime();
	else
		return null;
};

var checkTemplateid = function (conf, templateType, cb) {
	api.getAllPrivateTemplate(function (err, result) {
		if (err)
			console.log('get template list err', err);
		else {
			var templateIdShort
			switch (templateType) {
			case 'newHomework':
				templateIdShort = conf.template.newHomework.templateIdShort;
				break;
			case 'weijiao':
				templateIdShort = conf.template.weijiao.templateIdShort;
				break;
			case 'pigai':
				templateIdShort = conf.template.pigai.templateIdShort;
				break;
			}
			if (result.template_list.length > 0) {
				var templates = result.template_list;
				for (var i = 0; i < templates.length; i++) {
					if (templateType == 'newHomework' && templates[i].title == '作业提醒') {
						conf.template.newHomework.template_id = templates[i].template_id;
						return cb(true);
					}
					if (templateType == 'weijiao' && templates[i].title == '作业完成进度提醒') {
						conf.template.weijiao.template_id = templates[i].template_id;
						return cb(true);
					}
					if (templateType == 'pigai' && templates[i].title == '作业成绩通知') {
						conf.template.pigai.template_id = templates[i].template_id;
						return cb(true);
					}
				}
			}
			api.addTemplate(templateIdShort, function (err, result) { //添加模板
				if (err)
					console.log('add template err:', err);
				else {
					if (templateType == 'newHomework') {
						conf.template.newHomework.template_id = result.template_id;
						return cb(true);
					}
					if (templateType == 'pigai') {
						conf.template.pigai.template_id = result.template_id;
						return cb(true);
					} else {
						conf.template.weijiao.template_id = result.template_id;
						return cb(true);
					}
				}
			});
		}
	});
};

exports.zhaiyao = function (jiazhang, msgType) {
	checkTemplateid(conf, msgType, function (result) {
		if (true == result) {
			var xueshengs = [];
			var nowTime = Date.now();
			for (var i = 0; i < jiazhang.length; i++) {
				var info = {};
				info.ip = jiazhang[i].ip;
				info.port = jiazhang[i].port;
				info.id = jiazhang[i].xueshengID;
				info.parent = jiazhang[i].parentID;
				xueshengs.push(info);
			}
			if (xueshengs.length > 0) {
				xueshengs.forEach(function (xuesheng) {
					async.auto({
						//step:
                        //1. get token;
						//2. [1]reuqest to get today's zuoyeqingdans;
						//3. [1]request to get datijilu which is corrected by teacher yesterday;
						//4. [1]request to get xuesheng data;
						//5. [2]request to get zuoyeqingdan which exist in [3]
						//6. [2,5]request to get timu data whilch exist in zuoyeqingdan;
						//7. [4]request to get kecheng data;
						//8. [5]request to get xuesheng banji data;
						//9. [6,7]deal data;
						//10. [9]send data to parent;
						get_token : function(callback) {
							mysqlpool.query('SELECT * FROM xuexiaobiao WHERE proxy = ?', [xuesheng.ip + ':' + xuesheng.port], function(err, result) {
								if(err)
									callback(err, null);
								else
									callback(null, result[0]);
							});
						},
						get_zuoyeqingdan : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/zuoyeqingdans?xueshengs=' + xuesheng.id + '&shanchu=0&fields=id,name,beizhu,timus,kecheng,fabutime&fabutime=[' + get0ClockMilliSeconds('today') + ',' + nowTime + ']',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							};
							//console.log(options);
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						get_datijilu : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/datijilus?xuesheng=' + xuesheng.id + '&shanchu=0&pigai=1&fields=id,xuesheng,timu,zuoyeqingdan,pigaijieguo,pigaitime&pigaitime=[' + get0ClockMilliSeconds('yesterday') + ',' + get0ClockMilliSeconds('today') + ']',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							};
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						get_xuesheng : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/users?id=' + xuesheng.id + '&shanchu=0&fields=id,name,banji,xiugaitime,user,createtime,lasttime',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							}
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						get_pigaiqingdan : ['get_datijilu', function (results, callback) {
								if (results.get_datijilu.length > 0) {
									var pigaiID = [];
									results.get_datijilu.forEach(function (datijilu) {
										pigaiID.push(datijilu.zuoyeqingdan)
									});
									pigaiID.join();
									var options = {
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/zuoyeqingdans?xueshengs=' + xuesheng.id + '&shanchu=0&id=' + pigaiID + '&fields=id,name,beizhu,timus,kecheng,fabutime',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									};
									//console.log(options);
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						get_timu : ['get_zuoyeqingdan', 'get_pigaiqingdan', function (results, callback) {
								var allqingdan = results.get_zuoyeqingdan.concat(results.get_pigaiqingdan);
								if (allqingdan.length > 0) {
									var allTimu = [];
									allqingdan.forEach(function (qingdan) {
										qingdan.timus.forEach(function (timu) {
											allTimu.push(timu.id);
										})
									});
									var allTimuStr = allTimu.toString();
									var options = { //用来找题的
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/timus?id=' + allTimuStr + '&xuesheng=' + xuesheng.id + '&fields=id,parent',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									}
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						get_kecheng : ['get_xuesheng', function (results, callback) {
								if (results.get_xuesheng.length > 0) {
									var options = {
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/banjis/' + results.get_xuesheng[0].banji + '/kechengs?shanchu=0&fields=id,name,banji,laoshi,jihua,jindu',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									}
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						get_banji : ['get_xuesheng', function (results, callback) {
								if (results.get_xuesheng.length > 0) {
									var options = {
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/banjis/' + results.get_xuesheng[0].banji + '?shanchu=0&fields=id,name',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									}
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						deal_data : ['get_kecheng', 'get_banji', 'get_timu', function (results, callback) {
								//console.log('deal date');
								//console.log('results:', results);
								if (results.get_xuesheng.length > 0) {
									//把课程id映射成课程名称
									var kechengHash = {};
									for (var j in results.get_kecheng) {
										if (kechengHash[results.get_kecheng[j].id] == undefined)
											kechengHash[results.get_kecheng[j].id] = results.get_kecheng[j].name;
									}

									//键：作业清单中的所有大题； 值：该大题下的所有小题
									var timuParentHash = {};
									if (results.get_timu.length > 0) {
										for (var k in results.get_timu) {
											if (results.get_timu[k].parent == -1)
												timuParentHash[results.get_timu[k].id] = [results.get_timu[k].id];
											else
												timuParentHash[results.get_timu[k].parent].push(results.get_timu[k].id);
										}
									}
									//console.log('timuHash', timuParentHash);

									if (msgType == 'newHomework') {
										var dealzuoye = (timuParentHash == {}) ? [] : zuoyeqingdanProcess(kechengHash, timuParentHash, results.get_zuoyeqingdan, null);
										//新作业信息
										var NewHomework = '\n';
										if (dealzuoye.length == 0)
											NewHomework += '今天没有作业';
										else {
											dealzuoye.forEach(function (zuoye) {
												zuoye.qingdans.forEach(function (qingdan) {
													NewHomework += zuoye.kecheng + '    ' + qingdan.name + '    ' + qingdan.timus.length + '题    备注：' + qingdan.beizhu + '\n';
												});
											});
											NewHomework += '请督促您的孩子及时完成。\n';
										}
										//console.log('新作业信息', NewHomework);
										var content = {
											"first" : {
												"value" : "亲爱的家长,您好!这是今天新布置的作业",
												"color" : "#173177"
											},
											"keyword1" : { //班级
												"value" : results.get_banji.name,
												"color" : "#173177"
											},
											"keyword2" : { //作业名称
												"value" : getDate(nowTime).today + '日作业',
												"color" : "#173177"
											},
											"keyword3" : { //作业详情
												"value" : '\n' + NewHomework, //getDate(nowTime).yesterday,
												"color" : "#173177"
											},
											"remark" : {
												"value" : '\n感谢您的查阅，请监督' + results.get_xuesheng[0].name + '同学按时完成作业', //'新作业信息:' + NewHomework + '\n\n昨日作业信息:' + HomeWorkYesterday,
												"color" : "#173177"
											}
										}
									}
									if (msgType == 'pigai') {
										var dealzuoyeed = (timuParentHash == {}) ? [] : zuoyeqingdanProcess(kechengHash, timuParentHash, results.get_pigaiqingdan, results.get_datijilu);
										//昨日作业情况
										var pigaiYesterday = '\n';
										if (dealzuoyeed.length == 0)
											pigaiYesterday += '老师很忙，昨天没有批改作业;';
										else {
											dealzuoyeed.forEach(function (zuoyeed) {
												zuoyeed.qingdans.forEach(function (qingdan) {
													pigaiYesterday += zuoyeed.kecheng + '    ' + qingdan.name + '    ' + qingdan.timus.length + '题    平均得分：' + qingdan.fenshuAverage.toFixed(2) + '\n';
												});
											});
											pigaiYesterday += '请您督促孩子及时复习没有掌握的知识。\n';
										}
										//console.log('昨日批改作业', pigaiYesterday);
										var content = {
											"first" : {
												"value" : "亲爱的家长,您好!这是老师昨天批改的作业",
												"color" : "#173177"
											},
											"keyword1" : { //姓名
												"value" : results.get_xuesheng[0].name,
												"color" : "#173177"
											},
											"keyword2" : { //作业类型
												"value" : '课后作业',
												"color" : "#173177"
											},
											"remark" : { //批改情况
												"value" : '\n昨日批改成绩:' + pigaiYesterday,
												"color" : "#173177"
											}
										}
									}
									callback(null, content);
								} else
									callback(null, {});
							}
						],
						send_msg : ['deal_data', function (results) {
								if (results.get_xuesheng.length > 0) {
									var templateId = (msgType == 'newHomework') ? conf.template.newHomework.template_id : conf.template.pigai.template_id;
									var url = (msgType == 'newHomework') ? conf.template.newHomework.url : conf.template.pigai.url;

									api.sendTemplate(xuesheng.parent, templateId, url, results.deal_data, function (err, result) { //发送模板消息
										if (err)
											console.log('send err:', err);

										console.log('send succeed:', result);
									});
								}
							}
						]
					}, function (err, results) {
						console.log('sth err');
						if (err)
							console.log(err);
						else
							console.log('inform succeed, and result:', results);
					});
				});
			}
		} else
			console.log('get template err');
	});
};

exports.weijiao = function (jiazhang) {
	checkTemplateid(conf, 'weijiao', function (result) {
		if (true == result) {
			var xueshengs = [];
			var nowTime = Date.now();
			for (var i = 0; i < jiazhang.length; i++) {
				var info = {};
				info.ip = jiazhang[i].ip;
				info.port = jiazhang[i].port;
				info.id = jiazhang[i].xueshengID;
				info.parent = jiazhang[i].parentID;
				xueshengs.push(info);
			}
			if (xueshengs.length > 0) {
				xueshengs.forEach(function (xuesheng) {
					async.auto({
						//step:
                        //1. get token;
						//2. [1]reuqest to get today's zuoyeqingdans;
						//3. [1]request to get xuesheng data;
						//4. [3]request to get kecheng data;
						//5. [4]request to get xuesheng banji data;
						//6. request to get today's datijilus
						//7. deal data;
						//8. send data to parent;
                        get_token : function(callback) {
							mysqlpool.query('SELECT * FROM xuexiaobiao WHERE proxy = ?', [xuesheng.ip + ':' + xuesheng.port], function(err, result) {
								if(err)
									callback(err, null);
								else
									callback(null, result[0]);
							});
						},
						get_zuoyeqingdan : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/zuoyeqingdans?xueshengs=' + xuesheng.id + '&shanchu=0&fields=id,name,timus,kecheng,fabutime&fabutime=[' + get0ClockMilliSeconds('today') + ',' + nowTime + ']',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							}
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						get_xuesheng : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/users?id=' + xuesheng.id + '&shanchu=0&fields=id,name,banji,xiugaitime,user,createtime,lasttime',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							}
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						get_kecheng : ['get_xuesheng', function (results, callback) {
								if (results.get_xuesheng.length > 0) {
									var options = {
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/banjis/' + results.get_xuesheng[0].banji + '/kechengs?shanchu=0&fields=id,name,banji,laoshi,jihua,jindu',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									}
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						get_banji : ['get_xuesheng', function (results, callback) {
								if (results.get_xuesheng.length > 0) {
									var options = {
										url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/banjis/' + results.get_xuesheng[0].banji + '?shanchu=0&fields=id,name',
										json : true,
										method : 'GET',
										headers : {
											Authorization : 'Bearer ' + results.get_token.token
										}
									}
									request(options, function (err, res, body) {
										callback(err, body);
									});
								} else
									callback(null, []);
							}
						],
						get_datijilu : ['get_token', function (results, callback) {
							var options = {
								url : 'http://' + xuesheng.ip + ':' + xuesheng.port + '/datijilus?xuesheng=' + xuesheng.id + '&shanchu=0&pigai=1&fields=id,xuesheng,timu,zuoyeqingdan,pigaijieguo&zuotitime=[' + get0ClockMilliSeconds('today') + ',' + nowTime + ']',
								json : true,
								method : 'GET',
								headers : {
									Authorization : 'Bearer ' + results.get_token.token
								}
							}
							request(options, function (err, res, body) {
								callback(err, body);
							});
						}],
						deal_data : ['get_zuoyeqingdan', 'get_kecheng', 'get_banji', 'get_datijilu', function (results, callback) {
								if (results.get_xuesheng.length > 0) {
									//课程id映射成课程名称
									var kechengHash = {};
									for (var j in results.get_kecheng) {
										if (kechengHash[results.get_kecheng[j].id] == undefined)
											kechengHash[results.get_kecheng[j].id] = results.get_kecheng[j].name;
									}
									results.get_zuoyeqingdan.forEach(function (qingdan) {
										qingdan.timucount = qingdan.timus.length;
									});

									var dealzuoye = zuoyeqingdanProcess(kechengHash, null, results.get_zuoyeqingdan, results.get_datijilu);

									var unFinished = '\n';
									if (dealzuoye.length == 0) {
										unFinished += '无';
									} else {
										var datiHash = {}; //键：答题记录中出现的作业清单；值：该作业清单题目数量；
										results.get_datijilu.forEach(function (dati) {
											if (datiHash[dati.zuoyeqingdan] == undefined)
												datiHash[dati.zuoyeqingdan] = 1;
											else
												datiHash[dati.zuoyeqingdan] += 1;
										})
										dealzuoye.forEach(function (zuoye) {
											var allFinished = true;
											unFinished += zuoye.kecheng + ':  ';
											zuoye.qingdans.forEach(function (qingdan) {
												if (datiHash[qingdan.id] === undefined || datiHash[qingdan.id] < qingdan.timucount) {
													unFinished += qingdan.name + '  ';
													allFinished = false;
												}
											});
											if (!allFinished)
												unFinished += '\n';
											else
												unFinished += '无\n';
										});
									}
									//console.log('未完成的作业：', unFinished);

									var content = {
										"first" : {
											"value" : "您好，明天就要交作业了吗，您的孩子现在还有以下作业没有完成：",
											"color" : "#173177"
										},
										"keyword1" : { //班级
											"value" : results.get_banji.name,
											"color" : "#173177"
										},
										"keyword2" : { //姓名
											"value" : results.get_xuesheng[0].name,
											"color" : "#173177"
										},
										"keyword3" : { //未完成作业
											"value" : unFinished,
											"color" : "#173177"
										},
										"remark" : {
											"value" : '\n请监督孩子及时完成作业。',
											"color" : "#173177"
										}
									}
									callback(null, content);
								} else
									callback(null, {});
							}
						],
						send_msg : ['deal_data', function (results) {
								if (results.get_xuesheng.length > 0) {
									api.sendTemplate(xuesheng.parent, conf.template.weijiao.template_id, conf.template.weijiao.url, results.deal_data, function (err, result) { //发送模板消息
										if (err)
											console.log('send err:', err);

										console.log('send succeed:', result);
									});
								}
							}
						],
					}, function (err, results) {
						if (err)
							console.log(err);
						else
							console.log('inform succeed, and result:', results);
					});
				});
			}
		} else
			console.log('get template err');
	});
};
