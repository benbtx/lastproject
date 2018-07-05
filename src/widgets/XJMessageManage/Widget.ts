import BaseWidget = require('core/BaseWidget.class');


import Map = require("esri/map");
import SimpleMarkerSymbol = require("esri/symbols/SimpleMarkerSymbol");
import SimpleLineSymbol = require("esri/symbols/SimpleLineSymbol");
import SimpleFillSymbol = require("esri/symbols/SimpleFillSymbol");
import Color = require("esri/Color");
import ScreenPoint = require('esri/geometry/ScreenPoint');
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import Graphic = require("esri/graphic");
import GeometryEngine = require("esri/geometry/geometryEngine");
import Point = require("esri/geometry/Point");
import SpatialReference = require("esri/SpatialReference");
import Polyline = require("esri/geometry/Polyline");
import QueryTask = require("esri/tasks/QueryTask");
import Query = require("esri/tasks/query");

import IdentifyParameters = require("esri/tasks/IdentifyParameters");
import IdentifyTask = require("esri/tasks/IdentifyTask");
import Polygon = require("esri/geometry/Polygon");
import GeometryService = require("esri/tasks/GeometryService");
import BufferParameters = require("esri/tasks/BufferParameters");





export = XJMessageManage;

class XJMessageManage extends BaseWidget {
    baseClass = "XJMessageManage";

    departmentCount = null;//部门总数
    pageIndex;
    pageSize;
    sendMessageList = [];//已发消息
    adminMessageList = [];//管理员消息
    popup;
    sendUser;//发送消息人姓名

    startup() {
        this.setHtml(_.template(this.template.split('$$')[0])({
            hello: this.config.hello + (/\/([a-zA-Z]+)$/g.exec(this.widgetPath)[1])
        }));
        this.XJMessageManageInit();


    }

    destroy() {
        this.domObj.remove();
        this.afterDestroy();
    }



    XJMessageManageInit() {
        this.sendUser = this.AppX.appConfig.realname;
        //请求管理员的消息，并初始化我的消息列表（管理员需要处理的消息：隐患定级、隐患审核等）
        this.requestAdminMessage(this.myMessengerInit.bind(this));

        //发送消息
        this.initFileUploadPlugin(); //初始化上传文件插件
        this.initDepartmentList(this.initDepartmentListCallBack.bind(this));  //初始化部门下拉列表

        //已发消息
        this.popup = this.AppX.runtimeConfig.popup;
        this.pageIndex = this.config.requestSendMessageList.pageindex;
        this.pageSize = this.config.requestSendMessageList.pagesize;
        this.requestSendMessageList(this.pageIndex, this.pageSize, this.initHistoryMessageListCallBack.bind(this));//初始化历史消息列表
        this.initevent();
    }

    //
    initevent() {
        //我的消息
        this.domObj.find("#recieveMessage .typeMessage button").bind("click", function (event) {
            var selectType = $(event.currentTarget).attr("choosetype");
            this.chooseTypeMessage(selectType);
        }.bind(this));//筛选消息
        this.domObj.find(" #recieveMessage .selcetMessage button").bind("click", function (event) {
            var choosed = $(event.currentTarget).attr("choosed");
            this.selecMessage(choosed, $(event.currentTarget));
        }.bind(this));//全选某种状态的消息
        this.domObj.find("#recieveMessage .selcetMessage input").bind("click", function (event) {
            var choosed = $(event.currentTarget).attr("choosed");
            this.selecMessage(choosed, $(event.currentTarget));
        }.bind(this));//全选某种状态的消息
        this.domObj.find(" #recieveMessage .handleMessag button").bind("click", this.handleMessage.bind(this));//处理消息
        //发送消息
        this.domObj.find("button.sendfiles").bind("click", this.sendMessageClick.bind(this));//绑定发送消息点击事件
        this.domObj.find(" .pagination button.next").bind("click", this.nextPage.bind(this));
        this.domObj.find(".pagination button.pre").bind("click", this.prePage.bind(this));
        this.domObj.find(".pagination button.pageturning").bind("click", this.goPage.bind(this));
        //
    }

