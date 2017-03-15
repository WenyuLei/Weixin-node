/*!
 * menu.js : menu utils
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";
var api = require('./api').api;

exports.initMenu = function (menu) {
	api.createMenu(menu, function (err, result) {
		if (result.errcode != 0) {
			console.log('Menu initialize failed !');
			process.exit(1);
		} else {
			console.log('Menu initialize succeed !');
			return true;
		}
	});
};
