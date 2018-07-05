import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

/*** 暴露类 ***/
export = XJMessager;
declare var Messenger;
class XJMessager extends BaseWidget {
    baseClass = "widget-XJMessager";
    firstInit: true;

    adminMessageList = [];//管理员消息
    popup;

    startup() {

        //this.setHtml(this.template.split("$$")[0]);
        this.ready();
        window.setInterval(this.messagerInit.bind(this), 20000)

    }

    messagerInit() {
        this.popup = this.AppX.runtimeConfig.popup;
        this.getMessageAlert();
    }
    clickCallBack() {
        if ($(".XJMessageManage").length == 0) {
            //生产属性标注
            $(".fire-on[data-id=" + this.config.widgetname + "]").first().trigger("click");
        } else {
            this.requestAdminMessage(this.myMessengerInit.bind(this));
        }
    }


    //获取所有管理员未读的通知消息
    getMessageAlert() {
        var config = this.config.getMessageAlert;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 1000,
                // "receive_usertype": "管理员",
                "isread": 0
            },
            success: function (result) {
                if (result.code !== 1) {
                    this.AppX.runtimeConfig.toast.Show(config.MSG_Error);
                } else if (result.result.rows.length === 0) {
                    return;
                } else {
                    this.messengerInit(result.result.rows.length);
                }

            }.bind(this),
            error: function () {
                this.AppX.runtimeConfig.toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });
    }


    //获取管理员需要处理的信息
    requestAdminMessage(callBack: Function) {
        var config = this.config.requestAdminMessage;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": config.Data_pageindex,
                "pagesize": config.Data_pagesize,
                "isread": ""
            },
            success: function (result) {
                this.adminMessageList = [];
                if (result.code !== 1) {
                    toast.Show(config.MSG_Error);
                } else if (result.result.rows.length === 0) {
                    return;
                } else {
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var messengerId = rows[i].id;//id
                        var sendUsername = rows[i].send_username;//发送人
                        var sendTime = rows[i].send_time.replace("T", " ")//发送时间
                        var content = rows[i].msgcontent;//消息内容
                        var readState = rows[i].isread;//阅读状态（0:未读，1已读）
                        var readTime = rows[i].read_time;
                        var files = rows[i].files;
                        var message = new Message(messengerId, content, sendUsername, "管理员", sendTime, readState, readTime, files);
                        this.adminMessageList.push(message);
                    }
                    callBack(this.adminMessageList);
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });
    }

    //初始化<我的消息>列表，我的消息为管理员接收的消息
    myMessengerInit(adminMessageList: Array<Message>) {
        //移除之前的消息记录
        $("#recieveMessage tbody tr").remove();
        var html = "";
        for (var i = 0, length = adminMessageList.length; i < length; i++) {
            var template = "";
            if (adminMessageList[i].isRead === 1) {
                template = $("#recieveMessage #readedMessageTemplate").text();//已读消息模板
            } else {
                template = $("#recieveMessage #readingMessageTemplate").text();//未读消息模板
            }
            var data = adminMessageList[i].getAdminData();
            data = [i].concat(data);
            var index = 0
            var templateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += templateReplace;
        }
        $("#recieveMessage tbody").append(html);
        //每一项查看具体消息
        $("#recieveMessage tbody tr td.detail").on("click", function (event) {
            var index = $(event.currentTarget).parents("tr").attr("index");
            this.viewAdminItemMessage(index);
        }.bind(this));
    }


    //查看管理员接收的消息详情
    viewAdminItemMessage(index) {
        var templateIndex = 0;
        var data = this.adminMessageList[index].getAdminDetailData();
        var template = this.template.split('$$')[1].replace(/%data/g, function () {
            return (templateIndex < data.length) ? (data[templateIndex++]) : ""
        })
        this.popup.setSize(400, 500);
        var Obj = this.popup.Show("消息详情", template);
        //音频数据
        if (data.length > 3 && data[data.length - 2].length > 0) {
            var fileTemplate = '';
            fileTemplate = _.template(this.template.split('$$')[3])({ audioData: data[data.length - 2] });
            Obj.conObj.find("#message-audio *").remove();
            Obj.conObj.find("#message-audio").append(fileTemplate);
        }
        //图片数据
        if (data.length > 3 && data[data.length - 1].length > 0) {
            var fileTemplate = '';
            fileTemplate = _.template(this.template.split('$$')[2])({ photoData: data[data.length - 1] });
            Obj.conObj.find("#messagealert-files *").remove();
            Obj.conObj.find("#messagealert-files").append(fileTemplate);
        }
        Obj.submitObj.off("click").on("click", function () {
            this.popup.btncloseObj.trigger("click");
        }.bind(this));
        //查看照片详情
        Obj.conObj.find("img").on("click", function (event) {
            $(this).parents("ul").viewer({
                title: 0,
                navbar: 0
            });
        });
    }



    messengerInit(length) {
        $("ul.messenger.messenger-fixed  li").remove();
        var MessengerInstance = $("div.widget-XJMessage").messenger();
        Messenger({ instance: MessengerInstance }).post({
            message: '<a class=\"message\">未读消息（' + length + '）</a>',
            hideAfter: 10,
            hideOnNavigate: true
        });
        $("a.message").on("click", this.clickCallBack.bind(this));
    }


}

