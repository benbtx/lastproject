import BaseWidget = require('core/BaseWidget.class');
import Functions = require('core/Functions.module');

import Map = require("esri/map");
import GraphicsLayer = require("esri/layers/GraphicsLayer");
import PictureMarkerSymbol = require("esri/symbols/PictureMarkerSymbol");




export = TerminalState;

class TerminalState extends BaseWidget {
    baseClass = "widget-terminalstate";

    map: Map;
    terminalGraphicLayer: GraphicsLayer;
    symbol: Array<any>;
    terminalStateResult;//终端状态查询结果
    dataState = "table";//表明当前是图标还是列表状态
    userState = "all";//表明显示什么状态的用户
    currentQueryUserID;
    currentQueryDate;
    runlogPopup;


    userType = "";//用户类型：总公司(superadmin)，分公司管理员(companyadmin)，分公司部门管理员(departmentadmin)
    firstRequest = true;

    startup() {
        var html = _.template(this.template.split("$$")[0])();
        this.setHtml(html);
        this.terminalStateInit();
    }
    destroy() {
        this.domObj.remove();
        this.afterDestroy();
        this.backToInit();
    }
    //回到初始状态
    backToInit() {
        if (this.terminalGraphicLayer != undefined) {
            this.map.removeLayer(this.terminalGraphicLayer);
        }
    }