    /**
     * 我的消息
     */
    //标记已读、未读、全部消息
    chooseTypeMessage(selectType) {
        var messageTableRows = this.domObj.find(" #recieveMessage  tbody tr");
        if (selectType === "all") {//全部
            messageTableRows.css("display", "table-row")
        } else if (selectType === "reading") {//未读
            messageTableRows.attr("readstate", function (index, val) {
                if (val === "0") {
                    $(this).css("display", "table-row")
                } else if (val === "1") {
                    $(this).css("display", "none")
                }
                return val;
            })
        } else if (selectType === "readed") {//已读
            messageTableRows.attr("readstate", function (index, val) {
                if (val === "0") {
                    $(this).css("display", "none")
                } else if (val === "1") {
                    $(this).css("display", "table-row")
                }
                return val;
            })
        }
    }

    //选中对应状态的消息
    selecMessage(choosed, chooseAllObj) {
        var messageTableRows = this.domObj.find(" #recieveMessage  tbody tr");
        messageTableRows.css("display", function (index, val) {
            if (choosed === "no") {
                chooseAllObj.attr("choosed", "yes");
                chooseAllObj.parent("div.selcetMessage").find("input").prop("checked", true);
                if (val === "none") {
                    $(this).find("input[type='checkbox']").prop("checked", false);
                } else if (val === "table-row") {
                    $(this).find("input[type='checkbox']").prop("checked", true);
                }
            } else {
                chooseAllObj.attr("choosed", "no");
                chooseAllObj.parent("div.selcetMessage").find("input").prop("checked", false);
                $(this).find("input[type='checkbox']").prop("checked", false);
            }
            return val;
        })
    }

