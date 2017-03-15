/*
 * CreateDB.sql: scripts for creating all DB tables
 * Author: Wenyu Lei <leiwenyu@pku.edu.cn>
 * MySQL Version: 5.7
 * Create Date: 2016-7-6
 */
 
-- create database
drop database if exists sseweixin_db;
create database sseweixin_db;

-- create tables
use sseweixin_db;

create table jiazhangbiao (
    id int not null auto_increment primary key,
    xueshengID int not null,
    banji text not null,
    username text not null，
    xueshengName text not null,
    phone text null,
    parentID text not null,
    ip text not null,
    port int not null,
    zhaiyao int not null default 1,
    weijiao int not null default 1,
    shanchu int not null default 0
);

create table baimingdanbiao (
    id int not null auto_increment primary key,
    xuesheng int not null,
    phone text not null,
    parentID text not null,
    shanchu int not null default 0
);

create table jiazhangtongzhibiao (
    id int not null auto_increment primary key,
    laoshi int null,
    banji int null,
    xuesheng int not null,
    time int not null,
    message text not null,
    shanchu int not null default 0
);

create table tokenbiao (
    id int not null auto_increment primary key,
    tokeninfo text not null
);

create table kefubiao (
    id int not null auto_increment primary key,
    openID text not null,
    zhiban int not null default 0
);

create table xuexiaobiao (
    id int not null auto_increment primary key,
    schoolID int not null,
    proxy text not null,
    token text null
);
    