    terminalStateInit() {
        this.map = this.AppX.runtimeConfig.map;

        //判断用户类型
        this.judgeUserType()
        this.runlogPopup = this.AppX.runtimeConfig.popup;
        //初始化事件
        this.initEvent();

        //初始化查询界面
        this.initQueryInterface();

        // //初始化部门和人员下拉列表
        // this.initDeparmentAndUserSelet();
        //绑定查询事件
        this.domObj.find("button.terminalStateQuery").bind("click", this.terminalStateQuery.bind(this));
        this.domObj.find("div.tool-table").bind("click", this.showTerminalStateByTalbe.bind(this));
        this.domObj.find("div.picture").bind("click", this.showTerminalStateByPicture.bind(this));
        this.domObj.find("div.refresh").bind("click", this.terminalStateQuery.bind(this));
        this.domObj.find(".state .stateTool").bind("click", this.stateToolClick.bind(this)); //选择用户对于状态的数据
        //日志上下页查询
        this.domObj.find(".sideBox li.pre").bind("click", function (event) {
            var currentPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[0].replace("(", ""));
            var totalPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[1].replace(")", ""));
            if (currentPage - 1 < 1) {
                return;
            } else {
                this.requestRunLog(currentPage - 1, this.config.log.Num_pagesize, this.currentQueryUserID, this.currentQueryDate);
            }

        }.bind(this)); //选择用户对于状态的数据
        this.domObj.find(".sideBox li.next").bind("click", function (event) {
            var currentPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[0].replace("(", ""));
            var totalPage = parseInt(this.domObj.find(".sideBox li.total a").text().split('/')[1].replace(")", ""));
            if (currentPage + 1 > totalPage) {
                return;
            } else {
                this.requestRunLog(currentPage + 1, this.config.log.Num_pagesize, this.currentQueryUserID, this.currentQueryDate);
            }
        }.bind(this)); //选择用户对于状态的数据
    }

    judgeUserType() {
        if (AppX.appConfig.groupid != null && AppX.appConfig.groupid != "") {
            this.userType = "departmentadmin";
        } else if (/00;/.test(AppX.appConfig.range)) {
            this.userType = "superadmin";
        } else {
            this.userType = "companyadmin";
        }
    }

    initEvent() {
        //绑定公司下拉改变事件
        this.domObj.find("select.company").change(function (this) {
            //清除原有部门信息
            this.domObj.find("select.department option").remove();
            var requestCompanyId = this.domObj.find("select.company option:selected").val();
            if (requestCompanyId == "") {
                return;
            } else {
                this.requestDepartmentInfo(requestCompanyId, this.initDepartmentList.bind(this));
            }
        }.bind(this));
        //绑定部门下拉改变事件
        this.domObj.find("select.department").change(function () {
            this.domObj.find("select.user option").remove();
            var departmentId = this.domObj.find(" select.department").find("option:selected").val();
            var companyId = this.domObj.find(" select.company").find("option:selected").val();
            this.requestUserInfo(companyId, departmentId, this.initUserList.bind(this));
        }.bind(this));
    }

    /*初始化查询界面 */
    initQueryInterface() {
        switch (this.userType) {
            case "superadmin":
                this.requestCompanyInfo();//初始化公司、部门、人员查询条件
                break;
            case "companyadmin":
                this.requestDepartmentInfo(AppX.appConfig.departmentid, this.initDepartmentList.bind(this));//初始化部门、人员查询条件
                this.domObj.find("div.company").remove();
                break;
            case "departmentadmin":
                this.requestUserInfo(AppX.appConfig.departmentid, AppX.appConfig.groupid, this.initUserList.bind(this));//初始化人员查询条件
                this.domObj.find("div.company").remove();
                this.domObj.find("div.department").remove();
                break;
        }
        //初始化日期控件
        this.dateWeightInit();
    }

    requestCompanyInfo() {
        var config = this.config.requestCompanyInfo;
        $.ajax({
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {

            },
            success: function (result) {
                if (result.code !== 1) {
                    console.log(result.message);
                } else if (result.result.length === 0) {
                    console.log(config.MSG_null);
                } else {
                    var rows = result.result;
                    var html = "<option value=''>全部</option>";
                    for (var i = 0, length = rows.length; i < length; i++) {
                        var companyId = rows[i].companyid;
                        var companyName = rows[i].company_name;
                        var itemHtml = "<option value='" + companyId + "'>" + companyName + "</option>";
                        html += itemHtml;
                    }

                    //初始化公司下拉选项
                    this.domObj.find("select.company").append(html);
                    //自动触发
                    this.domObj.find("select.company option").attr("value", function (index, val) {
                        if (val === AppX.appConfig.departmentid) {
                            $(this).attr("selected", "selected")
                        }
                        return val;
                    });
                    this.domObj.find("select.company ").trigger("change");
                }
            }.bind(this),
            error: function (error) {
                console.log(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    //请求部门信息
    requestDepartmentInfo(companyId, callback: Function) {
        var config = this.config.requestDepartmentInfo;
        var toast = this.AppX.runtimeConfig.toast;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyId
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error);
                } else if (result.result.rows.length === 0) {
                    toast.Show(config.MSG_null);
                } else {
                    callback(companyId, result);
                }

            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化部门列表
    initDepartmentList(companyId, result) {
        this.domObj.find("select.department option").remove();
        var rows = result.result.rows;
        var html = "<option value='allDepartment'>所有</option>";
        var template = this.domObj.find("#departmentList").text();
        for (var i = 0, length = rows.length; i < length; i++) {
            var departmentName = rows[i].name;
            var departmentId = rows[i].id;
            var data = [departmentId, departmentName];
            var index = 0;
            var replaceTemplate = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            })
            html += replaceTemplate
        }
        this.domObj.find(" select.department").append(html);
        this.domObj.find("select.department").trigger("change");
    }

    //请求巡检人员信息
    requestUserInfo(companyid, departmentId, callback) {
        var config = this.config.requestUserInfo;
        var toast = this.AppX.runtimeConfig.toast;
        if (departmentId === "allDepartment") {
            departmentId = "";
        }
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_Request,
            data: {
                "pageindex": 1,
                "pagesize": 100000,
                "companyid": companyid,
                "depid": departmentId
            },
            success: function (result) {
                callback(result)
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            },
            dataType: "json",
        });
    }

    //初始化巡检人员列表
    initUserList(result) {
        var config = this.config.initUserList;
        var rows = result.result.rows;
        var html = " <option value=''>所有</option>";
        var template = this.domObj.find(" #userList").text().trim();
        for (var i = 0, length = rows.length; i < length; i++) {
            var userName = rows[i].username;
            if (userName != "管理员") {
                var userId = rows[i].userid;
                var data = [userId, userName];
                var index = 0;
                var replaceTemplate = template.replace(/%data/g, function () {
                    return (index < data.length) ? (data[index++]) : "";
                })
                html += replaceTemplate
            }
        }
        this.domObj.find("select.userName option").remove();
        this.domObj.find("select.userName").append(html);
        if (this.firstRequest == true) {
            //默认查询当天
            this.domObj.find("button.terminalStateQuery").trigger("click");
            this.firstRequest = false;
        }

    }

    //初始化日期控件
    dateWeightInit() {
        //jquery 日期控件初始化
        this.domObj.find("input.date").jeDate({
            format: 'YYYY-MM-DD', //日期格式  
            isinitVal: true,
            maxDate: $.nowDate(0),
            choosefun: function (elem, val) {
                this.startDate = val;
            }.bind(this)
        })
    }





    /*
     * 查询终端信息，并以列表和图标显示 
     * 1.terminalStateQuery--
    */

    //查询点击事件回调函数
    terminalStateQuery(event) {
        var companyId = AppX.appConfig.departmentid;
        var departmentId = AppX.appConfig.groupid;
        var userID = '';
        if (this.domObj.find("select.company").length != 0) {
            companyId = this.domObj.find("select.company").find("option:selected").val();
        }
        if (this.domObj.find("select.department").length != 0) {
            departmentId = this.domObj.find("select.department").find("option:selected").val();//获取部门id
            if (departmentId === "allDepartment") {
                departmentId = " ";
            }
        }
        userID = this.domObj.find("select.userName").val(); //获取巡检人员id
        var date = this.domObj.find("input.date").val().replace(/-/g, "/");  //获取查询日期
        this.domObj.find(".mainBox *").remove();
        this.domObj.find(".mainContent div.dataloaderleft").css("display", "block");

        this.requestTerminalState(companyId, departmentId, userID, date);
        //设置用户获取默认为全部
        this.userState = "all";
    }

    //请求终端状态信息
    requestTerminalState(companyId, departmentid, userid, queryDate) {
        var toast = this.AppX.runtimeConfig.toast;
        var config = this.config.requestTerminalState;
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
                "range": AppX.appConfig.range
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                'pageindex': 1,
                'pagesize': 100000,
                'companyid': companyId,
                "deptid": departmentid,
                "userid": userid,
                "search_date": queryDate,
            },
            success: function (result) {
                if (result.code !== 1) {
                    toast.Show(config.MSG_error)
                } else {
                    this.requestTerminalStateCallBack(result);
                }

            }.bind(this),
            error: function () {
            },
            dataType: "json",
        });
    }

    //请求终端状态信息的回调函数
    requestTerminalStateCallBack(result) {
        this.terminalStateResult = result;
        if (this.dataState == "table") {
            this.domObj.find("div.tool-table").trigger("click");//主动触发列表显示
        } else {
            this.domObj.find('div.picture').trigger("click");//主动触发图标显示
        }
    }

    //列表形式展现终端状态
    showTerminalStateByTalbe() {
        //设置相应的表格按钮激活，图标按钮不激活
        this.domObj.find(" #toolbar div.tool-table").addClass('active');
        this.domObj.find("#toolbar div.picture").removeClass('active');
        this.domObj.find(".state .all").addClass("active");
        //清除表格之前显示的元素
        if (this.domObj.find(" .mainBox *")) {
            this.domObj.find(".mainBox *").remove();

        }
        //设置当前状态（表格显示|图标显示）
        this.dataState = "table";
        //初始化列表
        var rows = this.terminalStateResult.result.rows;
        var html = "";
        var template = this.template.split("$$")[3]
        var countAll = 0;
        var countNoWork = 0;
        var countonWork = 0;
        var countGpsError = 0;
        var countNoGps = 0;
        var countNetError = 0;
        var countOffWork = 0;

        for (var i = 0, length = rows.length; i < length; i++) {
            var data = [];
            countAll = length;
            var companyName = rows[i].company_name;//公司名称
            var departmentName = rows[i].depname;//部门名称
            var userName = rows[i].username;
            var userId = rows[i].userid;//用户id
            var loginTime = (rows[i].on_time !== null && rows[i].on_time !== "") ? rows[i].on_time.split(",")[0].split(" ")[1] : "--";//上班时间
            var offTime = (rows[i].off_time !== null && rows[i].off_time !== "") ? rows[i].off_time.split(",")[rows[i].off_time.split(",").length - 1].split(" ")[1] : "--";//下班时间
            var equipmentInfo = rows[i].equip_info;//设备状态
            var gpsState = 0;
            var netState = 0;
            var x = rows[i].lng;
            var y = rows[i].lat;
            /*设置巡检人员状态
             *1. 无上班时间则为未上班
             *2. 有上下班时间 则为下班
             *3. 上班（正常，gps异常，网络异常）
             */
            var userstate = "未上班";
            var userStateCode = "noWork";
            if (loginTime !== "--") {
                var workState = equipmentInfo[0].work_state;
                gpsState = equipmentInfo[0].gps_state;
                netState = equipmentInfo[0].network_state;
                switch (workState) {
                    case 3://下班
                        userstate = "下班";
                        userStateCode = "offWork";
                        countOffWork++;
                        break;
                    default://异常
                        if (netState == 0) {
                            userstate = "上班-网络异常";
                            userStateCode = 'netError';
                            countNetError++;
                        }
                        else if (gpsState == 0 && netState == 1) {
                            userstate = "上班-gps未开启";
                            userStateCode = 'noGps';
                            countNoGps++;
                        } else if (gpsState == 2 && netState == 1) {
                            userstate = "上班-gps异常";
                            userStateCode = 'gpsError';
                            countGpsError++;
                        } else if (gpsState == 1 && netState == 1) {
                            userstate = "上班-正常";
                            userStateCode = 'onWork';
                            countonWork++;
                            break;
                        }
                }


                // if (offTime !== "--") {
                //     userstate = "下班";
                //     userStateCode = "offWork";
                //     countOffWork++;
                // } else {
                //     gpsState = equipmentInfo[0].gps_state;
                //     netState = equipmentInfo[0].network_state;
                //     if (netState == 0) {
                //         userstate = "上班-网络异常";
                //         userStateCode = 'netError';
                //         countNetError++;
                //     } else if (gpsState == 0 && netState == 1) {
                //         userstate = "上班-gps未开启";
                //         userStateCode = 'noGps';
                //         countNoGps++;
                //     } else if (gpsState == 2 && netState == 1) {
                //         userstate = "上班-gps异常";
                //         userStateCode = 'gpsError';
                //         countGpsError++;
                //     } else {
                //         userstate = "上班-正常";
                //         userStateCode = 'onWork';
                //         countonWork++;
                //     }

                // }
            } else {
                countNoWork++;
            }
            var electricity = "--";//电量
            var gpsPng = "gpsOff.png";
            var netPng = "netOff.png";
            var uploadTime = "--:--:--";
            var space = '-';
            if (equipmentInfo !== null && equipmentInfo.length !== 0) {
                if (equipmentInfo[0].electricity.length !== 0) {
                    electricity = equipmentInfo[0].electricity + "%";
                }
                uploadTime = equipmentInfo[0].check_time.split(" ")[1];
                if (gpsState == 1) {
                    gpsPng = "gpsOn.png";
                }
                if (netState == 1) {
                    netPng = "netOn.png";
                }
                if (equipmentInfo[0].residual_space !== "" && equipmentInfo[0].residual_space < 1024) {
                    space = equipmentInfo[0].residual_space + "M";
                } else if (equipmentInfo[0].residual_space !== "" && equipmentInfo[0].residual_space > 1024) {
                    space = (equipmentInfo[0].residual_space / 1024).toFixed(2) + "G";
                }

            }
            data.push(userStateCode, userId, companyName, companyName, departmentName, departmentName, userName, userName, userstate, loginTime, offTime, electricity, gpsPng, netPng, space, uploadTime);
            var index = 0;
            var templateRepalce = template.replace(/%s/g, function () {
                var itemVal = (index < data.length) ? data[index++] : '';
                return itemVal;
            });
            //除了正常和未上班，状态栏文字显示为红色
            if (userStateCode == "onWork" || userStateCode == "noWork") {
                templateRepalce = templateRepalce.replace("red", "black");
            }
            html += templateRepalce;

            //初始化状态统计
            this.domObj.find("div.state span.countall").text("(" + countAll + ")");
            this.domObj.find("div.state span.countnowork").text("(" + countNoWork + ")");
            this.domObj.find("div.state span.countonwork").text("(" + countonWork + ")");
            this.domObj.find("div.state span.countnogps").text("(" + countNoGps + ")");
            this.domObj.find("div.state span.countgpserror").text("(" + countGpsError + ")");
            this.domObj.find("div.state span.countneterror").text("(" + countNetError + ")");
            this.domObj.find("div.state span.countoffwork").text("(" + countOffWork + ")");

        }
        this.domObj.find(".mainBox").append(this.template.split("$$")[1]);
        this.domObj.find(".mainContent div.dataloaderleft").css("display", "none");
        $(".terminalStateTable tbody ").append(html);

        //根据 用户显示界面
        switch (this.userType) {
            case "superadmin":
                break;
            case "companyadmin":

                this.domObj.find("div.mainBox .company").remove();
                break;
            case "departmentadmin":
                this.domObj.find("div.mainBox .company").remove();
                this.domObj.find(" div.mainBox  .department").remove();
                break;
        }
        //日志详情
        $(".terminalStateTable tbody tr a").bind("click", function (event) {
            var queryDate = this.domObj.find(' input.date').val().replace(/-/g, "/");
            var userId = $(event.currentTarget).parents("tr").attr("userid");
            this.currentQueryUserID = userId;
            this.currentQueryDate = queryDate;
            // this.domObj.find(".sideBox .tableContent tbody tr").remove();//清除之前的结果
            // this.domObj.find(".mainContent div.dataloaderright").css("display", "block");
            this.requestRunLog(this.config.log.Num_pageindex, this.config.log.Num_pagesize, userId, queryDate);
        }.bind(this));
        //清除右边栏日志
        this.domObj.find(".sideBox .tableContent tbody tr").remove();
        // //自动触发用户过滤
        // this.domObj.find(".state div[userState=" + this.userState + "]").trigger("click");
    }

    //图标形式展现终端状态
    showTerminalStateByPicture() {
        var config = this.config.showTerminalStateByPicture;
        //设置图标显示按下背景
        this.domObj.find(" #toolbar div.tool-table").removeClass('active');
        this.domObj.find("#toolbar div.picture").addClass('active');
        this.domObj.find(".state .all").addClass("active");
        //清除之前的元素
        if (this.domObj.find(".mainBox *")) {
            this.domObj.find(".mainBox *").remove();
        }
        //设置当前状态（表格显示|图标显示）
        this.dataState = "picture";
        //初始化图标显示
        var rows = this.terminalStateResult.result.rows;
        var html = "";
        var countAll = 0;
        var countNoWork = 0;
        var countonWork = 0;
        var countGpsError = 0;
        var countNetError = 0;
        var countNoGps = 0;
        var countOffWork = 0;
        for (var i = 0, length = rows.length; i < length; i++) {
            var username = rows[i].username;
            var subUserName = username;
            if (username.length > 4) {
                subUserName = username.substr(0, 4) + "...";
            }
            countAll = length;
            var userId = rows[i].userid;
            var loginTime = rows[i].on_time;//上班时间
            var offTime = rows[i].off_time;//下班时间
            var headPicture = rows[i].avatar;
            var x = rows[i].lng;
            var y = rows[i].lat;
            var oraginalAvatar = "no";
            if (headPicture !== "") {
                var xjapiRoot = AppX.appConfig.xjapiroot;
                headPicture = xjapiRoot.substr(0, xjapiRoot.length - 3) + rows[i].avatar;//头像地址
            } else if (loginTime === null || offTime !== null) {
                headPicture = config.URL_avatarOffWork;//头像
                oraginalAvatar = "yes";
            } else {
                headPicture = config.URL_avatarOffWork;//头像
                oraginalAvatar = "yes";
            }

            /*设置巡检人员状态
              *1. 无上班时间则为未上班
              *2. 有上下班时间 则为下班
              *3. 上班（正常，gps异常，网络异常，gps和网络异常）
              */
            var userState = "";
            if (loginTime !== null && loginTime !== "") {
                var equipmentInfo = rows[i].equip_info;
                var workState = equipmentInfo[0].work_state;
                var gpsState = equipmentInfo[0].gps_state;
                var netState = equipmentInfo[0].network_state;
                switch (workState) {
                    case 3://下班
                        userState = "offWork";
                        // userPng = "./widgets/TerminalState/css/img/offWork.png";
                        countOffWork++;
                        break;
                    default://异常
                        if (netState == 0) {
                            userState = "netError";
                            countNetError++;
                        }
                        else if (gpsState == 0 && netState == 1) {
                            userState = "noGps";
                            countNoGps++;
                            countNoGps++;
                        } else if (gpsState == 2 && netState == 1) {
                            userState = "gpsError";
                            countGpsError++;
                        } else if (gpsState == 1 && netState == 1) {
                            userState = "onWork";
                            countonWork++;
                        }
                }

                // if (offTime !== null) {//下班
                //     userState = "offWork";
                //     // userPng = "./widgets/TerminalState/css/img/offWork.png";
                //     countOffWork++;
                // } else {
                //     var equipmentInfo = rows[i].equip_info;
                //     var gpsState = equipmentInfo[0].gps_state;
                //     var netState = equipmentInfo[0].network_state;
                //     if (gpsState == 2 && netState === 1) {//上班-GPS异常
                //         userState = "gpsError";
                //         // userPng = "./widgets/TerminalState/css/img/gpsErro.png";
                //         countGpsError++;
                //     } else if (netState == 1 && gpsState == 0) {
                //         userState = "noGps";
                //         countNoGps++;
                //     } else if (netState == 0) {//上班-网络异常
                //         userState = "netError";
                //         // userPng = "./widgets/TerminalState/css/img/netErro.png";
                //         countNetError++;
                //     } else {//上班-正常
                //         userState = "onWork";
                //         // userPng = "./widgets/TerminalState/css/img/onWork.png";
                //         countonWork++;
                //     }
                // }

            } else {//未上班
                var userState = "noWork";
                // userPng = "./widgets/TerminalState/css/img/noWork.png";
                countNoWork++;
            }
            var data = [userId, userState, oraginalAvatar, headPicture, username, subUserName];
            var template = this.template.split("$$")[2];
            var index = 0;
            var templateReplace = template.replace(/%s/g, function () {
                return (index < data.length) ? (data[index++]) : ""
            });
            html += templateReplace;

        }

        this.domObj.find(".mainContent div.dataloaderleft").css("display", "none");
        this.domObj.find(" .mainBox").append(html);
        //初始化状态统计
        this.domObj.find("div.state span.countall").text("(" + countAll + ")");
        this.domObj.find("div.state span.countnowork").text("(" + countNoWork + ")");
        this.domObj.find("div.state span.countonwork").text("(" + countonWork + ")");
        this.domObj.find("div.state span.countgpserror").text("(" + countGpsError + ")");
        this.domObj.find("div.state span.countnogps").text("(" + countNoGps + ")");
        this.domObj.find("div.state span.countneterror").text("(" + countNetError + ")");
        this.domObj.find("div.state span.countoffwork").text("(" + countOffWork + ")");

        //每个图标绑定点击事件
        this.domObj.find(".mainBox .workState div.state").bind("click", function (event) {
            var queryDate = this.domObj.find(' input.date').val().replace(/-/g, "/");
            var userId = $(event.currentTarget).attr("userid");
            this.currentQueryUserID = userId;
            this.currentQueryDate = queryDate;
            this.domObj.find(".sideBox .tableContent tbody tr").remove();//清除之前的结果
            // this.domObj.find(".mainContent div.dataloaderright").css("display", "block");
            this.requestRunLog(this.config.log.Num_pageindex, this.config.log.Num_pagesize, userId, queryDate);

        }.bind(this));
        //清除右边栏日志
        this.domObj.find(".sideBox .tableContent tbody tr").remove();
        // //自动触发用户过滤
        // $(".widget-terminalstate .state div[userState=" + this.userState + "]").trigger("click");
    }

    /*
     * 终端运行日志显示
     */

    //获取运行日志
    requestRunLog(pageindex, pagesize, userID, queryDate) {
        var config = this.config.requestRunLog;
        var toast = this.AppX.runtimeConfig.toast;
        //设置第一个元素处于处于激活状态，表明为查询该用户的运行日志
        if (this.dataState == "table") {
            this.domObj.find(".tableContent tbody tr").removeClass("success");
            $(event.currentTarget).addClass("success");
        } else {
            this.domObj.find(".mainBox .workState div").removeClass("success");
            $(event.currentTarget).addClass("success");
        }
        //查询日志
        $.ajax({
            headers: {
                'Token': AppX.appConfig.xjxj,
                'departmentid': AppX.appConfig.departmentid,
            },
            type: "POST",
            url: AppX.appConfig.xjapiroot.replace(/\/+$/, "") + config.URL_request,
            data: {
                "userid": userID,
                "search_date": queryDate,
                "pageindex": pageindex,
                "pagesize": pagesize
            },
            success: function (result) {
                if (result.result.rows.runlog === null || result.result.rows.runlog.length === 0) {
                    return;
                } else if (result.code !== 1) {
                    toast.Show(result.message);
                }
                else {
                    var logInfos = [];
                    var runLog = result.result.rows.runlog;
                    for (var i = 0, length = runLog.length; i < length; i++) {
                        var logInfo = {
                            "userName": result.result.rows.username,//用户名
                            "checkTime": runLog[i].check_time,//日志app端检测时间
                            "workState": runLog[i].work_state,//工作状态（0:开机；1：上班；2：工作中；3：下班；4：异常）
                            "gpsState": runLog[i].gps_state,//0：关闭；1：开启；2：异常
                            "netState": runLog[i].network_state,//0：关闭；1：开启
                            "electricity": runLog[i].electricity,//电量
                        }
                        logInfos.push(logInfo);
                    }
                    this.requestRunLogCallBack(logInfos);
                }
            }.bind(this),
            error: function () {
                toast.Show(config.MSG_error);
            }.bind(this),
            dataType: "json",
        });
    }

    //获取运行日志回调函数
    requestRunLogCallBack(logInfos: Array<any>) {
        var html = "";
        for (var i = 0, length = logInfos.length; i < length; i++) {
            var time = logInfos[i].checkTime.split(" ")[1];//去除年月日
            var dataState = "normal";
            var workState = ""
            switch (logInfos[i].workState) {
                case 0:
                    workState = "开机";
                    break;
                case 1:
                    workState = "上班";
                    dataState = "loginIn";
                    break;
                case 2:
                    workState = "工作中";
                    break;
                case 3:
                    workState = "下班";
                    dataState = "loginOut"
                    break;
                case 4:
                    workState = "异常";
                    break;
            }
            var gpsState = "--";//gps状态
            var netState = "";//网络状态
            if (logInfos[i].netState == 0) {
                netState = "中断";
            } else {
                netState = "正常";
                if (logInfos[i].gpsState == 0) {
                    gpsState = "未开启";
                } else if (logInfos[i].gpsState == 2) {
                    gpsState = "异常";
                } else {
                    gpsState = "正常";
                }
            }
            var electricity = "--";//电量
            if (logInfos[i].electricity.length !== 0) {
                electricity = logInfos[i].electricity + "%";
            }
            var data = [dataState, time, workState, gpsState, netState, electricity];
            var template = this.template.split("$$")[5];
            var index = 0;
            var itemHtml = template.replace(/%data/g, function () {
                return (index < data.length) ? (data[index++]) : "";
            });
            html = html + itemHtml;
        }

        this.runlogPopup.setSize(600, 600);
        var template = this.template.split("$$")[4].replace(/%runlogdata/g, html);
        var Obj = this.runlogPopup.Show("日志详情" + "(" + logInfos[0].userName + ")", template);
        //异常，中断文字显示为红色
        Obj.conObj.find("td").text(function (index, value) {
            if (value == "异常"||value=="中断"||value=="未开启") {
                $(this).css("color", "red");

            }
            return value;
        });

        //移除关闭 和提交按钮
        Obj.conObj.find(".btn-close").remove();
        Obj.conObj.find(".btn-submit").remove();

    }


    /*
     * 显示某个状态的巡检员
     */

    //用户状态点击事件，筛选符合状态的巡检员
    stateToolClick(event) {
        var state = $(event.currentTarget).attr("userState");
        //设置所选用户的状态
        this.userState = state;
        //设置点击的状态图标为active
        this.domObj.find(".state div").removeClass("active");
        $(event.currentTarget).addClass("active");
        //根据列表还是图标，显示符合条件的用户    
        if (this.dataState == "table") {
            //显示符合条件的用户
            this.domObj.find('.mainContent .terminalStateTable tbody tr').css("display", function (index, value) {
                var userSate = this.domObj.find(".mainContent .terminalStateTable tbody tr:eq(" + index + ")").attr("userState");
                var regExp = new RegExp(state);
                if (state == "all") {
                    return "";
                } else if (regExp.test(userSate)) {
                    return "";
                } else {
                    return "none";
                }
            }.bind(this));
            //清除右边栏日志
            this.domObj.find(".sideBox .tableContent tbody tr").remove();
            // //默认查询第一个用户的运行日志
            // this.domObj.find(".mainContent .terminalStateTable tbody tr:visible:eq(0)").trigger("click");
        } else {
            //显示符合条件的用户
            this.domObj.find('.mainContent .mainBox .workState div.item').css("display", function (index, value) {
                var userSate = this.domObj.find(".mainContent .mainBox .workState div.item:eq(" + index + ")").attr("state");
                var regExp = new RegExp(state);
                if (state == "all") {
                    return "";
                } else if (regExp.test(userSate)) {
                    return "";
                } else {
                    return "none";
                }
            }.bind(this));
            //清除右边栏日志
            this.domObj.find(".sideBox .tableContent tbody tr").remove();
            // //默认查询第一个用户的运行日志
            // this.domObj.find(".mainContent .mainBox .workState div.item:visible:eq(0)").trigger("click");
        }

    }
}