    //处理消息
    handleMessage(event) {
        var handleType = $(event.currentTarget).attr("handletype");
        var toast = this.AppX.runtimeConfig.toast;
        var config = this.config.handleMessage;
        if (handleType === "del") {
            //删除消息
            this.domObj.find(" #recieveMessage tbody input[type='checkbox']").prop("checked", function (index, val) {
                if (val == true) {
                    var messengerId = $(this).parent().parent().attr("messageid");
                    $(this).parent().parent().remove();
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        type: "POST",
                        contentType: "application/json",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Del,
                        data: JSON.stringify([{ 'id': messengerId }]),
                        processData: false,
                        success: function (result) {
                            if (result.code !== 1) {
                                toast.Show(result.message);
                            } else {
                                return;
                            }
                        }.bind(this),
                        error: function () {
                            toast.Show(config.MSG_delerror);
                        },
                        dataType: "json",
                    });

                } else {

                }
            });
        } else {
            //标记消息已读
            this.domObj.find(" #recieveMessage tbody input[type='checkbox']").prop("checked", function (index, val) {
                if (val == true) { //获取勾选的消息
                    var messengerId = $(this).parents("tr").attr("messageid");
                    var trObj = $(this).parents("tr");
                    $.ajax({
                        headers: {
                            'Token': AppX.appConfig.xjxj,
                            'departmentid': AppX.appConfig.departmentid,
                        },
                        contentType: "application/json",
                        type: "POST",
                        url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Check + "/" + messengerId,
                        data: JSON.stringify([{ 'id': messengerId }]),
                        processData: false,
                        success: function (result) {
                            if (result.code !== 1) {
                                console.log(config.MSG_markerror);
                            } else {
                                trObj.addClass("readed");
                                trObj.attr("readstate", "1");
                                return;
                            }
                        },
                        error: function () {
                            console.log(config.MSG_markerror);
                        },
                        dataType: "json",
                    });
                } else {

                }
            });
        }
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
                    toast.Show(result.message);
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
        $("#recieveMessage tbody tr td.detail:last-child").on("click", function (event) {
            var index = $(event.currentTarget).parents("tr").attr("index");
            this.viewAdminItemMessage(index);
        }.bind(this));
        //每一项跳转到相应模块
        $("#recieveMessage tbody tr td.detail a").on("click", function (event) {
            var message = $(event.currentTarget).text();
            this.goToOtherWidget(message);
        }.bind(this));
    }

    /**
   * 发送消息
   */

    //初始化上传文件插件
    initFileUploadPlugin() {
        $("#input-fileupload").fileinput({
            'language': 'zh',
            'showCaption': true,
            'showPreview ': true,
            'showRemove': false,
            'showUpload': false,
            'previewClass ': {
                height: "100px"
            },
            'initialPreviewCount': 2,
            'initialPreviewConfig': [{
                width: '50px'
            }],
            "allowedFileExtensions": ['jpg', 'png', 'bmp', 'jpeg','png'],//接收的文件后缀
            'previewFileType': ['image'],
            'dropZoneEnabled': true,//是否显示拖拽区域
            'previewSettings': {
                image: { width: "50px", height: "50px" },
            },
        });
    }

    //初始化部门下拉列表
    initDepartmentList(callBack) {
        var config = this.config.initDepartmentList;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 1000
            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.rows.length === 0) {
                    console.log(config.MSG_Null);
                } else {
                    var rows = result.result.rows;
                    var departmentInfos = [];
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var departmentInfo = {
                            "departmentId": rows[i].id
                        }
                        departmentInfos.push(departmentInfo);
                    }
                    callBack(departmentInfos);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.URL_Request);
            },
            dataType: "json",
        });
    }

    //初始化部门下拉列表回调函数
    initDepartmentListCallBack(departmentInfos: Array<any>) {
        for (var i = 0, length = departmentInfos.length; i < length; i++) {
            var departmentId = departmentInfos[i].departmentId;
            this.initUserList(departmentId, this.initUserListCallBack.bind(this));
            this.departmentCount = length;
        }
    }

    //初始化巡检人员列表
    initUserList(departmentId, callBack) {
        var config = this.config.initUserList;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 10000,
                "depid": departmentId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows.length === 0) {
                    this.departmentCount--;
                } else {
                    callBack(result)
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_Error);
            },
            dataType: "json",
        });

    }

    //初始化巡检人员列表回调函数
    initUserListCallBack(result) {
        var rows = result.result.rows;
        var html = "";
        var template = this.domObj.find(" #userList").text().trim();
        var optgroupTemplate = template.split("<item>")[0];//部门模板
        var departmentName = rows[0].group_name;//部门名称
        var departmentId = rows[0].depid;//部门id
        var departmentData = [departmentName, departmentId];
        var departmentIndex = 0;
        optgroupTemplate = optgroupTemplate.replace(/%data/g, function () {
            return (departmentIndex < departmentData.length ? (departmentData[departmentIndex++]) : "")
        });

        var itemtemplate = template.split("<item>")[1];//巡检人员模板
        for (var i = 0, length = rows.length; i < length; i++) {
            var userName = rows[i].username;
            if (userName != "管理员") {
                var userId = rows[i].userid;
                var data = [userId, userName];
                var index = 0;
                var replaceTemplate = itemtemplate.replace(/%data/g, function () {
                    return (index < data.length) ? (data[index++]) : "";
                })
                html += replaceTemplate
            }
        }
        this.domObj.find(" select.receviceuser").append(optgroupTemplate);
        this.domObj.find("select.receviceuser optgroup:last").append(html);
        this.departmentCount--;
        if (this.departmentCount === 0) {
            this.initMuiltSelect()//初始化多选下拉列表
        }

    }

    //初始化多选下拉列表
    initMuiltSelect() {
        $('#receviceuser').multiselect({
            enableClickableOptGroups: true,
            nonSelectedText: '',
            allSelectedText: '全被选中',
            nSelectedText: "个被选中",
            buttonWidth: '290px',
            maxHeight: 150,
            numberDisplayed: 3,
            enableCollapsibleOptGroups: true,
            includeSelectAllOption: true,
            selectAllText: '全选',
            dropRight: true,
            selectAllJustVisible: false
        });

    }


    //发送消息
    sendMessageClick() {
        var formdata = this.getSendMessagerData();
        if (formdata === undefined) {
            return;
        } else {
            this.sendMessage(formdata);
        }

    }

    //获取发送消息的数据
    getSendMessagerData() {
        var config = this.config.getSendMessagerData;
        var toast = this.AppX.runtimeConfig.toast;
        var workerId = [];
        $(config.SELECT_user).find("option:selected").val(function (index, val) {
            workerId.push(val)
            return val;
        });
        var workerName = $(config.SELECT_user).find("option:selected").text();
        var content = $(config.SELECT_content).val();
        var files = $(config.SELECT_files).prop('files');
        if (workerId.length === 0) {
            toast.Show(config.MSG_usernull);
        } else if (content === "") {
            toast.Show(config.MSG_contentnull);
        } else {
            var data = new FormData();
            data.append("receive_userid", workerId.toString());
            data.append("send_user", this.sendUser);
            data.append("msgcontent", content);
            for (var i = 0, length = files.length; i < length; i++) {
                data.append("files", files[i]);
            }
            return data;
        }
    }

    //发送消息
    sendMessage(formdata) {
        var config = this.config.sendMessage;

        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Rquest,
            type: 'POST',
            data: formdata,
            cache: false,
            processData: false,
            contentType: false,
            success: function () {
                this.AppX.runtimeConfig.toast.Show(config.MSG_sucess);
                //清除消息输入框
                this.clearMessageInput();
                this.requestSendMessageList(this.pageIndex, this.pageSize, this.initHistoryMessageListCallBack.bind(this));//初始化历史消息列表

            }.bind(this),
            error: function () {
                this.AppX.runtimeConfig.toast.Show(config.MSG_error);
            }.bind(this)
        });
    }


    /**
    * 已发消息
    */
    //初始化发送信息列表
    requestSendMessageList(pageindex, pagesize, callBack) {
        var config = this.config.requestSendMessageList;
        var toast = this.AppX.runtimeConfig.toast;
        this.sendMessageList = [];
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": (pageindex === null) ? config.pageindex : pageindex,
                "pagesize": (pagesize === null) ? config.pagesize : pagesize
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(result.message);
                } else if (result.result.rows.length === 0) {
                    this.AppX.runtimeConfig.toast.Show(config.MSG_Null);
                } else {
                    var rows = result.result.rows;
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var ID = rows[i].id;
                        var receiver = rows[i].receive_username;
                        var content = rows[i].msgcontent;
                        var sendTime = rows[i].send_time;
                        var isRead = rows[i].isread;
                        var readTime = rows[i].read_time;
                        var files = rows[i].files;
                        var message = new Message(ID, content, "管理员", receiver, sendTime, isRead, readTime, files);
                        this.sendMessageList.push(message);
                    }
                    //初始化分页信息
                    var pageIndex = result.result.pageindex;
                    var total = result.result.total;
                    var pageSize = result.result.pagesize;
                    var totalPage = Math.ceil(parseInt(total) / parseInt(pageSize));
                    this.domObj.find(".pagination span.currentpagenumber").text(pageIndex);
                    this.domObj.find(".pagination span.allpagenumber").text(totalPage);
                    //添加列表数据
                    callBack(this.sendMessageList);
                }

            }.bind(this),
            error: function () {
                this.AppX.runtimeConfig.toast.Show(config.URL_Request);
            },
            dataType: "json",
        });
    }

    initHistoryMessageListCallBack(sendMessageList: Array<Message>) {
        //去除之前的数据
        $("#historyMessage .message tbody tr").remove();
        // var rows = result.result.rows;
        var html = "";
        for (var i = 0, length = sendMessageList.length; i < length; i++) {
            var data = sendMessageList[i].getWidgetData();
            data = [i].concat(data);
            var template = $("#historyMessage #messageTemplate").text();
            var index = 0;
            var templateReplace = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "-";
            })
            html += templateReplace;
        }
        $("#historyMessage .message tbody ").append(html);
        //每一项查看具体消息
        $("#historyMessage .message tbody tr").on("click", function (event) {
            var index = $(event.currentTarget).attr("index");
            this.viewItemMessage(index);
        }.bind(this));

    }

    //清除输入消息
    clearMessageInput() {
        this.domObj.find("textarea.content").val("");
        this.domObj.find(".fileinput-remove").trigger("click");
    }

    //上一页
    prePage() {
        var pageIndex = parseInt(this.domObj.find(".pagination span.currentpagenumber").text());
        var prePage = pageIndex - 1;
        if (prePage < 1) {
            return;
        } else {
            this.pageIndex = prePage;
            this.requestSendMessageList(this.pageIndex, this.pageSize, this.initHistoryMessageListCallBack.bind(this));//初始化历史消息列表
        }
    }

    //下一页
    nextPage() {
        var pageIndex = parseInt(this.domObj.find(".pagination span.currentpagenumber").text());
        var totalPage = parseInt(this.domObj.find(".pagination span.allpagenumber").text());
        var nextPage = pageIndex + 1;
        if (nextPage > totalPage) {
            return;
        } else {
            this.pageIndex = nextPage;
            this.requestSendMessageList(this.pageIndex, this.pageSize, this.initHistoryMessageListCallBack.bind(this));//初始化历史消息列表

        }
    }

    //跳转
    goPage() {
        var pageIndex = parseInt(this.domObj.find(".pagination input.gopage").val());
        var totalPage = parseInt(this.domObj.find(".pagination span.allpagenumber").text());
        var goPage = pageIndex;
        if (goPage > totalPage || goPage < 1) {
            return;
        } else {
            this.pageIndex = goPage;
            this.requestSendMessageList(this.pageIndex, this.pageSize, this.initHistoryMessageListCallBack.bind(this));//初始化历史消息列表

        }
    }

    //查看管理员接收的消息详情
    viewAdminItemMessage(index) {
        var templateIndex = 0;
        var data = this.adminMessageList[index].getAdminDetailData();
        var template = this.template.split('$$')[3].replace(/%data/g, function () {
            return (templateIndex < data.length) ? (data[templateIndex++]) : ""
        })
        this.popup.setSize(400, 500);
        var Obj = this.popup.Show("消息详情", template);
        //音频数据
        if (data.length > 3 && data[data.length - 2].length > 0) {
            var fileTemplate = '';
            fileTemplate = _.template(this.template.split('$$')[4])({ audioData: data[data.length - 2] });
            Obj.conObj.find("#message-audio *").remove();
            Obj.conObj.find("#message-audio").append(fileTemplate);
        }
        //图片数据
        if (data.length > 3 && data[data.length - 1].length > 0) {
            var fileTemplate = '';
            fileTemplate = _.template(this.template.split('$$')[2])({ photoData: data[data.length - 1] });
            Obj.conObj.find("#message-files *").remove();
            Obj.conObj.find("#message-files").append(fileTemplate);
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

    goToOtherWidget(message) {
        var config = this.config.goToOtherWidget;
        if (/隐患/.test(message) && /定级/.test(message)) {
            $(".fire-on[data-id=" + config.hidedangerjibie + "]").first().trigger("click");
        } else if (/隐患/.test(message) && /定级/.test(message) && /审核/.test(message)) {
            $(".fire-on[data-id=" + config.hidedangercheck + "]").first().trigger("click");
        } else if (/隐患/.test(message) && /处理/.test(message) && /审核/.test(message)) {
            $(".fire-on[data-id=" + config.hidedangerchuli + "]").first().trigger("click");
        }
        else if (/工地/.test(message) && /指派/.test(message)) {
            $(".fire-on[data-id=" + config.buildsiteassign + "]").first().trigger("click");
        }
    }

    //查看发送的消息详情
    viewItemMessage(index) {
        var templateIndex = 0;
        var data = this.sendMessageList[index].getSendDetailData();
        var template = this.template.split('$$')[1].replace(/%data/g, function () {
            return (templateIndex < data.length) ? (data[templateIndex++]) : ""
        })
        this.popup.setSize(400, 500);
        var Obj = this.popup.Show("消息详情", template);
        if (data.length > 5 && data[data.length - 2].length > 0) {
            var fileTemplate = '';
            fileTemplate = _.template(this.template.split('$$')[2])({ photoData: data[data.length - 2] });
            Obj.conObj.find("#message-files *").remove();
            Obj.conObj.find("#message-files").append(fileTemplate);

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