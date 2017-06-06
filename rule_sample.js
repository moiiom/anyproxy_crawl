/*
 read the following wiki before using rule file
 https://github.com/alibaba/anyproxy/wiki/What-is-rule-file-and-how-to-write-one
 */

var fs = require('fs'),
    url = require("url"),
    queryString  = require("querystring");

module.exports = {
    urlFolder:"./urls",

    replaceServerResDataAsync: function(req,res,serverResData,callback){
        if(req.url.indexOf('profile_ext') > 0){
            console.log(">>>replace data:true");
            console.log(">>>reqest url:" + req.url);

            var result = url.parse(req.url);
            var query = result["query"];
            var dict = queryString.parse(query);
            var action = dict['action'];
            if(action == "home" || action == "getmsg"){
                this.decodeURL(action, serverResData.toString());
            }
        }

        callback(serverResData);
    },

    shouldInterceptHttpsReq :function(req){
        console.log(">>>intercept https:true");
        return true;
    },

    decodeURL :function (action, resData) {
        var msg,
            matched,
            decodeStr;
        matched = (action == "home") ? resData.match(/msgList = '(.*)';/) : resData.match(/general_msg_list":"(.*)"}/);
        if(matched && matched.length > 0){
            msg = matched[1];
            // console.log(">>>>>>>>>>>>>>>>>recive message:" + msg);
        }else{
            console.log(">>>error!! intercept https and get response body,but can't find historical article url.");
            return;
        }

        decodeStr = (action == "home") ? msg.replace(/\\\//g, "\/").replace(/&quot;/g, "\"").replace(/&amp;/g, "&").replace(/&amp;/g, "&")
            : msg.replace(/\\\//g, "\/").replace(/\\"/g, "\"").replace(/&amp;/g, "&").replace(/&quot;/g, "\\\"");
        var res = JSON.parse(String(decodeStr));
        for(var idx in res["list"]){
            var title = "",
                digest = "",
                content_url = "",
                url = "";

            var item = res["list"][idx];
            if(!item.hasOwnProperty("app_msg_ext_info")){
                continue;
            }
            var ext_info = item["app_msg_ext_info"];
            if(ext_info.hasOwnProperty("title")){
                title = ext_info["title"];
            }
            if(ext_info.hasOwnProperty("digest")){
                digest = ext_info["digest"];
            }
            if(!ext_info.hasOwnProperty("content_url")){
                continue;
            }
            content_url =ext_info["content_url"];
            url = content_url.replace(/amp;/g,"");

            console.log("title:"+title);
            console.log("digest:"+digest);
            console.log("content url:"+url);
            this.write2File(title, digest, url);
        }
    },

    write2File :function (title, digest, url) {
        Date.prototype.Format = function (fmt) {
            var o = {
                "M+": this.getMonth() + 1,
                "d+": this.getDate(), 
                "h+": this.getHours(),
                "m+": this.getMinutes(),
                "s+": this.getSeconds(),
                "q+": Math.floor((this.getMonth() + 3) / 3),
                "S": this.getMilliseconds()
            };
            if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
            for (var k in o)
                if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
            return fmt;
        };

        var currDateStr = new Date().Format("yyyyMMdd");
        var fileName = this.urlFolder + "/url_" + currDateStr;
        fs.stat(fileName, function(err, stat) {
            if(err == null){
                console.log("file is exist.");
            }else if (err.code == "ENOENT") {
                fs.open(fileName, "w",function (err) { });
            }
        });

        var line = title + "\t" + digest + "\t" + url + "\n";
        fs.open(fileName,"a",function(e,fd){
            if(e) throw e;
            fs.write(fd,line,function(e){});
        });
    }
};
