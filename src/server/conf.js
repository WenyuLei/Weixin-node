/*!
 * config.js : configuration of sseserver
 * Author : Wenyu Lei <leiwenyu@pku.edu.cn>
 * Copyright(c) 2016
 */

"use strict";

exports.port = 80;

exports.config = {
	token : 'sseweixin',
	appid : 'wx5da79517e05cb1f5',
	appsecret : '30dc0bc3069e94937a0ed9e3e6836953',
	encodingAESKey : '4rHeIILwNk2rIlHJ0UnGqRvPTK26f2dhYsTzWZdJvjZ',
	username : 'zyjweixin',
	password : 'zyjweixin9874123',
	mac : '00:16:3e:00:54:58',
	version : '1.0'
};

exports.mysql_conf = {
	host : 'localhost',
	database : 'sseweixin_db',
	user : 'root',
	password : 'StrongeneDB123456!'
};

exports.menu = {
	"button" : [{
			"type" : "scancode_waitmsg",
			"name" : "扫码绑定",
			"key" : "saoma",
			"sub_button" : []
		}, {
			"name" : "查询",
			"sub_button" : [{
					"type" : "click",
					"name" : "今日作业",
					"key" : "jinrizuoye",
					"sub_button" : []
				}, {
					"type" : "click",
					"name" : "昨日批改",
					"key" : "zuoripigai",
					"sub_button" : []
				}, {
                "type": "click",
                "name": "未交作业",
                "key": "weijiaozuoye",
                "sub_button": []
                },{
				"type" : "click",
				"name" : "已绑定",
				"key" : "bunded",
				"sub_button" : []
                }
			]
		}
	]
};

exports.informTime = {
	hour : 21,
	minute : 0,
	second : 0
}

exports.template = {
	newHomework : {
		templateIdShort : 'OPENTM405774022',
		url : ''
	},
	pigai : {
		templateIdShort : 'OPENTM406784233',
		url : ''
	},
	weijiao : {
		templateIdShort : 'OPENTM407523137',
		url : ''
	}
}

exports.hint = {
	content : '欢迎关注 作业家\n\n关注后请先扫描学生二维码进行绑定，绑定之后可以点击按钮查询 今日作业、昨日批改、今日未交作业\n\n回复【作业】、【新作业】、【今日作业】查询今日作业；\n\n可以回复【昨日成绩】、【昨日批改】查询昨日批改；\n\n可以回复【未交】、【未交作业】查询未交作业；'
}

exports.school_info = {
	server_proxy : '101.200.123.36:80'
}


exports.QR_KEY = "-----BEGIN RSA PRIVATE KEY-----MIICXQIBAAKBgQC1Y3hP0PHt+KNxXoUe/uI5tIpY4+gPtzcyZ8s5pMGpWeG1Fh5zxEFXN7SEqBLxZnuRxMrpFvc58S94pmR0MMhU5+H+qqBYuNH1bkBiOWL3jszCtAFn9FIJrttjJdejM90MrNqzC/KerL2oBWfCzJoJVjcS9//FGp7jcBHkkFG/pQIDAQABAoGAXX5r4Rgd2z8xX5oMm7FdAclhFfhDAPa66Kw/P/MALz447JH+GEWsODxqO4Y2XV8pijUZMZO40pDSmymI1arfVqVV0IQYNklc/F8xQCVXwxbPYewZc2g9cYAhfch8DU9Oko/EieYILzUqmhPKrN7p+6ueP3tIkrajCqYGF568m4ECQQDqJ3TOSlgI6TQuUmZhniI4gxB/2gEgmXZmxrCdsOygITds2WBGXK4kXxLaU/Tn0tPM6SAkL8bfuroXKi7fS38pAkEAxk/CYaaHRLmiVAuyQGmtLp5jJjbdjajMiEsJF9Mf3Jvl/u2jFXoh51Qw138cLqGZthf/Lw58KNdb/lopg6SYHQJBAIfZwnwZSABLhNnHNt02CPaum/kBe5v1TWuNpVSoHHE/NE/zwlawWNyDSIXhJfsGJ5oAO4SjL4gIZwUflTg6LhkCQQCSfgC9WeK6pdZ/91PpuSaxNVdQt17ackMEu0kwTElREejIdIrwJpQ86jhaOA99cuq1VOywuiaFlPDj536bPE8RAkBipb0gtkuk6PRFiahWNohfkR5MaWJmkSNY05Q7s0YpsIDa7naFUwsCOYKFih4eGXC2Ixcid+CS264pGUALndHu-----END RSA PRIVATE KEY-----"