class Message {
    id: string;//唯一标识
    sender: string;//发送用户
    receiver: string;//接收用户
    sendTime: string;//发送时间
    isRead: number;//是否阅读
    readTime: string;//阅读时间
    content: string;//消息内容
    files = [];//附件[{src:'',type:"image/png"}]
    constructor(id, content, sender, receiver, sendTime, isRead, readTime, files) {
        this.id = id;
        this.content = content;
        this.sender = sender;
        this.receiver = receiver;
        this.sendTime = sendTime;
        this.isRead = isRead;
        this.readTime = readTime;
        for (var i = 0; i < files.length; i++) {
            var fileSrc = files[i].filename;
            var fileType = files[i].filetype;
            var fileObj = {
                "src": fileSrc,
                "type": fileType
            }
            this.files.push(fileObj);
        }

    }

    getWidgetData() {
        var data = [];
        var subContent = "";
        if (this.content.length > 6) {
            subContent = this.content.substr(0, 5) + "...";
        } else {
            subContent = this.content;
        }
        var state = "";
        if (this.isRead === 1) {
            var date = this.readTime.split(" ")[0];
            var time = this.readTime.split(" ")[1];
            var subDate = date.split("-")[1] + "-" + date.split("-")[2];
            var subTime = time.split(":")[0] + ":" + time.split(":")[1];
            state = "已读/" + subDate + " " + subTime;

        } else {
            state = "未读";
        }
        var subReceiver = "";
        if (this.receiver.length > 4) {
            subReceiver = this.receiver.substr(0, 3) + "...";
        } else {
            subReceiver = this.receiver;
        }
        data = [subContent, subReceiver, state];
        return data;
    }
    getAdminData() {
        var data = [];
        data = [this.id, this.isRead, this.content, (this.sender + "/" + this.sendTime)];
        return data;
    }
    getAdminDetailData() {
        var data = [];
        data = [this.sender, this.sendTime, this.content];
        var imgSrc = [];
        var audioSrc = [];
        for (var i = 0, length = this.files.length; i < length; i++) {
            if (/image/.test(this.files[i].type)) {
                var src = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.files[i].src;
                imgSrc.push(src);
            } else if (/audio/.test(this.files[i].type)) {
                var src = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.files[i].src;
                audioSrc.push(src);
            }
            data.push(audioSrc, imgSrc);
        }
        return data;

    }
    getSendDetailData() {
        var data = [];
        var isRead = "";
        if (this.isRead === 0) {
            isRead = "未读";
            data = [this.sendTime, this.receiver, isRead, "-", this.content];
        } else {
            isRead = "已读";
            data = [this.sendTime, this.receiver, isRead, this.readTime, this.content];
        }
        var imgSrc = [];
        var filesSrc = [];
        for (var i = 0, length = this.files.length; i < length; i++) {
            if (/image/.test(this.files[i].type)) {
                var src = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.files[i].src;
                imgSrc.push(src);
            } else {
                var src = AppX.appConfig.xjapiroot.substr(0, AppX.appConfig.xjapiroot.length - 3) + this.files[i].src;
                filesSrc.push(src);
            }
            data.push(imgSrc, filesSrc);
        }
        return data;

    }

}