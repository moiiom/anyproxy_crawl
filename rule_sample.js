/*
 read the following wiki before using rule file
 https://github.com/alibaba/anyproxy/wiki/What-is-rule-file-and-how-to-write-one
 */

var fs = require('fs'),
    url = require("url"),
    queryString = require("querystring");

module.exports = {
    urlFolder: "/home/jason/scrapy_data/weixin_url",

    replaceServerResDataAsync: function (req, res, serverResData, callback) {
        if (req.url.indexOf('profile_ext') > 0) {
            console.log(">>>replace data:true");
            console.log(">>>reqest url:" + req.url);

            var result = url.parse(req.url);
            var query = result["query"];
            var dict = queryString.parse(query);
            var action = dict['action'];
            if (action == "home" || action == "getmsg") {
                this.decodeURL(action, serverResData.toString());
            }
        }

        callback(serverResData);
    },

    shouldInterceptHttpsReq: function (req) {
        console.log(">>>intercept https:true");
        return true;
    },

    decodeURL: function (action, resData) {
        var msg,
            matched,
            decodeStr;
        matched = (action == "home") ? resData.match(/msgList = '(.*)';/) : resData.match(/general_msg_list":"(.*)"}/);
        if (matched && matched.length > 0) {
            msg = matched[1];
            // console.log(">>>>>>>>>>>>>>>>>recive message:" + msg);
        } else {
            console.log(">>>error!! intercept https and get response body,but can't find historical article url.");
            return;
        }

        decodeStr = (action == "home") ? msg.replace(/\\\//g, "\/").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&amp;/g, "&")
            : msg.replace(/\\\//g, "\/").replace(/\\"/g, "\"").replace(/&amp;/g, "&").replace(/&quot;/g, "\\\"");
        var res = JSON.parse(String(decodeStr));
        for (var i in res["list"]) {
            var itemI = res["list"][i];
            if (!itemI.hasOwnProperty("app_msg_ext_info")) {
                continue;
            }
            var extInfo = itemI["app_msg_ext_info"];
            this.parseData(extInfo);

            if (extInfo.hasOwnProperty("multi_app_msg_item_list") && extInfo["multi_app_msg_item_list"].length > 0) {
                for (var j in extInfo["multi_app_msg_item_list"]) {
                    var itemJ = extInfo["multi_app_msg_item_list"][j];
                    this.parseData(itemJ);
                }
            }
        }
    },

    parseData: function (extInfo) {
        var author = "",
            title = "",
            digest = "",
            contentUrl = "",
            url = "";
        if (extInfo.hasOwnProperty("author")) {
            author = extInfo["author"] ? extInfo["author"].replace(/\t/g, '') : "null"
        }
        if (extInfo.hasOwnProperty("title")) {
            title = extInfo["title"] ? extInfo["title"].replace(/\t/g, '') : "null"
        }
        if (extInfo.hasOwnProperty("digest")) {
            digest = extInfo["digest"] ? extInfo["digest"].replace(/\t/g, '') : "null"
        }
        if (extInfo.hasOwnProperty("content_url") && extInfo["content_url"]) {
            contentUrl = extInfo["content_url"];
            url = contentUrl.replace(/amp;/g, "").replace(/\t/g, '');

            console.log("author:" + author);
            console.log("title:" + title);
            console.log("digest:" + digest);
            console.log("content url:" + url);
            this.write2File(author, title, digest, url);
        }
    },

    write2File: function (author, title, digest, url) {
        Date.prototype.Format = function (fmt) {
            var o = {
                "M+": this.getMonth() + 1, //月份
                "d+": this.getDate(), //日
                "h+": this.getHours(), //小时
                "m+": this.getMinutes(), //分
                "s+": this.getSeconds(), //秒
                "q+": Math.floor((this.getMonth() + 3) / 3), //季度
                "S": this.getMilliseconds() //毫秒
            };
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        };

        var currDateStr = new Date().Format("yyyyMMdd");
        var fileName = this.urlFolder + "/url_" + currDateStr;
        fs.stat(fileName, function (err, stat) {
            if (err == null) {
                console.log("file is exist.");
            } else if (err.code == "ENOENT") {
                fs.open(fileName, "w", function (err) {
                });
            }
        });

        var line = title + "\t" + digest + "\t" + url + "\n";
        fs.open(fileName, "a", function (e, fd) {
            if (e) throw e;
            fs.write(fd, line, function (e) {
            });
        });
    }
};
